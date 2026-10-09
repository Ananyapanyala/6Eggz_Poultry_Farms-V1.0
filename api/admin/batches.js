import { db } from "hatchable";
import crypto from "node:crypto";

export const access="admin";
export const methods=["GET","POST"];

const s=(v,n=1000)=>typeof v==="string"?v.trim().slice(0,n):"";
const RELEASE=["Quarantined","Pending QC","Released","On Hold","Recalled","Withdrawn"];

export default async function(req,res){
  if(req.method==="GET"){
    const r=await db.query("SELECT b.*,p.name AS product_name, f.feed_batch_code, rp.name AS rnd_project_name FROM egg_batches b LEFT JOIN products p ON p.id=b.product_id LEFT JOIN feed_batches f ON f.id=b.feed_batch_id LEFT JOIN rnd_projects rp ON rp.id=b.rnd_project_id ORDER BY b.created_at DESC LIMIT 500");
    return res.json({batches:r.rows});
  }
  const b=req.body||{};
  if(req.method==="POST" && b.action === "review"){
    const id=Number(b.id),status=s(b.release_status,40),recall=s(b.recall_status,40),qc=s(b.quality_inspection_status,60);
    if(!Number.isInteger(id)||!RELEASE.includes(status)||!["Clear","Hold","Recalled","Withdrawn"].includes(recall))return res.status(400).json({error:"Provide valid batch ID, release status and recall status."});
    const prior=await db.query("SELECT * FROM egg_batches WHERE id=$1",[id]);
    if(!prior.rows.length)return res.status(404).json({error:"Batch not found."});
    if(status==="Released"&&recall!=="Clear")return res.status(409).json({error:"A held, recalled or withdrawn batch cannot be released."});
    if(status==="Released"){
      if(qc!=="Passed"||!b.release_decision||!s(b.released_by,200))return res.status(400).json({error:"Release requires passed QC, a written release decision and a named reviewer."});
      if(prior.rows[0].rnd_project_id){
        const project=await db.query("SELECT commercial_release_approved FROM rnd_projects WHERE id=$1",[prior.rows[0].rnd_project_id]);
        if(!project.rows[0]||!project.rows[0].commercial_release_approved)return res.status(409).json({error:"The linked specialised research project has not been approved for commercial release."});
      }
      const reports=await db.query("SELECT COUNT(*)::int AS n FROM lab_reports WHERE batch_id=$1 AND review_status='Accepted for Internal Use'",[id]);
      if(Number(reports.rows[0].n)===0)return res.status(409).json({error:"No accepted laboratory report is linked to this batch. A reviewer must assess real test evidence before release."});
    }
    const finalStatus=(recall!=="Clear"&&status==="Released")?"Recalled":status;
    const updated=await db.query("UPDATE egg_batches SET quality_inspection_status=$2,release_status=$3,recall_status=$4,storage_guidance=$5,public_summary=$6,released_by=CASE WHEN $3='Released' THEN $7 ELSE released_by END,released_at=CASE WHEN $3='Released' THEN NOW() ELSE released_at END,updated_at=NOW() WHERE id=$1 RETURNING *",
    [id,qc,finalStatus,recall,s(b.storage_guidance,1000)||prior.rows[0].storage_guidance,s(b.public_summary,1500),s(b.released_by,200)]);
    await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,before_data,after_data,notes) VALUES ($1,'egg_batch_status_change','egg_batch',$2,$3::jsonb,$4::jsonb,$5)",[req.member?.email||req.member?.handle||"project-admin",String(id),JSON.stringify(prior.rows[0]),JSON.stringify(updated.rows[0]),s(b.release_decision,2000)]);
    if(["On Hold","Recalled","Withdrawn"].includes(finalStatus)||recall!=="Clear"){
      const linked=prior.rows[0].product_id;
      if(linked) await db.query("UPDATE products SET available=FALSE,updated_at=NOW() WHERE id=$1",[linked]);
    }
    return res.json({batch:updated.rows[0]});
  }
  if(req.method==="POST" && !b.action){
    const code=s(b.batch_code,100);
    const produced=Number(b.quantity_produced),saleable=Number(b.saleable_quantity),rejected=Number(b.rejected_quantity);
    if(!code||!Number.isInteger(produced)||!Number.isInteger(saleable)||!Number.isInteger(rejected)||produced<0||saleable<0||rejected<0||saleable+rejected>produced) return res.status(400).json({error:"Enter a unique batch code and valid produced/saleable/rejected egg counts."});
    const productId=b.product_id?String(b.product_id):null;
    if(productId){
      const p=await db.query("SELECT id FROM products WHERE id=$1",[productId]);
      if(!p.rows.length)return res.status(400).json({error:"Product ID does not match a configured product."});
    }
    if(b.rnd_project_id){
      const rp=await db.query("SELECT id FROM rnd_projects WHERE id=$1",[Number(b.rnd_project_id)]);
      if(!rp.rows.length)return res.status(400).json({error:"Research project ID does not exist."});
    }
    if(b.feed_batch_id){
      const f=await db.query("SELECT id FROM feed_batches WHERE id=$1",[Number(b.feed_batch_id)]);
      if(!f.rows.length)return res.status(400).json({error:"Feed batch ID does not exist."});
    }
    const release=s(b.release_status,40)||"Quarantined";
    if(!RELEASE.includes(release))return res.status(400).json({error:"Invalid batch release status."});
    if(release==="Released")return res.status(409).json({error:"A batch cannot be released during creation. Complete QC, test review and product release checks, then use the audited release workflow."});
    const qr=crypto.randomUUID()+crypto.randomUUID();
    const r=await db.query("INSERT INTO egg_batches (batch_code,product_id,rnd_project_id,farm_or_house,production_date,packing_date,best_before_date,quantity_produced,saleable_quantity,rejected_quantity,feed_batch_id,quality_inspection_status,release_status,recall_status,storage_guidance,public_summary,qr_token) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *",
    [code,productId,b.rnd_project_id?Number(b.rnd_project_id):null,s(b.farm_or_house,200),b.production_date||null,b.packing_date||null,b.best_before_date||null,produced,saleable,rejected,b.feed_batch_id?Number(b.feed_batch_id):null,s(b.quality_inspection_status,60)||"Pending",release,s(b.recall_status,40)||"Clear",s(b.storage_guidance,1000)||"Follow the storage instructions printed on the approved package.",s(b.public_summary,1500),qr]);
    await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,after_data) VALUES ($1,'egg_batch_created','egg_batch',$2,$3::jsonb)",[req.member?.email||req.member?.handle||"project-admin",String(r.rows[0].id),JSON.stringify(r.rows[0])]);
    return res.status(201).json({batch:r.rows[0],verification_url:"/batch/"+qr});
  }
  const id=Number(b.id),status=s(b.release_status,40),recall=s(b.recall_status,40),qc=s(b.quality_inspection_status,60);
  if(!Number.isInteger(id)||!RELEASE.includes(status)||!["Clear","Hold","Recalled","Withdrawn"].includes(recall))return res.status(400).json({error:"Provide valid batch ID, release status and recall status."});
  const prior=await db.query("SELECT * FROM egg_batches WHERE id=$1",[id]);
  if(!prior.rows.length)return res.status(404).json({error:"Batch not found."});
  if(status==="Released"&&recall!=="Clear")return res.status(409).json({error:"A held, recalled or withdrawn batch cannot be released."});
  if(status==="Released"){
    if(qc!=="Passed"||!b.quality_inspection_status||!b.release_decision||!s(b.released_by,200))return res.status(400).json({error:"Release requires passed QC, a written release decision and a named reviewer."});
    if(prior.rows[0].rnd_project_id){
      const project=await db.query("SELECT commercial_release_approved FROM rnd_projects WHERE id=$1",[prior.rows[0].rnd_project_id]);
      if(!project.rows[0]||!project.rows[0].commercial_release_approved)return res.status(409).json({error:"The linked specialised research project has not been approved for commercial release."});
    }
    const reports=await db.query("SELECT COUNT(*)::int AS n FROM lab_reports WHERE batch_id=$1 AND review_status='Accepted for Internal Use'",[id]);
    if(Number(reports.rows[0].n)===0)return res.status(409).json({error:"No accepted laboratory report is linked to this batch. A reviewer must assess real test evidence before release."});
  }
  const finalStatus=(recall!=="Clear"&&status==="Released")?"Recalled":status;
  const r=await db.query("UPDATE egg_batches SET quality_inspection_status=$2,release_status=$3,recall_status=$4,storage_guidance=$5,public_summary=$6,released_by=CASE WHEN $3='Released' THEN $7 ELSE released_by END,released_at=CASE WHEN $3='Released' THEN NOW() ELSE released_at END,updated_at=NOW() WHERE id=$1 RETURNING *",
  [id,qc,finalStatus,recall,s(b.storage_guidance,1000)||prior.rows[0].storage_guidance,s(b.public_summary,1500),s(b.released_by,200)]);
  await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,before_data,after_data,notes) VALUES ($1,'egg_batch_status_change','egg_batch',$2,$3::jsonb,$4::jsonb,$5)",[req.member?.email||req.member?.handle||"project-admin",String(id),JSON.stringify(prior.rows[0]),JSON.stringify(r.rows[0]),s(b.release_decision,2000)]);
  if(finalStatus==="On Hold"||finalStatus==="Recalled"||finalStatus==="Withdrawn"||recall!=="Clear"){
    const linked=prior.rows[0].product_id;
    if(linked) await db.query("UPDATE products SET available=FALSE,updated_at=NOW() WHERE id=$1",[linked]);
  }
  return res.json({batch:r.rows[0]});
}