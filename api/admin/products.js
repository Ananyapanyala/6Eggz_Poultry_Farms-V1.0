import { db } from "hatchable";

export const access = "admin";
export const methods = ["GET", "POST"];

function s(v, max = 2000) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }

export default async function (req, res) {
  if (req.method === "GET") {
    const { rows } = await db.query("SELECT * FROM products ORDER BY created_at DESC LIMIT 200");
    return res.json({ products: rows });
  }
  const b = req.body || {};
  const name = s(b.name, 160);
  const slug = s(b.slug, 180).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const price = b.price_rupees === "" || b.price_rupees == null ? null : Number(b.price_rupees);
  const stock = Number(b.stock_quantity || 0);
  if (!name || !slug || !s(b.category, 80) || !Number.isInteger(stock) || stock < 0 || (price !== null && (!Number.isFinite(price) || price < 0 || price > 1000000))) {
    return res.status(400).json({ error: "Enter a product name, valid slug/category, non-negative stock and a valid price in rupees." });
  }
  const { rows } = await db.query(
    "INSERT INTO products (name, slug, category, description, pack_size, price_paise, available, stock_quantity, image_url, research_status, nutrient_target, nutrient_amount, nutrient_unit, serving_basis, lab_name, report_date, report_reference, evidence_approved, public_claim, storage_instructions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *",
    [name, slug, s(b.category,80), s(b.description), s(b.pack_size,100), price === null ? null : Math.round(price*100), Boolean(b.available), stock, s(b.image_url,1000), s(b.research_status,40) || "Proposed", s(b.nutrient_target,160), b.nutrient_amount === "" || b.nutrient_amount == null ? null : Number(b.nutrient_amount), s(b.nutrient_unit,40), s(b.serving_basis,120), s(b.lab_name,200), b.report_date || null, s(b.report_reference,160), Boolean(b.evidence_approved), s(b.public_claim,1000), s(b.storage_instructions,1000)]
  );
  return res.status(201).json({ product: rows[0] });
}