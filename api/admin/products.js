import { db } from "hatchable";
export const access = "admin";
export const methods = ["GET","POST"];
function s(v,max=2000){return typeof v==="string"?v.trim().slice(0,max):"";}
function n(v){return v===""||v==null?null:Number(v);}
function validate(b){
 const price=n(b.price_rupees),stock=Number(b.stock_quantity||0),amount=n(b.nutrient_amount);
 if(!s(b.name,160)||!s(b.slug,180)||!s(b.category,80)||!Number.isInteger(stock)||stock<0||(price!==null&&(!Number.isFinite(price)||price<0||price>1000000))||(amount!==null&&(!Number.isFinite(amount)||amount<0)))return {error:"Enter a product name, slug/category, non-negative stock and valid price/nutrient amounts."};
 const category=s(b.category,80).toLowerCase(),research=category.includes("nutrition")||category.includes("enriched")||category.includes("research");
 if(research&&(b.available===true||b.available==="true")&&(!(b.evidence_approved===true||b.evidence_approved==="true")||s(b.research_status,60)!=="Verified"))return {error:"Research-stage products cannot be made available without verified product status and approved evidence."};
 if(b.public_claim&&(!(b.evidence_approved===true||b.evidence_approved==="true")||s(b.research_status,60)!=="Verified"))return {error:"A public nutrition claim requires a verified product and approved evidence."};
 return {price,stock,amount};
}
function params(b,v){return [s(b.name,160),s(b.slug,180).toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,""),s(b.category,80),s(b.description),s(b.pack_size,100),v.price===null?null:Math.round(v.price*100),Boolean(b.available),v.stock,s(b.image_url,1000),s(b.research_status,60)||"Proposed",s(b.nutrient_target,160),v.amount,s(b.nutrient_unit,40),s(b.serving_basis,120),s(b.lab_name,200),b.report_date||null,s(b.report_reference,160),Boolean(b.evidence_approved),s(b.public_claim,1000),s(b.storage_instructions,1000)];}
export default async function(req,res){
 if(req.method==="GET"){const r=await db.query("SELECT * FROM products ORDER BY created_at DESC LIMIT 200");return res.json({products:r.rows});}
 const b=req.body||{},v=validate(b);if(v.error)return res.status(400).json({error:v.error});
 const vals=params(b,v);
 const r=await db.query("INSERT INTO products (name,slug,category,description,pack_size,price_paise,available,stock_quantity,image_url,research_status,nutrient_target,nutrient_amount,nutrient_unit,serving_basis,lab_name,report_date,report_reference,evidence_approved,public_claim,storage_instructions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *",vals);
 await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,after_data) VALUES ($1,'product_created','product',$2,$3::jsonb)",[req.member?.email||req.member?.handle||"project-admin",r.rows[0].id,JSON.stringify(r.rows[0])]);
 return res.status(201).json({product:r.rows[0]});
}