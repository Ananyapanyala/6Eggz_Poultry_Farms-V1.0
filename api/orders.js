import { db, auth } from "hatchable";
export const access="public";
export const methods=["POST"];
const clean=(v,n=240)=>typeof v==="string"?v.trim().slice(0,n):"";
export default async function(req,res){
 const b=req.body||{},name=clean(b.customer_name,120),email=clean(b.customer_email,200),phone=clean(b.customer_phone,40),address=clean(b.address_line,250),city=clean(b.city,100),pin=clean(b.pin_code,10),items=Array.isArray(b.items)?b.items.slice(0,30):[];
 if(!name||(!email&&!phone)||!address||!city||!/^[0-9]{6}$/.test(pin)||!items.length)return res.status(400).json({error:"Enter contact details, delivery address, 6-digit PIN code and at least one item."});
 const q=new Map();
 for(const x of items){const id=clean(x?.product_id,80),qty=Number(x?.quantity);if(!id||!Number.isInteger(qty)||qty<1||qty>100)return res.status(400).json({error:"Each item needs a valid product and quantity (1–100)."});q.set(id,(q.get(id)||0)+qty);}
 const ids=[...q.keys()],result=await db.query("SELECT id,name,category,pack_size,price_paise,available,stock_quantity,research_status,evidence_approved FROM products WHERE id=ANY($1::uuid[])",[ids]);
 if(result.rows.length!==ids.length)return res.status(400).json({error:"One or more products could not be found."});
 const lineItems=[];let subtotal=0;
 for(const p of result.rows){const qty=q.get(p.id),cat=String(p.category||"").toLowerCase(),research=cat.includes("nutrition")||cat.includes("enriched")||cat.includes("research");
  if(!p.available||p.price_paise==null||Number(p.stock_quantity)<qty||(research&&!(p.research_status==="Verified"&&p.evidence_approved)))return res.status(409).json({error:p.name+" is not currently available for purchase."});
  subtotal+=Number(p.price_paise)*qty;lineItems.push({product_id:p.id,name:p.name,pack_size:p.pack_size,unit_price_paise:Number(p.price_paise),quantity:qty,line_total_paise:Number(p.price_paise)*qty});
 }
 // No online payment gateway or stock reservation is configured. This stores an enquiry/request only.
 const authenticatedUser=await auth.getUser(req);
 const out=await db.query("INSERT INTO orders (customer_name,customer_email,customer_phone,address_line,city,state,pin_code,items,subtotal_paise,delivery_paise,total_paise,payment_status,order_status,customer_user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,0,$9,'not_configured','pending_confirmation',$10) RETURNING id,created_at",[name,email,phone,address,city,clean(b.state||"Telangana",100),pin,JSON.stringify(lineItems),subtotal,authenticatedUser?.id||null]);
 return res.status(201).json({ok:true,order_id:out.rows[0].id,created_at:out.rows[0].created_at,total_rupees:subtotal/100,payment_status:"not_configured",order_status:"pending_confirmation",message:"Order request recorded only. This is not a payment or delivery confirmation."});
}