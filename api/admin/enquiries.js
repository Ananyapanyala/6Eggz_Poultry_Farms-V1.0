import { db } from "hatchable";
export const access = "admin";
export const methods = ["GET","POST"];
const s=(v,n=3000)=>typeof v==="string"?v.trim().slice(0,n):"";
export default async function(req,res){
 if(req.method==="GET"){
  const r=await db.query("SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 300");
  return res.json({enquiries:r.rows});
 }
 const b=req.body||{},id=s(b.id,80),status=s(b.status,30);
 const statuses=["new","contacted","quoted","converted","closed","spam"];
 const quote=b.quote_rupees==null||b.quote_rupees===""?null:Number(b.quote_rupees);
 if(!id||!statuses.includes(status)||(quote!==null&&(!Number.isFinite(quote)||quote<0||quote>100000000)))return res.status(400).json({error:"Provide an enquiry ID, valid status and a non-negative quote."});
 const before=await db.query("SELECT * FROM enquiries WHERE id=$1",[id]);
 if(!before.rows.length)return res.status(404).json({error:"Enquiry not found."});
 const updated=await db.query("UPDATE enquiries SET status=$2,admin_notes=$3,quote_paise=$4,updated_at=NOW() WHERE id=$1 RETURNING id,status,admin_notes,quote_paise,updated_at",[id,status,s(b.admin_notes),quote===null?null:Math.round(quote*100)]);
 await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,before_data,after_data,notes) VALUES ($1,'enquiry_updated','enquiry',$2,$3::jsonb,$4::jsonb,'Enquiry status or quote changed by admin')",[req.member?.email||req.member?.handle||"project-admin",id,JSON.stringify(before.rows[0]),JSON.stringify(updated.rows[0])]);
 return res.json({enquiry:updated.rows[0]});
}