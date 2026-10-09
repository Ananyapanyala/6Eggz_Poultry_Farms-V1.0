import { db } from "hatchable";

export const access = "public";
export const methods = ["POST"];

function clean(v, max = 240) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export default async function (req, res) {
  const b = req.body || {};
  const name = clean(b.customer_name, 120);
  const email = clean(b.customer_email, 200);
  const phone = clean(b.customer_phone, 40);
  const address = clean(b.address_line, 250);
  const city = clean(b.city, 100);
  const pin = clean(b.pin_code, 10);
  const rawItems = Array.isArray(b.items) ? b.items.slice(0, 30) : [];
  if (!name || (!email && !phone) || !address || !city || !/^\d{6}$/.test(pin) || !rawItems.length) {
    return res.status(400).json({ error: "Enter your contact details, delivery address, 6-digit PIN code, and at least one item." });
  }

  const requested = new Map();
  for (const item of rawItems) {
    const id = clean(item && item.product_id, 80);
    const qty = Number(item && item.quantity);
    if (!id || !Number.isInteger(qty) || qty < 1 || qty > 100) return res.status(400).json({ error: "Each item needs a valid product and quantity (1–100 packs)." });
    requested.set(id, (requested.get(id) || 0) + qty);
  }
  const ids = [...requested.keys()];
  const productResult = await db.query(
    "SELECT id, name, category, pack_size, price_paise, available, stock_quantity, research_status, evidence_approved FROM products WHERE id = ANY($1::uuid[])",
    [ids]
  );
  if (productResult.rows.length !== ids.length) return res.status(400).json({ error: "One or more products could not be found. Please refresh the catalogue." });

  const items = [];
  let subtotal = 0;
  for (const p of productResult.rows) {
    const qty = requested.get(p.id);
    const category = String(p.category || "").toLowerCase();
    const requiresEvidence = category.includes("nutrition") || category.includes("enriched");
    if (!p.available || p.price_paise == null || p.stock_quantity < qty || (requiresEvidence && !(p.research_status === "Verified" && p.evidence_approved))) {
      return res.status(409).json({ error: p.name + " is currently unavailable or has insufficient stock. Please refresh the catalogue." });
    }
    subtotal += Number(p.price_paise) * qty;
    items.push({ product_id: p.id, name: p.name, pack_size: p.pack_size, unit_price_paise: Number(p.price_paise), quantity: qty, line_total_paise: Number(p.price_paise) * qty });
  }
  const delivery = 0;
  const { rows } = await db.query(
    "INSERT INTO orders (customer_name, customer_email, customer_phone, address_line, city, state, pin_code, items, subtotal_paise, delivery_paise, total_paise, payment_status, order_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,'not_configured','pending_confirmation') RETURNING id, created_at",
    [name, email, phone, address, city, clean(b.state || "Telangana", 100), pin, JSON.stringify(items), subtotal, delivery, subtotal]
  );
  return res.status(201).json({
    ok: true,
    order_id: rows[0].id,
    created_at: rows[0].created_at,
    total_rupees: subtotal / 100,
    payment_status: "not_configured",
    order_status: "pending_confirmation",
    message: "Your order request is recorded. This is not a payment confirmation; the team must confirm availability, delivery charges and payment separately."
  });
}