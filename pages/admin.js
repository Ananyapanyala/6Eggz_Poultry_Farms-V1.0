export const access = "admin";
export const methods = ["GET"];

export default async function (req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>6EGGZ Admin</title><link rel="stylesheet" href="/theme.css"></head>
<body class="admin-body">
<div class="admin-layout">
  <aside class="admin-sidebar"><a class="brand" href="/"><span class="brand-mark">6E</span><span>6EGGZ<small>ADMIN CONSOLE</small></span></a><h2 class="serif">Operations</h2><p>Private product, enquiry and order management.</p><nav><a class="active" href="#overview" data-section="overview">Overview</a><a href="#products" data-section="products">Products &amp; evidence</a><a href="#enquiries" data-section="enquiries">Customer enquiries</a><a href="#orders" data-section="orders">Order requests</a></nav><p style="margin-top:25px;font-size:.75rem">Access is restricted to authorised Hatchable project administrators.</p><a href="/">← View public site</a></aside>
  <main class="admin-main">
    <div class="admin-top"><div><p class="eyebrow">6EGGZ / OPERATIONS</p><h1 class="serif" id="adminTitle">Overview</h1><p class="small-muted">Real records from your project database. No demo metrics are mixed in.</p></div><button class="btn btn-light btn-small" id="refreshBtn">↻ Refresh data</button></div>
    <div id="adminNotice" class="notice hidden" role="status"></div>
    <section id="overviewSection"><div class="admin-metrics"><div class="metric"><small>Configured products</small><strong id="metricProducts">—</strong></div><div class="metric"><small>Available · low stock</small><strong id="metricStock">—</strong></div><div class="metric"><small>New enquiries</small><strong id="metricEnquiries">—</strong></div><div class="metric"><small>Paid revenue (recorded)</small><strong id="metricRevenue">—</strong></div></div><div class="admin-panel"><h2>Launch readiness checklist</h2><p class="small-muted">Before opening to customers, add genuine products, pack sizes, correct prices and stock; verify contact details; test delivery coverage; and configure a real payment provider before accepting online payments.</p><p class="small-muted">Nutrition-enriched products must stay unavailable until supporting laboratory evidence and applicable compliance review are completed and approved.</p></div></section>
    <section id="productsSection" class="hidden">
      <div class="admin-panel"><h2 id="productFormTitle">Add a product</h2><p class="small-muted">Products begin unavailable. Setting evidence approved is an internal workflow toggle, not proof by itself—only use it after real evidence and compliance review.</p>
        <form id="productForm"><input type="hidden" name="id">
          <div class="admin-form-grid">
            <div class="field"><label for="pName">Product name *</label><input id="pName" name="name" required maxlength="160"></div>
            <div class="field"><label for="pSlug">URL slug *</label><input id="pSlug" name="slug" required maxlength="180" placeholder="fresh-eggs-6-pack"></div>
            <div class="field"><label for="pCategory">Category *</label><select id="pCategory" name="category"><option>Everyday Eggs</option><option>Nutrition Eggs</option><option>Plant-Based Nutrition</option></select></div>
            <div class="field"><label for="pPack">Pack size</label><input id="pPack" name="pack_size" maxlength="100" placeholder="e.g. 6 eggs"></div>
            <div class="field"><label for="pPrice">Price (₹)</label><input id="pPrice" name="price_rupees" type="number" min="0" step=".01"></div>
            <div class="field"><label for="pStock">Stock quantity (packs)</label><input id="pStock" name="stock_quantity" type="number" min="0" step="1" value="0"></div>
            <div class="field"><label for="pAvailable">Availability</label><select id="pAvailable" name="available"><option value="false">Unavailable</option><option value="true">Available</option></select></div>
            <div class="field"><label for="pStatus">Evidence / product status</label><select id="pStatus" name="research_status"><option>Proposed</option><option>Under Testing</option><option>Verified</option><option>Discontinued</option></select></div>
            <div class="field"><label for="pImage">Product image URL</label><input id="pImage" name="image_url" type="url" maxlength="1000"></div>
            <div class="field"><label for="pStorage">Storage instructions</label><input id="pStorage" name="storage_instructions" maxlength="1000"></div>
            <div class="field"><label for="pNutrient">Target nutrient / feature</label><input id="pNutrient" name="nutrient_target" maxlength="160"></div>
            <div class="field"><label for="pAmount">Lab-measured amount</label><input id="pAmount" name="nutrient_amount" type="number" min="0" step="any"></div>
            <div class="field"><label for="pUnit">Nutrient unit</label><input id="pUnit" name="nutrient_unit" maxlength="40" placeholder="e.g. mg"></div>
            <div class="field"><label for="pBasis">Serving / measurement basis</label><input id="pBasis" name="serving_basis" maxlength="120" placeholder="e.g. per 100 g edible portion"></div>
            <div class="field"><label for="pLab">Laboratory name</label><input id="pLab" name="lab_name" maxlength="200"></div>
            <div class="field"><label for="pDate">Lab report date</label><input id="pDate" name="report_date" type="date"></div>
            <div class="field"><label for="pReport">Report reference</label><input id="pReport" name="report_reference" maxlength="160"></div>
            <div class="field"><label for="pApproved">Evidence approved for public display</label><select id="pApproved" name="evidence_approved"><option value="false">No</option><option value="true">Yes — reviewed</option></select></div>
          </div>
          <div class="field"><label for="pDescription">Description</label><textarea id="pDescription" name="description" maxlength="2000"></textarea></div>
          <div class="field"><label for="pClaim">Approved public nutrition claim (only after review)</label><textarea id="pClaim" name="public_claim" maxlength="1000"></textarea></div>
          <button class="btn btn-primary btn-small" type="submit" id="saveProduct">Save product</button> <button class="btn btn-light btn-small" type="button" id="resetProduct">Clear form</button><p class="form-message" id="productFeedback" role="status"></p>
        </form>
      </div>
      <div class="admin-panel"><h2>Product catalogue</h2><div id="productsTable" class="small-muted">Loading products…</div></div>
    </section>
    <section id="enquiriesSection" class="hidden"><div class="admin-panel"><h2>Customer &amp; business enquiries</h2><div id="enquiriesTable" class="small-muted">Loading enquiries…</div></div></section>
    <section id="ordersSection" class="hidden"><div class="admin-panel"><h2>Order requests</h2><p class="small-muted">Only mark a payment as paid after checking the payment provider independently. The current platform has not been connected to a live payment gateway.</p><div id="ordersTable" class="small-muted">Loading orders…</div></div></section>
  </main>
</div>
<div id="adminToast" class="toast hidden" role="status"></div><script src="/admin.js" defer></script></body></html>`);
}