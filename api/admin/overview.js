import { db } from "hatchable";
export const access="admin";
export const methods=["GET"];
export default async function(req,res){
 const [products,enquiries,orders,revenue,ops]=await Promise.all([
  db.query("SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE available=TRUE AND price_paise IS NOT NULL AND stock_quantity>0)::int AS available,COUNT(*) FILTER (WHERE stock_quantity BETWEEN 1 AND 10)::int AS low_stock FROM products"),
  db.query("SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE status='new')::int AS new_count FROM enquiries"),
  db.query("SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE order_status='pending_confirmation')::int AS pending,COUNT(*) FILTER (WHERE order_status IN ('confirmed','packing','out_for_delivery') )::int AS awaiting_dispatch,COUNT(*) FILTER (WHERE order_status='delivered')::int AS delivered,COUNT(*) FILTER (WHERE order_status='cancelled')::int AS cancelled FROM orders"),
  db.query("SELECT COALESCE(SUM(total_paise),0)::bigint AS paid_paise FROM orders WHERE payment_status='paid'"),
  db.query("SELECT (SELECT COUNT(*) FROM farm_daily_records)::int AS farm_days,(SELECT COUNT(*) FROM rnd_projects WHERE commercial_release_approved=FALSE)::int AS pending_rnd,(SELECT COUNT(*) FROM lab_reports WHERE review_status='Pending Review')::int AS pending_labs,(SELECT COUNT(*) FROM rnd_validation_gates WHERE mandatory=TRUE AND status<>'Pass')::int AS pending_gates,(SELECT COUNT(*) FROM egg_batches WHERE release_status IN ('On Hold','Recalled','Withdrawn') OR recall_status<>'Clear')::int AS quality_holds")
 ]);
 return res.json({products:products.rows[0],enquiries:enquiries.rows[0],orders:orders.rows[0],paid_revenue_rupees:Number(revenue.rows[0].paid_paise)/100,operations:ops.rows[0]});
}