import React, { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Printer,
  ShieldCheck,
  Percent,
  Layers,
  ArrowRightLeft,
  Building2,
  FileText,
  Info,
} from "lucide-react";
import type { DbContractorProject } from "@/types/database";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { formatByCode } from "@/lib/international/currency-format";
import {
  convertProjectCurrency,
  buildProjectCurrencySummary,
  ProjectCurrencyConfig,
} from "@/lib/finance/multi-currency";
import {
  calculateJurisdictionalTax,
  VerifiedTaxRate,
} from "@/lib/finance/tax-engine";
import {
  assembleStandardBoq,
  exportBoqToCsv,
  exportBoqToPrintHtml,
  BoqStandard,
  STANDARD_SECTION_TEMPLATES,
} from "@/lib/finance/boq-standard";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import { useToast } from "@/components/ui/Toast";

interface Props {
  project: DbContractorProject;
}

const WORLD_CURRENCIES = [
  { code: "USD", name: "US Dollar ($)" },
  { code: "EUR", name: "Euro (€)" },
  { code: "GBP", name: "British Pound (£)" },
  { code: "NGN", name: "Nigerian Naira (₦)" },
  { code: "CAD", name: "Canadian Dollar (C$)" },
  { code: "AUD", name: "Australian Dollar (A$)" },
  { code: "INR", name: "Indian Rupee (₹)" },
  { code: "JPY", name: "Japanese Yen (¥)" },
  { code: "KRW", name: "South Korean Won (₩)" },
  { code: "CNY", name: "Chinese Yuan (¥)" },
  { code: "IDR", name: "Indonesian Rupiah (Rp)" },
  { code: "BRL", name: "Brazilian Real (R$)" },
  { code: "MXN", name: "Mexican Peso ($)" },
  { code: "ZAR", name: "South African Rand (R)" },
  { code: "GHS", name: "Ghanaian Cedi (GH₵)" },
  { code: "KES", name: "Kenyan Shilling (KSh)" },
  { code: "SAR", name: "Saudi Riyal (SAR)" },
  { code: "AED", name: "UAE Dirham (AED)" },
];

