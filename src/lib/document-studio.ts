import { supabase } from "@/lib/supabase";

export type StudioBlock =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "materials"; title: string; rows: Array<{ label: string; quantity: number; unit: string; unitPrice: number }> }
  | { id: string; type: "terms"; text: string };

export interface StudioConfig {
  pageSize: "a4" | "a3" | "letter";
  orientation: "portrait" | "landscape";
  currency: string;
  locale: string;
  accentColor: string;
  watermark: boolean;
  blocks: StudioBlock[];
}

export interface StudioTemplate {
  id: string;
  name: string;
  document_type: "quotation" | "material_schedule" | "project_summary";
  config: StudioConfig;
  version: number;
  updated_at: string;
}

const allowedTypes = new Set(["quotation", "material_schedule", "project_summary"]);
const allowedBlocks = new Set(["heading", "paragraph", "materials", "terms"]);
const safeText = (value: unknown, max = 1200): string =>
  typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, max) : "";

export function validateStudioConfig(value: unknown): StudioConfig {
  if (!value || typeof value !== "object") throw new Error("Template configuration is missing.");
  const raw = value as Record<string, unknown>;
  const blocks = Array.isArray(raw.blocks) ? raw.blocks : [];
  if (blocks.length > 30) throw new Error("A template can contain at most 30 sections.");
  const normalized: StudioBlock[] = blocks.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid template section.");
    const block = item as Record<string, unknown>;
    const type = String(block.type);
    if (!allowedBlocks.has(type)) throw new Error("Unsupported template section.");
    const id = safeText(block.id, 80) || crypto.randomUUID();
    if (type === "materials") {
      const rows = Array.isArray(block.rows) ? block.rows.slice(0, 100) : [];
      return { id, type, title: safeText(block.title, 120) || "Materials", rows: rows.map((entry) => {
        const row = entry as Record<string, unknown>;
        const quantity = Number(row.quantity); const unitPrice = Number(row.unitPrice);
        if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(unitPrice) || unitPrice < 0) throw new Error("Material quantities and unit prices must be non-negative numbers.");
        return { label: safeText(row.label, 160), quantity, unit: safeText(row.unit, 24), unitPrice };
      }) };
    }
    return { id, type: type as "heading" | "paragraph" | "terms", text: safeText(block.text, type === "heading" ? 160 : 3000) };
  });
  const color = typeof raw.accentColor === "string" && /^#[0-9a-f]{6}$/i.test(raw.accentColor) ? raw.accentColor : "#7C3AED";
  return {
    pageSize: ["a4", "a3", "letter"].includes(String(raw.pageSize)) ? raw.pageSize as StudioConfig["pageSize"] : "a4",
    orientation: raw.orientation === "landscape" ? "landscape" : "portrait",
    currency: safeText(raw.currency, 3) || "NGN",
    locale: safeText(raw.locale, 20) || "en-NG",
    accentColor: color,
    watermark: raw.watermark !== false,
    blocks: normalized,
  };
}

export async function listStudioTemplates(): Promise<StudioTemplate[]> {
  const { data, error } = await supabase.from("pdf_studio_templates").select("id,name,document_type,config,version,updated_at").is("archived_at", null).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as StudioTemplate[];
}

export async function saveStudioTemplate(template: Pick<StudioTemplate, "name" | "document_type" | "config"> & { id?: string; version?: number }): Promise<StudioTemplate> {
  const name = safeText(template.name, 80).trim();
  if (!name) throw new Error("Give your template a name.");
  if (!allowedTypes.has(template.document_type)) throw new Error("Unsupported document type.");
  const config = validateStudioConfig(template.config);
  const { data, error } = await supabase.rpc("save_pdf_studio_template", {
    p_id: template.id ?? null,
    p_name: name,
    p_document_type: template.document_type,
    p_config: config,
  });
  if (error) throw error;
  return data as unknown as StudioTemplate;
}

export async function archiveStudioTemplate(id: string): Promise<void> {
  const { error } = await supabase.rpc("archive_pdf_studio_template", { p_id: id });
  if (error) throw error;
}

export async function generateStudioPdf(name: string, configInput: StudioConfig): Promise<void> {
  const config = validateStudioConfig(configInput);
  const { data, error } = await supabase.functions.invoke("pdf-studio-export", {
    body: { name: safeText(name, 100), config },
  });
  if (error) {
    const { getFunctionErrorMessage } = await import("@/lib/supabase");
    throw new Error(await getFunctionErrorMessage(error));
  }
  if (!data || typeof data.url !== "string") {
    throw new Error("PDF export did not return a secure download link.");
  }
  window.location.assign(data.url);
}

export interface StudioDocument { id: string; file_name: string; byte_size: number; created_at: string; expires_at: string; }
export async function listStudioDocuments(): Promise<StudioDocument[]> {
 const { data, error } = await supabase.from("pdf_studio_documents").select("id,file_name,byte_size,created_at,expires_at").eq("status","ready").order("created_at",{ascending:false});
 if(error) throw error; return (data ?? []) as StudioDocument[];
}
export async function downloadStudioDocument(id: string): Promise<void> {
 const {data,error}=await supabase.functions.invoke("pdf-studio-export",{body:{action:"download",documentId:id}});
 if(error){const {getFunctionErrorMessage}=await import("@/lib/supabase");throw new Error(await getFunctionErrorMessage(error));}
 if(!data||typeof data.url!=="string")throw new Error("A secure download link was not returned."); window.location.assign(data.url);
}
