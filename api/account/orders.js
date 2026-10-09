import { db } from "hatchable";
export const access="user";
export const methods=["GET"];
export default async function(req,res){
 const user=req.user;
 const r=await db.query("SELECT id,items,subtotal_paise,delivery_paise,total_paise,payment_status,order_status,created_at,updated_at FROM orders WHERE customer_user_id=$1 ORDER BY created_at DESC LIMIT 200",[user.id]);
 return res.json({orders:r.rows});
}