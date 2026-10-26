import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  FolderOpen,
  FilePlus2,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import HeroTitle from "@/components/ui/HeroTitle";
import { Button } from "@/components/ui/shadcn/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useSubscription } from "@/lib/subscription";
import {
  archiveStudioTemplate,
  downloadStudioDocument,
  generateStudioPdf,
  listStudioDocuments,
  listStudioTemplates,
  saveStudioTemplate,
  consumeStudioImport,
  safeText,
  validateStudioConfig,
  type StudioBlock,
  type StudioConfig,
  type StudioDocument,
  type StudioTemplate,
} from "@/lib/document-studio";
import { toast } from "sonner";

const freshConfig = (): StudioConfig => ({
  pageSize: "a4",
  orientation: "portrait",
  currency: "NGN",
  locale: "en-NG",
  accentColor: "#7C3AED",
  watermark: true,
  blocks: [
    { id: crypto.randomUUID(), type: "heading", text: "Project details" },
    {
      id: crypto.randomUUID(),
      type: "paragraph",
      text: "Enter verified project or client information. This builder does not invent measurements, rates, taxes, or project details.",
    },
    {
      id: crypto.randomUUID(),
      type: "materials",
      title: "Materials schedule",
      rows: [],
    },
  ],
});
const types: StudioTemplate["document_type"][] = [
  "quotation",
  "material_schedule",
  "project_summary",
  "invoice",
  "labour_schedule",
  "bill_of_quantities",
];

