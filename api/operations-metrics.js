import { db } from "hatchable";
export const access="admin";
export const methods=["GET"];
export default async function(req,res){
 const [farm,stock,orders,revenue,rnd,lab,batches,costs]=await Promise.all([
 db.query("SELECT COUNT(*)::int AS days_recorded,COALESCE(SUM(eggs_produced),0)::bigint AS eggs_produced,COALESCE(SUM(saleable_eggs),0)::bigint AS saleable_eggs,COALESCE(SUM(rejected_eggs),0)::bigint AS rejected_eggs,COALESCE(SUM(feed_cost_paise),0)::bigint AS feed_cost_paise,COALESCE(SUM(medicine_cost_paise),0)::bigint AS medicine_cost_paise,COALESCE(SUM(labour_energy_cost_paise),0)::bigint AS labour_energy_cost_paise FROM farm_daily_records"),
 db.query("SELECT COUNT(*)::int AS products,COALESCE(SUM(stock_quantity),0)::bigint AS packs_on_hand,COUNT(*) FILTER (WHERE available=TRUE AND price_paise IS NOT NULL AND stock_quantity>0)::int AS saleable_skus FROM products"),
 db.query("SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE order_status='delivered')::int AS delivered,COUNT(*) FILTER (WHERE order_status NOT IN ('delivered','cancelled'))::int AS outstanding FROM orders"),
 db.query("SELECT COALESCE(SUM(total_paise),0)::bigint AS paid_paise FROM orders WHERE payment_status='paid'"),
 db.query("SELECT COUNT(*)::int AS projects,COUNT(*) FILTER (WHERE status='Approved for Commercial Release' AND commercial_release_approved=TRUE)::int AS approved_projects FROM rnd_projects"),
 db.query("SELECT COUNT(*)::int AS reports,COUNT(*) FILTER (WHERE review_status='Pending Review')::int AS pending FROM lab_reports"),
 db.query("SELECT COUNT(*)::int AS batches,COUNT(*) FILTER (WHERE release_status='Released' AND recall_status='Clear')::int AS released,COUNT(*) FILTER (WHERE release_status IN ('On Hold','Recalled','Withdrawn') OR recall_status<>'Clear')::int AS held_or_recalled FROM egg_batches"),
 db.query("SELECT COALESCE(SUM(amount_paise),0)::bigint AS total_rnd_costs,COUNT(*)::int AS entries FROM rnd_costs")
 ]);
 return res.json({farm:{...farm.rows[0],data_status:Number(farm.rows[0].days_recorded)>0?"Recorded farm operations":"No data available"},inventory:stock.rows[0],orders:orders.rows[0],paid_revenue_rupees:Number(revenue.rows[0].paid_paise)/100,rnd:{...rnd.rows[0],cost_entries:costs.rows[0].entries,total_recorded_rnd_cost_rupees:Number(costs.rows[0].total_rnd_costs)/100},laboratory:lab.rows[0],batches:batches.rows[0]});
}