import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { DbAnalyticsEvent } from "@/types/database";
import {
  AdminHeader,
  AdminCard,
  StateMessage,
} from "@/components/admin/AdminUi";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calculator,
  DollarSign,
  ExternalLink,
  Eye,
  Mail,
  MessageCircle,
  Monitor,
  Palette,
  Radio,
  TrendingUp,
  Users,
} from "lucide-react";
import Ga4BridgeNotice from "@/components/admin/Ga4BridgeNotice";
import { useLanguage } from "@/lib/i18n";
import {
  fetchGa4Configuration,
  fetchGa4Status,
  fetchGa4Summary,
  type Ga4Status,
  fetchTrafficReport,
  type Ga4Configuration,
  type Ga4Summary,
  type TrafficReport,
} from "@/lib/traffic-report";

const CATEGORIES = [
  {
    label: "Calculator",
    icon: Calculator,
    events: ["calculator_started", "calculator_completed"],
    color: "text-brand-purple",
  },
  {
    label: "Cost Estimator",
    icon: DollarSign,
    events: ["cost_estimator_started", "cost_estimate_completed"],
    color: "text-accent-green",
  },
  {
    label: "AI Assistant",
    icon: BarChart3,
    events: [
      "ai_assistant_opened",
      "text_consultation_submitted",
      "image_analysis_started",
      "ai_recommendation_generated",
      "ai_request_failed",
      "ai_usage_limit_reached",
      "rewarded_access_requested",
      "rewarded_access_verified",
    ],
    color: "text-accent-orange",
  },
  {
    label: "Color Gallery",
    icon: Palette,
    events: [
      "color_gallery_viewed",
      "color_page_viewed",
      "color_recommendation_clicked",
    ],
    color: "text-accent-cyan",
  },
  {
    label: "Contact",
    icon: MessageCircle,
    events: ["whatsapp_clicked", "contact_form_submitted"],
    color: "text-accent-green",
  },
];

const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 28, label: "28 days" },
  { days: 90, label: "90 days" },
];

const number = new Intl.NumberFormat();

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  live,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Users;
  live?: boolean;
}) {
  return (
    <AdminCard>
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="h-4 w-4 text-foreground" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {live && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-accent-green">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-accent-green"
            />
            Live
          </span>
        )}
      </div>
      <p className="mt-1 text-2xl font-bold text-foreground">
        {number.format(value)}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </AdminCard>
  );
}

