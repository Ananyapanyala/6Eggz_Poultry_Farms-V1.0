import { db } from "hatchable";

export const access="public";
export const methods=["GET"];

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

export default async function(req,res){
  const token=typeof req.params.token==="string"?req.params.token:"";
  if(!/^[0-9a-f-]{36,80}$/i.test(token)){
    res.setHeader("Content-Type","text/html; charset=utf-8");
    return res.status(404).send("<!doctype html><html lang='en'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Batch not found · 6EGGZ</title><link rel='stylesheet' href='/theme.css'><main class='section wrap'><h1 class='serif'>Batch record not found</h1><p>This QR token does not match a 6EGGZ batch record.</p><a class='btn btn-primary' href='/'>Return to 6EGGZ</a></main></html>");
  }
  const {rows}=await db.query("SELECT b.batch_code,b.production_date,b.packing_date,b.best_before_date,b.farm_or_house,b.quality_inspection_status,b.release_status,b.recall_status,b.storage_guidance,b.public_summary,p.name AS product_name,p.nutrient_target,p.nutrient_amount,p.nutrient_unit,p.serving_basis,p.lab_name,p.report_date,p.report_reference,p.public_claim,p.evidence_approved,p.research_status FROM egg_batches b LEFT JOIN products p ON p.id=b.product_id WHERE b.qr_token=$1 LIMIT 1",[token]);
  res.setHeader("Content-Type","text/html; charset=utf-8");
  if(!rows.length)return res.status(404).send("<!doctype html><html lang='en'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Batch not found · 6EGGZ</title><link rel='stylesheet' href='/theme.css'><main class='section wrap'><h1 class='serif'>Batch record not found</h1><p>No batch is registered for this QR token.</p><a class='btn btn-primary' href='/'>Return to 6EGGZ</a></main></html>");
  const b=rows[0], safe=b.release_status==="Released"&&b.recall_status==="Clear"&&b.quality_inspection_status==="Passed";
  const claim=safe&&b.evidence_approved&&b.research_status==="Verified"?b.public_claim:"";
  const heading=safe?"Batch verification":"Batch not cleared for sale";
  const notice=!safe?(b.recall_status!=="Clear"?"This batch is on hold, recalled or withdrawn. Do not use it as evidence of commercial release.":"This batch has not been released for commercial sale."):"This page shows the batch information approved for public display.";
  const facts=[
    ["Batch ID",b.batch_code],
    ["Product",b.product_name||"Not recorded"],
    ["Production date",b.production_date||"Not recorded"],
    ["Packing date",b.packing_date||"Not recorded"],
    ["Best before",b.best_before_date||"Follow the date printed on approved packaging"],
    ["Farm / house",b.farm_or_house||"Not recorded"],
    ["Release status",b.release_status],
    ["Recall status",b.recall_status]
  ];
  const rowsHtml=facts.map(([k,v])=>"<div class='metric'><small>"+esc(k)+"</small><strong style='font-size:1rem;line-height:1.4'>"+esc(v)+"</strong></div>").join("");
  const nutrition=claim?"<section class='admin-panel'><h2>Approved nutrition information</h2><p>"+esc(claim)+"</p><p class='small-muted'>This claim was marked approved for the linked product specification. Review the pack and serving basis above.</p></section>":"<section class='admin-panel'><h2>Nutrition information</h2><p>Nutritional enrichment is under research or verified results are not approved for public display. No nutrient amount is published for this batch.</p></section>";
  const lab=safe&&b.report_reference&&b.lab_name?"<section class='admin-panel'><h2>Approved test reference</h2><p>Laboratory: "+esc(b.lab_name)+"</p><p>Test/report date: "+esc(b.report_date||"Not recorded")+"</p><p>Report reference: "+esc(b.report_reference)+"</p><p class='small-muted'>This concise reference is shown only because the report reference is approved for public use in a released batch.</p></section>":"";
  return res.send("<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><meta name='robots' content='noindex,nofollow'><title>"+esc(heading)+" · 6EGGZ</title><link rel='stylesheet' href='/theme.css'></head><body><header class='site-header'><div class='wrap nav'><a class='brand' href='/'><span class='brand-mark'>6E</span><span>6EGGZ<small>POULTRY FARMS</small></span></a><a class='text-link' href='/'>Main website</a></div></header><main class='section wrap' style='max-width:1000px'><span class='eyebrow'>6EGGZ · QR batch verification</span><h1 class='serif' style='font-size:clamp(2.4rem,5vw,4rem)'>"+esc(heading)+"</h1><p style='color:var(--muted)'>"+esc(notice)+"</p><div class='admin-metrics' style='grid-template-columns:repeat(2,minmax(0,1fr))'>"+rowsHtml+"</div><section class='admin-panel'><h2>Approved batch note</h2><p>"+esc(safe?(b.public_summary||"No additional public batch note has been approved."):notice)+"</p><p><strong>Storage guidance:</strong> "+esc(b.storage_guidance)+"</p></section>"+nutrition+lab+"<p class='small-muted'>This QR page shows public batch fields only. Internal feed formulations, confidential research records, private laboratory documents and customer information are not exposed.</p></main><footer class='site-footer'><div class='wrap footer-bottom'><span>© Dhruva Natural Bio Products Pvt Ltd · 6EGGZ</span><a href='/'>Home</a></div></footer></body></html>");
}