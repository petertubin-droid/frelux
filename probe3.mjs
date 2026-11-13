import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.audit","utf8").split("\n")) {
  const m=/^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m && m[2]) process.env[m[1]]=m[2].replace(/^"|"$/g,"");
}
const U=process.env.VITE_SUPABASE_URL,K=process.env.VITE_SUPABASE_ANON_KEY;
const get=async(t,q)=>{const r=await fetch(`${U}/rest/v1/${t}?${q}`,{headers:{apikey:K,Authorization:`Bearer ${K}`}});if(!r.ok){console.log(t,r.status);return[]}return r.json()};
const mk=["ET","TZ","CN","CI"];
const [roles,mats,prices]=await Promise.all([
 get("market_material_roles","select=market,role,material_slug&is_active=eq.true&limit=2000"),
 get("estimation_materials","select=id,slug,category&limit=3000"),
 get("estimation_prices","select=market,ref_id,price,currency,price_source&is_active=eq.true&limit=20000"),
]);
const byId=new Map(mats.map(m=>[m.id,m]));
for(const code of mk){
  const own=prices.filter(p=>p.market===code && p.price!=null).map(p=>({slug:byId.get(p.ref_id)?.slug??"?",cat:byId.get(p.ref_id)?.category,price:p.price,cur:p.currency}));
  const rl=roles.filter(r=>r.market===code).map(r=>r.role+"->"+r.material_slug);
  console.log(`\n${code}: ${own.length} priced rows, ${rl.length} roles`);
  console.log("  rows:", own.map(o=>`${o.slug}${o.cat?"["+o.cat+"]":""}:${o.price}${o.cur?" "+o.cur:""}`).join(", ").slice(0,600));
  console.log("  roles:", rl.join(", "));
}
