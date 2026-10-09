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
    const countEl = $("#cartCount");
    if (countEl) countEl.textContent = String(count);
  }
  function showToast(message) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message; el.classList.remove("hidden");
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
      const isEgg = String(p.category).toLowerCase().includes("everyday") || String(p.category).toLowerCase().includes("egg");
      const isResearch = String(p.category).toLowerCase().includes("nutrition") || String(p.category).toLowerCase().includes("enriched") || String(p.research_status).toLowerCase().includes("research");
      if (currentFilter === "all") return isEgg && !isResearch;
      if (currentFilter === "Everyday Eggs") return isEgg && !isResearch;
      return isResearch;
    });
    if (!filtered.length) {
      const empty = make("div", "empty-catalog");
      empty.append(make("div", "egg", "🥚"));
      empty.append(make("h3", "", currentFilter === "Nutrition Eggs" ? "Research concepts are not for sale" : "6EGGZ table eggs"));
      empty.append(make("p", "", currentFilter === "Nutrition Eggs" ? "Growing Years and GlucoBalance are research concepts only. No verified nutrient results or commercial release approval are available yet." : "The core egg product is listed, but confirmed pack size, current price and sellable stock have not been provided. Contact the team for actual supply details."));
      const link = make("a", "btn btn-primary btn-small", currentFilter === "Nutrition Eggs" ? "View research status" : "Enquire about table eggs");
      link.href = currentFilter === "Nutrition Eggs" ? "#nutrition" : "#bulk"; empty.append(link); grid.append(empty); return;
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
      priceBox.textContent = p.price_rupees == null ? "Price on enquiry" : money(p.price_rupees);
      priceBox.append(make("small", "", p.pack_size || "Pack size to be confirmed"));
      foot.append(priceBox);
      const add = make("a", "btn btn-primary btn-small", isResearch ? "View research status" : "Request details");
      add.href = isResearch ? "#nutrition" : "#bulk";
      if (!isResearch) add.addEventListener("click", () => {
        const interest = $("#bulkProduct");
        const message = $("#bulkMessage");
        if (interest) interest.value = "6EGGZ Table Eggs";
        if (message) message.value = "I'm interested in " + p.name + ". Please share confirmed availability, pack specification and pricing.";
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
    const lines = $("#cartLines"), summary = $("#cartSummary");
    if (!lines || !summary) return;
    lines.replaceChildren();
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
  function openCart() {
    const overlay = $("#cartOverlay");
    if (!overlay) return;
    overlay.classList.add("open"); overlay.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden";
    const close = $("#closeCart"); if (close) close.focus();
  }
  function closeCart() {
    const overlay = $("#cartOverlay");
    if (!overlay) return;
    overlay.classList.remove("open"); overlay.setAttribute("aria-hidden", "true"); document.body.style.overflow = "";
    const trigger = $("#openCart"); if (trigger) trigger.focus();
  }
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

  const menuToggle = $("#menuToggle");
  const navLinks = $("#navLinks");
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open"); menuToggle.setAttribute("aria-expanded", String(open));
    });
    navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => { navLinks.classList.remove("open"); menuToggle.setAttribute("aria-expanded", "false"); }));
  }
  const openCartButton = $("#openCart"), closeCartButton = $("#closeCart"), cartOverlay = $("#cartOverlay");
  if (openCartButton) openCartButton.addEventListener("click", openCart);
  if (closeCartButton) closeCartButton.addEventListener("click", closeCart);
  if (cartOverlay) cartOverlay.addEventListener("click", (event) => { if (event.target === cartOverlay) closeCart(); });
  document.addEventListener("keydown", (event) => { const overlay = $("#cartOverlay"); if (event.key === "Escape" && overlay && overlay.classList.contains("open")) closeCart(); });
  document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach((b) => b.classList.toggle("active", b === button));
    currentFilter = button.dataset.filter; renderProducts();
  }));
  const bulkForm = $("#bulkForm");
  if (bulkForm) bulkForm.addEventListener("submit", (event) => { event.preventDefault(); submitEnquiry(event.currentTarget, "#bulkFeedback"); });
  const contactForm = $("#contactForm");
  if (contactForm) contactForm.addEventListener("submit", (event) => { event.preventDefault(); submitEnquiry(event.currentTarget, "#contactFeedback"); });
  const orderForm = $("#orderForm");
  if (orderForm) orderForm.addEventListener("submit", submitOrder);
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
  renderCartCount(); renderCart(); loadProducts();
})();