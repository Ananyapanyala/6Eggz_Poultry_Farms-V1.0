(() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const API = (window.__HATCHABLE__ && window.__HATCHABLE__.api) || "/api";
  const money = (v) => new Intl.NumberFormat("en-IN", {style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(v||0));
  let products = [], enquiries = [], orders = [];
  function node(tag, text, cls) { const e=document.createElement(tag); if(text!==undefined)e.textContent=text; if(cls)e.className=cls; return e; }
  function notice(message) { const e=$("#adminNotice"); e.textContent=message; e.classList.remove("hidden"); }
  function toast(message) { const e=$("#adminToast"); e.textContent=message; e.classList.remove("hidden"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>e.classList.add("hidden"),3200); }
  async function api(path, options={}) {
    const r=await fetch(API+path,{...options,headers:{...(options.body?{"Content-Type":"application/json"}:{}),...(options.headers||{})}});
    let d={}; try{d=await r.json()}catch(_){}
    if(!r.ok) throw new Error(d.error || d.message || (r.status===401||r.status===403 ? "Admin access is required. Sign in with an authorised project administrator." : "Request failed."));
    return d;
  }
  function fmtDate(v) { if(!v)return "—"; try{return new Date(v).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}catch(_){return String(v)} }
  function table(headers, rows) {
    const t=node("table",undefined,"admin-table"), thead=node("thead"), tr=node("tr");
    headers.forEach(h=>tr.append(node("th",h))); thead.append(tr); t.append(thead);
    const tbody=node("tbody"); rows.forEach(cells=>{const r=node("tr");cells.forEach(c=>{const td=node("td");if(c instanceof Node)td.append(c);else td.textContent=String(c??"—");r.append(td)});tbody.append(r)});t.append(tbody);return t;
  }
  const sections=["overview","products","enquiries","orders","rnd","labs","batches","farmops","profile"];
  function section(sectionName) {
    sections.forEach(n=>$("#"+n+"Section").classList.toggle("hidden",n!==sectionName));
    document.querySelectorAll("[data-section]").forEach(a=>a.classList.toggle("active",a.dataset.section===sectionName));
    $("#adminTitle").textContent=({overview:"Overview",products:"Products & evidence",enquiries:"Customer enquiries",orders:"Order requests",rnd:"Nutrition R&D",labs:"Laboratory reports",batches:"Egg batches / QR",farmops:"Farm operations",profile:"DPR profile"})[sectionName]||"Operations";
    if(sectionName==="products")loadProducts(); if(sectionName==="enquiries")loadEnquiries(); if(sectionName==="orders")loadOrders();
    if(sectionName==="rnd")loadRnd(); if(sectionName==="labs")loadLabs(); if(sectionName==="batches")loadBatches(); if(sectionName==="farmops")loadFarmOps(); if(sectionName==="profile")loadProfile();
  }
  function renderProductTable() {
    const target=$("#productsTable");target.replaceChildren();
    if(!products.length){target.append(node("p","No products configured yet. Add your first product above."));return}
    const rows=products.map(p=>{
      const edit=node("button","Edit","btn btn-light btn-small");edit.type="button";edit.addEventListener("click",()=>fillProduct(p));
      return [p.name, p.category, p.pack_size||"—", p.price_paise==null?"Not set":money(Number(p.price_paise)/100), String(p.stock_quantity), p.available?"Available":"Unavailable", p.research_status, edit];
    });
    target.append(table(["Product","Category","Pack","Price","Stock","Availability","Evidence status",""],rows));
  }
  async function loadProducts() {
    try{const d=await api("/admin/products");products=d.products||[];renderProductTable()}catch(e){notice(e.message)}
  }
  function fillProduct(p) {
    const f=$("#productForm");Object.entries({
      id:p.id,name:p.name,slug:p.slug,category:p.category,description:p.description,pack_size:p.pack_size,
      price_rupees:p.price_paise==null?"":Number(p.price_paise)/100,stock_quantity:p.stock_quantity,available:String(p.available),
      image_url:p.image_url,research_status:p.research_status,nutrient_target:p.nutrient_target,nutrient_amount:p.nutrient_amount??"",
      nutrient_unit:p.nutrient_unit,serving_basis:p.serving_basis,lab_name:p.lab_name,report_date:p.report_date?String(p.report_date).slice(0,10):"",
      report_reference:p.report_reference,evidence_approved:String(p.evidence_approved),public_claim:p.public_claim,storage_instructions:p.storage_instructions
    }).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v??""});
    $("#productFormTitle").textContent="Edit product";$("#saveProduct").textContent="Update product";f.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function resetProduct() { $("#productForm").reset();$("#productForm").elements.id.value="";$("#productForm").elements.stock_quantity.value="0";$("#productFormTitle").textContent="Add a product";$("#saveProduct").textContent="Save product";$("#productFeedback").textContent=""; }
  async function saveProduct(event) {
    event.preventDefault();const form=event.currentTarget,b=Object.fromEntries(new FormData(form).entries());const id=b.id;delete b.id;
    b.available=b.available==="true";b.evidence_approved=b.evidence_approved==="true";b.stock_quantity=Number(b.stock_quantity);b.price_rupees=b.price_rupees===""?null:Number(b.price_rupees);b.nutrient_amount=b.nutrient_amount===""?null:Number(b.nutrient_amount);
    const button=$("#saveProduct");button.disabled=true;button.textContent="Saving…";
    try{await api(id?"/admin/products/"+encodeURIComponent(id):"/admin/products",{method:id?"PUT":"POST",body:JSON.stringify(b)});$("#productFeedback").textContent="Product saved.";$("#productFeedback").className="form-message success";toast("Product saved");resetProduct();await loadProducts();await loadOverview()}
    catch(e){$("#productFeedback").textContent=e.message;$("#productFeedback").className="form-message error"}
    finally{button.disabled=false;button.textContent=id?"Update product":"Save product"}
  }
  function renderEnquiries() {
    const target=$("#enquiriesTable");target.replaceChildren();
    if(!enquiries.length){target.append(node("p","No enquiries received yet."));return}
    const rows=enquiries.map(q=>{
      const detail=node("div");detail.append(node("strong",q.name));detail.append(node("div",q.email||q.phone||"No contact", "small-muted"));if(q.organisation)detail.append(node("div",q.organisation,"small-muted"));detail.append(node("div",q.message||"","small-muted"));
      const control=node("div");const status=node("select");["new","contacted","quoted","converted","closed","spam"].forEach(s=>{const o=node("option",s);o.value=s;o.selected=q.status===s;status.append(o)});status.setAttribute("aria-label","Enquiry status");
      const quote=node("input");quote.type="number";quote.min="0";quote.step=".01";quote.placeholder="Quote ₹";quote.value=q.quote_paise==null?"":String(Number(q.quote_paise)/100);quote.style.width="100px";quote.style.margin="6px 0";
      const notes=node("textarea");notes.placeholder="Internal notes";notes.value=q.admin_notes||"";notes.rows=2;notes.style.width="160px";notes.style.display="block";
      const save=node("button","Save","btn btn-primary btn-small");save.style.marginTop="7px";save.addEventListener("click",async()=>{save.disabled=true;try{await api("/admin/enquiries",{method:"POST",body:JSON.stringify({action:"review",id:q.id,status:status.value,quote_rupees:quote.value===""?null:Number(quote.value),admin_notes:notes.value})});toast("Enquiry updated");await loadEnquiries()}catch(e){notice(e.message);save.disabled=false}});
      control.append(status,quote,notes,save);
      return [q.enquiry_type,detail,q.product_interest||"—",q.quantity||"—",q.delivery_location||"—",fmtDate(q.created_at),control];
    });
    target.append(table(["Type","Contact & message","Product","Quantity","Location","Received","Follow-up"],rows));
  }
  async function loadEnquiries(){try{const d=await api("/admin/enquiries");enquiries=d.enquiries||[];renderEnquiries()}catch(e){notice(e.message)}}
  async function loadRnd(){
    try{
      const [d,costData]=await Promise.all([api("/admin/rnd"),api("/admin/rnd-costs")]);
      $("#rndProjectsCount").textContent=(d.counts?.projects??(d.projects||[]).length);
      $("#rndLabCount").textContent=d.counts?.lab_reports??"—";$("#rndLabPending").textContent=d.counts?.pending_lab_reviews??"—";
      $("#rndCostTotal").textContent=(costData.costs||[]).length?money((costData.costs||[]).reduce((sum,c)=>sum+Number(c.amount_paise||0),0)/100):"No data";
      const pt=$("#rndProjectsTable");pt.replaceChildren();
      (d.projects||[]).forEach(p=>{
        const card=node("div",undefined,"metric");card.style.marginBottom="12px";
        card.append(node("h3",p.name));card.append(node("p",p.product_concept));
        card.append(node("p","Project code: "+p.project_code+" · Status: "+p.status+" · Commercial release: "+(p.commercial_release_approved?"Approved":"Not approved"),"small-muted"));
        card.append(node("p","Research question: "+p.research_question));
        card.append(node("p","Candidate targets: "+(Array.isArray(p.candidate_nutrients)?p.candidate_nutrients.join(", "):""),"small-muted"));
        card.append(node("p","Baseline: "+(p.baseline_summary||"Not measured yet"),"small-muted"));
        pt.append(card);
      });
      const gt=$("#rndGatesTable");gt.replaceChildren();
      const gateRows=(d.gates||[]).map(g=>[g.id,g.project_name,g.gate_code,g.gate_name,g.status,g.reviewer||"Not assigned",g.reviewed_at?fmtDate(g.reviewed_at):"Not reviewed",g.evidence_summary||""]);
      if(gateRows.length)gt.append(table(["Gate ID","Project","Code","Gate","Status","Reviewer","Reviewed","Pass criteria / evidence note"],gateRows));else gt.append(node("p","No validation gates recorded."));
      $("#gateId").replaceChildren(node("option","Choose a gate"));$("#gateId").options[0].value="";
      (d.gates||[]).forEach(g=>{const op=node("option",String(g.id)+" · "+g.project_code+" · "+g.gate_code+" · "+g.gate_name);op.value=String(g.id);op.dataset.projectId=String(g.project_id);op.dataset.gateCode=g.gate_code;$("#gateId").append(op)});
      $("#gateId").addEventListener("change",()=>{const op=$("#gateId").selectedOptions[0];if(op&&op.dataset.projectId){$("#gateProject").value=op.dataset.projectId;$("#gateCode").value=op.dataset.gateCode}});
      if((d.projects||[]).length) {
        $("#gateProject").innerHTML=(d.projects||[]).map(p=>'<option value="'+p.id+'">'+escapeHTML(p.name)+'</option>').join("");
        $("#rndProjectId").innerHTML=(d.projects||[]).map(p=>'<option value="'+p.id+'">'+escapeHTML(String(p.id)+" · "+p.name)+'</option>').join("");
        $("#mProject").innerHTML=(d.projects||[]).map(p=>'<option value="'+p.id+'">'+escapeHTML(p.name)+'</option>').join("");
        $("#costProject").innerHTML=(d.projects||[]).map(p=>'<option value="'+p.id+'">'+escapeHTML(p.name)+'</option>').join("");
        $("#labProject").innerHTML=(d.projects||[]).map(p=>'<option value="'+p.id+'">'+escapeHTML(p.name)+'</option>').join("");
        $("#batchRnd").innerHTML='<option value="">No R&D link</option>'+(d.projects||[]).map(p=>'<option value="'+p.id+'">'+escapeHTML(p.name)+'</option>').join("");
      }
    }catch(e){notice(e.message)}
  }
  function escapeHTML(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  async function saveGate(event){
    event.preventDefault();const f=event.currentTarget,b=Object.fromEntries(new FormData(f).entries());
    b.project_id=Number(b.project_id);b.gate_id=Number(b.gate_id);b.report_id=b.report_id?Number(b.report_id):null;
    try{await api("/admin/rnd",{method:"POST",body:JSON.stringify(b)});$("#gateFeedback").textContent="Gate review saved.";$("#gateFeedback").className="form-message success";toast("Gate review saved");await loadRnd()}
    catch(e){$("#gateFeedback").textContent=e.message;$("#gateFeedback").className="form-message error"}
  }
  async function saveRndStatus(event){
    event.preventDefault();const f=event.currentTarget,b=Object.fromEntries(new FormData(f).entries());b.id=Number(b.id);
    try{await api("/admin/rnd",{method:"PUT",body:JSON.stringify(b)});$("#rndStatusFeedback").textContent="Research project status saved.";$("#rndStatusFeedback").className="form-message success";toast("Research project updated");await loadRnd()}
    catch(e){$("#rndStatusFeedback").textContent=e.message;$("#rndStatusFeedback").className="form-message error"}
  }
  async function saveMeasurement(event){
    event.preventDefault();const f=event.currentTarget,b=Object.fromEntries(new FormData(f).entries());b.project_id=Number(b.project_id);b.gate_id=b.gate_id?Number(b.gate_id):null;b.source_report_id=b.source_report_id?Number(b.source_report_id):null;b.result_value=b.result_value===""?null:Number(b.result_value);
    try{const d=await api("/admin/rnd-measurements",{method:"POST",body:JSON.stringify(b)});$("#measurementFeedback").textContent="Measurement recorded as unvalidated. ID: "+d.measurement.id;$("#measurementFeedback").className="form-message success";toast("Measurement recorded");f.reset();await loadRnd()}
    catch(e){$("#measurementFeedback").textContent=e.message;$("#measurementFeedback").className="form-message error"}
  }
  async function saveCost(event){
    event.preventDefault();const f=event.currentTarget,b=Object.fromEntries(new FormData(f).entries());b.project_id=Number(b.project_id);b.amount_rupees=Number(b.amount_rupees);
    try{await api("/admin/rnd-costs",{method:"POST",body:JSON.stringify(b)});$("#costFeedback").textContent="Cost record saved.";$("#costFeedback").className="form-message success";toast("R&D cost saved");f.reset();await loadRnd()}
    catch(e){$("#costFeedback").textContent=e.message;$("#costFeedback").className="form-message error"}
  }
  async function renderLabs(){
    const d=await api("/admin/lab-reports"),target=$("#labReportsTable");target.replaceChildren();
    if(!(d.reports||[]).length){target.append(node("p","No laboratory reports have been uploaded yet."));return;}
    const rows=d.reports.map(q=>{
      const detail=node("div");detail.append(node("strong",q.sample_id));detail.append(node("div",q.laboratory_name,"small-muted"));detail.append(node("div",q.result_value==null?(q.result_text||"Result not recorded"):String(q.result_value)+" "+(q.result_unit||""),"small-muted"));
      const idButton=node("button","Review #"+q.id,"btn btn-light btn-small");idButton.addEventListener("click",()=>{$("#lrId").value=q.id;$("#lrReviewer").focus()});
      return [q.id,detail,q.test_parameter,q.test_date||"—",q.test_method||"—",q.accreditation_status,q.review_status,q.report_reference||"—",idButton];
    });
    target.append(table(["ID","Sample / laboratory","Parameter","Date","Method","Scope","Review","Report ref",""],rows));
  }
  async function loadLabs(){try{await renderLabs()}catch(e){notice(e.message)}}
  async function fileDataUrl(file){
    if(!file)return "";
    if(file.size>8*1024*1024)throw new Error("Report file limit is 8 MB.");
    return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error("Could not read selected report file."));reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file)});
  }
  async function saveLab(event){
    event.preventDefault();const f=event.currentTarget,b=Object.fromEntries(new FormData(f).entries());b.project_id=b.project_id?Number(b.project_id):null;b.batch_id=b.batch_id?Number(b.batch_id):null;b.result_value=b.result_value===""?null:Number(b.result_value);
    const file=$("#labFile").files[0];const button=$("button[type=submit]",f);button.disabled=true;button.textContent="Saving report…";
    try{b.file_data_url=await fileDataUrl(file);const d=await api("/admin/lab-reports",{method:"POST",body:JSON.stringify(b)});$("#labFeedback").textContent="Report record created. ID: "+d.report.id+" · Status: Pending Review.";$("#labFeedback").className="form-message success";f.reset();toast("Lab report saved");await loadLabs();await loadRnd()}
    catch(e){$("#labFeedback").textContent=e.message;$("#labFeedback").className="form-message error"}
    finally{button.disabled=false;button.textContent="Save lab report"}
  }
  async function reviewLab(event){
    event.preventDefault();const f=event.currentTarget,b=Object.fromEntries(new FormData(f).entries());b.id=Number(b.id);b.is_public_summary_approved=f.elements.is_public_summary_approved.checked;
    try{await api("/admin/lab-reports",{method:"POST",body:JSON.stringify({action:"review",...b})});$("#labReviewFeedback").textContent="Lab review saved. This is not automatic regulatory or product approval.";$("#labReviewFeedback").className="form-message success";toast("Lab review saved");await loadLabs()}
    catch(e){$("#labReviewFeedback").textContent=e.message;$("#labReviewFeedback").className="form-message error"}
  }
  async function loadBatches(){
    try{const d=await api("/admin/batches"),target=$("#batchesTable");target.replaceChildren();
      if(!(d.batches||[]).length){target.append(node("p","No egg batches recorded yet."));return}
      const rows=d.batches.map(b=>{
        const url=location.origin+"/batch/"+encodeURIComponent(b.qr_token);
        const detail=node("div");detail.append(node("div",b.batch_code));detail.append(node("small",url,"small-muted"));
        const qr=node("img");qr.src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data="+encodeURIComponent(url);qr.alt="QR code for batch "+b.batch_code;qr.width=88;qr.height=88;qr.loading="lazy";
        const open=node("a","Open page","text-link");open.href=url;open.target="_blank";open.rel="noopener";
        const save=node("a","Download QR","text-link");save.href=qr.src;save.target="_blank";save.rel="noopener";save.style.display="block";
        const qrCell=node("div");qrCell.append(qr,open,save);
        return [b.id,detail,b.product_name||"—",b.production_date||"—",String(b.quantity_produced),String(b.saleable_quantity),String(b.rejected_quantity),b.quality_inspection_status,b.release_status,b.recall_status,qrCell];
      });
      target.append(table(["ID","Batch / verification URL","Product","Produced","Total","Saleable","Rejects","QC","Release","Recall","QR code"],rows))
    }catch(e){notice(e.message)}
  }
  async function saveBatch(event){
    event.preventDefault();const f=event.currentTarget,b=Object.fromEntries(new FormData(f).entries());b.product_id=b.product_id||null;b.rnd_project_id=b.rnd_project_id?Number(b.rnd_project_id):null;b.feed_batch_id=b.feed_batch_id?Number(b.feed_batch_id):null;["quantity_produced","saleable_quantity","rejected_quantity"].forEach(k=>b[k]=Number(b[k]||0));
    try{const d=await api("/admin/batches",{method:"POST",body:JSON.stringify(b)});$("#batchFeedback").textContent="Batch created in quarantine. Verification route: "+d.verification_url+" · Token: "+d.batch.qr_token;$("#batchFeedback").className="form-message success";f.reset();toast("Batch created");await loadBatches()}
    catch(e){$("#batchFeedback").textContent=e.message;$("#batchFeedback").className="form-message error"}
  }
  async function saveBatchReview(event){
    event.preventDefault();const f=event.currentTarget,b=Object.fromEntries(new FormData(f).entries());b.id=Number(b.id);
    try{await api("/admin/batches",{method:"POST",body:JSON.stringify({action:"review",...b})});$("#batchReviewFeedback").textContent="Batch status saved.";$("#batchReviewFeedback").className="form-message success";toast("Batch status saved");await loadBatches()}
    catch(e){$("#batchReviewFeedback").textContent=e.message;$("#batchReviewFeedback").className="form-message error"}
  }
  async function loadFarmOps(){
    try{
      const [r,feed]=await Promise.all([api("/admin/farm-records"),api("/admin/feed-batches")]);
      const t=r.totals||{};
      $("#farmDays").textContent=t.days_recorded??0;$("#farmEggs").textContent=Number(t.days_recorded)>0?Number(t.eggs_produced||0).toLocaleString("en-IN"):"No data";$("#farmSaleable").textContent=Number(t.days_recorded)>0?Number(t.saleable_eggs||0).toLocaleString("en-IN"):"No data";$("#farmRejected").textContent=Number(t.days_recorded)>0?Number(t.rejected_eggs||0).toLocaleString("en-IN"):"No data";
      const ft=$("#farmRecordsTable");ft.replaceChildren();
      if(!(r.records||[]).length)ft.append(node("p","No data available. Farm production records have not been entered; DPR projections are not displayed as actual production."));
      else ft.append(table(["Date","House","Flock","Eggs","Saleable","Rejected","Feed kg","Feed cost"],r.records.map(x=>[x.record_date,x.house_code,x.flock_count??"—",x.eggs_produced??"—",x.saleable_eggs??"—",x.rejected_eggs??"—",x.feed_used_kg??"—",x.feed_cost_paise==null?"—":money(Number(x.feed_cost_paise)/100)])));
      const f=$("#feedTable");f.replaceChildren();
      if(!(feed.feed_batches||[]).length)f.append(node("p","No feed batches registered yet."));
      else f.append(table(["ID","Batch code","Feed type","Supplier","Received","QC"],feed.feed_batches.map(x=>[x.id,x.feed_batch_code,x.feed_type,x.supplier_name||"—",x.received_date||"—",x.qc_status])));
    }catch(e){notice(e.message)}
  }
  async function saveFarmRecord(event){
    event.preventDefault();const f=event.currentTarget,b=Object.fromEntries(new FormData(f).entries());
    try{await api("/admin/farm-records",{method:"POST",body:JSON.stringify(b)});$("#farmFeedback").textContent="Daily record saved.";$("#farmFeedback").className="form-message success";toast("Farm record saved");await loadFarmOps();await loadProfile()}
    catch(e){$("#farmFeedback").textContent=e.message;$("#farmFeedback").className="form-message error"}
  }
  async function saveFeedBatch(event){
    event.preventDefault();const f=event.currentTarget,b=Object.fromEntries(new FormData(f).entries());
    try{await api("/admin/feed-batches",{method:"POST",body:JSON.stringify(b)});$("#feedFeedback").textContent="Feed batch registered.";$("#feedFeedback").className="form-message success";toast("Feed batch saved");f.reset();await loadFarmOps()}
    catch(e){$("#feedFeedback").textContent=e.message;$("#feedFeedback").className="form-message error"}
  }
  async function loadProfile(){
    try{
      const [p,m]=await Promise.all([api("/admin/business-profile"),api("/operations-metrics")]);
      const target=$("#profileDetails");target.replaceChildren();
      if(!p.profile){target.append(node("p","No DPR profile available."))}
      else{
        const x=p.profile;
        const details=[
          ["Legal entity",x.legal_name],["Brand",x.brand_name],["CIN",x.cin],["Registered office",x.registered_office],
          ["Farm",x.farm_name],["Site",x.farm_address],["Survey",x.survey_numbers],["Land extent",x.farm_land_extent],
          ["Land status",x.land_status],["Proposed capacity",Number(x.bird_capacity).toLocaleString("en-IN")+" commercial layers"],["Bird type",x.bird_type],
          ["Housing",x.housing_system],["Water",x.water_source],["Power",x.power_source],["Report",x.year_of_report],
          ["Project cost (DPR)",money(Number(x.project_cost_paise)/100)],["Proposed term loan",money(Number(x.term_loan_paise)/100)],
          ["Promoter contribution",money(Number(x.promoter_contribution_paise)/100)],["Cash-credit limit",money(Number(x.cash_credit_limit_paise)/100)],["Status",x.project_status],["Notes",x.notes]
        ];
        target.append(table(["Field","DPR-derived value"],details));
      }
      const s=$("#operationsSummary");s.replaceChildren();
      const fm=m.farm||{}, inv=m.inventory||{},rnd=m.rnd||{},lab=m.laboratory||{},batch=m.batches||{},ord=m.orders||{};
      s.append(table(["Metric","Recorded value / state"],[
        ["Daily farm records",Number(fm.days_recorded)>0?fm.days_recorded:"No data available"],
        ["Eggs produced",Number(fm.days_recorded)>0?Number(fm.eggs_produced).toLocaleString("en-IN"):"No data available"],
        ["Saleable eggs",Number(fm.days_recorded)>0?Number(fm.saleable_eggs).toLocaleString("en-IN"):"No data available"],
        ["Rejected eggs",Number(fm.days_recorded)>0?Number(fm.rejected_eggs).toLocaleString("en-IN"):"No data available"],
        ["Recorded farm feed costs",Number(fm.days_recorded)>0?money(Number(fm.feed_cost_paise)/100):"No data available"],
        ["Product SKUs / saleable SKUs",String(inv.products??0)+" / "+String(inv.saleable_skus??0)],
        ["Orders / delivered / outstanding",String(ord.total??0)+" / "+String(ord.delivered??0)+" / "+String(ord.outstanding??0)],
        ["Recorded paid order revenue",money(m.paid_revenue_rupees||0)],
        ["R&D projects / released projects",String(rnd.projects??0)+" / "+String(rnd.approved_projects??0)],
        ["R&D costs recorded",Number(rnd.cost_entries)>0?money(rnd.total_recorded_rnd_cost_rupees):"No data available"],
        ["Lab reports / pending review",String(lab.reports??0)+" / "+String(lab.pending??0)],
        ["Egg batches / released / held or recalled",String(batch.batches??0)+" / "+String(batch.released??0)+" / "+String(batch.held_or_recalled??0)]
      ]));
    }catch(e){notice(e.message)}
  }
  function renderOrders() {
    const target=$("#ordersTable");target.replaceChildren();
    if(!orders.length){target.append(node("p","No order requests received yet."));return}
    const rows=orders.map(o=>{
      const detail=node("div");detail.append(node("strong",o.customer_name));detail.append(node("div",o.customer_phone||o.customer_email||"No contact","small-muted"));detail.append(node("div",[o.address_line,o.city,o.state,o.pin_code].filter(Boolean).join(", "),"small-muted"));
      const itemDetail=node("div");
      (Array.isArray(o.items)?o.items:[]).forEach(i=>itemDetail.append(node("div",(i.name||"Product")+" × "+i.quantity+" · "+money(Number(i.line_total_paise)/100))));
      const control=node("div");const st=node("select");[["pending_confirmation","Pending confirmation"],["confirmed","Confirmed"],["packing","Packing"],["out_for_delivery","Out for delivery"],["delivered","Delivered"],["cancelled","Cancelled"]].forEach(([v,l])=>{const op=node("option",l);op.value=v;op.selected=o.order_status===v;st.append(op)});
      const pay=node("select");[["not_configured","Payment not configured"],["awaiting_payment","Awaiting payment"],["paid","Paid (verified)"],["failed","Failed"],["refunded","Refunded"]].forEach(([v,l])=>{const op=node("option",l);op.value=v;op.selected=o.payment_status===v;pay.append(op)});
      st.style.display="block";st.style.marginBottom="7px";pay.style.display="block";pay.style.marginBottom="7px";st.setAttribute("aria-label","Order status");pay.setAttribute("aria-label","Payment status");
      const save=node("button","Save status","btn btn-primary btn-small");save.addEventListener("click",async()=>{save.disabled=true;try{await api("/admin/orders",{method:"POST",body:JSON.stringify({id:o.id,order_status:st.value,payment_status:pay.value})});toast("Order updated");await loadOrders();await loadOverview()}catch(e){notice(e.message);save.disabled=false}});
      control.append(st,pay,save);
      return [String(o.id).slice(0,8),fmtDate(o.created_at),detail,itemDetail,money(Number(o.total_paise)/100),o.payment_status,o.order_status,control];
    });
    target.append(table(["Reference","Received","Customer / delivery","Items","Total","Payment","Order status","Update"],rows));
  }
  async function loadOrders(){try{const d=await api("/admin/orders");orders=d.orders||[];renderOrders()}catch(e){notice(e.message)}}
  async function loadOverview() {
    try { const d=await api("/admin/overview");const p=d.products||{},q=d.enquiries||{};
      $("#metricProducts").textContent=p.total??0;
      $("#metricStock").textContent=(p.available??0)+" saleable · "+(p.low_stock??0)+" low-stock";
      $("#metricEnquiries").textContent=q.new_count??0;
      $("#metricRevenue").textContent=money(d.paid_revenue_rupees||0);
      $("#adminNotice").classList.add("hidden");
      try {
      const op=await api("/operations-metrics");
      $("#metricProducts").textContent=op.inventory?.products??0;
      $("#metricStock").textContent=(op.inventory?.saleable_skus??0)+" saleable · "+String(op.inventory?.packs_on_hand??0)+" packs";
      if(op.farm?.data_status==="No data available") notice("No farm production records have been entered yet. Production figures are intentionally shown as unavailable rather than copied from DPR projections.");
    } catch (_) {}
    } catch(e) { notice(e.message); }
  }
  document.querySelectorAll("[data-section]").forEach(a=>a.addEventListener("click",event=>{event.preventDefault();section(a.dataset.section)}));
  $("#productForm").addEventListener("submit",saveProduct);$("#resetProduct").addEventListener("click",resetProduct);
  $("#gateForm").addEventListener("submit",saveGate);$("#rndStatusForm").addEventListener("submit",saveRndStatus);
  $("#measurementForm").addEventListener("submit",saveMeasurement);$("#costForm").addEventListener("submit",saveCost);
  $("#labForm").addEventListener("submit",saveLab);$("#labReviewForm").addEventListener("submit",reviewLab);
  $("#batchForm").addEventListener("submit",saveBatch);$("#batchReviewForm").addEventListener("submit",saveBatchReview);
  $("#farmRecordForm").addEventListener("submit",saveFarmRecord);$("#feedForm").addEventListener("submit",saveFeedBatch);
  $("#refreshBtn").addEventListener("click",async()=>{await loadOverview();const active=document.querySelector("[data-section].active");if(active)section(active.dataset.section);toast("Refresh complete")});
  loadOverview();
})();