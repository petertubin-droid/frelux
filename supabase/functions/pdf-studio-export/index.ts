import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "npm:jspdf@2.5.2";
import { serveWithCors } from "../_shared/serve.ts";

type Block = { id: string; type: "heading" | "paragraph" | "terms" | "materials"; text?: string; title?: string; rows?: Array<{ label: string; quantity: number; unit: string; unitPrice: number }> };
type Config = { pageSize: "a4"|"a3"|"letter"; orientation: "portrait"|"landscape"; currency: string; locale: string; accentColor: string; watermark: boolean; blocks: Block[] };
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const safeText=(v:unknown,max=1200)=>typeof v==="string"?v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"").slice(0,max):"";
function validate(value:unknown):Config {
  if(!value||typeof value!=="object") throw new Error("Invalid template configuration."); const c=value as Record<string,unknown>;
  if(!Array.isArray(c.blocks)||c.blocks.length>30) throw new Error("A template can contain at most 30 sections.");
  const blocks=c.blocks.map((raw)=>{if(!raw||typeof raw!=="object")throw new Error("Invalid section.");const b=raw as Record<string,unknown>;const type=String(b.type);if(!["heading","paragraph","terms","materials"].includes(type))throw new Error("Unsupported section.");
    if(type==="materials"){if(!Array.isArray(b.rows)||b.rows.length>100)throw new Error("Invalid material rows.");return{id:safeText(b.id,80),type,title:safeText(b.title,120),rows:b.rows.map((r)=>{const row=r as Record<string,unknown>;const q=Number(row.quantity),p=Number(row.unitPrice);if(!Number.isFinite(q)||q<0||!Number.isFinite(p)||p<0)throw new Error("Invalid material quantity or price.");return{label:safeText(row.label,160),quantity:q,unit:safeText(row.unit,24),unitPrice:p};})};}
    return{id:safeText(b.id,80),type,text:safeText(b.text,type==="heading"?160:3000)};});
  const currency=safeText(c.currency,3);if(!/^[A-Z]{3}$/.test(currency))throw new Error("Use a three-letter ISO currency code.");
  const accentColor=typeof c.accentColor==="string"&&/^#[0-9a-f]{6}$/i.test(c.accentColor)?c.accentColor:"#7C3AED";
  return{pageSize:["a4","a3","letter"].includes(String(c.pageSize))?c.pageSize as Config["pageSize"]:"a4",orientation:c.orientation==="landscape"?"landscape":"portrait",currency,locale:safeText(c.locale,20)||"en-NG",accentColor,watermark:c.watermark!==false,blocks};
}