export default function DocumentStudio() {
  const { user } = useAuth();
  const subscription = useSubscription();
  const [searchParams] = useSearchParams();
  const [templates, setTemplates] = useState<StudioTemplate[]>([]);
  const [documents, setDocuments] = useState<StudioDocument[]>([]);
  const [active, setActive] = useState<StudioTemplate | null>(null);
  const [name, setName] = useState("Untitled document");
  const [docType, setDocType] =
    useState<StudioTemplate["document_type"]>("quotation");
  const [config, setConfig] = useState<StudioConfig>(freshConfig);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const canSave =
    subscription.isActive &&
    ["pro", "premium", "enterprise"].includes(subscription.plan);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!canSave) {
      toast.error(
        "Custom logo branding requires a Professional plan or above.",
      );
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Please upload a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file size must not exceed 2MB.");
      return;
    }
    setUploadingLogo(true);
    try {
      const ext =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("pdf-studio-logos")
        .upload(path, file, {
          upsert: false,
          contentType: file.type,
        });
      if (uploadError) throw uploadError;

      const { data: signData, error: signError } = await supabase.storage
        .from("pdf-studio-logos")
        .createSignedUrl(path, 3600);
      if (signError) throw signError;

      setConfig((c) => ({ ...c, logoPath: path, logoUrl: signData.signedUrl }));
      toast.success("Logo uploaded and attached to template.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload logo.",
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setConfig((c) => ({ ...c, logoPath: null, logoUrl: null }));
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([listStudioTemplates(), listStudioDocuments()])
      .then(([saved, docs]) => {
        setTemplates(saved);
        setDocuments(docs);
      })
      .catch(() => toast.error("Could not load your saved documents."))
      .finally(() => setLoading(false));
  }, [user]);
  useEffect(() => {
    if (!searchParams.has("calculatorImport")) return;
    try {
      const raw = consumeStudioImport();
      if (!raw || typeof raw !== "object") return;
      const parsed = raw as {
        title?: string;
        materials?: Array<{
          label: string;
          quantity: number;
          unit: string;
          unitPrice: number;
        }>;
        notes?: string;
        document_type?: StudioTemplate["document_type"];
        currency?: string;
      };
      if (parsed.title) setName(safeText(parsed.title, 120));
      if (parsed.document_type && types.includes(parsed.document_type))
        setDocType(parsed.document_type);
      setConfig((prev) => {
        const blocks: StudioBlock[] = [
          {
            id: crypto.randomUUID(),
            type: "heading",
            text: safeText(parsed.title || "Project details", 160),
          },
          {
            id: crypto.randomUUID(),
            type: "paragraph",
            text: safeText(parsed.notes || "", 2000),
          },
        ];
        if (Array.isArray(parsed.materials) && parsed.materials.length > 0) {
          blocks.push({
            id: crypto.randomUUID(),
            type: "materials",
            title: "Materials schedule",
            rows: parsed.materials.map((m) => ({
              label: safeText(m.label, 160),
              quantity: Math.max(0, Number(m.quantity) || 0),
              unit: safeText(m.unit, 24),
              unitPrice: Math.max(0, Number(m.unitPrice) || 0),
            })),
          });
        }
        return {
          ...prev,
          currency: safeText(parsed.currency, 3) || prev.currency,
          blocks,
        };
      });
      toast.info(
        "Calculator data loaded into Document Studio. Review and customize before export.",
      );
    } catch {
      toast.error("The calculator data could not be imported safely.");
    }
  }, [searchParams]);

  const total = useMemo(
    () =>
      config.blocks.reduce(
        (sum, b) =>
          b.type === "materials"
            ? sum + b.rows.reduce((s, r) => s + r.quantity * r.unitPrice, 0)
            : sum,
        0,
      ),
    [config],
  );
  const updateBlock = (id: string, patch: Partial<StudioBlock>) =>
    setConfig((c) => ({
      ...c,
      blocks: c.blocks.map((b) =>
        b.id === id ? ({ ...b, ...patch } as StudioBlock) : b,
      ),
    }));
  const move = (index: number, direction: number) =>
    setConfig((c) => {
      const blocks = [...c.blocks];
      const next = index + direction;
      if (next < 0 || next >= blocks.length) return c;
      [blocks[index], blocks[next]] = [blocks[next], blocks[index]];
      return { ...c, blocks };
    });
  const addBlock = (type: StudioBlock["type"]) => {
    setConfig((c) => {
      let newBlock: StudioBlock;
      if (type === "materials") {
        newBlock = {
          id: crypto.randomUUID(),
          type: "materials",
          title: "Materials",
          rows: [],
        };
      } else if (type === "signature") {
        newBlock = {
          id: crypto.randomUUID(),
          type: "signature",
          title: "Signatures",
          clientName: "",
          clientRole: "Client",
          contractorName: "",
          contractorRole: "Contractor",
          date: new Date().toISOString().slice(0, 10),
        };
      } else if (type === "payment_schedule") {
        newBlock = {
          id: crypto.randomUUID(),
          type: "payment_schedule",
          title: "Payment Schedule",
          milestones: [
            { stage: "Mobilization", percentage: 30 },
            { stage: "Practical Completion", percentage: 70 },
          ],
        };
      } else {
        newBlock = {
          id: crypto.randomUUID(),
          type,
          text: type === "heading" ? "New section" : "Add verified notes here.",
        };
      }
      return { ...c, blocks: [...c.blocks, newBlock] };
    });
  };
  const loadTemplate = async (template: StudioTemplate) => {
    setActive(template);
    setName(template.name);
    setDocType(template.document_type);
    try {
      const validated = validateStudioConfig(template.config);
      if (validated.logoPath && !validated.logoUrl) {
        const { data: signData } = await supabase.storage
          .from("pdf-studio-logos")
          .createSignedUrl(validated.logoPath, 3600);
        if (signData?.signedUrl) {
          validated.logoUrl = signData.signedUrl;
        }
      }
      setConfig(validated);
    } catch {
      toast.error("This template has invalid data.");
    }
  };
  const save = async () => {
    if (!canSave) {
      toast.error(
        "Saving reusable templates requires a paid FRELUX subscription.",
      );
      return;
    }
    setBusy(true);
    try {
      const saved = await saveStudioTemplate({
        id: active?.id,
        version: active?.version,
        name,
        document_type: docType,
        config,
      });
      setActive(saved);
      setTemplates((current) => [
        saved,
        ...current.filter((t) => t.id !== saved.id),
      ]);
      toast.success("Template saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save template.",
      );
    } finally {
      setBusy(false);
    }
  };
  const duplicate = async (template: StudioTemplate) => {
    setBusy(true);
    try {
      const copy = await saveStudioTemplate({
        name: `${template.name} copy`,
        document_type: template.document_type,
        config: template.config,
      });
      setTemplates((current) => [copy, ...current]);
      loadTemplate(copy);
      toast.success("Template duplicated.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not duplicate template.",
      );
    } finally {
      setBusy(false);
    }
  };
  const archive = async (template: StudioTemplate) => {
    try {
      await archiveStudioTemplate(template.id);
      setTemplates((current) => current.filter((t) => t.id !== template.id));
      if (active?.id === template.id) {
        setActive(null);
        setName("Untitled document");
        setConfig(freshConfig());
      }
      toast.success("Template archived.");
    } catch {
      toast.error("Could not archive template.");
    }
  };
  const download = async () => {
    setBusy(true);
    try {
      await generateStudioPdf(name, config);
      setDocuments(await listStudioDocuments());
      toast.success("PDF generated and saved to My Documents.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "PDF could not be generated.",
      );
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    setActive(null);
    setName("Untitled document");
    setDocType("quotation");
    setConfig(freshConfig());
  };
  const money = (n: number) => {
    try {
      return new Intl.NumberFormat(config.locale, {
        style: "currency",
        currency: config.currency,
      }).format(n);
    } catch {
      return `${config.currency} ${n.toFixed(2)}`;
    }
  };

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8">
      <HeroTitle title="Document Studio" />
      <div className="mb-6 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        PDF export uses the signed-in account's server-side monthly allowance.
        This first studio version supports manually entered content and material
        schedules; it does not yet import calculator results or saved project
        records. No taxes, measurements, or market prices are inferred.
      </div>
      <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">My templates</h2>
            <Button variant="outline" size="sm" onClick={reset}>
              <FilePlus2 className="mr-2 h-4 w-4" />
              New
            </Button>
          </div>
          {!user && (
            <p className="text-sm text-muted-foreground">
              Sign in to save and reuse templates.
            </p>
          )}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading templates…</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved templates yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {templates.map((template) => (
                <li
                  key={template.id}
                  className={`rounded-lg border p-3 ${active?.id === template.id ? "border-primary" : "border-border"}`}
                >
                  <button
                    className="w-full text-left"
                    onClick={() => loadTemplate(template)}
                  >
                    <span className="block font-medium">{template.name}</span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {template.document_type.replace(/_/g, " ")} · v
                      {template.version}
                    </span>
                  </button>
                  <div className="mt-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Duplicate ${template.name}`}
                      onClick={() => duplicate(template)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Archive ${template.name}`}
                      onClick={() => archive(template)}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t pt-4">
            <h3 className="mb-2 font-semibold">My Documents</h3>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No generated PDFs yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {documents.map((document) => (
                  <li
                    key={document.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {document.file_name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Download ${document.file_name}`}
                      onClick={() =>
                        downloadStudioDocument(document.id).catch(() =>
                          toast.error("Could not download this document."),
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {subscription.isActive ? `Plan: ${subscription.plan}` : "Free plan"}{" "}
            · ask server for current usage when exporting.
          </p>
          <Link className="text-sm text-primary underline" to="/pricing">
            View plans and billing
          </Link>
        </aside>
        <section className="space-y-6">
          <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
            <label className="text-sm">
              Template name
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Document type
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={docType}
                onChange={(e) =>
                  setDocType(e.target.value as StudioTemplate["document_type"])
                }
              >
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Page size
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={config.pageSize}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    pageSize: e.target.value as StudioConfig["pageSize"],
                  }))
                }
              >
                <option value="a4">A4</option>
                <option value="a3">A3</option>
                <option value="letter">US Letter</option>
              </select>
            </label>
            <label className="text-sm">
              Orientation
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                value={config.orientation}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    orientation: e.target.value as StudioConfig["orientation"],
                  }))
                }
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>
            <label className="text-sm">
              Currency (ISO 4217)
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                maxLength={3}
                value={config.currency}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    currency: e.target.value.toUpperCase(),
                  }))
                }
              />
            </label>
            <label className="text-sm">
              Locale
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                maxLength={20}
                value={config.locale}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, locale: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              Accent color
              <input
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2"
                type="color"
                value={config.accentColor}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, accentColor: e.target.value }))
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.watermark}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, watermark: e.target.checked }))
                }
              />{" "}
              FRELUX watermark
            </label>
            <div className="sm:col-span-2 rounded border border-border p-3 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  Company Logo (Professional+)
                </span>
                {config.logoPath && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeLogo}
                    className="h-7 text-xs text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
              {config.logoUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={config.logoUrl}
                    alt="Company logo preview"
                    className="h-10 w-auto max-w-32 object-contain rounded border border-border bg-white p-1"
                  />
                  <span className="text-xs text-muted-foreground truncate">
                    {config.logoPath}
                  </span>
                </div>
              ) : (
                <input
                  type="file"
                  aria-label="Company logo upload"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo || !canSave}
                  className="text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
                />
              )}
              {!canSave && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Upgrade to Professional to upload and display your custom
                  company branding on exports.
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                "heading",
                "paragraph",
                "materials",
                "terms",
                "signature",
                "payment_schedule",
              ] as const
            ).map((type) => (
              <Button
                key={type}
                variant="outline"
                onClick={() => addBlock(type)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add {type.replace("_", " ")}
              </Button>
            ))}
          </div>
          <div className="space-y-3">
            {config.blocks.map((block, index) => (
              <article
                key={block.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium capitalize">{block.type}</h3>
                  <div className="flex">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Move section up"
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Move section down"
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Remove section"
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          blocks: c.blocks.filter((b) => b.id !== block.id),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {block.type === "materials" ? (
                  <>
                    <input
                      aria-label="Materials section title"
                      className="mb-3 w-full rounded border border-input bg-background px-3 py-2"
                      value={block.title}
                      onChange={(e) =>
                        updateBlock(block.id, { title: e.target.value })
                      }
                    />
                    <div className="space-y-2">
                      {block.rows.map((row, i) => (
                        <div
                          key={`${block.id}-${i}`}
                          className="grid gap-2 sm:grid-cols-4"
                        >
                          <input
                            aria-label="Material name"
                            className="rounded border border-input bg-background px-2 py-2"
                            placeholder="Item"
                            value={row.label}
                            onChange={(e) =>
                              updateBlock(block.id, {
                                rows: block.rows.map((r, j) =>
                                  j === i ? { ...r, label: e.target.value } : r,
                                ),
                              })
                            }
                          />
                          <input
                            aria-label="Quantity"
                            className="rounded border border-input bg-background px-2 py-2"
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Quantity"
                            value={row.quantity || ""}
                            onChange={(e) =>
                              updateBlock(block.id, {
                                rows: block.rows.map((r, j) =>
                                  j === i
                                    ? { ...r, quantity: Number(e.target.value) }
                                    : r,
                                ),
                              })
                            }
                          />
                          <input
                            aria-label="Unit"
                            className="rounded border border-input bg-background px-2 py-2"
                            placeholder="Unit"
                            value={row.unit}
                            onChange={(e) =>
                              updateBlock(block.id, {
                                rows: block.rows.map((r, j) =>
                                  j === i ? { ...r, unit: e.target.value } : r,
                                ),
                              })
                            }
                          />
                          <div className="flex gap-1">
                            <input
                              aria-label="Unit price"
                              className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-2"
                              type="number"
                              min="0"
                              step="any"
                              placeholder="Unit price"
                              value={row.unitPrice || ""}
                              onChange={(e) =>
                                updateBlock(block.id, {
                                  rows: block.rows.map((r, j) =>
                                    j === i
                                      ? {
                                          ...r,
                                          unitPrice: Number(e.target.value),
                                        }
                                      : r,
                                  ),
                                })
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Remove material row"
                              onClick={() =>
                                updateBlock(block.id, {
                                  rows: block.rows.filter((_, j) => j !== i),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="mt-3"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateBlock(block.id, {
                          rows: [
                            ...block.rows,
                            { label: "", quantity: 0, unit: "", unitPrice: 0 },
                          ],
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add material
                    </Button>
                  </>
                ) : block.type === "signature" ? (
                  <div className="space-y-3">
                    <input
                      aria-label="Signature section title"
                      className="w-full rounded border border-input bg-background px-3 py-2 text-sm font-medium"
                      value={block.title}
                      onChange={(e) =>
                        updateBlock(block.id, { title: e.target.value })
                      }
                      placeholder="Signatures Title"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 rounded border border-border p-3">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          Client Representative
                        </span>
                        <input
                          aria-label="Client name"
                          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                          placeholder="Client Name"
                          value={block.clientName}
                          onChange={(e) =>
                            updateBlock(block.id, {
                              clientName: e.target.value,
                            })
                          }
                        />
                        <input
                          aria-label="Client role"
                          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                          placeholder="Title/Role (e.g. Owner)"
                          value={block.clientRole}
                          onChange={(e) =>
                            updateBlock(block.id, {
                              clientRole: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2 rounded border border-border p-3">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          Contractor / Firm
                        </span>
                        <input
                          aria-label="Contractor name"
                          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                          placeholder="Contractor Name"
                          value={block.contractorName}
                          onChange={(e) =>
                            updateBlock(block.id, {
                              contractorName: e.target.value,
                            })
                          }
                        />
                        <input
                          aria-label="Contractor role"
                          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                          placeholder="Title/Role (e.g. Lead Engineer)"
                          value={block.contractorRole}
                          onChange={(e) =>
                            updateBlock(block.id, {
                              contractorRole: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <input
                      aria-label="Signature date"
                      className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                      type="date"
                      value={block.date}
                      onChange={(e) =>
                        updateBlock(block.id, { date: e.target.value })
                      }
                    />
                  </div>
                ) : block.type === "payment_schedule" ? (
                  <div className="space-y-3">
                    <input
                      aria-label="Payment schedule title"
                      className="w-full rounded border border-input bg-background px-3 py-2 text-sm font-medium"
                      value={block.title}
                      onChange={(e) =>
                        updateBlock(block.id, { title: e.target.value })
                      }
                      placeholder="Payment Schedule Title"
                    />
                    <div className="space-y-2">
                      {block.milestones.map((m, i) => (
                        <div key={i} className="grid gap-2 sm:grid-cols-3">
                          <input
                            aria-label="Milestone stage"
                            className="rounded border border-input bg-background px-2 py-1.5 text-sm"
                            placeholder="Stage/Milestone"
                            value={m.stage}
                            onChange={(e) =>
                              updateBlock(block.id, {
                                milestones: block.milestones.map((ms, j) =>
                                  j === i
                                    ? { ...ms, stage: e.target.value }
                                    : ms,
                                ),
                              })
                            }
                          />
                          <input
                            aria-label="Milestone percentage"
                            className="rounded border border-input bg-background px-2 py-1.5 text-sm"
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Percentage (%)"
                            value={m.percentage || ""}
                            onChange={(e) =>
                              updateBlock(block.id, {
                                milestones: block.milestones.map((ms, j) =>
                                  j === i
                                    ? {
                                        ...ms,
                                        percentage: Number(e.target.value),
                                      }
                                    : ms,
                                ),
                              })
                            }
                          />
                          <div className="flex gap-1">
                            <input
                              aria-label="Milestone amount"
                              className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1.5 text-sm"
                              type="number"
                              min="0"
                              placeholder="Amount (optional)"
                              value={m.amount || ""}
                              onChange={(e) =>
                                updateBlock(block.id, {
                                  milestones: block.milestones.map((ms, j) =>
                                    j === i
                                      ? {
                                          ...ms,
                                          amount: e.target.value
                                            ? Number(e.target.value)
                                            : undefined,
                                        }
                                      : ms,
                                  ),
                                })
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Remove milestone"
                              onClick={() =>
                                updateBlock(block.id, {
                                  milestones: block.milestones.filter(
                                    (_, j) => j !== i,
                                  ),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateBlock(block.id, {
                          milestones: [
                            ...block.milestones,
                            { stage: "New milestone", percentage: 0 },
                          ],
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add milestone
                    </Button>
                  </div>
                ) : (
                  <textarea
                    className="min-h-24 w-full rounded border border-input bg-background px-3 py-2"
                    maxLength={block.type === "heading" ? 160 : 3000}
                    value={block.text}
                    onChange={(e) =>
                      updateBlock(block.id, { text: e.target.value })
                    }
                  />
                )}
              </article>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={busy || !user || !canSave}>
              <Save className="mr-2 h-4 w-4" />
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save template"
              )}
            </Button>
            <Button variant="outline" onClick={download} disabled={busy}>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="ghost" onClick={reset}>
              Reset editor
            </Button>
          </div>
          {!canSave && (
            <p className="text-sm text-muted-foreground">
              Saving templates is available on paid plans. Basic editing and
              export usage are governed by your account's server-side allowance.{" "}
              <Link className="text-primary underline" to="/pricing">
                Compare plans
              </Link>
              .
            </p>
          )}
          <section
            className="rounded-xl border border-border bg-white p-6 text-slate-900 shadow-sm"
            aria-label="Document preview"
          >
            <div
              className="mb-4 h-1 rounded"
              style={{ backgroundColor: config.accentColor }}
            />
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-bold tracking-widest text-slate-500">
                FRELUX {config.watermark ? "· WATERMARKED" : ""}
              </div>
              {config.logoUrl && (
                <img
                  src={config.logoUrl}
                  alt="Company logo"
                  className="h-8 w-auto max-w-28 object-contain"
                />
              )}
            </div>
            <h2 className="mb-5 text-2xl font-bold">
              {name || "Untitled document"}
            </h2>
            {config.blocks.map((block) => {
              if (block.type === "heading") {
                return (
                  <h3
                    key={block.id}
                    className="mb-2 mt-4 text-lg font-semibold"
                    style={{ color: config.accentColor }}
                  >
                    {block.text}
                  </h3>
                );
              }
              if (block.type === "paragraph" || block.type === "terms") {
                return (
                  <p
                    key={block.id}
                    className="mb-3 whitespace-pre-wrap text-sm"
                  >
                    {block.text}
                  </p>
                );
              }
              if (block.type === "materials") {
                return (
                  <div key={block.id} className="mb-4">
                    <h3 className="mb-2 font-semibold">{block.title}</h3>
                    {block.rows.map((row, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-5 border-b py-1 text-xs"
                      >
                        <span>{row.label || "—"}</span>
                        <span>{row.quantity}</span>
                        <span>{row.unit}</span>
                        <span>{money(row.unitPrice)}</span>
                        <span>{money(row.quantity * row.unitPrice)}</span>
                      </div>
                    ))}
                  </div>
                );
              }
              if (block.type === "signature") {
                return (
                  <div
                    key={block.id}
                    className="my-6 rounded border border-slate-200 p-4"
                  >
                    <h4 className="mb-4 font-semibold text-slate-800">
                      {block.title}
                    </h4>
                    <div className="grid grid-cols-2 gap-6 text-xs text-slate-700">
                      <div>
                        <div className="h-8 border-b border-dashed border-slate-300" />
                        <p className="mt-1 font-medium">
                          {block.clientName || "Client Name"}
                        </p>
                        <p className="text-slate-500">
                          {block.clientRole || "Client Representative"}
                        </p>
                      </div>
                      <div>
                        <div className="h-8 border-b border-dashed border-slate-300" />
                        <p className="mt-1 font-medium">
                          {block.contractorName || "Contractor Name"}
                        </p>
                        <p className="text-slate-500">
                          {block.contractorRole || "Contractor Representative"}
                        </p>
                      </div>
                    </div>
                    {block.date ? (
                      <p className="mt-3 text-right text-xs text-slate-400">
                        Date: {block.date}
                      </p>
                    ) : null}
                  </div>
                );
              }
              if (block.type === "payment_schedule") {
                return (
                  <div key={block.id} className="my-4">
                    <h4 className="mb-2 font-semibold text-slate-800">
                      {block.title}
                    </h4>
                    <div className="space-y-1 text-xs">
                      {block.milestones.map((m, i) => (
                        <div
                          key={i}
                          className="flex justify-between border-b py-1"
                        >
                          <span>
                            {m.stage} ({m.percentage}%)
                          </span>
                          <span>
                            {m.amount !== undefined ? money(m.amount) : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })}
            <div className="mt-4 border-t pt-3 text-right font-semibold">
              Material subtotal: {money(total)}
            </div>
            <p className="mt-5 text-right text-xs text-slate-500">
              Preview is illustrative; PDF export is generated by the same
              structured content configuration.
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}