export const ProjectFinanceTab: React.FC<Props> = ({ project }) => {
  const { can, currentRole } = useWorkspace();
  const { toast } = useToast();

  const baseProjectAmount =
    project.total_project_cost && project.total_project_cost > 0
      ? project.total_project_cost
      : 250000;
  const projectLocationStr =
    typeof project.location === "string"
      ? project.location
      : project.location?.country
        ? String(project.location.country)
        : "Site Location";
  const projectMarket =
    typeof project.location === "object" && project.location?.country_code
      ? String(project.location.country_code).toUpperCase()
      : "US";

  // Multi-Currency Accounting Configuration
  const [baseCurrency, setBaseCurrency] = useState(project.currency || "USD");
  const [settlementCurrency, setSettlementCurrency] = useState(
    project.currency || "USD",
  );
  const [quoteCurrency, setQuoteCurrency] = useState(project.currency || "USD");
  const [riskMarginBps, setRiskMarginBps] = useState(150); // 1.5%

  // BOQ Standard & Commercials
  const [boqStandard, setBoqStandard] = useState<BoqStandard>("NRM2");
  const [prelimsPercent, setPrelimsPercent] = useState(5);
  const [ohpPercent, setOhpPercent] = useState(10);
  const [contingencyPercent, setContingencyPercent] = useState(5);
  const [retentionPercent, setRetentionPercent] = useState(5);

  const [verifiedRates] = useState<VerifiedTaxRate[]>([]);

  // Compute 3-layer currency summary
  const currencySummary = useMemo(() => {
    const config: ProjectCurrencyConfig = {
      baseCurrency,
      settlementCurrency,
      clientQuoteCurrency: quoteCurrency,
      fxRiskMarginBps: riskMarginBps,
    };

    return buildProjectCurrencySummary({
      baseAmount: baseProjectAmount,
      config,
    });
  }, [
    baseProjectAmount,
    baseCurrency,
    settlementCurrency,
    quoteCurrency,
    riskMarginBps,
  ]);

  // Compute tax
  const taxCalculation = useMemo(() => {
    return calculateJurisdictionalTax({
      marketCode: projectMarket,
      valuationDate: new Date().toISOString(),
      lines: [
        {
          id: "project-base-sum",
          description: "Project Construction Works",
          netAmount: baseProjectAmount,
          taxCategory: "vat",
        },
      ],
      rates: verifiedRates,
    });
  }, [projectMarket, baseProjectAmount, verifiedRates]);

  // Build standard BOQ document
  const boqDocument = useMemo(() => {
    const defaultTemplates = STANDARD_SECTION_TEMPLATES[boqStandard] || [];

    return assembleStandardBoq({
      metadata: {
        title: project.name || "Commercial Project",
        projectRef: `PRJ-${project.id.slice(0, 8).toUpperCase()}`,
        clientName: project.client_name || "Client Representative",
        contractorName: "Main Contractor",
        location: projectLocationStr,
        marketCode: projectMarket,
        currency: quoteCurrency,
        preparedBy: "Senior Quantity Surveyor",
        date: new Date().toISOString().slice(0, 10),
        revision: "Rev 01",
        standard: boqStandard,
      },
      commercials: {
        preliminariesPercent: prelimsPercent,
        overheadProfitPercent: ohpPercent,
        contingencyPercent: contingencyPercent,
        retentionPercent: retentionPercent,
        taxResult: taxCalculation,
      },
      sections: defaultTemplates.slice(0, 4).map((tpl, i) => ({
        code: tpl.code,
        title: tpl.title,
        subSections: [
          {
            code: `${tpl.code}.1`,
            title: "Standard Scope Items",
            items: [
              {
                itemNumber: `${tpl.code}.1.01`,
                description: `${tpl.title} — Primary civil & architectural execution`,
                quantity: 1,
                unit: "item",
                materialRate: Math.round((baseProjectAmount / 4) * 0.6),
                laborRate: Math.round((baseProjectAmount / 4) * 0.3),
                plantRate: Math.round((baseProjectAmount / 4) * 0.1),
              },
            ],
          },
        ],
      })),
    });
  }, [
    project,
    projectMarket,
    quoteCurrency,
    boqStandard,
    baseProjectAmount,
    prelimsPercent,
    ohpPercent,
    contingencyPercent,
    retentionPercent,
    taxCalculation,
  ]);

  const handleDownloadCsv = () => {
    const csvContent = exportBoqToCsv(boqDocument);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `BOQ_${project.name || "Project"}_${boqStandard}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "BOQ CSV Exported", variant: "success" });
  };

  const handlePrintHtml = () => {
    const htmlContent = exportBoqToPrintHtml(boqDocument);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
      win.focus();
    } else {
      toast({
        title: "Pop-up blocked. Please allow pop-ups to print BOQ.",
        variant: "error",
      });
    }
  };

  const canEditFinancials =
    can("canEditFinancials") ||
    [
      "owner",
      "project_manager",
      "quantity_surveyor",
      "finance_officer",
    ].includes(currentRole || "");

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="p-4 rounded-xl border bg-card/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" /> International
            Finance, Tax & BOQ
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Multi-currency project accounting, verified jurisdictional taxes,
            and standardized BOQ generation (NRM2, CESMM4, ICMS).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" /> Download CSV
          </Button>
          <Button
            size="sm"
            onClick={handlePrintHtml}
            className="flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" /> Print / PDF BOQ
          </Button>
        </div>
      </div>

      {/* 3-Tier Multi-Currency Accounting */}
      <div className="p-6 rounded-xl border bg-card space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h4 className="font-semibold text-base flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" /> 3-Layer Project
            Currency Accounting
          </h4>
          <span className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-mono">
            FX Risk Buffer: {(riskMarginBps / 100).toFixed(2)}%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Base Budget */}
          <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                1. Project Base Budget
              </span>
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">
              {currencySummary.base.formatted}
            </div>
            <p className="text-xs text-muted-foreground">
              Internal accounting & material takeoff baseline.
            </p>
            {canEditFinancials && (
              <div className="pt-2">
                <Label className="text-xs">Base Currency</Label>
                <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORLD_CURRENCIES.map((c) => (
                      <SelectItem
                        key={c.code}
                        value={c.code}
                        className="text-xs"
                      >
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Contractor Settlement */}
          <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                2. Contractor Settlement
              </span>
              <Layers className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {currencySummary.settlement.formatted}
            </div>
            <p className="text-xs text-muted-foreground">
              Trade labor and local subcontractor payout currency.
            </p>
            {canEditFinancials && (
              <div className="pt-2">
                <Label className="text-xs">Settlement Currency</Label>
                <Select
                  value={settlementCurrency}
                  onValueChange={setSettlementCurrency}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORLD_CURRENCIES.map((c) => (
                      <SelectItem
                        key={c.code}
                        value={c.code}
                        className="text-xs"
                      >
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Client Quote */}
          <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                3. Client Quote / Financing
              </span>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {currencySummary.clientQuote.formatted}
            </div>
            <p className="text-xs text-muted-foreground">
              Contract sum & commercial bank loan underwriting currency.
            </p>
            {canEditFinancials && (
              <div className="pt-2">
                <Label className="text-xs">Client Quote Currency</Label>
                <Select value={quoteCurrency} onValueChange={setQuoteCurrency}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORLD_CURRENCIES.map((c) => (
                      <SelectItem
                        key={c.code}
                        value={c.code}
                        className="text-xs"
                      >
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {canEditFinancials && (
          <div className="flex items-center gap-4 pt-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">
              FX Volatility Contingency Margin:
            </Label>
            <Input
              type="number"
              min="0"
              max="1000"
              step="25"
              value={riskMarginBps}
              onChange={(e) => setRiskMarginBps(parseInt(e.target.value) || 0)}
              className="w-24 h-8 text-xs font-mono"
            />
            <span className="text-xs text-muted-foreground">
              basis points ({(riskMarginBps / 100).toFixed(2)}%) buffer against
              exchange rate drift.
            </span>
          </div>
        )}
      </div>

      {/* Standard BOQ Assembly & Summary */}
      <div className="p-6 rounded-xl border bg-card space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h4 className="font-semibold text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Standardized
            Bill of Quantities (BOQ)
          </h4>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium">Standard:</Label>
            <Select
              value={boqStandard}
              onValueChange={(val: BoqStandard) => setBoqStandard(val)}
            >
              <SelectTrigger className="w-36 h-8 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NRM2">NRM2 (RICS)</SelectItem>
                <SelectItem value="CESMM4">CESMM4 (Civil)</SelectItem>
                <SelectItem value="ICMS">ICMS (Global)</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Commercial Markups Row */}
        {canEditFinancials && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/20 border text-xs">
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Preliminaries (%)
              </Label>
              <Input
                type="number"
                min="0"
                max="30"
                value={prelimsPercent}
                onChange={(e) =>
                  setPrelimsPercent(parseFloat(e.target.value) || 0)
                }
                className="h-7 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Overhead & Profit (%)
              </Label>
              <Input
                type="number"
                min="0"
                max="40"
                value={ohpPercent}
                onChange={(e) => setOhpPercent(parseFloat(e.target.value) || 0)}
                className="h-7 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Contingency (%)
              </Label>
              <Input
                type="number"
                min="0"
                max="25"
                value={contingencyPercent}
                onChange={(e) =>
                  setContingencyPercent(parseFloat(e.target.value) || 0)
                }
                className="h-7 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Retention / Holdback (%)
              </Label>
              <Input
                type="number"
                min="0"
                max="20"
                value={retentionPercent}
                onChange={(e) =>
                  setRetentionPercent(parseFloat(e.target.value) || 0)
                }
                className="h-7 text-xs mt-1"
              />
            </div>
          </div>
        )}

        {/* Collection Summary Card */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b text-left">
                <th className="p-2.5 font-semibold">Cost Component</th>
                <th className="p-2.5 font-semibold">Standard Basis</th>
                <th className="p-2.5 font-semibold text-right">
                  Amount ({quoteCurrency})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="p-2.5 font-medium">Measured Building Works</td>
                <td className="p-2.5 text-muted-foreground">
                  Takeoff calculations & quantities
                </td>
                <td className="p-2.5 text-right font-semibold">
                  {formatByCode(
                    boqDocument.summary.measuredWorksTotal,
                    quoteCurrency,
                  )}
                </td>
              </tr>
              {boqDocument.summary.preliminariesAmount > 0 && (
                <tr>
                  <td className="p-2.5">
                    Preliminaries & General Requirements
                  </td>
                  <td className="p-2.5 text-muted-foreground">
                    {prelimsPercent}% of measured works
                  </td>
                  <td className="p-2.5 text-right">
                    {formatByCode(
                      boqDocument.summary.preliminariesAmount,
                      quoteCurrency,
                    )}
                  </td>
                </tr>
              )}
              {boqDocument.summary.overheadProfitAmount > 0 && (
                <tr>
                  <td className="p-2.5">Contractor Overhead & Profit (OH&P)</td>
                  <td className="p-2.5 text-muted-foreground">
                    {ohpPercent}% markup
                  </td>
                  <td className="p-2.5 text-right">
                    {formatByCode(
                      boqDocument.summary.overheadProfitAmount,
                      quoteCurrency,
                    )}
                  </td>
                </tr>
              )}
              {boqDocument.summary.contingencyAmount > 0 && (
                <tr>
                  <td className="p-2.5">Construction Contingency</td>
                  <td className="p-2.5 text-muted-foreground">
                    {contingencyPercent}% unforeseen reserve
                  </td>
                  <td className="p-2.5 text-right">
                    {formatByCode(
                      boqDocument.summary.contingencyAmount,
                      quoteCurrency,
                    )}
                  </td>
                </tr>
              )}
              <tr className="bg-muted/20">
                <td className="p-2.5 font-semibold">
                  Net Contract Sum (Excl. Tax)
                </td>
                <td className="p-2.5 text-muted-foreground">
                  Commercial subtotal
                </td>
                <td className="p-2.5 text-right font-semibold">
                  {formatByCode(
                    boqDocument.summary.subtotalBeforeTax,
                    quoteCurrency,
                  )}
                </td>
              </tr>
              <tr>
                <td className="p-2.5 text-muted-foreground">
                  Statutory Tax (
                  {taxCalculation.provenance[0]?.taxCode || "Tax"})
                </td>
                <td className="p-2.5 text-muted-foreground">
                  {taxCalculation.status === "calculated"
                    ? `${((taxCalculation.provenance[0]?.rate ?? 0) * 100).toFixed(1)}%`
                    : "Reviewer-approved rate required"}
                </td>
                <td className="p-2.5 text-right font-medium">
                  {taxCalculation.status === "calculated"
                    ? formatByCode(boqDocument.summary.taxAmount, quoteCurrency)
                    : "—"}
                </td>
              </tr>
              <tr className="bg-primary/5 font-bold text-sm">
                <td className="p-3 text-primary">
                  GROSS BILL OF QUANTITIES TOTAL
                </td>
                <td className="p-3 text-xs text-muted-foreground font-normal">
                  Standard {boqStandard} schedule
                </td>
                <td className="p-3 text-right text-primary">
                  {formatByCode(boqDocument.summary.grossTotal, quoteCurrency)}
                </td>
              </tr>
              {boqDocument.summary.retentionAmount > 0 && (
                <tr className="text-muted-foreground">
                  <td className="p-2.5">Less Statutory Holdback / Retention</td>
                  <td className="p-2.5">
                    {retentionPercent}% held during defects liability period
                  </td>
                  <td className="p-2.5 text-right text-rose-600">
                    -
                    {formatByCode(
                      boqDocument.summary.retentionAmount,
                      quoteCurrency,
                    )}
                  </td>
                </tr>
              )}
              {boqDocument.summary.retentionAmount > 0 && (
                <tr className="font-bold text-xs bg-muted/30">
                  <td className="p-2.5">Net Initial Contract Draw Baseline</td>
                  <td className="p-2.5 text-muted-foreground">
                    Payable during construction phases
                  </td>
                  <td className="p-2.5 text-right">
                    {formatByCode(
                      boqDocument.summary.netPayableTotal,
                      quoteCurrency,
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
