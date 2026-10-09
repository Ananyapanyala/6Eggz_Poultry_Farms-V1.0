import { db } from "hatchable";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { rows } = await db.query(
    "SELECT id, name, slug, category, description, pack_size, price_paise, available, stock_quantity, image_url, research_status, nutrient_target, nutrient_amount, nutrient_unit, serving_basis, lab_name, report_date, report_reference, evidence_approved, public_claim, storage_instructions FROM products WHERE research_status <> 'Discontinued' ORDER BY available DESC, category, name LIMIT 100"
  );
  return res.json({
    products: rows.map((p) => {
      const category = String(p.category || "").toLowerCase();
      const needsEvidence = category.includes("nutrition") || category.includes("enriched");
      const evidenceReady = p.evidence_approved && p.research_status === "Verified";
      return {
        ...p,
        available: Boolean(p.available && Number(p.stock_quantity) > 0 && (!needsEvidence || evidenceReady)),
        price_rupees: p.price_paise == null ? null : Number(p.price_paise) / 100,
        public_nutrition_claim: evidenceReady ? p.public_claim : ""
      };
    })
  });
}