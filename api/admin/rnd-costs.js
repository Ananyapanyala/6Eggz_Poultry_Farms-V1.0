import { db } from "hatchable";

export const access="admin";
export const methods=["GET","POST"];

const s=(v,n=1000)=>typeof v==="string"?v.trim().slice(0,n):"";

export default async function(req,res){
  if(req.method==="GET"){
    const r=await db.query("SELECT c.*,p.project_code,p.name AS project_name FROM rnd_costs c JOIN rnd_projects p ON p.id=c.project_id ORDER BY c.created_at DESC LIMIT 500");
    return res.json({costs:r.rows});
  }
  const b=req.body||{}, project=Number(b.project_id),category=s(b.cost_category,100),description=s(b.description,1000),amount=Number(b.amount_rupees);
  if(!Number.isInteger(project)||!category||!description||!Number.isFinite(amount)||amount<0||amount>100000000) return res.status(400).json({error:"Project, cost category, description and a non-negative rupee amount are required."});
  const r=await db.query("INSERT INTO rnd_costs (project_id,cost_category,description,amount_paise,quote_status,supplier_or_lab,incurred_on,reference,entered_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
  [project,category,description,Math.round(amount*100),s(b.quote_status,80)||"Estimate Needed",s(b.supplier_or_lab,240),b.incurred_on||null,s(b.reference,200),req.member?.email||req.member?.handle||"project-admin"]);
  await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,after_data) VALUES ($1,'rnd_cost_created','rnd_cost',$2,$3::jsonb)",[req.member?.email||req.member?.handle||"project-admin",String(r.rows[0].id),JSON.stringify(r.rows[0])]);
  return res.status(201).json({cost:r.rows[0]});
}