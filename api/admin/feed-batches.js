import { db } from "hatchable";

export const access="admin";
export const methods=["GET","POST"];

const s=(v,n=1000)=>typeof v==="string"?v.trim().slice(0,n):"";

export default async function(req,res){
  if(req.method==="GET"){
    const r=await db.query("SELECT * FROM feed_batches ORDER BY created_at DESC LIMIT 500");
    return res.json({feed_batches:r.rows});
  }
  const b=req.body||{},code=s(b.feed_batch_code,120),type=s(b.feed_type,120);
  if(!code||!type)return res.status(400).json({error:"Feed batch code and feed type are required."});
  const r=await db.query("INSERT INTO feed_batches (feed_batch_code,feed_type,supplier_name,ingredients_summary,supplier_coa_reference,manufacture_date,received_date,expiry_date,qc_status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
  [code,type,s(b.supplier_name,200),s(b.ingredients_summary,2000),s(b.supplier_coa_reference,200),b.manufacture_date||null,b.received_date||null,b.expiry_date||null,s(b.qc_status,60)||"Pending",s(b.notes,2000)]);
  await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,after_data) VALUES ($1,'feed_batch_created','feed_batch',$2,$3::jsonb)",[req.member?.email||req.member?.handle||"project-admin",String(r.rows[0].id),JSON.stringify(r.rows[0])]);
  return res.status(201).json({feed_batch:r.rows[0]});
}