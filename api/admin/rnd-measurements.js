import { db } from "hatchable";

export const access="admin";
export const methods=["GET","POST"];

const s=(v,n=1000)=>typeof v==="string"?v.trim().slice(0,n):"";

export default async function(req,res){
  if(req.method==="GET"){
    const r=await db.query("SELECT m.*,p.project_code,p.name AS project_name FROM rnd_measurements m JOIN rnd_projects p ON p.id=m.project_id ORDER BY m.created_at DESC LIMIT 500");
    return res.json({measurements:r.rows});
  }
  const b=req.body||{};
  const project=Number(b.project_id), phase=s(b.phase,80), metric=s(b.metric_name,180), sample=s(b.sample_id,120);
  if(!Number.isInteger(project)||!phase||!metric) return res.status(400).json({error:"Project, measurement phase and metric name are required."});
  if(b.is_validated===true) return res.status(400).json({error:"Validated measurements must be reviewed against a lab report by an authorized reviewer; this entry endpoint records measurements as unvalidated."});
  const r=await db.query("INSERT INTO rnd_measurements (project_id,gate_id,phase,sample_id,metric_name,result_value,result_text,result_unit,measurement_basis,measurement_date,method,source_report_id,is_validated,entered_by,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,FALSE,$13,$14) RETURNING *",
  [project,b.gate_id?Number(b.gate_id):null,phase,sample,metric,b.result_value===""||b.result_value==null?null:Number(b.result_value),s(b.result_text,1000),s(b.result_unit,80),s(b.measurement_basis,180),b.measurement_date||null,s(b.method,300),b.source_report_id?Number(b.source_report_id):null,req.member?.email||req.member?.handle||"project-admin",s(b.notes,2500)]);
  await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,after_data) VALUES ($1,'measurement_recorded','rnd_measurement',$2,$3::jsonb)",[req.member?.email||req.member?.handle||"project-admin",String(r.rows[0].id),JSON.stringify(r.rows[0])]);
  return res.status(201).json({measurement:r.rows[0]});
}