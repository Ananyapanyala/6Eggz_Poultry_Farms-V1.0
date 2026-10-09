import { auth, db } from "hatchable";
export const access="user";
export const methods=["GET","PUT"];
const s=(v,n=500)=>typeof v==="string"?v.trim().slice(0,n):"";
export default async function(req,res){
 const user=req.user;
 if(req.method==="GET"){
  const [profile,addresses]=await Promise.all([
   db.query("SELECT user_id,full_name,phone,created_at,updated_at FROM customer_profiles WHERE user_id=$1",[user.id]),
   db.query("SELECT id,label,recipient_name,phone,address_line,city,state,pin_code,delivery_instructions,is_default,created_at,updated_at FROM customer_addresses WHERE user_id=$1 ORDER BY is_default DESC,created_at DESC",[user.id])
  ]);
  return res.json({user:{id:user.id,email:user.email,name:user.name||""},profile:profile.rows[0]||{user_id:user.id,full_name:user.name||"",phone:""},addresses:addresses.rows});
 }
 const b=req.body||{},name=s(b.full_name,160),phone=s(b.phone,40);
 const current=await db.query("SELECT * FROM customer_profiles WHERE user_id=$1",[user.id]);
 const p=await db.query("INSERT INTO customer_profiles(user_id,full_name,phone) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET full_name=EXCLUDED.full_name,phone=EXCLUDED.phone,updated_at=NOW() RETURNING user_id,full_name,phone,updated_at",[user.id,name,phone]);
 await db.query("INSERT INTO admin_audit_log(actor,action,entity_type,entity_id,before_data,after_data,notes) VALUES($1,'customer_profile_updated','customer_profile',$2,$3::jsonb,$4::jsonb,'Customer updated their own profile')",[s(user.email||user.id,200),"customer_profile_update",user.id,JSON.stringify(current.rows[0]||{}),JSON.stringify(p.rows[0])]);
 return res.json({profile:p.rows[0]});
}