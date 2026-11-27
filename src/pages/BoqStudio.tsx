import StandaloneEstimateAccuracyFeedback from "@/components/calculators/StandaloneEstimateAccuracyFeedback";
import EstimateDisclaimer from "@/components/calculators/EstimateDisclaimer";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import AdSlot from "@/components/ui/AdSlot";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { getSafeError } from "@/lib/safeError";
import { formatByCode } from "@/lib/international/currency-format";
import { exportBoqToCsv, type BoqStandard } from "@/lib/finance/boq-standard";
import { convertSurveyToPriced } from "@/lib/boq/survey";
import {
  buildQuoteShareMessage,
  buildQuoteShareSnapshot,
  quoteShareHeading,
  quoteShareUrl,
  type QuoteShareSnapshot,
} from "@/lib/boq/share";
import { createQuoteShare, revokeQuoteShare } from "@/lib/boq/share-queries";
import {
  compileBoq,
  documentStatusLabel,
  itemAmount,
  itemUnitRate,
} from "@/lib/boq/compile";
import {
  CALCULATOR_SECTIONS,
  makeItemId,
  mergeImportedLines,
  previewImport,
  type ImportPreview,
  type RawSourceRecord,
} from "@/lib/boq/imports";
import {
  fetchAllSections,
  fetchDocuments,
  fetchImportSources,
  fetchTemplates,
  saveDocument,
  snapshotRevision,
  type BoqDocumentRow,
} from "@/lib/boq/queries";
import {
  createEmptyDocument,
  type BoqStudioDocument,
  type BoqStudioItem,
  type BoqStudioSection,
  type BoqTemplateRow,
} from "@/lib/boq/types";
import { downloadBoqXlsx } from "@/lib/boq/xlsx";
import ScreenProtection from "@/components/documents/ScreenProtection";
import PrintPaywallModal from "@/components/documents/PrintPaywallModal";
import DocumentSubscriptionGate from "@/components/documents/DocumentSubscriptionGate";
import {
  canExportBoqSummary,
  canExportDocuments,
  canPrintDocument,
} from "@/lib/documents/document-access";
import { useDisplayCurrency } from "@/lib/international/currency-context";
import { useLanguage } from "@/lib/i18n";
import { UnrenderableScriptError } from "@/lib/boq/fonts";
import { downloadBoqPdf } from "@/lib/boq/pdf";
import { resolveReviewerCredential } from "@/lib/identity/credentials";
import {
  downloadOutlineBoqPdf,
  needsOutlineRenderer,
} from "@/lib/boq/pdf-arabic";
import {
  boqStudioPrintHtml,
  boqSummaryPrintHtml,
  openBoqPrint,
  openPrintHtml,
} from "@/lib/boq/print";
import { NumericInput } from "@/components/ui/NumericInput";
import { methodologyText } from "@/lib/calculatorMethodology";
import HowCalculatedSection from "@/components/calculators/HowCalculatedSection";
import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import {
  fetchBrandProfiles,
  resolveBranding,
  resolveBrandStudioAccess,
} from "@/lib/brand-studio";
import { ShieldCheck, ExternalLink } from "lucide-react";
import {
  SAMPLE_BUNGALOW_VERIFICATION,
  SAMPLE_VERIFIED_BUNGALOW_BOQ,
} from "@/lib/boq/sample-bungalow-boq";

/**
 * BOQ Studio.
 *
 * This page is an editor, not a calculator: every figure it shows comes from
 * compileBoq, which delegates the arithmetic to the standard BOQ engine. Users
 * import quantities the calculators already validated, rate them, and export.
 */

const FIELD =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const LABEL =
  "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";
const CARD = "rounded-2xl border border-slate-200 bg-white p-5";

