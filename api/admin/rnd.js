import { db } from "hatchable";

export const access = "admin";
export const methods = ["GET", "POST", "PATCH"];

const STATUSES = ["Proposed","Under Review","Baseline Testing","Trial Planned","Trial Active","Laboratory Testing","Confirmation Required","Regulatory Review","Approved for Commercial Release","On Hold","Rejected","Discontinued"];
const GATE_STATUSES = ["Not Started","In Progress","Pass","Fail","Needs More Evidence","Waived"];
const clean = (v, max=4000) => typeof v === "string" ? v.trim().slice(0,max) : "";

export default async function (req, res) {
  if (req.method === "GET") {
    const projects = await db.query("SELECT * FROM rnd_projects ORDER BY id");
    const gates = await db.query("SELECT g.*, p.project_code, p.name AS project_name FROM rnd_validation_gates g JOIN rnd_projects p ON p.id=g.project_id ORDER BY p.id, g.sequence_number");
    const counts = await db.query("SELECT (SELECT COUNT(*) FROM lab_reports)::int AS lab_reports, (SELECT COUNT(*) FROM lab_reports WHERE review_status='Pending Review')::int AS pending_lab_reviews, (SELECT COUNT(*) FROM egg_batches)::int AS batches, (SELECT COUNT(*) FROM egg_batches WHERE recall_status <> 'Clear')::int AS held_or_recalled_batches, (SELECT COUNT(*) FROM rnd_costs)::int AS cost_entries");
    return res.json({ projects: projects.rows, gates: gates.rows, counts: counts.rows[0] });
  }

  const b = req.body || {};
  if (req.method === "POST") {
    const projectId = Number(b.project_id);
    const gateCode = clean(b.gate_code, 20);
    const status = clean(b.status, 40);
    if (!Number.isInteger(projectId) || !gateCode || !GATE_STATUSES.includes(status)) return res.status(400).json({error:"Provide a valid project, gate code and gate status."});
    const existing = await db.query("SELECT * FROM rnd_validation_gates WHERE id=$1 AND project_id=$2 AND gate_code=$3", [Number(b.gate_id), projectId, gateCode]);
    if (!existing.rows.length) return res.status(404).json({error:"Validation gate not found."});
    if (status === "Pass" && (!clean(b.reviewer,200) || !clean(b.decision,1000) || !clean(b.evidence_summary,3000))) return res.status(400).json({error:"A gate can only pass with a named reviewer, written decision and evidence summary."});
    const previous = existing.rows[0];
    const updated = await db.query("UPDATE rnd_validation_gates SET status=$2,reviewer=$3,reviewed_at=CASE WHEN $2 IN ('Pass','Fail','Needs More Evidence','Waived') THEN NOW() ELSE reviewed_at END,decision=$4,evidence_summary=$5,report_id=$6,updated_at=NOW() WHERE id=$1 RETURNING *", [previous.id,status,clean(b.reviewer,200),clean(b.decision,1000),clean(b.evidence_summary,3000),b.report_id ? Number(b.report_id) : null]);
    await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,before_data,after_data,notes) VALUES ($1,$2,'rnd_validation_gate',$3,$4::jsonb,$5::jsonb,$6)", [req.member?.email || req.member?.handle || "project-admin","gate_status_change",String(previous.id),JSON.stringify(previous),JSON.stringify(updated.rows[0]),"Gate status updated by authorized administrator."]);
    if (status === "Pass") {
      const mandatory = await db.query("SELECT COUNT(*)::int AS n FROM rnd_validation_gates WHERE project_id=$1 AND mandatory=TRUE AND status <> 'Pass'", [projectId]);
      if (mandatory.rows[0].n === 0) {
        // Passing gates is necessary, but a separate final reviewer decision is required before a release flag may be set.
        await db.query("UPDATE rnd_projects SET status='Regulatory Review',updated_at=NOW() WHERE id=$1 AND commercial_release_approved=FALSE AND status <> 'Discontinued'", [projectId]);
      }
    }
    return res.json({gate:updated.rows[0]});
  }

  const id = Number(b.id);
  const status = clean(b.status, 60);
  if (!Number.isInteger(id) || !STATUSES.includes(status)) return res.status(400).json({error:"Provide a valid research project ID and status."});
  const prev = await db.query("SELECT * FROM rnd_projects WHERE id=$1", [id]);
  if (!prev.rows.length) return res.status(404).json({error:"Research project not found."});
  const release = status === "Approved for Commercial Release";
  if (release) {
    const outstanding = await db.query("SELECT COUNT(*)::int AS n FROM rnd_validation_gates WHERE project_id=$1 AND mandatory=TRUE AND status <> 'Pass'", [id]);
    if (outstanding.rows[0].n > 0) return res.status(409).json({error:"Commercial release is blocked: every mandatory validation gate must be marked Pass first."});
    if (!clean(b.final_decision,1000) || !clean(b.reviewer,200)) return res.status(400).json({error:"Commercial release requires a named final reviewer and written final decision."});
  }
  const after = await db.query("UPDATE rnd_projects SET status=$2,reviewer_comments=$3,final_decision=$4,project_owner=$5,commercial_release_approved=$6,updated_at=NOW() WHERE id=$1 RETURNING *", [id,status,clean(b.reviewer_comments,4000),clean(b.final_decision,2000),clean(b.project_owner,200),release]);
  await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,before_data,after_data,notes) VALUES ($1,$2,'rnd_project',$3,$4::jsonb,$5::jsonb,$6)", [req.member?.email || req.member?.handle || "project-admin","rnd_project_status_change",String(id),JSON.stringify(prev.rows[0]),JSON.stringify(after.rows[0]),"Project status changed by authorized administrator."]);
  return res.json({project:after.rows[0]});
}