(() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const API = (window.__HATCHABLE__ && window.__HATCHABLE__.api) || "/api";
  const money = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n || 0));
  let products = [];
  let currentFilter = "all";
  let cart = readCart();

  function readCart() {
    try { const raw = localStorage.getItem("6eggz_cart"); return raw ? JSON.parse(raw) : {}; } catch (_) { return {}; }
  }
  function saveCart() {
    try { localStorage.setItem("6eggz_cart", JSON.stringify(cart)); } catch (_) {}
    renderCartCount();
  }
  function renderCartCount() {
    const count = Object.values(cart).reduce((sum, n) => sum + Number(n || 0), 0);
    $("#cartCount").textContent = String(count);
  }
  function showToast(message) {
    const el = $("#toast"); el.textContent = message; el.classList.remove("hidden");
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.classList.add("hidden"), 3600);
  }
  async function jsonFetch(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) } });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  }
  function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function renderProducts() {
    const grid = $("#productGrid"); grid.replaceChildren();
    const filtered = products.filter((p) => {
      if (currentFilter === "all") return true;
      if (currentFilter === "Everyday Eggs") return String(p.category).toLowerCase().includes("everyday");
      return String(p.category).toLowerCase().includes("nutrition") || String(p.category).toLowerCase().includes("enriched");
    });
    if (!filtered.length) {
      const empty = make("div", "empty-catalog");
      empty.append(make("div", "egg", "🥚"));
      empty.append(make("h3", "", currentFilter === "all" ? "Our product catalogue is being prepared" : "No products in this category yet"));
      empty.append(make("p", "", currentFilter === "all" ? "Our team is configuring pack sizes, pricing and availability. Send a supply enquiry while we prepare the catalogue." : "Products will appear here when the team has configured their details and status."));
      const link = make("a", "btn btn-primary btn-small", "Enquire about supply"); link.href = "#bulk"; empty.append(link); grid.append(empty); return;
    }
    filtered.forEach((p) => {
      const card = make("article", "product-card");
      const imageWrap = make("div", "product-image");
      if (p.image_url) {
        const image = make("img"); image.src = p.image_url; image.alt = p.name; image.loading = "lazy"; image.onerror = () => { imageWrap.replaceChildren(make("div", "product-placeholder", "🥚")); }; imageWrap.append(image);
      } else imageWrap.append(make("div", "product-placeholder", "🥚"));
      const isResearch = String(p.id).startsWith("rnd-") || p.category.toLowerCase().includes("nutrition") || String(p.research_status).toLowerCase().includes("research");
      const badgeText = isResearch ? "Research concept · Not for sale" :
        (p.research_status === "Verified" && p.evidence_approved ? "Evidence reviewed" : (p.available && p.stock_quantity > 0 ? "Available" : "Enquire for availability"));
      imageWrap.append(make("span", "product-badge", badgeText));
      card.append(imageWrap);
      const body = make("div", "product-content");
      body.append(make("h3", "", p.name));
      body.append(make("p", "", p.description || "Product details will be updated by the 6EGGZ team."));
      if (p.public_nutrition_claim) body.append(make("p", "verified-claim", p.public_nutrition_claim));
      const foot = make("div", "product-foot");
      const priceBox = make("div", "price");
      priceBox.textContent = p.price_rupees == null ? "Price on request" : money(p.price_rupees);
      priceBox.append(make("small", "", p.pack_size || "Pack size to be confirmed"));
      foot.append(priceBox);
      const purchasable = Boolean(!isResearch && p.available && Number(p.stock_quantity) > 0 && p.price_paise != null && p.research_status !== "Discontinued");
      const add = make("button", "btn btn-primary btn-small", purchasable ? "Add to cart +" : "Enquire");
      if (purchasable) add.addEventListener("click", () => addToCart(p.id));
      else add.addEventListener("click", () => {
        $("#bulkType").value = "bulk";
        $("#bulkMessage").value = "I'm interested in " + p.name + ". Please share availability and pricing.";
        $("#bulk").scrollIntoView({ behavior: "smooth" });
      });
      foot.append(add); body.append(foot); card.append(body); grid.append(card);
    });
  }
  function addToCart(id) {
    const p = products.find((item) => item.id === id);
    if (!p || !p.available || p.price_paise == null || p.stock_quantity < 1) return showToast("This item is not currently available.");
    cart[id] = Math.min(100, (Number(cart[id]) || 0) + 1); saveCart(); renderCart(); openCart(); showToast("Added to your cart");
  }
  function changeQuantity(id, delta) {
    const p = products.find((item) => item.id === id);
    const next = (Number(cart[id]) || 0) + delta;
    if (!p || next <= 0) delete cart[id];
    else cart[id] = Math.min(100, Math.min(next, Math.max(1, Number(p.stock_quantity) || 1)));
    saveCart(); renderCart();
  }
  function cartRows() {
    return Object.entries(cart).map(([id, quantity]) => ({ p: products.find((x) => x.id === id), quantity: Number(quantity) })).filter((x) => x.p && x.quantity > 0);
  }
  function renderCart() {
    const lines = $("#cartLines"), summary = $("#cartSummary"); lines.replaceChildren();
    const rows = cartRows();
    if (!rows.length) {
      lines.append(make("div", "cart-empty", "Your cart is empty. Add an available item from the catalogue to get started."));
      summary.classList.add("hidden"); return;
    }
    summary.classList.remove("hidden");
    let total = 0;
    rows.forEach(({ p, quantity }) => {
      const line = make("div", "cart-line");
      const details = make("div");
      details.append(make("strong", "", p.name));
      details.append(make("small", "", (p.pack_size || "Pack") + " · " + money(p.price_rupees) + " each"));
      const controls = make("div", "qty-controls");
      const minus = make("button", "", "−"); minus.type = "button"; minus.setAttribute("aria-label", "Remove one " + p.name); minus.addEventListener("click", () => changeQuantity(p.id, -1));
      controls.append(minus, make("span", "", String(quantity)));
      const plus = make("button", "", "+"); plus.type = "button"; plus.setAttribute("aria-label", "Add one " + p.name); plus.addEventListener("click", () => changeQuantity(p.id, 1));
      controls.append(plus); details.append(controls);
      const lineTotal = Number(p.price_rupees || 0) * quantity; total += lineTotal;
      line.append(details, make("strong", "", money(lineTotal))); lines.append(line);
    });
    $("#cartTotal").textContent = money(total);
  }
  function openCart() { $("#cartOverlay").classList.add("open"); $("#cartOverlay").setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; $("#closeCart").focus(); }
  function closeCart() { $("#cartOverlay").classList.remove("open"); $("#cartOverlay").setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; $("#openCart").focus(); }
  function setFeedback(selector, message, kind) { const el = $(selector); el.textContent = message; el.className = "form-message" + (kind ? " " + kind : ""); }
  async function submitEnquiry(form, feedbackSelector) {
    const button = $("button[type=submit]", form);
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.email && !data.phone) return setFeedback(feedbackSelector, "Please provide an email address or phone number.", "error");
    button.disabled = true; button.textContent = "Sending…"; setFeedback(feedbackSelector, "", "");
    try {
      const result = await jsonFetch(API + "/enquiries", { method: "POST", body: JSON.stringify(data) });
      form.reset(); setFeedback(feedbackSelector, result.message + " Reference: " + result.enquiry_id, "success");
    } catch (error) { setFeedback(feedbackSelector, error.message, "error"); }
    finally { button.disabled = false; button.textContent = feedbackSelector === "#bulkFeedback" ? "Send supply enquiry ↗" : "Send message ↗"; }
  }
  async function submitOrder(event) {
    event.preventDefault();
    const form = event.currentTarget, button = $("#submitOrder");
    const rows = cartRows();
    if (!rows.length) return setFeedback("#orderFeedback", "Your cart is empty.", "error");
    const data = Object.fromEntries(new FormData(form).entries());
    data.items = rows.map(({ p, quantity }) => ({ product_id: p.id, quantity }));
    button.disabled = true; button.textContent = "Submitting…"; setFeedback("#orderFeedback", "", "");
    try {
      const result = await jsonFetch(API + "/orders", { method: "POST", body: JSON.stringify(data) });
      cart = {}; saveCart(); renderCart(); form.reset();
      setFeedback("#orderFeedback", result.message + " Reference: " + result.order_id, "success");
      showToast("Order request recorded");
      loadProducts();
    } catch (error) { setFeedback("#orderFeedback", error.message, "error"); }
    finally { button.disabled = false; button.textContent = "Request order confirmation ↗"; }
  }
  async function loadProducts() {
    const grid = $("#productGrid");
    try {
      const result = await jsonFetch(API + "/products");
      products = Array.isArray(result.products) ? result.products : [];
      renderProducts(); renderCartCount(); renderCart();
    } catch (_) {
      grid.replaceChildren();
      const el = make("div", "empty-catalog"); el.append(make("div", "egg", "🥚")); el.append(make("h3", "", "Catalogue temporarily unavailable")); el.append(make("p", "", "Please try again shortly, or contact us using the enquiry form."));
      const button = make("button", "btn btn-light btn-small", "Retry"); button.addEventListener("click", loadProducts); el.append(button); grid.append(el);
    }
  }

  $("#menuToggle").addEventListener("click", () => {
    const nav = $("#navLinks"), open = nav.classList.toggle("open"); $("#menuToggle").setAttribute("aria-expanded", String(open));
  });
  $("#navLinks").querySelectorAll("a").forEach((a) => a.addEventListener("click", () => { $("#navLinks").classList.remove("open"); $("#menuToggle").setAttribute("aria-expanded", "false"); }));
  $("#openCart").addEventListener("click", openCart); $("#closeCart").addEventListener("click", closeCart);
  $("#cartOverlay").addEventListener("click", (event) => { if (event.target === $("#cartOverlay")) closeCart(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && $("#cartOverlay").classList.contains("open")) closeCart(); });
  document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach((b) => b.classList.toggle("active", b === button));
    currentFilter = button.dataset.filter; renderProducts();
  }));
  $("#bulkForm").addEventListener("submit", (event) => { event.preventDefault(); submitEnquiry(event.currentTarget, "#bulkFeedback"); });
  $("#contactForm").addEventListener("submit", (event) => { event.preventDefault(); submitEnquiry(event.currentTarget, "#contactFeedback"); });
  $("#orderForm").addEventListener("submit", submitOrder);
  $("#year").textContent = String(new Date().getFullYear());
  renderCartCount(); renderCart(); loadProducts();
})();