export default function BoqStudio() {
  const auth = useAuth();
  const { user, loading } = auth;
  const navigate = useNavigate();
  const cur = useDisplayCurrency();
  const userCurrency = cur.code || "USD";
  const { t } = useLanguage();
  const [showDocumentGate, setShowDocumentGate] = useState(false);
  const [showPrintPaywall, setShowPrintPaywall] = useState(false);
  const [printDocId, setPrintDocId] = useState("boq-studio");
  useSeo({
    title: "Bill of Quantities Generator",
    description:
      "Build a professional construction bill of quantities from your FRELUX calculator results, then export it to PDF, Excel or print.",
    canonicalPath: "/boq-studio",
  });

  const [templates, setTemplates] = useState<BoqTemplateRow[]>([]);
  const [documents, setDocuments] = useState<BoqDocumentRow[]>([]);
  const [sources, setSources] = useState<RawSourceRecord[]>([]);
  const [templateSlug, setTemplateSlug] = useState("ng-commercial");
  const [doc, setDoc] = useState<BoqStudioDocument | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [isSampleActive, setIsSampleActive] = useState(false);
  const [saving, setSaving] = useState(false);
  // FRELUX VERIFY toggle: on by default, matching the existing export
  // behaviour; switching it off exports without the seal and without a
  // blockchain registration.
  // The seal is the user's decision at export time — off until they opt in.
  // Verified by default: an exported BOQ without its QR is a document a client
  // cannot check. The toggle still lets the user turn the seal off.
  const [busy, setBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareSnapshot, setShareSnapshot] = useState<QuoteShareSnapshot | null>(
    null,
  );
  const [importPreviews, setImportPreviews] = useState<ImportPreview[]>([]);
  const [selectedImports, setSelectedImports] = useState<
    Record<string, boolean>
  >({});

  const compiled = useMemo(() => (doc ? compileBoq(doc) : null), [doc]);

  /** A survey becomes an offer by keeping its captured rates and restoring the
   *  commercial layer, so the quantities never have to be re-entered. */
  const handleConvertToPriced = () => {
    if (!doc) return;
    setDoc(convertSurveyToPriced(doc));
    toast.success(
      t(
        "Converted to a priced quote. The captured market rates are kept as line rates.",
      ),
    );
  };

  const refreshLibrary = useCallback(async () => {
    const [t, d] = await Promise.all([
      fetchTemplates(),
      user
        ? fetchDocuments(user.id)
        : Promise.resolve({ documents: [], error: null }),
    ]);
    setTemplates(t.templates);
    if (t.error) toast.error(t.error);
    setDocuments(d.documents);
  }, [user]);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    if (!user) {
      setSources([]);
      return;
    }
    void (async () => {
      const { records, error } = await fetchImportSources(user.id);
      if (error) toast.error(error);
      setSources(records);
      setImportPreviews(
        records.map(previewImport).filter((p) => p.lines.length > 0),
      );
    })();
  }, [user]);

  const startNewDocument = useCallback(async () => {
    const template =
      templates.find((t) => t.slug === templateSlug) ?? templates[0];
    const library = await fetchAllSections();
    const standard = (template?.standard ?? "Commercial") as BoqStandard;
    const librarySections = library.sections.filter(
      (s) => s.standard === standard,
    );

    const base = createEmptyDocument({
      currency: template?.currency ?? "NGN",
      marketCode: template?.market_code ?? "NG",
      standard,
      templateSlug: template?.slug ?? "ng-commercial",
      preparedBy: user?.user_metadata?.full_name ?? "",
    });

    const sections: BoqStudioSection[] = librarySections.map((s) => ({
      id: `sec-${s.code}`,
      code: s.code,
      title: s.title,
      notes: "",
      items: [],
    }));

    const next: BoqStudioDocument = {
      ...base,
      measurement_system: template?.measurement_system ?? "metric",
      reference: `BOQ-${new Date().getFullYear()}-${String(documents.length + 1).padStart(3, "0")}`,
      commercials: {
        preliminaries_pct: Number(template?.default_preliminaries_pct ?? 0),
        overhead_profit_pct: Number(template?.default_overhead_profit_pct ?? 0),
        contingency_pct: Number(template?.default_contingency_pct ?? 0),
        retention_pct: Number(template?.default_retention_pct ?? 0),
        waste_allowance_pct: 0,
        tax_pct:
          template?.default_tax_pct === null ||
          template?.default_tax_pct === undefined
            ? null
            : Number(template.default_tax_pct),
      },
      sections,
    };
    setIsSampleActive(false);
    setDoc(next);
    setDocumentId(null);
  }, [templates, templateSlug, user, documents.length]);

  const loadSampleVerifiedBoq = () => {
    setDoc(JSON.parse(JSON.stringify(SAMPLE_VERIFIED_BUNGALOW_BOQ)));
    setDocumentId(null);
    setIsSampleActive(true);
    toast.success(
      t("Loaded verified sample 3-bedroom bungalow BOQ with blockchain proof."),
    );
  };

  const patch = (changes: Partial<BoqStudioDocument>) =>
    setDoc((prev) =>
      prev
        ? { ...prev, ...changes, updated_at: new Date().toISOString() }
        : prev,
    );

  const patchItem = (
    sectionId: string,
    itemId: string,
    changes: Partial<BoqStudioItem>,
  ) => {
    setDoc((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((s) =>
              s.id === sectionId
                ? {
                    ...s,
                    items: s.items.map((i) =>
                      i.id === itemId ? { ...i, ...changes } : i,
                    ),
                  }
                : s,
            ),
            updated_at: new Date().toISOString(),
          }
        : prev,
    );
  };

  const addItem = (sectionId: string) => {
    setDoc((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((s) =>
              s.id === sectionId
                ? {
                    ...s,
                    items: [
                      ...s.items,
                      {
                        id: makeItemId(),
                        item_number: "",
                        description: "",
                        specification: "",
                        unit:
                          prev.measurement_system === "metric" ? "m²" : "ft²",
                        quantity: 0,
                        material_rate: 0,
                        labour_rate: 0,
                        plant_rate: 0,
                        notes: "",
                        rates_include_waste: false,
                      },
                    ],
                  }
                : s,
            ),
          }
        : prev,
    );
  };

  const addSection = () => {
    setDoc((prev) =>
      prev
        ? {
            ...prev,
            sections: [
              ...prev.sections,
              {
                id: makeItemId(),
                code: String(prev.sections.length + 1).padStart(2, "0"),
                title: "Custom section",
                notes: "",
                items: [],
              },
            ],
          }
        : prev,
    );
  };

  const runImport = () => {
    if (!doc) return;
    const chosen = importPreviews.filter((p) => selectedImports[p.record.ref]);
    if (chosen.length === 0) {
      toast.error(t("Select at least one saved calculation to import."));
      return;
    }
    const allLines = chosen.flatMap((p) => p.lines);
    const { sections, added, skipped } = mergeImportedLines(
      doc.sections,
      allLines,
    );
    patch({ sections });
    toast.success(
      `Imported ${added} line${added === 1 ? "" : "s"}${skipped ? `, skipped ${skipped} duplicate(s)` : ""}.`,
    );
    setSelectedImports({});
  };

  const handleSave = async () => {
    if (!doc || !user) return;
    setSaving(true);
    try {
      const { id, error } = await saveDocument({
        id: documentId,
        userId: user.id,
        document: doc,
        totals: (compiled?.standard.summary ?? null) as Record<
          string,
          unknown
        > | null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      setDocumentId(id);
      if (id)
        await snapshotRevision({
          quoteId: id,
          userId: user.id,
          document: doc,
          totals: compiled?.standard.summary ?? null,
        });
      toast.success(t("BOQ saved."));
      void refreshLibrary();
    } catch (error) {
      toast.error(
        error instanceof UnrenderableScriptError
          ? error.message
          : getSafeError(error),
      );
    } finally {
      setSaving(false);
    }
  };

  const loadDocument = async (row: BoqDocumentRow) => {
    if (!row.boq_document) return;
    setIsSampleActive(false);
    setDoc(row.boq_document);
    setDocumentId(row.id);
    toast.success(`${t("Loaded")} ${row.title}`);
  };

  const guardExport = (): boolean => {
    if (!compiled) return false;
    if (compiled.warnings.blocking.length > 0) {
      toast.error(compiled.warnings.blocking[0]);
      return false;
    }
    return true;
  };

  const requireFreeAccount = () => {
    if (user) return true;
    const redirect = encodeURIComponent(
      `${window.location.pathname}${window.location.search}`,
    );
    navigate(`/login?mode=signup&redirect=${redirect}`);
    return false;
  };

  const exportSummaryPdf = async () => {
    if (!doc || !compiled || !guardExport()) return;
    if (!canExportBoqSummary({ isRegistered: Boolean(user) })) {
      requireFreeAccount();
      return;
    }
    setBusy(true);
    try {
      // Complex scripts (Arabic, Indic, CJK) are drawn by the outline renderer:
      // the jsPDF engine cannot shape them, and a printed page cannot be hashed or sealed.
      if (needsOutlineRenderer(compiled.standard, compiled.document)) {
        await downloadOutlineBoqPdf(compiled.standard, compiled.document, {
          summaryOnly: true,
          stampOnBlockchain: false,
        });
        toast.success(
          t(
            "Free FRELUX summary BOQ downloaded. Line-level details are excluded.",
          ),
        );
        return;
      }
      await downloadBoqPdf(compiled.standard, compiled.document, {
        summaryOnly: true,
        verify: false,
        stampOnBlockchain: false,
      });
      toast.success(
        t(
          "Free FRELUX summary BOQ downloaded. Line-level details are excluded.",
        ),
      );
    } catch (error) {
      if (error instanceof UnrenderableScriptError && compiled) {
        // The PDF engine cannot draw this script; the browser can. Same
        // figures, printed from HTML, with no claim that a PDF was produced.
        const opened = openPrintHtml(
          boqSummaryPrintHtml(compiled.standard, compiled.document),
        );
        toast.error(
          opened
            ? t(
                "This script needs browser text shaping, so the summary opened in the print view. Choose Save as PDF there.",
              )
            : t(
                "The print view was blocked. Allow pop-ups to print this document.",
              ),
        );
        return;
      }
      toast.error(getSafeError(error));
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = async (verified = false) => {
    if (!doc || !compiled || !guardExport()) return;
    if (!requireFreeAccount()) return;
    if (verified && !canExportDocuments(auth)) {
      setShowDocumentGate(true);
      return;
    }
    const template = templates.find((t) => t.slug === doc.template_slug);
    setBusy(true);
    try {
      let branding = undefined;
      if (verified && user) {
        try {
          const access = await resolveBrandStudioAccess(
            user.id,
            auth.isAdmin,
            auth.isPaid,
            auth.paidStatus,
          );
          if (access.canUseCustomBranding) {
            const profiles = await fetchBrandProfiles(user.id);
            const selected =
              profiles.find((profile) => profile.is_default) ?? profiles[0];
            if (selected) branding = await resolveBranding(selected.id, access);
          }
        } catch {
          // The BOQ contractor identity remains the safe branded fallback.
        }
      }
      if (needsOutlineRenderer(compiled.standard, compiled.document)) {
        const outlineRes = await downloadOutlineBoqPdf(
          compiled.standard,
          compiled.document,
          {
            showMaterialRate: template?.show_material_rate ?? true,
            showLabourRate: template?.show_labour_rate ?? true,
            stampOnBlockchain: verified,
          },
        );
        if (verified && outlineRes?.stampError) {
          toast.error(
            `${t("Sealed, but not blockchain-verified:")} ${outlineRes.stampError}`,
          );
        } else if (verified && outlineRes?.verificationId) {
          toast.success(
            `Verified BOQ PDF exported & anchored to Bitcoin blockchain (ID: ${outlineRes.verificationId})`,
          );
        } else if (verified) {
          toast.error(
            t(
              "BOQ PDF exported, but the blockchain anchor was not created.",
            ),
          );
        } else {
          toast.success(t("FRELUX-branded BOQ PDF downloaded."));
        }
        return;
      }
      const res = await downloadBoqPdf(compiled.standard, compiled.document, {
        showMaterialRate: template?.show_material_rate ?? true,
        showLabourRate: template?.show_labour_rate ?? true,
        verify: verified,
        stampOnBlockchain: verified,
        customBranding: verified,
        branding,
      });
      if (verified && res?.stampError) {
        toast.error(
          `${t("Sealed, but not blockchain-verified:")} ${res.stampError}`,
        );
      } else if (res?.verificationId) {
        toast.success(
          `Verified BOQ PDF exported & anchored to Bitcoin blockchain (ID: ${res.verificationId})`,
        );
      } else {
        toast.success(
          t(
            "FRELUX-branded BOQ PDF downloaded without blockchain verification.",
          ),
        );
      }
    } catch (error) {
      if (error instanceof UnrenderableScriptError && compiled) {
        // A verified PDF cannot be produced for this script (the engine has no
        // shaping), so the document is printed instead. Nothing is claimed
        // about a blockchain anchor, because none was created.
        const opened = openPrintHtml(
          boqStudioPrintHtml(compiled.standard, compiled.document),
        );
        toast.error(
          opened
            ? t(
                "This script needs browser text shaping, so the document opened in the print view and was not blockchain-verified. Choose Save as PDF there.",
              )
            : t(
                "The print view was blocked. Allow pop-ups to print this document.",
              ),
        );
        return;
      }
      toast.error(getSafeError(error));
    } finally {
      setBusy(false);
    }
  };

  const exportEditableSchedule = () => {
    if (!doc || !compiled || !guardExport()) return;
    if (!user) {
      requireFreeAccount();
      return;
    }
    if (!canExportDocuments(auth)) {
      setShowDocumentGate(true);
      return;
    }
    downloadBoqXlsx(compiled.standard, compiled.document);
  };

  const exportCsvSchedule = () => {
    if (!doc || !compiled || !guardExport()) return;
    if (!user) {
      requireFreeAccount();
      return;
    }
    if (!canExportDocuments(auth)) {
      setShowDocumentGate(true);
      return;
    }
    const blob = new Blob([exportBoqToCsv(compiled.standard)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(doc.reference || doc.title || "boq").replace(/[^a-z0-9-_]+/gi, "-")}-R${doc.revision}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportPrint = () => {
    if (!compiled || !guardExport()) return;
    const docRef = doc?.reference || documentId || "boq-studio-doc";
    if (!canPrintDocument(auth, docRef)) {
      setPrintDocId(docRef);
      setShowPrintPaywall(true);
      return;
    }
    void openBoqPrint(compiled.standard, compiled.document, {
      verify: false,
    });
  };

  const shareQuotation = async () => {
    if (!doc || !compiled || !guardExport()) return;
    if (!documentId) {
      toast.error(
        t("Save the document first, so the link points at a stored quotation."),
      );
      return;
    }
    setShareBusy(true);
    try {
      const snapshot = buildQuoteShareSnapshot(compiled);
      const { token, error } = await createQuoteShare({
        documentId,
        snapshot,
      });
      if (error || !token) {
        throw new Error(error ?? "Could not create the share link.");
      }
      setShareToken(token);
      setShareSnapshot(snapshot);
      toast.success(t("Share link created."));
    } catch (error) {
      toast.error(
        error instanceof UnrenderableScriptError
          ? error.message
          : getSafeError(error),
      );
    } finally {
      setShareBusy(false);
    }
  };

  const copyShareLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("Link copied."));
    } catch {
      toast.error(t("Copy failed. Select the link and copy it manually."));
    }
  };

  const revokeShareLink = async () => {
    if (!shareToken) return;
    const { error } = await revokeQuoteShare(shareToken);
    if (error) {
      toast.error(getSafeError(error));
      return;
    }
    setShareToken(null);
    setShareSnapshot(null);
    toast.success(t("Share link revoked. The link no longer opens."));
  };

  const money = (value: number) =>
    formatByCode(value, doc?.currency ?? "NGN", { decimals: 2 });

  if (loading) {
    return (
      <Container>
        <div className="py-24 text-center text-sm text-slate-500">
          Loading BOQ Studio…
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <ScreenProtection
        documentId={doc?.reference || documentId || "boq-studio"}
        documentTitle={doc?.title || "BOQ Studio Document"}
        onPrintRequested={exportPrint}
      >
        <PageHeader
          title={t("Bill of Quantities Studio")}
          subtitle={t(
            "Turn validated calculator results into a structured, exportable BOQ.",
          )}
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <div>
            <label className={LABEL}>Template</label>
            <select
              aria-label={t("Template")}
              className={FIELD}
              value={templateSlug}
              onChange={(e) => setTemplateSlug(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={startNewDocument}
            className="mt-5 h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {t("New BOQ")}
          </button>
          <button
            type="button"
            onClick={loadSampleVerifiedBoq}
            className="mt-5 h-10 rounded-lg border border-emerald-600 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600/50 dark:hover:bg-emerald-950/70"
          >
            {t("View Sample Verified BOQ")}
          </button>
          {doc && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-5 h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save BOQ"}
            </button>
          )}
        </div>

        {!doc && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className={CARD}>
              <h2 className="text-sm font-semibold text-slate-900">
                {t("Start a bill of quantities")}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {t(
                  "Pick a template and create a document. Sections come from the FRELUX standard library and stay editable.",
                )}
              </p>
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                {sources.length > 0
                  ? `${sources.length} saved calculation${sources.length === 1 ? "" : "s"} are ready to import.`
                  : "No saved calculations yet. Save a result from any FRELUX calculator and it will appear here."}
              </p>
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Inspect a Live Verified BOQ</span>
                </div>
                <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                  Inspect a completed 180 m² 3-bedroom bungalow takeoff
                  calibrated by registered civil quantity surveyors with live
                  {t(
                    "SHA-256 cryptographic attestation before entering your own",
                  )}
                  project.
                </p>
                <button
                  type="button"
                  onClick={loadSampleVerifiedBoq}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-200"
                >
                  Load 3-Bedroom Bungalow Demo & Blockchain Proof →
                </button>
              </div>
            </div>
            <div className={CARD}>
              <h2 className="text-sm font-semibold text-slate-900">
                {t("Your BOQ documents")}
              </h2>
              {documents.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  {t("Nothing saved yet.")}
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {documents.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {row.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {row.quote_ref} · R{row.revision} · {row.currency}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void loadDocument(row)}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Open
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {doc && (
          <div className="space-y-5">
            {isSampleActive && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/80 p-5 text-emerald-950 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-200">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-base font-semibold">
                        {t(
                          "Sample Verified BOQ & Immutable Cryptographic Attestation",
                        )}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        {SAMPLE_BUNGALOW_VERIFICATION.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                      {t(
                        "A worked example, not a client commission: a complete 180 m²",
                      )}{" "}
                      {t(
                        "3-bedroom bungalow schedule priced line by line, so a quantity surveyor",
                      )}{" "}
                      {t(
                        "can check it by hand. The fingerprint below is the SHA-256 of this schedule",
                      )}{" "}
                      {t(
                        "and is recomputed by the test suite, so editing any rate or quantity breaks it.",
                      )}{" "}
                      <span className="font-semibold">
                        {SAMPLE_VERIFIED_BUNGALOW_BOQ.market_code} ·{" "}
                        {SAMPLE_VERIFIED_BUNGALOW_BOQ.currency}
                      </span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 text-xs">
                      <div className="rounded-lg bg-white/70 p-2 border border-emerald-200/60 dark:bg-black/20 dark:border-white/5">
                        <span className="text-muted-foreground block text-[11px]">
                          {t("Verification Record")}
                        </span>
                        <span className="font-mono font-semibold text-foreground">
                          {SAMPLE_BUNGALOW_VERIFICATION.verificationId}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white/70 p-2 border border-emerald-200/60 dark:bg-black/20 dark:border-white/5">
                        <span className="text-muted-foreground block text-[11px]">
                          {t("Calibrated By")}
                        </span>
                        <span className="font-semibold text-foreground">
                          {SAMPLE_BUNGALOW_VERIFICATION.reviewerName}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white/70 p-2 border border-emerald-200/60 dark:bg-black/20 dark:border-white/5 sm:col-span-2 lg:col-span-1">
                        <span className="text-muted-foreground block text-[11px]">
                          {t("Governing Standards")}
                        </span>
                        <span className="font-semibold text-foreground truncate block">
                          {SAMPLE_BUNGALOW_VERIFICATION.governingStandards}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2">
                    {/* This sample has no anchored record, so the old button
                        promised a lookup that could only return "not found".
                        It points at the mechanism instead, and the fingerprint
                        is shown for anyone who wants to recompute it. */}
                    <a
                      href="/verify"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                    >
                      <span>{t("How verification works")}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <code className="max-w-[220px] break-all rounded bg-white/70 px-2 py-1 font-mono text-[10px] leading-tight text-slate-600 dark:bg-black/20 dark:text-slate-300">
                      {SAMPLE_BUNGALOW_VERIFICATION.sha256Hash}
                    </code>
                  </div>
                </div>
              </div>
            )}
            {compiled &&
              (compiled.warnings.blocking.length > 0 ||
                compiled.warnings.advisory.length > 0) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  {compiled.warnings.blocking.map((w) => (
                    <p key={w} className="font-semibold">
                      {w}
                    </p>
                  ))}
                  {compiled.warnings.advisory.map((w) => (
                    <p key={w} className="mt-1 text-amber-800">
                      {w}
                    </p>
                  ))}
                </div>
              )}

            <section className={CARD}>
              <h2 className="mb-1 text-sm font-semibold text-slate-900">
                {t("Quote type")}
              </h2>
              <p className="mb-3 text-xs text-slate-500">
                {t(
                  "The quantities are identical in both types. Only the price layer",
                )}
                differs.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => patch({ mode: "priced" })}
                  aria-pressed={doc.mode !== "market_survey"}
                  className={`rounded-lg border p-3 text-left transition ${
                    doc.mode !== "market_survey"
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-sm font-semibold text-slate-900">
                    {t("Priced quote")}
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">
                    {t(
                      "Rates and a contract total, with your commercial build-up.",
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => patch({ mode: "market_survey" })}
                  aria-pressed={doc.mode === "market_survey"}
                  className={`rounded-lg border p-3 text-left transition ${
                    doc.mode === "market_survey"
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-sm font-semibold text-slate-900">
                    {t("Market survey quote")}
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">
                    {t(
                      "Exact quantities and units with no prices, ready to price in",
                    )}
                    the market.
                  </span>
                </button>
              </div>
            </section>

            <section className={CARD}>
              <h2 className="mb-4 text-sm font-semibold text-slate-900">
                {t("Project details")}
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className={LABEL}>BOQ reference</label>
                  <input
                    aria-label={t("BOQ reference")}
                    className={FIELD}
                    value={doc.reference}
                    onChange={(e) => patch({ reference: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL}>Project title</label>
                  <input
                    aria-label={t("Project title")}
                    className={FIELD}
                    value={doc.title}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className={LABEL}>Description</label>
                  <textarea
                    aria-label={t("Description")}
                    className={`${FIELD} min-h-[70px]`}
                    value={doc.description}
                    onChange={(e) => patch({ description: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL}>Currency</label>
                  <input
                    aria-label={t("Currency")}
                    className={FIELD}
                    value={doc.currency}
                    onChange={(e) =>
                      patch({ currency: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL}>Measurement system</label>
                  <select
                    aria-label={t("Measurement system")}
                    className={FIELD}
                    value={doc.measurement_system}
                    onChange={(e) =>
                      patch({
                        measurement_system: e.target
                          .value as BoqStudioDocument["measurement_system"],
                      })
                    }
                  >
                    <option value="metric">Metric (m, m², m³, kg)</option>
                    <option value="imperial">
                      Imperial (ft, ft², ft³, lb)
                    </option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Market</label>
                  <input
                    aria-label={t("Market")}
                    className={FIELD}
                    value={doc.market_code}
                    onChange={(e) =>
                      patch({ market_code: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL}>Client name</label>
                  <input
                    aria-label={t("Client name")}
                    className={FIELD}
                    value={doc.client.name}
                    onChange={(e) =>
                      patch({ client: { ...doc.client, name: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL}>
                    {t("Client address / site location")}
                  </label>
                  <input
                    aria-label={t("Client address / site location")}
                    className={FIELD}
                    value={doc.client.address ?? ""}
                    onChange={(e) =>
                      patch({
                        client: { ...doc.client, address: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL}>Contractor</label>
                  <input
                    aria-label={t("Contractor")}
                    className={FIELD}
                    value={doc.contractor.name}
                    onChange={(e) =>
                      patch({
                        contractor: { ...doc.contractor, name: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL}>Prepared by</label>
                  <input
                    aria-label={t("Prepared by")}
                    className={FIELD}
                    value={doc.prepared_by}
                    onChange={(e) => patch({ prepared_by: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL}>Prepared date</label>
                  <input
                    aria-label={t("Prepared date")}
                    type="date"
                    className={FIELD}
                    value={doc.prepared_date}
                    onChange={(e) => patch({ prepared_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL}>Revision</label>
                  <NumericInput
                    aria-label={t("Revision")}
                    value={doc.revision}
                    min={0}
                    onValueChange={(n) => patch({ revision: n })}
                    className={FIELD}
                  />
                </div>
              </div>
            </section>

            <section className={CARD}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  {t("Import from calculators")}
                </h2>
                <button
                  type="button"
                  onClick={runImport}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  {t("Import selected")}
                </button>
              </div>
              {importPreviews.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {t(
                    "No saved calculator results found. Save a calculation, then",
                  )}
                  import its quantities here.
                </p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-auto pr-1">
                  {importPreviews.map((p) => (
                    <label
                      key={p.record.ref}
                      className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={Boolean(selectedImports[p.record.ref])}
                        onChange={(e) =>
                          setSelectedImports((prev) => ({
                            ...prev,
                            [p.record.ref]: e.target.checked,
                          }))
                        }
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900">
                          {p.calculator_label}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {p.record.title} ·{" "}
                          {new Date(p.record.created_at).toLocaleDateString()} ·{" "}
                          {p.lines.length} line
                          {p.lines.length === 1 ? "" : "s"}
                        </span>
                        {p.warnings.length > 0 && (
                          <span className="mt-1 block text-xs text-amber-700">
                            {p.warnings[0]}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section className={CARD}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  {t("Measured works")}
                </h2>
                <button
                  type="button"
                  onClick={addSection}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t("Add section")}
                </button>
              </div>

              <div className="space-y-6">
                {doc.sections.map((section) => (
                  <div key={section.id}>
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2">
                      <input
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-xs font-semibold"
                        value={section.code}
                        onChange={(e) =>
                          patch({
                            sections: doc.sections.map((s) =>
                              s.id === section.id
                                ? { ...s, code: e.target.value }
                                : s,
                            ),
                          })
                        }
                      />
                      <input
                        className="min-w-[180px] flex-1 rounded border border-slate-200 px-2 py-1 text-sm font-medium"
                        value={section.title}
                        onChange={(e) =>
                          patch({
                            sections: doc.sections.map((s) =>
                              s.id === section.id
                                ? { ...s, title: e.target.value }
                                : s,
                            ),
                          })
                        }
                      />
                      <span className="text-xs text-slate-500">
                        {money(
                          compiled?.standard.sections.find(
                            (s) => s.code === section.code,
                          )?.sectionTotal ?? 0,
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => addItem(section.id)}
                        className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        {t("Add item")}
                      </button>
                    </div>

                    {section.items.length === 0 ? (
                      <p className="py-2 text-xs text-slate-400">
                        {t("No items in this section.")}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="mt-2 w-full min-w-[860px] text-sm">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                              <th className="py-1 pr-2">Item</th>
                              <th className="py-1 pr-2">Description</th>
                              <th className="py-1 pr-2">Spec</th>
                              <th className="py-1 pr-2">Unit</th>
                              <th className="py-1 pr-2 text-right">Qty</th>
                              <th className="py-1 pr-2 text-right">Material</th>
                              <th className="py-1 pr-2 text-right">Labour</th>
                              <th className="py-1 pr-2 text-right">Amount</th>
                              <th className="py-1" />
                            </tr>
                          </thead>
                          <tbody>
                            {section.items.map((item) => (
                              <tr
                                key={item.id}
                                className="border-t border-slate-100 align-top"
                              >
                                <td className="py-1 pr-2">
                                  <input
                                    className="w-16 rounded border border-slate-200 px-1.5 py-1 text-xs"
                                    value={item.item_number}
                                    placeholder={t("auto")}
                                    onChange={(e) =>
                                      patchItem(section.id, item.id, {
                                        item_number: e.target.value,
                                      })
                                    }
                                  />
                                </td>
                                <td className="py-1 pr-2">
                                  <input
                                    className="w-full min-w-[200px] rounded border border-slate-200 px-1.5 py-1 text-sm"
                                    value={item.description}
                                    onChange={(e) =>
                                      patchItem(section.id, item.id, {
                                        description: e.target.value,
                                      })
                                    }
                                  />
                                  {item.source && (
                                    <span className="mt-0.5 block text-xs text-slate-400">
                                      from {item.source.label} · ref{" "}
                                      {item.source.ref.slice(0, 8)}
                                    </span>
                                  )}
                                </td>
                                <td className="py-1 pr-2">
                                  <input
                                    className="w-28 rounded border border-slate-200 px-1.5 py-1 text-xs"
                                    value={item.specification}
                                    onChange={(e) =>
                                      patchItem(section.id, item.id, {
                                        specification: e.target.value,
                                      })
                                    }
                                  />
                                </td>
                                <td className="py-1 pr-2">
                                  <input
                                    className="w-16 rounded border border-slate-200 px-1.5 py-1 text-xs"
                                    value={item.unit}
                                    onChange={(e) =>
                                      patchItem(section.id, item.id, {
                                        unit: e.target.value,
                                      })
                                    }
                                  />
                                </td>
                                <td className="py-1 pr-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-20 rounded border border-slate-200 px-1.5 py-1 text-right text-sm"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      patchItem(section.id, item.id, {
                                        quantity: Number(e.target.value),
                                      })
                                    }
                                  />
                                </td>
                                <td className="py-1 pr-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-24 rounded border border-slate-200 px-1.5 py-1 text-right text-sm"
                                    value={item.material_rate}
                                    onChange={(e) =>
                                      patchItem(section.id, item.id, {
                                        material_rate: Number(e.target.value),
                                      })
                                    }
                                  />
                                </td>
                                <td className="py-1 pr-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-24 rounded border border-slate-200 px-1.5 py-1 text-right text-sm"
                                    value={item.labour_rate}
                                    onChange={(e) =>
                                      patchItem(section.id, item.id, {
                                        labour_rate: Number(e.target.value),
                                      })
                                    }
                                  />
                                </td>
                                <td className="py-1 pr-2 text-right font-medium text-slate-900">
                                  {money(itemAmount(item))}
                                </td>
                                <td className="py-1 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      patch({
                                        sections: doc.sections.map((s) =>
                                          s.id === section.id
                                            ? {
                                                ...s,
                                                items: s.items.filter(
                                                  (i) => i.id !== item.id,
                                                ),
                                              }
                                            : s,
                                        ),
                                      })
                                    }
                                    className="text-xs text-rose-600 hover:underline"
                                  >
                                    Remove
                                  </button>
                                  <span className="mt-1 block text-xs text-slate-400">
                                    {money(itemUnitRate(item))}/unit
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className={CARD}>
              <h2 className="mb-4 text-sm font-semibold text-slate-900">
                {doc.mode === "market_survey"
                  ? "Market survey pricing"
                  : "Cost build-up"}
              </h2>
              {doc.mode === "market_survey" ? (
                <>
                  <p className="text-sm text-slate-600">
                    {t(
                      "Collect a rate for each line in the market and enter it",
                    )}
                    against the item. Preliminaries, overhead, contingency,
                    retention and tax do not apply, so the total is the sum of
                    the collected prices.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div>
                      <label className={LABEL}>Market or city</label>
                      <input
                        aria-label={t("Market or city")}
                        className={FIELD}
                        value={doc.survey.market_city}
                        onChange={(e) =>
                          patch({
                            survey: {
                              ...doc.survey,
                              market_city: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Survey date</label>
                      <input
                        aria-label={t("Survey date")}
                        type="date"
                        className={FIELD}
                        value={doc.survey.survey_date}
                        onChange={(e) =>
                          patch({
                            survey: {
                              ...doc.survey,
                              survey_date: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Surveyed by</label>
                      <input
                        aria-label={t("Surveyed by")}
                        className={FIELD}
                        value={doc.survey.surveyed_by}
                        onChange={(e) =>
                          patch({
                            survey: {
                              ...doc.survey,
                              surveyed_by: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-1 text-sm">
                    {compiled &&
                      (
                        [
                          ["Measured lines", compiled.survey.lines],
                          ["Lines priced", compiled.survey.priced_lines],
                          [
                            "Lines awaiting a market rate",
                            compiled.survey.unpriced_lines,
                          ],
                        ] as Array<[string, number]>
                      ).map(([label, value]) => (
                        <div
                          key={label}
                          className="flex justify-between border-b border-slate-50 py-1"
                        >
                          <span className="text-slate-600">{label}</span>
                          <span className="font-medium text-slate-900">
                            {value}
                          </span>
                        </div>
                      ))}
                    <div className="flex justify-between border-b border-slate-100 py-1">
                      <span className="text-slate-600">Rates captured</span>
                      <span className="font-medium text-slate-900">
                        {compiled ? compiled.survey.priced_pct : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="font-semibold text-slate-900">
                        {t("Market total")}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {money(compiled ? compiled.survey.market_total : 0)}
                      </span>
                    </div>
                  </div>
                  {compiled && compiled.survey.priced_lines > 0 && (
                    <button
                      type="button"
                      onClick={handleConvertToPriced}
                      className="mt-3 h-9 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      {t("Convert to priced quote")}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-4">
                    {(
                      [
                        ["preliminaries_pct", "Preliminaries %"],
                        ["overhead_profit_pct", "Overhead & profit %"],
                        ["contingency_pct", "Contingency %"],
                        ["retention_pct", "Retention %"],
                        ["waste_allowance_pct", "Waste allowance %"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key}>
                        <label className={LABEL}>{label}</label>
                        <NumericInput
                          aria-label={label}
                          value={doc.commercials[key]}
                          step={0.1}
                          onValueChange={(n) =>
                            patch({
                              commercials: {
                                ...doc.commercials,
                                [key]: n,
                              },
                            })
                          }
                          className={FIELD}
                        />
                      </div>
                    ))}
                    <div>
                      <label className={LABEL}>Tax % (blank = none)</label>
                      <input
                        aria-label={t("Tax % (blank = none)")}
                        type="number"
                        step="0.1"
                        className={FIELD}
                        value={doc.commercials.tax_pct ?? ""}
                        onChange={(e) =>
                          patch({
                            commercials: {
                              ...doc.commercials,
                              tax_pct:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 text-sm">
                    {compiled &&
                      (
                        [
                          [
                            "Measured works",
                            compiled.standard.summary.measuredWorksTotal,
                          ],
                          [
                            "Preliminaries",
                            compiled.standard.summary.preliminariesAmount,
                          ],
                          [
                            "Overhead & profit",
                            compiled.standard.summary.overheadProfitAmount,
                          ],
                          [
                            "Contingency",
                            compiled.standard.summary.contingencyAmount,
                          ],
                          [
                            "Subtotal before tax",
                            compiled.standard.summary.subtotalBeforeTax,
                          ],
                          [
                            compiled.standard.summary.taxCategory,
                            compiled.standard.summary.taxAmount,
                          ],
                          ["Gross total", compiled.standard.summary.grossTotal],
                          [
                            "Retention",
                            compiled.standard.summary.retentionAmount,
                          ],
                          [
                            "Net payable",
                            compiled.standard.summary.netPayableTotal,
                          ],
                        ] as Array<[string, number]>
                      ).map(([label, value]) => (
                        <div
                          key={label}
                          className="flex justify-between border-b border-slate-50 py-1"
                        >
                          <span className="text-slate-600">{label}</span>
                          <span className="font-medium text-slate-900">
                            {money(value)}
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </section>

            <section className={CARD}>
              <h2 className="mb-4 text-sm font-semibold text-slate-900">
                {t("Assumptions, exclusions and review")}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={LABEL}>Assumptions (one per line)</label>
                  <textarea
                    aria-label={t("Assumptions (one per line)")}
                    className={`${FIELD} min-h-[90px]`}
                    value={doc.assumptions.join("\n")}
                    onChange={(e) =>
                      patch({
                        assumptions: e.target.value
                          .split("\n")
                          .filter((v) => v.trim()),
                      })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL}>Exclusions (one per line)</label>
                  <textarea
                    aria-label={t("Exclusions (one per line)")}
                    className={`${FIELD} min-h-[90px]`}
                    value={doc.exclusions.join("\n")}
                    onChange={(e) =>
                      patch({
                        exclusions: e.target.value
                          .split("\n")
                          .filter((v) => v.trim()),
                      })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL}>Reviewer name</label>
                  <input
                    aria-label={t("Reviewer name")}
                    className={FIELD}
                    value={doc.review.reviewer_name ?? ""}
                    onChange={(e) => {
                      const name = e.target.value;
                      // A suffix prints only when an administrator verified it
                      // on the reviewer's own profile.
                      const credit = resolveReviewerCredential(
                        name,
                        auth.profile,
                      );
                      patch({
                        review: {
                          ...doc.review,
                          status: name.trim() ? "reviewed" : "unreviewed",
                          reviewer_name: name,
                          reviewer_qualification: credit.verified
                            ? (credit.suffix ?? undefined)
                            : undefined,
                          reviewer_credential_verified: credit.verified,
                          reviewed_at: name.trim()
                            ? new Date().toISOString()
                            : undefined,
                        },
                      });
                    }}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {t(
                      "Naming a qualified reviewer switches the document off Preliminary. Leave blank to keep it marked preliminary.",
                    )}
                  </p>
                </div>
                <div>
                  <label className={LABEL}>Reviewer qualification</label>
                  <input
                    aria-label={t("Reviewer qualification")}
                    className={FIELD}
                    value={doc.review.reviewer_qualification ?? ""}
                    readOnly
                    placeholder={t("Verified by an administrator")}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {doc.review.reviewer_credential_verified
                      ? t(
                          "Verified credential on file. It prints after the reviewer's name.",
                        )
                      : t(
                          "A credential suffix prints only when an administrator has verified it on the reviewer's profile. An unverified claim never reaches the document.",
                        )}
                  </p>
                </div>
              </div>
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                Current status: <strong>{documentStatusLabel(doc)}</strong>
              </p>
            </section>

            <section className={CARD}>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                Export
              </h2>
              <p className="mb-3 text-xs text-slate-600">
                {t(
                  "Free accounts can download a FRELUX-branded summary PDF. The",
                )}
                full FRELUX PDF without blockchain verification is also free;
                the verified, contractor-branded PDF and editable tender
                schedules are subscriber/admin exports.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={exportSummaryPdf}
                  disabled={busy}
                  className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100 disabled:opacity-60"
                >
                  {t("Download free summary PDF")}
                </button>
                <button
                  type="button"
                  onClick={() => void exportPdf(false)}
                  disabled={busy}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {busy ? "Building PDF…" : "Full FRELUX PDF (free)"}
                </button>
                <button
                  type="button"
                  onClick={() => void exportPdf(true)}
                  disabled={busy}
                  className="rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-60"
                >
                  Verified & contractor-branded PDF · Pro
                </button>
                <button
                  type="button"
                  onClick={exportEditableSchedule}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Editable Excel · Pro
                </button>
                <button
                  type="button"
                  onClick={exportCsvSchedule}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Tender CSV · Pro
                </button>
                <button
                  type="button"
                  onClick={exportPrint}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {t("Print view")}
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {t(
                  "The free summary omits item-level quantities and rates. Editable",
                )}
                schedules preserve numeric quantities and rates. Verified
                exports include a FRELUX VERIFY seal and are anchored only when
                the provider returns a verification ID.
              </p>
            </section>

            <section className={CARD}>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">
                {t("Share as quotation")}
              </h2>
              <p className="text-xs text-slate-600">
                {doc.mode === "market_survey"
                  ? "Sends the measured quantities with the rate columns blank, so the recipient can price them in the market and total them."
                  : "Sends the priced quotation with its totals, sealed as a snapshot that later edits cannot change."}{" "}
                {t("The link can be revoked at any time.")}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void shareQuotation()}
                  disabled={shareBusy || !documentId}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {shareBusy
                    ? "Creating link…"
                    : shareToken
                      ? "Create another link"
                      : "Create share link"}
                </button>
                {!documentId && (
                  <span className="text-xs text-amber-700">
                    {t("Save the document to enable sharing.")}
                  </span>
                )}
              </div>
              {shareToken && shareSnapshot && (
                <div className="mt-3 space-y-2">
                  <input
                    readOnly
                    value={quoteShareUrl(shareToken)}
                    onFocus={(event) => event.currentTarget.select()}
                    className={FIELD}
                    aria-label={t("Share link")}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void copyShareLink(quoteShareUrl(shareToken))
                      }
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      {t("Copy link")}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        buildQuoteShareMessage(
                          shareSnapshot,
                          quoteShareUrl(shareToken),
                        ),
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      {t("WhatsApp")}
                    </a>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(
                        `${quoteShareHeading(doc.mode)} ${doc.reference || doc.title}`,
                      )}&body=${encodeURIComponent(
                        buildQuoteShareMessage(
                          shareSnapshot,
                          quoteShareUrl(shareToken),
                        ),
                      )}`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      Email
                    </a>
                    <button
                      type="button"
                      onClick={() => void revokeShareLink()}
                      className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      {t("Revoke link")}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className={CARD}>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">
                {t("Templates available")}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {templates.map((t) => (
                  <li
                    key={t.slug}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {t.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t.standard} · {t.currency ?? "document currency"} ·{" "}
                      {t.measurement_system}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                {t(
                  "Administrators manage templates, standard sections and export",
                )}
                settings in Admin → BOQ templates. Supported imports:{" "}
                {Object.values(CALCULATOR_SECTIONS)
                  .map((c) => c.label)
                  .join(", ")}
                .
              </p>
            </section>
          </div>
        )}
        <AdSlot slotKey="calculator_mid" className="mt-8" />
        <AdSlot slotKey="calculator_native" className="mt-8" />
        <div className="mt-10">
          <RelatedTools
            links={[
              CALC_LINKS.smartCalc,
              CALC_LINKS.buildToRoof,
              CALC_LINKS.imageEstimator,
            ]}
          />
        </div>

        <ShareEstimateButton
          estimate={
            compiled
              ? {
                  kind: "Bill of Quantities",
                  summaryLines: [],
                  lineItems: [],
                  totals: [
                    {
                      label: "Measured works",
                      value: money(
                        compiled.standard.summary.measuredWorksTotal,
                      ),
                    },
                    {
                      label: "Before tax",
                      value: money(compiled.standard.summary.subtotalBeforeTax),
                    },
                    {
                      label: "Gross total",
                      value: money(compiled.standard.summary.grossTotal),
                      emphasized: true,
                    },
                  ],
                  link: "/boq-studio",
                }
              : null
          }
        />
        <HowCalculatedSection
          methodologyText={methodologyText("boq")}
          governingStandards={[
            "BESMM4 (Building Engineering Services Standard Method of Measurement)",
            "NIS 87 (Sandcrete Blocks Standard)",
            "BS 8110 / Eurocode 2 (Structural Concrete Norms)",
          ]}
          civilEngineeringConstants={[
            {
              label: "Standard Blockwork Dimensions",
              value: "450mm × 225mm × 225mm (9-inch)",
              standard: "NIS 87",
              notes: "vibrated hollow sandcrete",
            },
            {
              label: "Mortar Joint Bed & Perpend",
              value: "25mm standard joint",
              notes: "1:4 cement-sand mix",
            },
            {
              label: "Structural Concrete Mix",
              value: "1:2:4 (Grade C20/25)",
              standard: "BS 8110",
              notes: "20 MPa characteristic strength",
            },
            {
              label: "Cutting, Lapping & Wastage Allowance",
              value: "5% - 10% allowance",
              notes: "applied strictly to materials, never duplicated",
            },
            {
              label: "Cryptographic Attestation",
              value: "SHA-256 with OpenTimestamps Bitcoin anchoring",
              notes: "prevents contractor quote tampering",
            },
          ]}
        />
        <StandaloneEstimateAccuracyFeedback />
        <EstimateDisclaimer />
      </ScreenProtection>

      {showPrintPaywall && (
        <PrintPaywallModal
          isOpen={showPrintPaywall}
          onClose={() => setShowPrintPaywall(false)}
          documentId={printDocId}
          documentTitle={doc?.title || "BOQ Studio Document"}
          userCurrency={userCurrency}
          onPrintUnlocked={() => {
            if (compiled) {
              void openBoqPrint(compiled.standard, compiled.document, {
                verify: false,
              });
            }
          }}
        />
      )}

      {showDocumentGate && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
        >
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <DocumentSubscriptionGate
              strict={true}
              documentId={doc?.reference || documentId || "boq-studio"}
              documentTitle={doc?.title || "BOQ Studio Document"}
              onPrintUnlocked={() => {
                setShowDocumentGate(false);
                exportPrint();
              }}
            >
              <div />
            </DocumentSubscriptionGate>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowDocumentGate(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
