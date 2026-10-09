import { db } from "hatchable";
export const access="user";
export const methods=["POST","PUT","DELETE"];
const s=(v,n=400)=>typeof v==="string"?v.trim().slice(0,n):"";
export default async function(req,res){
 const user=req.user,b=req.body||{};
 if(req.method==="POST"){
  const line=s(b.address_line,250),city=s(b.city,100),pin=s(b.pin_code,10),recipient=s(b.recipient_name,160);
  if(!line||!city||!/^\d{6}$/.test(pin)||!recipient||!s(b.phone,40))return res.status(400).json({error:"Enter recipient, phone, street address, city and a valid 6-digit PIN code."});
  if(b.is_default===true)await db.query("UPDATE customer_addresses SET is_default=FALSE,updated_at=NOW() WHERE user_id=$1",[user.id]);
  const r=await db.query("INSERT INTO customer_addresses(user_id,label,recipient_name,phone,address_line,city,state,pin_code,delivery_instructions,is_default) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",[user.id,s(b.label,80)||"Home",recipient,s(b.phone,40),line,city,s(b.state,100)||"Telangana",pin,s(b.delivery_instructions,500),Boolean(b.is_default)]);
  return res.status(201).json({address:r.rows[0]});
 }
 const id=Number(b.id);
 if(!Number.isInteger(id)||id<1)return res.status(400).json({error:"Enter a valid address ID."});
 const prior=await db.query("SELECT * FROM customer_addresses WHERE id=$1 AND user_id=$2",[id,user.id]);
 if(!prior.rows.length)return res.status(404).json({error:"Address not found."});
 if(req.method==="DELETE"){await db.query("DELETE FROM customer_addresses WHERE id=$1 AND user_id=$2",[id,user.id]);return res.json({deleted:true,id});}
 const line=s(b.address_line,250),city=s(b.city,100),pin=s(b.pin_code,10),recipient=s(b.recipient_name,160),phone=s(b.phone,40);
 if(!line||!city||!/^\d{6}$/.test(pin)||!recipient||!phone)return res.status(400).json({error:"Enter recipient, phone, street address, city and a valid 6-digit PIN code."});
 if(b.is_default===true)await db.query("UPDATE customer_addresses SET is_default=FALSE,updated_at=NOW() WHERE user_id=$1",[user.id]);
 const r=await db.query("UPDATE customer_addresses SET label=$3,recipient_name=$4,phone=$5,address_line=$6,city=$7,state=$8,pin_code=$9,delivery_instructions=$10,is_default=$11,updated_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING *",[id,user.id,s(b.label,80)||"Home",recipient,phone,line,city,s(b.state,100)||"Telangana",pin,s(b.delivery_instructions,500),Boolean(b.is_default)]);
 return res.json({address:r.rows[0]});
}