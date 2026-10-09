import { db } from "hatchable";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { rows } = await db.query(
    "SELECT id, name, slug, category, description, pack_size, price_paise, available, stock_quantity, image_url, research_status, nutrient_target, nutrient_amount, nutrient_unit, serving_basis, lab_name, report_date, report_reference, evidence_approved, public_claim, storage_instructions FROM products WHERE research_status <> 'Discontinued' ORDER BY available DESC, category, name LIMIT 100"
  );
  const approvedProjects = await db.query(
    "SELECT id, project_code, name, alternate_name, product_concept, status, candidate_nutrients, research_question, commercial_release_approved FROM rnd_projects ORDER BY id"
  );
  const releasedProjects = new Set(approvedProjects.rows.filter(p => p.commercial_release_approved === true && p.status === "Approved for Commercial Release").map(p => Number(p.id)));
  const gates = await db.query("SELECT project_id, COUNT(*) FILTER (WHERE mandatory=TRUE AND status <> 'Pass')::int AS outstanding FROM rnd_validation_gates GROUP BY project_id");
  const outstandingByProject = new Map(gates.rows.map(g => [Number(g.project_id), Number(g.outstanding)]));
  const rnd = approvedProjects.rows.map((p) => {
    const active = p.commercial_release_approved === true && p.status === "Approved for Commercial Release" && Number(outstandingByProject.get(Number(p.id)) || 0) === 0;
    return {
      id: "rnd-" + p.id,
      project_code: p.project_code,
      name: p.name,
      alternate_name: p.alternate_name,
      category: "Nutrition Eggs",
      description: p.product_concept,
      pack_size: active ? "See approved product pack specification" : "Research Concept — Not Approved for Commercial Sale",
      price_paise: null,
      price_rupees: null,
      available: false,
      stock_quantity: 0,
      image_url: "",
      research_status: p.status,
      evidence_approved: active,
      nutrient_target: Array.isArray(p.candidate_nutrients) ? p.candidate_nutrients.join(", ") : "",
      public_nutrition_claim: "",
      research_question: p.research_question,
      commercial_release_approved: active
    };
  });
  const catalog = rows.map((p) => {
    const category = String(p.category || "").toLowerCase();
    const needsEvidence = category.includes("nutrition") || category.includes("enriched");
    const evidenceReady = p.evidence_approved && p.research_status === "Verified";
    return {
      ...p,
      available: Boolean(p.available && Number(p.stock_quantity) > 0 && (!needsEvidence || evidenceReady)),
      price_rupees: p.price_paise == null ? null : Number(p.price_paise) / 100,
      public_nutrition_claim: evidenceReady ? p.public_claim : ""
    };
  });
  return res.json({ products: [...catalog, ...rnd] });
}