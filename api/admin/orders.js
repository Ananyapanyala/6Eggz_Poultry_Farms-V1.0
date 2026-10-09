import { db } from "hatchable";

export const access = "admin";
export const methods = ["GET", "POST"];

export default async function (req, res) {
  if (req.method === "GET") {
    const { rows } = await db.query("SELECT id, customer_name, customer_email, customer_phone, address_line, city, state, pin_code, items, subtotal_paise, delivery_paise, total_paise, payment_status, order_status, created_at, updated_at FROM orders ORDER BY created_at DESC LIMIT 300");
    return res.json({ orders: rows });
  }
  const b = req.body || {};
  const id = typeof b.id === "string" ? b.id : "";
  if (b.action === "review") {
    const status = typeof b.order_status === "string" ? b.order_status : "";
    const payment = typeof b.payment_status === "string" ? b.payment_status : "";
    const allowedOrders = ["pending_confirmation","confirmed","packing","out_for_delivery","delivered","cancelled"];
    const allowedPayments = ["not_configured","awaiting_payment","paid","failed","refunded"];
    if (!id || !allowedOrders.includes(status) || !allowedPayments.includes(payment)) return res.status(400).json({error:"Provide an order ID and valid order/payment statuses. Mark payment paid only after independently verifying the payment."});
    const { rows } = await db.query("UPDATE orders SET order_status=$2, payment_status=$3, updated_at=NOW() WHERE id=$1 RETURNING id,order_status,payment_status,updated_at", [id,status,payment]);
    if (!rows.length) return res.status(404).json({error:"Order not found."});
    return res.json({order:rows[0]});
  }
  const status = typeof b.order_status === "string" ? b.order_status : "";
  const payment = typeof b.payment_status === "string" ? b.payment_status : "";
  const allowedOrders = ["pending_confirmation","confirmed","packing","out_for_delivery","delivered","cancelled"];
  const allowedPayments = ["not_configured","awaiting_payment","paid","failed","refunded"];
  if (!id || !allowedOrders.includes(status) || !allowedPayments.includes(payment)) return res.status(400).json({error:"Provide an order ID and valid order/payment statuses. Mark payment paid only after independently verifying the payment."});
  const { rows } = await db.query("UPDATE orders SET order_status=$2, payment_status=$3, updated_at=NOW() WHERE id=$1 RETURNING id,order_status,payment_status,updated_at", [id,status,payment]);
  if (!rows.length) return res.status(404).json({error:"Order not found."});
  return res.json({order:rows[0]});
}