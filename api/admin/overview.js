import { db } from "hatchable";

export const access = "admin";
export const methods = ["GET"];

export default async function (req, res) {
  const [products, enquiries, orders, revenue] = await Promise.all([
    db.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE available = TRUE AND stock_quantity > 0)::int AS available, COUNT(*) FILTER (WHERE available = TRUE AND stock_quantity <= 10)::int AS low_stock FROM products"),
    db.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'new')::int AS new_count FROM enquiries"),
    db.query("SELECT COUNT(*)::int AS total FROM orders"),
    db.query("SELECT COALESCE(SUM(total_paise),0)::bigint AS paid_paise FROM orders WHERE payment_status = 'paid'")
  ]);
  return res.json({
    products: products.rows[0],
    enquiries: enquiries.rows[0],
    orders: orders.rows[0],
    paid_revenue_rupees: Number(revenue.rows[0].paid_paise) / 100
  });
}