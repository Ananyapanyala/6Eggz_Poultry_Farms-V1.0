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
    if(!r.ok) throw new Error(d.error || (r.status===401||r.status===403 ? "Admin access is required. Sign in with an authorised project administrator." : "Request failed."));
    return d;
  }
  function fmtDate(v) { if(!v)return "—"; try{return new Date(v).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}catch(_){return String(v)} }
  function table(headers, rows) {
    const t=node("table",undefined,"admin-table"), thead=node("thead"), tr=node("tr");
    headers.forEach(h=>tr.append(node("th",h))); thead.append(tr); t.append(thead);
    const tbody=node("tbody"); rows.forEach(cells=>{const r=node("tr");cells.forEach(c=>{const td=node("td");if(c instanceof Node)td.append(c);else td.textContent=String(c??"—");r.append(td)});tbody.append(r)});t.append(tbody);return t;
  }
  function section(sectionName) {
    ["overview","products","enquiries","orders"].forEach(n=>$("#"+n+"Section").classList.toggle("hidden",n!==sectionName));
    document.querySelectorAll("[data-section]").forEach(a=>a.classList.toggle("active",a.dataset.section===sectionName));
    $("#adminTitle").textContent=({overview:"Overview",products:"Products & evidence",enquiries:"Customer enquiries",orders:"Order requests"})[sectionName];
    if(sectionName==="products")loadProducts(); if(sectionName==="enquiries")loadEnquiries(); if(sectionName==="orders")loadOrders();
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
      const save=node("button","Save","btn btn-primary btn-small");save.style.marginTop="7px";save.addEventListener("click",async()=>{save.disabled=true;try{await api("/admin/enquiries",{method:"PATCH",body:JSON.stringify({id:q.id,status:status.value,quote_rupees:quote.value===""?null:Number(quote.value),admin_notes:notes.value})});toast("Enquiry updated");await loadEnquiries()}catch(e){notice(e.message);save.disabled=false}});
      control.append(status,quote,notes,save);
      return [q.enquiry_type,detail,q.product_interest||"—",q.quantity||"—",q.delivery_location||"—",fmtDate(q.created_at),control];
    });
    target.append(table(["Type","Contact & message","Product","Quantity","Location","Received","Follow-up"],rows));
  }
  async function loadEnquiries(){try{const d=await api("/admin/enquiries");enquiries=d.enquiries||[];renderEnquiries()}catch(e){notice(e.message)}}
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
      const save=node("button","Save status","btn btn-primary btn-small");save.addEventListener("click",async()=>{save.disabled=true;try{await api("/admin/orders",{method:"PATCH",body:JSON.stringify({id:o.id,order_status:st.value,payment_status:pay.value})});toast("Order updated");await loadOrders();await loadOverview()}catch(e){notice(e.message);save.disabled=false}});
      control.append(st,pay,save);
      return [String(o.id).slice(0,8),fmtDate(o.created_at),detail,itemDetail,money(Number(o.total_paise)/100),o.payment_status,o.order_status,control];
    });
    target.append(table(["Reference","Received","Customer / delivery","Items","Total","Payment","Order status","Update"],rows));
  }
  async function loadOrders(){try{const d=await api("/admin/orders");orders=d.orders||[];renderOrders()}catch(e){notice(e.message)}}
  async function loadOverview() {
    try { const d=await api("/admin/overview");const p=d.products||{},q=d.enquiries||{};
      $("#metricProducts").textContent=p.total??0;$("#metricStock").textContent=(p.available??0)+" · "+(p.low_stock??0);$("#metricEnquiries").textContent=q.new_count??0;$("#metricRevenue").textContent=money(d.paid_revenue_rupees||0);
      $("#adminNotice").classList.add("hidden");
    } catch(e) { notice(e.message); }
  }
  document.querySelectorAll("[data-section]").forEach(a=>a.addEventListener("click",event=>{event.preventDefault();section(a.dataset.section)}));
  $("#productForm").addEventListener("submit",saveProduct);$("#resetProduct").addEventListener("click",resetProduct);
  $("#refreshBtn").addEventListener("click",async()=>{await loadOverview();const active=document.querySelector("[data-section].active");if(active)section(active.dataset.section);toast("Refresh complete")});
  loadOverview();
})();