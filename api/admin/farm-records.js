import { db } from "hatchable";

export const access="admin";
export const methods=["GET","POST"];

const s=(v,n=2000)=>typeof v==="string"?v.trim().slice(0,n):"";
const n=(v)=>v===""||v==null?null:Number(v);

export default async function(req,res){
  if(req.method==="GET"){
    const rows=await db.query("SELECT * FROM farm_daily_records ORDER BY record_date DESC,id DESC LIMIT 1000");
    const totals=await db.query("SELECT COUNT(*)::int AS days_recorded,COALESCE(SUM(eggs_produced),0)::bigint AS eggs_produced,COALESCE(SUM(saleable_eggs),0)::bigint AS saleable_eggs,COALESCE(SUM(rejected_eggs),0)::bigint AS rejected_eggs,COALESCE(SUM(feed_cost_paise),0)::bigint AS feed_cost_paise,COALESCE(SUM(medicine_cost_paise),0)::bigint AS medicine_cost_paise,COALESCE(SUM(labour_energy_cost_paise),0)::bigint AS labour_energy_cost_paise FROM farm_daily_records");
    return res.json({records:rows.rows,totals:totals.rows[0]});
  }
  const b=req.body||{},date=s(b.record_date,20),house=s(b.house_code,100);
  const values=["flock_count","eggs_produced","saleable_eggs","rejected_eggs","feed_used_kg","feed_cost_rupees","medicine_cost_rupees","labour_energy_cost_rupees"].map(k=>n(b[k]));
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return res.status(400).json({error:"Enter a valid record date."});
  for(let i=0;i<4;i++)if(values[i]!==null&&(!Number.isInteger(values[i])||values[i]<0))return res.status(400).json({error:"Bird and egg counts must be non-negative whole numbers."});
  if(values[4]!==null&&(!Number.isFinite(values[4])||values[4]<0))return res.status(400).json({error:"Feed kilograms must be non-negative."});
  for(let i=5;i<8;i++)if(values[i]!==null&&(!Number.isFinite(values[i])||values[i]<0))return res.status(400).json({error:"Costs must be non-negative rupee amounts."});
  const produced=values[1],saleable=values[2],rejected=values[3];
  if(produced!==null&&saleable!==null&&rejected!==null&&saleable+rejected>produced)return res.status(400).json({error:"Saleable plus rejected eggs cannot exceed total eggs produced."});
  const r=await db.query("INSERT INTO farm_daily_records (record_date,house_code,flock_count,eggs_produced,saleable_eggs,rejected_eggs,feed_used_kg,feed_cost_paise,medicine_cost_paise,labour_energy_cost_paise,notes,entered_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *",
  [date,house,values[0],values[1],values[2],values[3],values[4],values[5]===null?null:Math.round(values[5]*100),values[6]===null?null:Math.round(values[6]*100),values[7]===null?null:Math.round(values[7]*100),s(b.notes,3000),req.member?.email||req.member?.handle||"project-admin"]);
  await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,after_data) VALUES ($1,'farm_daily_record_created','farm_daily_record',$2,$3::jsonb)",[req.member?.email||req.member?.handle||"project-admin",String(r.rows[0].id),JSON.stringify(r.rows[0])]);
  return res.status(201).json({record:r.rows[0]});
}