import { supabase } from "@/lib/supabase";

export type StudioBlock =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "materials"; title: string; rows: Array<{ label: string; quantity: number; unit: string; unitPrice: number }> }
  | { id: string; type: "terms"; text: string }
  | { id: string; type: "signature"; title: string; clientName: string; clientRole: string; contractorName: string; contractorRole: string; date: string }
  | { id: string; type: "payment_schedule"; title: string; milestones: Array<{ stage: string; percentage: number; amount?: number; dueDate?: string }> };

export interface StudioConfig {
  pageSize: "a4" | "a3" | "letter";
  orientation: "portrait" | "landscape";
  currency: string;
  locale: string;
  accentColor: string;
  watermark: boolean;
  logoPath?: string | null;
  logoUrl?: string | null;
  blocks: StudioBlock[];
}

export interface StudioTemplate {
  id: string;
  name: string;
  document_type: "quotation" | "material_schedule" | "project_summary" | "invoice" | "labour_schedule" | "bill_of_quantities";
  config: StudioConfig;
  version: number;
  updated_at: string;
}

const allowedTypes = new Set(["quotation", "material_schedule", "project_summary", "invoice", "labour_schedule", "bill_of_quantities"]);
const allowedBlocks = new Set(["heading", "paragraph", "materials", "terms", "signature", "payment_schedule"]);
export const safeText = (value: unknown, max = 1200): string =>
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
    if (type === "signature") {
      return {
        id,
        type: "signature",
        title: safeText(block.title, 120) || "Approvals & Signatures",
        clientName: safeText(block.clientName, 120),
        clientRole: safeText(block.clientRole, 80),
        contractorName: safeText(block.contractorName, 120),
        contractorRole: safeText(block.contractorRole, 80),
        date: safeText(block.date, 40),
      };
    }
    if (type === "payment_schedule") {
      const rawMilestones = Array.isArray(block.milestones) ? block.milestones.slice(0, 20) : [];
      const milestones = rawMilestones.map((m) => {
        const entry = m as Record<string, unknown>;
        const percentage = Number(entry.percentage);
        if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
          throw new Error("Payment milestone percentages must be between 0 and 100.");
        }
        const amount = entry.amount !== undefined && entry.amount !== null ? Number(entry.amount) : undefined;
        if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
          throw new Error("Payment milestone amount must be a non-negative number.");
        }
        return {
          stage: safeText(entry.stage, 120),
          percentage,
          ...(amount !== undefined ? { amount } : {}),
          ...(entry.dueDate ? { dueDate: safeText(entry.dueDate, 40) } : {}),
        };
      });
      return {
        id,
        type: "payment_schedule",
        title: safeText(block.title, 120) || "Payment Schedule",
        milestones,
      };
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
    logoPath: typeof raw.logoPath === "string" ? safeText(raw.logoPath, 300) : null,
    logoUrl: typeof raw.logoUrl === "string" ? safeText(raw.logoUrl, 600) : null,
    blocks: normalized,
  };
}

const STUDIO_IMPORT_KEY = "frelux.document-studio.import.v1";

export function stageStudioImport(payload: {
  title: string;
  materials: Array<{ label: string; quantity: number; unit: string; unitPrice: number }>;
  notes: string;
  document_type: string;
  currency: string;
}): void {
  try {
    window.sessionStorage.setItem(STUDIO_IMPORT_KEY, JSON.stringify(payload));
  } catch {
    throw new Error("Could not prepare calculator data for Document Studio.");
  }
}

export function consumeStudioImport(): unknown | null {
  try {
    const raw = window.sessionStorage.getItem(STUDIO_IMPORT_KEY);
    window.sessionStorage.removeItem(STUDIO_IMPORT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    window.sessionStorage.removeItem(STUDIO_IMPORT_KEY);
    throw new Error("Calculator data could not be read safely.");
  }
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


export interface StudioPlanLimit {
  plan: string;
  monthly_exports: number;
  visual_builder: boolean;
  custom_branding: boolean;
  watermark_removal: boolean;
}

export interface StudioAuditEntry {
  id: string;
  actor_user_id: string;
  action: string;
  plan: string;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  created_at: string;
}

export async function fetchStudioPlanLimits(): Promise<StudioPlanLimit[]> {
  const { data, error } = await supabase
    .from("pdf_studio_plan_limits")
    .select("plan, monthly_exports, visual_builder, custom_branding, watermark_removal")
    .order("monthly_exports", { ascending: true });
  if (error) throw error;
  return (data || []) as StudioPlanLimit[];
}

export async function updateStudioPlanLimit(
  plan: string,
  updates: Partial<Omit<StudioPlanLimit, "plan">>,
  previousValues: Partial<Omit<StudioPlanLimit, "plan">> = {}
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  const { error } = await supabase
    .from("pdf_studio_plan_limits")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("plan", plan);
  if (error) throw error;

  if (userId) {
    try {
      await supabase.from("pdf_studio_admin_audit").insert({
        actor_user_id: userId,
        action: "plan_limit_updated",
        plan,
        old_values: previousValues,
        new_values: updates,
      });
    } catch {
      // Non-blocking audit failure
    }
  }
}

export async function fetchStudioAuditLogs(): Promise<StudioAuditEntry[]> {
  const { data, error } = await supabase
    .from("pdf_studio_admin_audit")
    .select("id, actor_user_id, action, plan, old_values, new_values, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []) as StudioAuditEntry[];
}