function TrafficTrend({ report }: { report: TrafficReport }) {
  const max = Math.max(1, ...report.daily.map((d) => d.page_views));
  const points = report.daily.slice(-28);

  if (points.length === 0) {
    return (
      <StateMessage
        type="empty"
        title="No traffic recorded yet"
        message="Page views appear here as soon as visitors load the site. Nothing is sampled or estimated."
      />
    );
  }

  const summary = points
    .map((d) => `${d.date}: ${d.page_views} page views, ${d.visitors} visitors`)
    .join(". ");

  return (
    <div>
      <div
        className="flex h-40 items-end gap-1"
        role="img"
        aria-label={`Daily page views. ${summary}`}
      >
        {points.map((point, index) => {
          const height = Math.max(
            3,
            Math.round((point.page_views / max) * 100),
          );
          const showLabel =
            index === 0 ||
            index === points.length - 1 ||
            (points.length > 10 && index % 7 === 0);
          return (
            <div
              key={point.date}
              className="group flex h-full flex-1 flex-col justify-end gap-1"
              title={`${point.date}: ${number.format(point.page_views)} page views, ${number.format(point.visitors)} visitors`}
            >
              <div
                className="w-full rounded-sm bg-primary/80 transition-colors group-hover:bg-primary"
                style={{ height: `${height}%` }}
              />
              <span className="h-4 text-center text-[10px] text-muted-foreground">
                {showLabel ? point.date.slice(5) : ""}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Page views per day. Hover a bar for visitors on that day.
      </p>
    </div>
  );
}

function BreakdownList({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number; detail?: string }[];
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <AdminCard>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data in this period.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const share = total > 0 ? Math.round((row.value / total) * 100) : 0;
            return (
              <li key={row.label}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-foreground">
                    {row.label}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {number.format(row.value)}
                    {row.detail ? ` ${row.detail}` : ""}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AdminCard>
  );
}

export default function AdminAnalytics() {
  const { t } = useLanguage();
  const [days, setDays] = useState(7);
  const [report, setReport] = useState<TrafficReport | null>(null);
  const [trafficError, setTrafficError] = useState<string | null>(null);
  const [ga4, setGa4] = useState<Ga4Configuration | null>(null);
  const [ga4Summary, setGa4Summary] = useState<Ga4Summary | null>(null);
  const [ga4Status, setGa4Status] = useState<Ga4Status | null>(null);
  const [events, setEvents] = useState<DbAnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const loadTraffic = useCallback(async (period: number) => {
    const { report: nextReport, error: nextError } =
      await fetchTrafficReport(period);
    setReport(nextReport);
    setTrafficError(nextError);
    setUpdatedAt(new Date());
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function load() {
      const { data, error: eventsError } = await supabase
        .from("analytics_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (!active) return;
      if (eventsError) setError(eventsError.message);
      setEvents(data ?? []);

      await loadTraffic(days);
      if (!active) return;

      const configuration = await fetchGa4Configuration();
      if (!active) return;
      setGa4(configuration);
      const summary = configuration.measurementId
        ? await fetchGa4Summary(days)
        : null;
      if (!active) return;
      setGa4Summary(summary);
      setGa4Status(summary ? null : await fetchGa4Status());
      if (!active) return;

      if (active) setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [days, loadTraffic]);

  // Realtime count: refresh while the tab is visible.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadTraffic(days);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [days, loadTraffic]);

  const counts = useMemo(
    () =>
      events.reduce<Record<string, number>>((acc, event) => {
        acc[event.event] = (acc[event.event] ?? 0) + 1;
        return acc;
      }, {}),
    [events],
  );

  const aiSuccess = counts["ai_recommendation_generated"] ?? 0;
  const aiFailed = counts["ai_request_failed"] ?? 0;
  const aiLimitReached = counts["ai_usage_limit_reached"] ?? 0;
  const totalEvents = events.length;

  const pages = (report?.pages ?? []).map((page) => ({
    label: page.path,
    value: page.views,
    detail: "views",
  }));
  const sources = (report?.sources ?? []).map((source) => ({
    label: source.source,
    value: source.visits,
    detail: "visits",
  }));
  const devices = (report?.devices ?? []).map((device) => ({
    label:
      device.device.charAt(0).toUpperCase() +
      device.device.slice(1).toLowerCase(),
    value: device.visitors,
    detail: "visitors",
  }));

  return (
    <>
      <AdminHeader
        title={t("Analytics")}
        subtitle={t(
          "Site traffic measured on this domain, plus the platform events logged as visitors use the tools.",
        )}
        action={
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {PERIODS.map((period) => (
              <button
                key={period.days}
                type="button"
                onClick={() => setDays(period.days)}
                aria-pressed={days === period.days}
                className={
                  days === period.days
                    ? "rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                    : "rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              >
                {period.label}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <StateMessage
          type="loading"
          title="Loading analytics"
          message="Fetching traffic for this period."
        />
      ) : trafficError ? (
        <StateMessage
          type="error"
          title="Traffic report unavailable"
          message="The traffic summary could not be read. Page views are still being recorded; reload once the database function is available."
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("Active now")}
              value={report?.active_now ?? 0}
              hint={t("Sessions in the last 5 minutes")}
              icon={Radio}
              live
            />
            <StatTile
              label={t("Visitors")}
              value={report?.totals.visitors ?? 0}
              hint={t("Unique browsers in this period")}
              icon={Users}
            />
            <StatTile
              label={t("Page views")}
              value={report?.totals.page_views ?? 0}
              hint={t("Pages loaded in this period")}
              icon={Eye}
            />
            <StatTile
              label={t("Sessions")}
              value={report?.totals.sessions ?? 0}
              hint={t("Visits with 30 minute activity windows")}
              icon={Activity}
            />
          </div>

          <div className="mb-6">
            <AdminCard>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    {t("Traffic")}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Daily page views and visitors for the selected period")}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("Updated")}{" "}
                  {updatedAt
                    ? updatedAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "N/A"}
                </p>
              </div>
              {report ? <TrafficTrend report={report} /> : null}
            </AdminCard>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <BreakdownList title={t("Top pages")} rows={pages} />
            <BreakdownList title={t("Sources")} rows={sources} />
            <BreakdownList title={t("Devices")} rows={devices} />
          </div>

          <div className="mb-8">
            <AdminCard>
              <div className="flex items-start gap-3">
                <Monitor
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 text-foreground"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    {t("Google Analytics 4")}
                  </h2>
                  {ga4?.measurementId ? (
                    <>
                      <p className="mt-1 text-sm text-foreground">
                        {ga4.enabled
                          ? t("The GA4 tag is live on this site.")
                          : t(
                              "A GA4 measurement ID is saved but tracking is disabled.",
                            )}{" "}
                        <span className="font-medium">{ga4.measurementId}</span>
                      </p>
                      {ga4Summary ? (
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {[
                            ["Active users", ga4Summary.activeUsers],
                            ["Sessions", ga4Summary.sessions],
                            ["Page views", ga4Summary.pageViews],
                            ["Period days", ga4Summary.periodDays],
                          ].map(([label, value]) => (
                            <div
                              key={String(label)}
                              className="rounded-lg border border-border p-3"
                            >
                              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                                {label}
                              </p>
                              <p className="mt-0.5 text-lg font-semibold text-foreground">
                                {number.format(Number(value))}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Ga4BridgeNotice status={ga4Status} />
                      )}
                      <a
                        href="https://analytics.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-2"
                      >
                        {t("Open Google Analytics")}
                        <ExternalLink
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />
                      </a>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-sm text-foreground">
                        {t("No GA4 measurement ID is configured yet.")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t(
                          "Add the measurement ID in Admin, Integrations, Analytics and Tracking. Until then, the traffic numbers on this page still come from this site directly.",
                        )}
                      </p>
                      <Link
                        to="/admin/integrations"
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-2"
                      >
                        {t("Open Integrations")}
                        <ExternalLink
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </AdminCard>
          </div>

          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {t("Platform activity")}
          </h2>

          {error ? (
            <StateMessage
              type="error"
              title={t("Could not load platform events")}
              message={error}
            />
          ) : events.length === 0 ? (
            <StateMessage
              type="empty"
              title={t("No events yet")}
              message="Events will appear here as visitors use the calculator, estimator, and color pages."
            />
          ) : (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <AdminCard>
                  <div className="flex items-center gap-2">
                    <TrendingUp
                      aria-hidden="true"
                      className="h-5 w-5 text-foreground"
                    />
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t("Total events")}
                    </p>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {totalEvents}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("Event count, not unique visitors")}
                  </p>
                </AdminCard>
                <AdminCard>
                  <div className="flex items-center gap-2">
                    <BarChart3
                      aria-hidden="true"
                      className="h-5 w-5 text-accent-green"
                    />
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t("AI successes")}
                    </p>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {aiSuccess}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("Recommendations generated")}
                  </p>
                </AdminCard>
                <AdminCard>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t("AI failures")}
                    </p>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {aiFailed}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("Failed AI requests")}
                  </p>
                </AdminCard>
                <AdminCard>
                  <div className="flex items-center gap-2">
                    <Mail
                      aria-hidden="true"
                      className="h-5 w-5 text-accent-green"
                    />
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t("WhatsApp clicks")}
                    </p>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {counts["whatsapp_clicked"] ?? 0}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("Contact via WhatsApp")}
                  </p>
                </AdminCard>
              </div>

              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const catTotal = cat.events.reduce(
                    (sum, event) => sum + (counts[event] ?? 0),
                    0,
                  );
                  return (
                    <AdminCard key={cat.label}>
                      <div className="flex items-center gap-2">
                        <Icon className={"h-4 w-4 " + cat.color} />
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          {cat.label}
                        </p>
                      </div>
                      <p className="mt-1 text-2xl font-bold text-foreground">
                        {catTotal}
                      </p>
                      <div className="mt-2 space-y-1">
                        {cat.events.map((event) => (
                          <div
                            key={event}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-muted-foreground">
                              {event}
                            </span>
                            <span className="font-semibold text-foreground">
                              {counts[event] ?? 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    </AdminCard>
                  );
                })}
              </div>

              {aiLimitReached > 0 && (
                <div className="mb-6">
                  <AdminCard>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-accent-yellow" />
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {t("Usage limit reached")}
                      </p>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {aiLimitReached}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("Times users hit the daily AI limit")}
                    </p>
                  </AdminCard>
                </div>
              )}

              <AdminCard>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  {t("Recent events")}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
                        <th className="py-2 pr-4">{t("Event")}</th>
                        <th className="py-2 pr-4">{t("Page")}</th>
                        <th className="py-2 pr-4">{t("Time")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.slice(0, 50).map((event) => (
                        <tr
                          key={event.id}
                          className="border-b border-border/50"
                        >
                          <td className="py-2 pr-4 font-medium text-foreground">
                            {event.event}
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {event.page_path ?? "N/A"}
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {new Date(event.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Showing the 50 most recent events. Total events logged:{" "}
                  {totalEvents}.
                </p>
              </AdminCard>
            </>
          )}
        </>
      )}
    </>
  );
}
