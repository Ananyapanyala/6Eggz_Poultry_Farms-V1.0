import { db } from "hatchable";

export const access="public";
export const methods=["GET"];

export default async function(req,res){
  const token=typeof req.params.token==="string"?req.params.token:"";
  if(!/^[0-9a-f-]{36,80}$/i.test(token))return res.status(404).json({error:"Batch verification record not found."});
  const result=await db.query("SELECT b.batch_code,b.production_date,b.packing_date,b.best_before_date,b.farm_or_house,b.quality_inspection_status,b.release_status,b.recall_status,b.storage_guidance,b.public_summary,p.name AS product_name,p.category,p.nutrient_target,p.nutrient_amount,p.nutrient_unit,p.serving_basis,p.lab_name,p.report_date,p.report_reference,p.public_claim,p.evidence_approved,p.research_status FROM egg_batches b LEFT JOIN products p ON p.id=b.product_id WHERE b.qr_token=$1 LIMIT 1",[token]);
  if(!result.rows.length)return res.status(404).json({error:"Batch verification record not found."});
  const b=result.rows[0];
  const safe=b.release_status==="Released"&&b.recall_status==="Clear"&&b.quality_inspection_status==="Passed";
  const verifiedClaim=safe&&b.evidence_approved&&b.research_status==="Verified"?b.public_claim:"";
  const publicReport=safe&&b.report_reference&&b.lab_name?{laboratory:b.lab_name,report_date:b.report_date,report_reference:b.report_reference}:null;
  return res.json({batch:{batch_code:b.batch_code,product_name:b.product_name,production_date:b.production_date,packing_date:b.packing_date,best_before_date:b.best_before_date,farm_or_house:b.farm_or_house,release_status:b.release_status,recall_status:b.recall_status,public_summary:safe?b.public_summary:"",storage_guidance:b.storage_guidance,nutrition_status:verifiedClaim?"Verified information approved for publication":"Verified nutritional results are not available for public display.",approved_nutrition_claim:verifiedClaim,approved_lab_summary:publicReport,notice:!safe?(b.recall_status!=="Clear"?"This batch is on hold or recalled. Do not use this page as evidence of commercial release.":"This batch has not been released for commercial sale."):"Only the approved information shown on this page is published."}});
}