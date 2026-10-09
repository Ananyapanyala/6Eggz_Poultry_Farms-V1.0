import { db } from "hatchable";
export const access = "admin";
export const methods = ["PUT"];
const s=(v,max=2000)=>typeof v==="string"?v.trim().slice(0,max):"";
const n=v=>v===""||v==null?null:Number(v);
export default async function(req,res){
 const id=req.params.id,b=req.body||{},price=n(b.price_rupees),stock=Number(b.stock_quantity||0),amount=n(b.nutrient_amount);
 const slug=s(b.slug,180).toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
 if(!s(b.name,160)||!slug||!s(b.category,80)||!Number.isInteger(stock)||stock<0||(price!==null&&(!Number.isFinite(price)||price<0||price>1000000))||(amount!==null&&(!Number.isFinite(amount)||amount<0)))return res.status(400).json({error:"Invalid product fields."});
 const c=s(b.category,80).toLowerCase(),research=c.includes("nutrition")||c.includes("enriched")||c.includes("research"),available=b.available===true||b.available==="true",evidence=b.evidence_approved===true||b.evidence_approved==="true",status=s(b.research_status,60)||"Proposed",claim=s(b.public_claim,1000);
 if(research&&available&&(!evidence||status!=="Verified"))return res.status(400).json({error:"Research-stage products cannot be made available without verified status and approved evidence."});
 if(claim&&(!evidence||status!=="Verified"))return res.status(400).json({error:"Public nutrition claims require approved evidence and Verified status."});
 const before=await db.query("SELECT * FROM products WHERE id=$1",[id]);if(!before.rows.length)return res.status(404).json({error:"Product not found."});
 const r=await db.query("UPDATE products SET name=$2,slug=$3,category=$4,description=$5,pack_size=$6,price_paise=$7,available=$8,stock_quantity=$9,image_url=$10,research_status=$11,nutrient_target=$12,nutrient_amount=$13,nutrient_unit=$14,serving_basis=$15,lab_name=$16,report_date=$17,report_reference=$18,evidence_approved=$19,public_claim=$20,storage_instructions=$21,updated_at=NOW() WHERE id=$1 RETURNING *",
 [id,s(b.name,160),slug,s(b.category,80),s(b.description),s(b.pack_size,100),price===null?null:Math.round(price*100),available,stock,s(b.image_url,1000),status,s(b.nutrient_target,160),amount,s(b.nutrient_unit,40),s(b.serving_basis,120),s(b.lab_name,200),b.report_date||null,s(b.report_reference,160),evidence,claim,s(b.storage_instructions,1000)]);
 await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,before_data,after_data,notes) VALUES ($1,'product_updated','product',$2,$3::jsonb,$4::jsonb,'Product fields changed by admin')",[req.member?.email||req.member?.handle||"project-admin",id,JSON.stringify(before.rows[0]),JSON.stringify(r.rows[0])]);
 return res.json({product:r.rows[0]});
}