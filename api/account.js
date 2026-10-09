import { db } from "hatchable";
export const access="user";
export const methods=["GET","PUT"];
const s=(v,n=500)=>typeof v==="string"?v.trim().slice(0,n):"";
export default async function(req,res){
 const user=req.user;
 if(req.method==="GET"){
  const [profile,addresses,prefs]=await Promise.all([
   db.query("SELECT user_id,full_name,phone,created_at,updated_at FROM customer_profiles WHERE user_id=$1",[user.id]),
   db.query("SELECT id,label,recipient_name,phone,address_line,city,state,pin_code,delivery_instructions,is_default,created_at,updated_at FROM customer_addresses WHERE user_id=$1 ORDER BY is_default DESC,created_at DESC",[user.id]),
   db.query("SELECT marketing_opt_in,consent_at,opted_out_at FROM customer_marketing_preferences WHERE email=$1",[s(user.email,200).toLowerCase()])
  ]);
  return res.json({user:{id:user.id,email:user.email,name:user.name||""},profile:profile.rows[0]||{user_id:user.id,full_name:user.name||"",phone:""},addresses:addresses.rows,marketing:prefs.rows[0]||{marketing_opt_in:false,consent_at:null,opted_out_at:null}});
 }
 const b=req.body||{},name=s(b.full_name,160),phone=s(b.phone,40);
 const current=await db.query("SELECT * FROM customer_profiles WHERE user_id=$1",[user.id]);
 const p=await db.query("INSERT INTO customer_profiles(user_id,full_name,phone) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET full_name=EXCLUDED.full_name,phone=EXCLUDED.phone,updated_at=NOW() RETURNING user_id,full_name,phone,updated_at",[user.id,name,phone]);
 await db.query("INSERT INTO admin_audit_log(actor,action,entity_type,entity_id,before_data,after_data,notes) VALUES($1,'customer_profile_updated','customer_profile',$2,$3::jsonb,$4::jsonb,'Customer updated their own profile')",[s(user.email||user.id,200),user.id,JSON.stringify(current.rows[0]||{}),JSON.stringify(p.rows[0])]);
 if(typeof b.marketing_opt_in!=="undefined" && s(user.email,200)){
  const optedIn=b.marketing_opt_in===true||b.marketing_opt_in==="true"||b.marketing_opt_in==="on";
  if(optedIn) await db.query("INSERT INTO customer_marketing_preferences(email,marketing_opt_in,consent_at,opted_out_at,consent_source,updated_at) VALUES($1,TRUE,NOW(),NULL,'customer account settings',NOW()) ON CONFLICT(email) DO UPDATE SET marketing_opt_in=TRUE,consent_at=NOW(),opted_out_at=NULL,consent_source='customer account settings',updated_at=NOW()",[s(user.email,200).toLowerCase()]);
  else await db.query("INSERT INTO customer_marketing_preferences(email,marketing_opt_in,opted_out_at,consent_source,updated_at) VALUES($1,FALSE,NOW(),'customer account settings',NOW()) ON CONFLICT(email) DO UPDATE SET marketing_opt_in=FALSE,opted_out_at=NOW(),consent_source='customer account settings',updated_at=NOW()",[s(user.email,200).toLowerCase()]);
 }
 return res.json({profile:p.rows[0]});
}