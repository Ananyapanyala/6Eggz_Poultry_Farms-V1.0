import { db, storage } from "hatchable";
import crypto from "node:crypto";

export const access = "admin";
export const methods = ["GET", "POST"];

const s = (v,n=500) => typeof v==="string" ? v.trim().slice(0,n) : "";
const types = new Set(["application/pdf","image/png","image/jpeg","image/webp"]);
const extFor = {"application/pdf":"pdf","image/png":"png","image/jpeg":"jpg","image/webp":"webp"};

export default async function (req,res) {
  if(req.method==="GET"){
    const r=await db.query("SELECT id,project_id,batch_id,sample_id,test_parameter,result_value,result_text,result_unit,test_method,test_date,laboratory_name,accreditation_status,accreditation_scope_notes,report_reference,reviewer,review_status,decision_notes,is_public_summary_approved,created_at FROM lab_reports ORDER BY created_at DESC LIMIT 500");
    return res.json({reports:r.rows});
  }
  const b=req.body||{};
  if(req.method==="POST" && b.action === "review"){
    const id=Number(b.id), status=s(b.review_status,50);
    const allowed=["Pending Review","Reviewed","Accepted for Internal Use","Rejected","Inconclusive"];
    if(!Number.isInteger(id)||!allowed.includes(status)||!s(b.reviewer,200)||!s(b.decision_notes,200)) return res.status(400).json({error:"Provide report ID, valid review status, reviewer and decision notes."});
    const prior=await db.query("SELECT * FROM lab_reports WHERE id=$1",[id]);
    if(!prior.rows.length)return res.status(404).json({error:"Lab report not found."});
    const approval=status==="Accepted for Internal Use"&&b.is_public_summary_approved===true;
    const r=await db.query("UPDATE lab_reports SET accreditation_status=$2,accreditation_scope_notes=$3,reviewer=$4,review_status=$5,decision_notes=$6,is_public_summary_approved=$7,updated_at=NOW() WHERE id=$1 RETURNING id,project_id,sample_id,test_parameter,laboratory_name,accreditation_status,reviewer,review_status,decision_notes,is_public_summary_approved",
    [id,s(b.accreditation_status,80),s(b.accreditation_scope_notes,2000),s(b.reviewer,200),status,s(b.decision_notes,3000),approval]);
    await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,before_data,after_data,notes) VALUES ($1,'lab_report_reviewed','lab_report',$2,$3::jsonb,$4::jsonb,'Review is an internal record, not automatic regulatory approval.')",[req.member?.email||req.member?.handle||"project-admin",String(id),JSON.stringify(prior.rows[0]),JSON.stringify(r.rows[0])]);
    return res.json({report:r.rows[0]});
  }
  if(req.method==="POST" && !b.action){
    const sample=s(b.sample_id,120), parameter=s(b.test_parameter,200), lab=s(b.laboratory_name,240);
    if(!sample||!parameter||!lab) return res.status(400).json({error:"Sample ID, test parameter and laboratory name are required."});
    let key="";
    const dataUrl=typeof b.file_data_url==="string"?b.file_data_url:"";
    if(dataUrl){
      const match=dataUrl.match(/^data:(application\/pdf|image\/png|image\/jpeg|image\/webp);base64,([A-Za-z0-9+/=]+)$/);
      if(!match) return res.status(415).json({error:"Upload a PDF, PNG, JPEG or WebP report."});
      const mime=match[1], bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
      if(bytes.length>8*1024*1024) return res.status(413).json({error:"Report file limit is 8 MB."});
      const isValid = mime==="application/pdf" ? String.fromCharCode(...bytes.slice(0,5))==="%PDF-" :
        mime==="image/png" ? Array.from(bytes.slice(0,8)).join(",")==="137,80,78,71,13,10,26,10" :
        mime==="image/jpeg" ? bytes[0]===255&&bytes[1]===216&&bytes[bytes.length-2]===255&&bytes[bytes.length-1]===217 :
        String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP";
      if(!isValid) return res.status(415).json({error:"The file bytes do not match the selected report format."});
      key="private-lab-reports/"+crypto.randomUUID()+"."+extFor[mime];
      await storage.put(key,bytes,mime);
    }
    const r=await db.query("INSERT INTO lab_reports (project_id,batch_id,sample_id,test_parameter,result_value,result_text,result_unit,test_method,test_date,laboratory_name,accreditation_status,accreditation_scope_notes,report_storage_key,report_reference,review_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Pending Review') RETURNING id,project_id,sample_id,test_parameter,laboratory_name,report_reference,review_status,created_at",
    [b.project_id?Number(b.project_id):null,b.batch_id?Number(b.batch_id):null,sample,parameter,b.result_value===""||b.result_value==null?null:Number(b.result_value),s(b.result_text,1000),s(b.result_unit,80),s(b.test_method,300),b.test_date||null,lab,s(b.accreditation_status,80)||"Not Reviewed",s(b.accreditation_scope_notes,2000),key,s(b.report_reference,200)]);
    await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,after_data,notes) VALUES ($1,'lab_report_created','lab_report',$2,$3::jsonb,'Report uploaded by authorized administrator; pending reviewer assessment.')",[req.member?.email||req.member?.handle||"project-admin",String(r.rows[0].id),JSON.stringify(r.rows[0])]);
    return res.status(201).json({report:r.rows[0],file_uploaded:Boolean(key)});
  }
  const id=Number(b.id), status=s(b.review_status,50);
  const allowed=["Pending Review","Reviewed","Accepted for Internal Use","Rejected","Inconclusive"];
  if(!Number.isInteger(id)||!allowed.includes(status)||!s(b.reviewer,200)||!s(b.decision_notes,200)) return res.status(400).json({error:"Provide report ID, valid review status, reviewer and decision notes."});
  const prior=await db.query("SELECT * FROM lab_reports WHERE id=$1",[id]);
  if(!prior.rows.length)return res.status(404).json({error:"Lab report not found."});
  const approval=status==="Accepted for Internal Use"&&b.is_public_summary_approved===true;
  const r=await db.query("UPDATE lab_reports SET accreditation_status=$2,accreditation_scope_notes=$3,reviewer=$4,review_status=$5,decision_notes=$6,is_public_summary_approved=$7,updated_at=NOW() WHERE id=$1 RETURNING id,project_id,sample_id,test_parameter,laboratory_name,accreditation_status,reviewer,review_status,decision_notes,is_public_summary_approved",
  [id,s(b.accreditation_status,80),s(b.accreditation_scope_notes,2000),s(b.reviewer,200),status,s(b.decision_notes,3000),approval]);
  await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,before_data,after_data,notes) VALUES ($1,'lab_report_reviewed','lab_report',$2,$3::jsonb,$4::jsonb,'Review is an internal record, not automatic regulatory approval.')",[req.member?.email||req.member?.handle||"project-admin",String(id),JSON.stringify(prior.rows[0]),JSON.stringify(r.rows[0])]);
  return res.json({report:r.rows[0]});
}