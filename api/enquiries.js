import { db } from "hatchable";

export const access = "public";
export const methods = ["POST"];

function clean(value, max = 2000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export default async function (req, res) {
  const b = req.body || {};
  const name = clean(b.name, 120);
  const email = clean(b.email, 200);
  const phone = clean(b.phone, 40);
  const message = clean(b.message, 3000);
  const type = clean(b.enquiry_type || "contact", 40);
  if (!name || (!email && !phone)) {
    return res.status(400).json({ error: "Please provide your name and either an email address or phone number." });
  }
  const allowed = ["contact", "bulk", "retailer", "institutional", "nutrition_notify"];
  if (!allowed.includes(type)) return res.status(400).json({ error: "Invalid enquiry type." });
  const { rows } = await db.query(
    "INSERT INTO enquiries (enquiry_type, name, email, phone, organisation, product_interest, quantity, delivery_location, frequency, message) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, created_at",
    [type, name, email, phone, clean(b.organisation, 200), clean(b.product_interest, 160), clean(b.quantity, 120), clean(b.delivery_location, 240), clean(b.frequency, 120), message]
  );
  return res.status(201).json({ ok: true, enquiry_id: rows[0].id, message: "Thanks. Your enquiry has been recorded; our team can follow up using the contact details provided." });
}