import { db } from "hatchable";

export const access = "admin";
export const methods = ["GET"];

export default async function (req, res) {
  const { rows } = await db.query("SELECT * FROM business_profile ORDER BY id LIMIT 1");
  return res.json({ profile: rows[0] || null });
}