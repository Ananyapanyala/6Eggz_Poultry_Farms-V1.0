import { db } from "hatchable";
export const access = "admin";
export const methods = ["GET","POST"];
const ORDER=["pending_confirmation","confirmed","packing","out_for_delivery","delivered","cancelled","on_hold","delivery_failed"];
const PAY=["not_configured","awaiting_payment","paid","failed","refunded"];
export default async function(req,res){
 if(req.method==="GET"){
  const r=await db.query("SELECT id,customer_name,customer_email,customer_phone,address_line,city,state,pin_code,items,subtotal_paise,delivery_paise,total_paise,payment_status,order_status,created_at,updated_at FROM orders ORDER BY created_at DESC LIMIT 300");
  return res.json({orders:r.rows});
 }
 const b=req.body||{},id=typeof b.id==="string"?b.id:"",status=typeof b.order_status==="string"?b.order_status:"",payment=typeof b.payment_status==="string"?b.payment_status:"";
 if(!id||!ORDER.includes(status)||!PAY.includes(payment))return res.status(400).json({error:"Provide an order ID and valid order/payment statuses."});
 const prior=await db.query("SELECT * FROM orders WHERE id=$1",[id]);
 if(!prior.rows.length)return res.status(404).json({error:"Order not found."});
 const old=prior.rows[0];
 if(payment==="paid"&&old.payment_status!=="paid")return res.status(409).json({error:"Payment cannot be marked paid until a payment provider or verified settlement is integrated. Record it only through a verified payment reconciliation."});
 if(old.order_status==="cancelled"&&status!=="cancelled")return res.status(409).json({error:"Cancelled orders cannot be reopened through this status update."});
 if(old.order_status==="delivered"&&status!=="delivered")return res.status(409).json({error:"Delivered orders cannot move back to an earlier fulfilment state."});
 if(status==="confirmed"&&old.order_status==="pending_confirmation"){
  return res.status(409).json({error:"Online stock reservation is not yet implemented. Confirm this order only after staff verifies current availability and allocates stock manually."});
 }
 const result=await db.query("UPDATE orders SET order_status=$2,payment_status=$3,updated_at=NOW() WHERE id=$1 RETURNING id,order_status,payment_status,updated_at",[id,status,payment]);
 await db.query("INSERT INTO admin_audit_log (actor,action,entity_type,entity_id,before_data,after_data,notes) VALUES ($1,'order_status_change','order',$2,$3::jsonb,$4::jsonb,'Order state changed by authorized administrator')",[req.member?.email||req.member?.handle||"project-admin",id,JSON.stringify(old),JSON.stringify(result.rows[0])]);
 return res.json({order:result.rows[0]});
}