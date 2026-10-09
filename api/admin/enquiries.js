import { db } from "hatchable";

export const access = "admin";
export const methods = ["GET", "PATCH"];

export default async function (req, res) {
  if (req.method === "GET") {
    const { rows } = await db.query("SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 300");
    return res.json({ enquiries: rows });
  }
  const b = req.body || {};
  const id = typeof b.id === "string" ? b.id : "";
  const status = typeof b.status === "string" ? b.status : "";
  const statuses = ["new","contacted","quoted","converted","closed","spam"];
  if (!id || !statuses.includes(status)) return res.status(400).json({error:"Provide an enquiry ID and a valid status."});
  const { rows } = await db.query("UPDATE enquiries SET status=$2, admin_notes=$3, quote_paise=$4, updated_at=NOW() WHERE id=$1 RETURNING id,status,admin_notes,quote_paise,updated_at", [id,status,typeof b.admin_notes==="string"?b.admin_notes.slice(0,3000):"",b.quote_rupees==null||b.quote_rupees===""?null:Math.round(Number(b.quote_rupees)*100)]);
  if (!rows.length) return res.status(404).json({error:"Enquiry not found."});
  return res.json({enquiry:rows[0]});
}