serveWithCors(async(req)=>{
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 const supabaseUrl=Deno.env.get("SUPABASE_URL");const anonKey=Deno.env.get("SUPABASE_ANON_KEY");const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!supabaseUrl||!anonKey||!serviceKey)return json({error:"PDF export service is not configured."},503);
 const token=req.headers.get("Authorization")?.replace(/^Bearer\s+/i,"");if(!token)return json({error:"Sign in to export a document."},401);
 const userClient=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await userClient.auth.getUser(token);if(userError||!user)return json({error:"Your session is invalid. Please sign in again."},401);
 let payload:Record<string,unknown>;try{const text=await req.text();if(text.length>250_000)return json({error:"Document configuration is too large."},413);payload=JSON.parse(text);}catch{return json({error:"Invalid JSON request."},400);}
 const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 if(payload.action==="download"){
  const documentId=typeof payload.documentId==="string"?payload.documentId:"";
  const {data:record,error:recordError}=await admin.from("pdf_studio_documents").select("storage_path").eq("id",documentId).eq("user_id",user.id).eq("status","ready").gt("expires_at",new Date().toISOString()).maybeSingle();
  if(recordError||!record)return json({error:"Document not found or no longer available."},404);
  const {data:signed,error:signedError}=await admin.storage.from("pdf-studio-documents").createSignedUrl(record.storage_path,60);
  if(signedError||!signed?.signedUrl)return json({error:"Could not create a secure download link."},500);
  return json({url:signed.signedUrl});
 }
 const name=safeText(payload.name,100).trim()||"FRELUX document";let config:Config;try{config=validate(payload.config);}catch(e){return json({error:e instanceof Error?e.message:"Invalid configuration."},400);}
 const requestId=crypto.randomUUID();const {data:reservation,error:reserveError}=await userClient.rpc("reserve_pdf_studio_export",{p_request_id:requestId});if(reserveError)return json({error:"Could not verify export access."},403);
 const check=reservation as {allowed?:boolean;reason?:string;limit?:number;used?:number;plan?:string};if(!check?.allowed)return json({error:check?.reason==="quota_exhausted"?"Monthly PDF export limit reached.":"PDF export is not available for this account.",usage:{used:check?.used,limit:check?.limit}},403);
 try {
  const doc=new jsPDF({unit:"mm",format:config.pageSize,orientation:config.orientation});const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight(),m=16;let y=m;const rgb=config.accentColor.match(/[a-f0-9]{2}/gi)!.map(x=>parseInt(x,16));
  doc.setFillColor(rgb[0],rgb[1],rgb[2]);doc.rect(0,0,w,5,"F");doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(90);doc.text("FRELUX",m,12);doc.setFontSize(18);doc.setTextColor(30);doc.text(name,m,y+12);y+=24;
  const room=(height:number)=>{if(y+height>h-m){doc.addPage();y=m;doc.setFillColor(rgb[0],rgb[1],rgb[2]);doc.rect(0,0,w,4,"F");}};
  const money=(n:number)=>new Intl.NumberFormat(config.locale,{style:"currency",currency:config.currency}).format(n);
  for(const b of config.blocks){if(b.type==="heading"){room(14);doc.setFont("helvetica","bold");doc.setFontSize(13);doc.setTextColor(rgb[0],rgb[1],rgb[2]);doc.text(b.text||"",m,y);y+=9;}else if(b.type==="paragraph"||b.type==="terms"){const lines=doc.splitTextToSize(b.text||"",w-m*2);room(lines.length*5+6);doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(45);doc.text(lines,m,y);y+=lines.length*5+7;}else{room(18);doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(30);doc.text(b.title||"Materials",m,y);y+=7;doc.setFontSize(8);doc.setFillColor(242,242,247);doc.rect(m,y-4,w-m*2,7,"F");doc.text("Item",m+1,y);doc.text("Qty",w-82,y);doc.text("Unit",w-62,y);doc.text("Rate",w-47,y);doc.text("Total",w-24,y);y+=6;let total=0;for(const r of b.rows||[]){room(8);const line=r.quantity*r.unitPrice;total+=line;doc.setFont("helvetica","normal");doc.text(doc.splitTextToSize(r.label,70)[0]||"",m+1,y);doc.text(String(r.quantity),w-82,y);doc.text(r.unit,w-62,y);doc.text(money(r.unitPrice),w-47,y);doc.text(money(line),w-24,y);y+=6;}room(10);doc.setFont("helvetica","bold");doc.text("Subtotal",w-75,y);doc.text(money(total),w-24,y);y+=12;}}
  const paidBranding=["pro","premium","enterprise"].includes(String(check.plan||"free").toLowerCase());const watermark=config.watermark||!paidBranding;
  const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFontSize(8);doc.setTextColor(120);doc.text(`Page ${p} of ${pages}`,w-m,h-8,{align:"right"});if(watermark){doc.setFontSize(36);doc.setTextColor(245,245,245);doc.text("FRELUX",w/2,h/2,{align:"center",angle:35});}}
  const bytes=doc.output("arraybuffer");if(bytes.byteLength>5_000_000)throw new Error("Generated document exceeds the 5 MB limit.");
  const fileName=`${name.replace(/[^a-z0-9-_]+/gi,"-").slice(0,60)||"frelux-document"}.pdf`;const storagePath=`${user.id}/${crypto.randomUUID()}.pdf`;
  const {error:uploadError}=await admin.storage.from("pdf-studio-documents").upload(storagePath,new Uint8Array(bytes),{contentType:"application/pdf",upsert:false});if(uploadError)throw new Error("Could not securely store generated PDF.");
  const {error:recordError}=await admin.from("pdf_studio_documents").insert({user_id:user.id,file_name:fileName,storage_path:storagePath,byte_size:bytes.byteLength});if(recordError){await admin.storage.from("pdf-studio-documents").remove([storagePath]);throw new Error("Could not register generated PDF.");}
  const {data:signed,error:signedError}=await admin.storage.from("pdf-studio-documents").createSignedUrl(storagePath,60);if(signedError||!signed?.signedUrl)throw new Error("Could not prepare secure PDF delivery.");
  const {error:finishError}=await admin.rpc("finish_pdf_studio_export_for_user",{p_user_id:user.id,p_request_id:requestId,p_success:true});if(finishError)throw new Error("Export could not be finalized.");
  return json({url:signed.signedUrl,fileName,usage:check});
 }catch(error){await admin.rpc("finish_pdf_studio_export_for_user",{p_user_id:user.id,p_request_id:requestId,p_success:false});return json({error:error instanceof Error?error.message:"PDF generation failed."},500);}
});
