import { db } from "hatchable";

export const access = "admin";
export const methods = ["PUT"];

function s(v, max = 2000) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }

export default async function (req, res) {
  const id = req.params.id;
  const b = req.body || {};
  const name = s(b.name,160);
  const slug = s(b.slug,180).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const price = b.price_rupees === "" || b.price_rupees == null ? null : Number(b.price_rupees);
  const stock = Number(b.stock_quantity || 0);
  if (!name || !slug || !s(b.category,80) || !Number.isInteger(stock) || stock < 0 || (price !== null && (!Number.isFinite(price) || price < 0 || price > 1000000))) return res.status(400).json({error:"Invalid product fields."});
  const { rows } = await db.query(
    "UPDATE products SET name=$2, slug=$3, category=$4, description=$5, pack_size=$6, price_paise=$7, available=$8, stock_quantity=$9, image_url=$10, research_status=$11, nutrient_target=$12, nutrient_amount=$13, nutrient_unit=$14, serving_basis=$15, lab_name=$16, report_date=$17, report_reference=$18, evidence_approved=$19, public_claim=$20, storage_instructions=$21, updated_at=NOW() WHERE id=$1 RETURNING *",
    [id,name,slug,s(b.category,80),s(b.description),s(b.pack_size,100),price===null?null:Math.round(price*100),Boolean(b.available),stock,s(b.image_url,1000),s(b.research_status,40)||"Proposed",s(b.nutrient_target,160),b.nutrient_amount===""||b.nutrient_amount==null?null:Number(b.nutrient_amount),s(b.nutrient_unit,40),s(b.serving_basis,120),s(b.lab_name,200),b.report_date||null,s(b.report_reference,160),Boolean(b.evidence_approved),s(b.public_claim,1000),s(b.storage_instructions,1000)]
  );
  if (!rows.length) return res.status(404).json({error:"Product not found."});
  return res.json({product:rows[0]});
}