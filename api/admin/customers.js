import { db } from "hatchable";
export const access = "admin";
export const methods = ["GET"];
const norm = v => typeof v === "string" ? v.trim().toLowerCase() : "";
export default async function(req,res){
 const [enq,accounts,prefs]=await Promise.all([
  db.query("SELECT name,email,phone,organisation,enquiry_type,product_interest,status,created_at FROM enquiries ORDER BY created_at DESC LIMIT 2000"),
  db.query("SELECT u.email,u.name,COALESCE(cp.full_name,'') AS full_name,COALESCE(cp.phone,'') AS phone,u.created_at FROM users u LEFT JOIN customer_profiles cp ON cp.user_id=u.id ORDER BY u.created_at DESC LIMIT 2000"),
  db.query("SELECT email,marketing_opt_in,consent_at,opted_out_at,consent_source,updated_at FROM customer_marketing_preferences")
 ]);
 const byEmail=new Map();
 function get(email){const key=norm(email);if(!key)return null;if(!byEmail.has(key))byEmail.set(key,{email:key,name:"",phone:"",organisation:"",sources:new Set(),interests:new Set(),enquiry_count:0,last_contact_at:null,marketing_opt_in:false,consent_at:null,opted_out_at:null,consent_source:""});return byEmail.get(key)}
 for(const a of accounts.rows){const c=get(a.email);if(!c)continue;c.name=c.name||a.full_name||a.name||"";c.phone=c.phone||a.phone||"";c.sources.add("Account");if(a.created_at&&(!c.last_contact_at||new Date(a.created_at)>new Date(c.last_contact_at)))c.last_contact_at=a.created_at}
 for(const q of enq.rows){const c=get(q.email);if(!c)continue;c.name=c.name||q.name||"";c.phone=c.phone||q.phone||"";c.organisation=c.organisation||q.organisation||"";c.enquiry_count++;c.sources.add("Enquiry");if(q.product_interest)c.interests.add(q.product_interest);if(q.enquiry_type)c.interests.add(q.enquiry_type);if(q.created_at&&(!c.last_contact_at||new Date(q.created_at)>new Date(c.last_contact_at)))c.last_contact_at=q.created_at}
 const prefMap=new Map(prefs.rows.map(x=>[norm(x.email),x]));
 const customers=[...byEmail.values()].map(c=>{const p=prefMap.get(c.email);c.sources=[...c.sources];c.interests=[...c.interests];c.marketing_opt_in=!!p?.marketing_opt_in;c.consent_at=p?.consent_at||null;c.opted_out_at=p?.opted_out_at||null;c.consent_source=p?.consent_source||"";return c}).sort((a,b)=>String(b.last_contact_at||"").localeCompare(String(a.last_contact_at||"")));
 return res.json({customers,count:customers.length,marketing_opt_in_count:customers.filter(c=>c.marketing_opt_in).length});
}