import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sentry, isSentryActive } from "./instrument";

// Wrap Routes with Sentry router instrumentation for navigation tracing
// Falls back to plain Routes if Sentry is not configured
const SentryRoutes = isSentryActive()
  ? Sentry.withSentryReactRouterV7Routing(Routes)
  : Routes;
import { useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { MarketProvider } from "@/lib/international/market-context";
import { CreditsProvider } from "@/lib/credits-context";
import { ToastProvider } from "@/components/ui/Toast";
const AnalyticsScripts = lazy(() => import("@/components/AnalyticsScripts"));
const AdBlockNotice = lazy(() =>
  import("@/components/ui/AdBlockNotice").then((m) => ({
    default: m.AdBlockNotice,
  })),
);
const CookieBanner = lazy(() =>
  import("@/components/ui/CookieBanner").then((m) => ({
    default: m.CookieBanner,
  })),
);
import Layout from "@/components/layout/Layout";
const Home = lazy(() => import("@/pages/Home"));
const Colors = lazy(() => import("@/pages/Colors"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Login = lazy(() => import("@/pages/Login"));
import ErrorBoundary from "@/components/ErrorBoundary";
import { useWebVitals } from "@/lib/web-vitals";
import { useTypography } from "@/lib/useTypography";

// Lazy-loaded public pages for code splitting
const ColorDetail = lazy(() => import("@/pages/ColorDetail"));
const Learn = lazy(() => import("@/pages/learn/Learn"));
const PaintingCalculatorHub = lazy(
  () => import("@/pages/PaintingCalculatorHub"),
);
const ScreedingCalculatorHub = lazy(
  () => import("@/pages/ScreedingCalculatorHub"),
);
const PopCeilingCalculatorHub = lazy(
  () => import("@/pages/PopCeilingCalculatorHub"),
);
const TileCalculatorHub = lazy(() => import("@/pages/TileCalculatorHub"));
const FinishingCalculatorHub = lazy(
  () => import("@/pages/FinishingCalculatorHub"),
);
const Calculators = lazy(() => import("@/pages/Calculators"));
const AiColorAssistant = lazy(() => import("@/pages/AiColorAssistant"));
const Contact = lazy(() => import("@/pages/Contact"));
const About = lazy(() => import("@/pages/legal/About"));
const PrivacyPolicy = lazy(() => import("@/pages/legal/PrivacyPolicy"));
const Terms = lazy(() => import("@/pages/legal/Terms"));
const CookiePolicy = lazy(() => import("@/pages/legal/CookiePolicy"));
const Disclaimer = lazy(() => import("@/pages/legal/Disclaimer"));
const AiDisclaimer = lazy(() => import("@/pages/legal/AiDisclaimer"));
const LearnCategory = lazy(() => import("@/pages/learn/LearnCategory"));
const LearnArticle = lazy(() => import("@/pages/learn/LearnArticle"));
const PaintColorDetail = lazy(() => import("@/pages/PaintColorDetail"));
const CompareColors = lazy(() => import("@/pages/CompareColors"));
const MyProjects = lazy(() => import("@/pages/MyProjects"));
const SharedProject = lazy(() => import("@/pages/SharedProject"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Profile = lazy(() => import("@/pages/Profile"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const BrandStudio = lazy(() => import("@/pages/BrandStudio"));
const BuildToRoofEstimator = lazy(() => import("@/pages/BuildToRoofEstimator"));
const ImageEstimator = lazy(() => import("@/pages/ImageEstimator"));
const StructuralCalculator = lazy(() => import("@/pages/StructuralCalculator"));
const SmartCalculator = lazy(() => import("@/pages/SmartCalculator"));
const FoundationCalculator = lazy(() => import("@/pages/FoundationCalculator"));
const ProjectTimeline = lazy(() => import("@/pages/ProjectTimeline"));
const ConstructionSequence = lazy(() => import("@/pages/ConstructionSequence"));
const ClientManagement = lazy(() => import("@/pages/ClientManagement"));
const EstimateAnalytics = lazy(() => import("@/pages/EstimateAnalytics"));
const ColorPreview = lazy(() => import("@/pages/ColorPreview"));
const StartBuilding = lazy(() => import("@/pages/StartBuilding"));

// Contractor experience pages
const ContractorProjects = lazy(
  () => import("@/pages/contractor/ContractorProjects"),
);
const ProjectWizard = lazy(
  () => import("@/components/contractor/ProjectWizard"),
);
const ProjectDashboard = lazy(
  () => import("@/pages/contractor/ProjectDashboard"),
);
const AdminMaterialCatalog = lazy(
  () => import("@/pages/admin/AdminMaterialCatalog"),
);
const AdminTimelineTemplates = lazy(
  () => import("@/pages/admin/AdminTimelineTemplates"),
);
const AdminQuotationSettings = lazy(
  () => import("@/pages/admin/AdminQuotationSettings"),
);

// Admin pages — all lazy-loaded to keep the public bundle small
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("@/components/admin/AdminLayout"));
const RequireAdmin = lazy(() => import("@/components/admin/RequireAdmin"));
const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
const AdminAIAssistant = lazy(() => import("@/pages/admin/AdminAIAssistant"));
const AdminEstimationConfig = lazy(
  () => import("@/pages/admin/AdminEstimationConfig"),
);
const AdminEstimationProducts = lazy(
  () => import("@/pages/admin/AdminEstimationProducts"),
);
const AdminEstimationMaterials = lazy(
  () => import("@/pages/admin/AdminEstimationMaterials"),
);
const AdminEstimationPricing = lazy(
  () => import("@/pages/admin/AdminEstimationPricing"),
);
const AdminEstimationEstimates = lazy(
  () => import("@/pages/admin/AdminEstimationEstimates"),
);
const AdminEstimationAudit = lazy(
  () => import("@/pages/admin/AdminEstimationAudit"),
);
const AdminEstimationProduction = lazy(
  () => import("@/pages/admin/AdminEstimationProduction"),
);
const AdminPaintEngineTest = lazy(
  () => import("@/pages/admin/AdminPaintEngineTest"),
);
const AdminTyroleneConfig = lazy(
  () => import("@/pages/admin/AdminTyroleneConfig"),
);
const AdminPaintTypes = lazy(() => import("@/pages/admin/AdminPaintTypes"));
const AdminPricing = lazy(() => import("@/pages/admin/AdminPricing"));
const AdminPriceUpdater = lazy(() => import("@/pages/admin/AdminPriceUpdater"));
const AdminLabourSettings = lazy(
  () => import("@/pages/admin/AdminLabourSettings"),
);
const AdminColors = lazy(() => import("@/pages/admin/AdminColors"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminLegal = lazy(() => import("@/pages/admin/AdminLegal"));
const AdminContactMessages = lazy(
  () => import("@/pages/admin/AdminContactMessages"),
);
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminAiMonetization = lazy(
  () => import("@/pages/admin/AdminAiMonetization"),
);
const AdminAiSettings = lazy(() => import("@/pages/admin/AdminAiSettings"));
const AdminAds = lazy(() => import("@/pages/admin/AdminAds"));
const AdminRewardedAccess = lazy(
  () => import("@/pages/admin/AdminRewardedAccess"),
);
const AdminBranding = lazy(() => import("@/pages/admin/AdminBranding"));
const AdminPdfBranding = lazy(() => import("@/pages/admin/AdminPdfBranding"));
const AdminScreedingMaterials = lazy(
  () => import("@/pages/admin/AdminScreedingMaterials"),
);
const AdminLearn = lazy(() => import("@/pages/admin/AdminLearn"));
const AdminMarkets = lazy(() => import("@/pages/admin/AdminMarkets"));
const AdminMarketIntelligence = lazy(
  () => import("@/pages/admin/AdminMarketIntelligence"),
);
const AdminEngineConfig = lazy(() => import("@/pages/admin/AdminEngineConfig"));
const AdminAiLearningAssistant = lazy(
  () => import("@/pages/admin/AdminAiLearningAssistant"),
);
const AdminPopMaterials = lazy(() => import("@/pages/admin/AdminPopMaterials"));
const AdminTypography = lazy(() => import("@/pages/admin/AdminTypography"));

const AdminTileMaterials = lazy(
  () => import("@/pages/admin/AdminTileMaterials"),
);
const AdminMedia = lazy(() => import("@/pages/admin/AdminMedia"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminGallery = lazy(() => import("@/pages/admin/AdminGallery"));
const AdminPaintComparison = lazy(
  () => import("@/pages/admin/AdminPaintComparison"),
);
const AdminMaterialPrices = lazy(
  () => import("@/pages/admin/AdminMaterialPrices"),
);
const AdminSurfaceConditions = lazy(
  () => import("@/pages/admin/AdminSurfaceConditions"),
);
const AdminProjectStages = lazy(
  () => import("@/pages/admin/AdminProjectStages"),
);
const AdminErrors = lazy(() => import("@/pages/admin/AdminErrors"));
const SystemHealth = lazy(() => import("@/pages/admin/SystemHealth"));
const AdminSeo = lazy(() => import("@/pages/admin/AdminSeo"));
const AdminTemplates = lazy(() => import("@/pages/admin/AdminTemplates"));
const AdminIntegrations = lazy(() => import("@/pages/admin/AdminIntegrations"));
const Templates = lazy(() => import("@/pages/Templates"));
const TemplateDetail = lazy(() => import("@/pages/TemplateDetail"));
const MyTemplates = lazy(() => import("@/pages/MyTemplates"));
const StudioLayout = lazy(() => import("@/components/studio/StudioLayout"));
const StudioOverview = lazy(() => import("@/pages/studio/StudioOverview"));
const StudioTool = lazy(() => import("@/pages/studio/StudioTool"));
const ErrorAnalysis = lazy(() => import("@/pages/studio/ErrorAnalysis"));

// Pro Connect pages — professional network
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const ProConnectDirectory = lazy(
  () => import("@/pages/pro-connect/ProConnectDirectory"),
);
const ProConnectProfile = lazy(
  () => import("@/pages/pro-connect/ProConnectProfile"),
);
const ProConnectRegister = lazy(
  () => import("@/pages/pro-connect/ProConnectRegister"),
);
const ProConnectDashboard = lazy(
  () => import("@/pages/pro-connect/ProConnectDashboard"),
);
const Messages = lazy(() => import("@/pages/pro-connect/Messages"));

// Marketplace
const MarketplaceHome = lazy(
  () => import("@/pages/marketplace/MarketplaceHome"),
);
const MarketplaceCategoryPage = lazy(
  () => import("@/pages/marketplace/MarketplaceCategoryPage"),
);
const MarketplaceLocationPage = lazy(
  () => import("@/pages/marketplace/MarketplaceLocationPage"),
);
const MarketplaceCategoryLocationPage = lazy(
  () => import("@/pages/marketplace/MarketplaceCategoryLocationPage"),
);
const ProCategoryLocationPage = lazy(
  () => import("@/pages/pro-connect/ProCategoryLocationPage"),
);
const ListingDetail = lazy(() => import("@/pages/marketplace/ListingDetail"));
const PostListing = lazy(() => import("@/pages/marketplace/PostListing"));
const MyListings = lazy(() => import("@/pages/marketplace/MyListings"));
const OrderDetail = lazy(() => import("@/pages/marketplace/OrderDetail"));
const WorkerChannels = lazy(
  () => import("@/pages/worker-channels/WorkerChannels"),
);
const Achievements = lazy(() => import("@/pages/Achievements"));
const Rewards = lazy(() => import("@/pages/Rewards"));

// Admin Pro Connect
const AdminProConnect = lazy(() => import("@/pages/admin/AdminProConnect"));
const AdminImageEstimation = lazy(
  () => import("@/pages/admin/AdminImageEstimation"),
);
const AdminMarketplace = lazy(() => import("@/pages/admin/AdminMarketplace"));
const AdminSeoLocation = lazy(() => import("@/pages/admin/AdminSeoLocation"));
const AdminRewards = lazy(() => import("@/pages/admin/AdminRewards"));
const AdminCreditsAds = lazy(() => import("@/pages/admin/AdminCreditsAds"));
const CreditsPage = lazy(() => import("@/pages/Credits"));
const PostProduct = lazy(() => import("@/pages/marketplace/PostProduct"));
const ProductDetail = lazy(() => import("@/pages/marketplace/ProductDetail"));
const MyProducts = lazy(() => import("@/pages/marketplace/MyProducts"));
const MarketplaceLayout = lazy(
  () => import("@/components/marketplace/MarketplaceLayout"),
);
const SellerDashboard = lazy(
  () => import("@/pages/marketplace/SellerDashboard"),
);

// Project Intelligence routes
const PaintComparison = lazy(() => import("@/pages/PaintComparison"));
const Gallery = lazy(() => import("@/pages/Gallery"));
const GalleryUpload = lazy(() => import("@/pages/GalleryUpload"));
const SurfaceAssessment = lazy(() => import("@/pages/SurfaceAssessment"));
const ProjectWorkspace = lazy(() => import("@/pages/ProjectWorkspace"));
const ProjectDetail = lazy(() => import("@/pages/ProjectDetail"));
const ClientEstimateView = lazy(() => import("@/pages/ClientEstimateView"));
const ClientEstimateEditor = lazy(() => import("@/pages/ClientEstimateEditor"));
const MaterialPriceTracker = lazy(() => import("@/pages/MaterialPriceTracker"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand-purple dark:border-border border-border dark:border-t-brand-purple-lighter" />
    </div>
  );
}

// Handle notification clicks from the service worker
function NotificationClickHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_CLICK" && event.data?.url) {
        navigate(event.data.url);
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () =>
      navigator.serviceWorker?.removeEventListener("message", handler);
  }, [navigate]);
  return null;
}

// Redirect old calculator routes to consolidated hubs with mode preserved
function RedirectToHub({ to, mode }: { to: string; mode?: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    const search = mode ? `?mode=${mode}` : "";
    navigate(`${to}${search}`, { replace: true });
  }, [navigate, to, mode]);
  return null;
}

export default function App() {
  useTypography();
  useWebVitals();

  // Lazy-load non-critical CSS (animations & visual effects) after first paint
  // to reduce the initial CSS payload and improve LCP on slower networks.
  useEffect(() => {
    import("@/styles/animations.css");
  }, []);
  return (
    <ErrorBoundary boundaryName="app-root">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm"
      >
        Skip to main content
      </a>
      <AuthProvider>
        <MarketProvider>
          <ToastProvider>
            <CreditsProvider>
              <Suspense fallback={null}>
                <AnalyticsScripts />
              </Suspense>
              <Suspense fallback={null}>
                <AdBlockNotice />
              </Suspense>
              <BrowserRouter>
                <ScrollToTop />
                <NotificationClickHandler />
                <Suspense fallback={null}>
                  <CookieBanner />
                </Suspense>
                <SentryRoutes>
                  {/* ─────────────────────────────────────────────────────── */}
                  {/* PUBLIC SITE — all public-facing pages under Layout */}
                  {/* No admin links, routes, or components appear here. */}
                  {/* ─────────────────────────────────────────────────────── */}

                  <Route element={<Layout />}>
                    {/* Home workspace */}
                    <Route
                      path="/"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Home />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/start-building"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <StartBuilding />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/calculators"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Calculators />
                        </Suspense>
                      }
                    />

                    {/* Consolidated calculator hubs */}
                    <Route
                      path="/paint-calculator"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <PaintingCalculatorHub />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/screeding-calculator"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ScreedingCalculatorHub />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/pop-ceiling-calculator"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <PopCeilingCalculatorHub />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/tile-calculator"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <TileCalculatorHub />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/finish-estimator"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <FinishingCalculatorHub />
                        </Suspense>
                      }
                    />

                    {/* 301 redirects from old secondary routes to consolidated hubs */}
                    <Route
                      path="/cost-estimator"
                      element={
                        <RedirectToHub to="/paint-calculator" mode="cost" />
                      }
                    />
                    <Route
                      path="/painting-estimator"
                      element={
                        <RedirectToHub
                          to="/paint-calculator"
                          mode="room-estimate"
                        />
                      }
                    />
                    <Route
                      path="/screeding-cost-estimator"
                      element={
                        <RedirectToHub to="/screeding-calculator" mode="cost" />
                      }
                    />
                    <Route
                      path="/pop-ceiling-cost-estimator"
                      element={
                        <RedirectToHub
                          to="/pop-ceiling-calculator"
                          mode="cost"
                        />
                      }
                    />
                    <Route
                      path="/tile-cost-estimator"
                      element={
                        <RedirectToHub to="/tile-calculator" mode="cost" />
                      }
                    />
                    <Route
                      path="/tyrolene-estimator"
                      element={
                        <RedirectToHub to="/finish-estimator" mode="tyrolene" />
                      }
                    />
                    <Route
                      path="/image-estimator"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ImageEstimator />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/smart-calculator"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <SmartCalculator />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/structural-calculator"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <StructuralCalculator />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/foundation-calculator"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <FoundationCalculator />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/project-timeline"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ProjectTimeline />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/construction-sequence"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ConstructionSequence />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/build-to-roof-estimator"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <BuildToRoofEstimator />
                        </Suspense>
                      }
                    />

                    {/* Colors workspace */}
                    <Route
                      path="/colors"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Colors />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/colors/compare"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <CompareColors />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/colors/paint/:slug"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <PaintColorDetail />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/colors/:slug"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ColorDetail />
                        </Suspense>
                      }
                    />

                    {/* AI workspace */}
                    <Route
                      path="/ai-color-assistant"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <AiColorAssistant />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/color-preview"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ColorPreview />
                        </Suspense>
                      }
                    />

                    {/* Projects workspace */}
                    <Route
                      path="/my-projects"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <MyProjects />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/templates"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Templates />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/templates/:slug"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <TemplateDetail />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/my-templates"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <MyTemplates />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/shared/:id"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <SharedProject />
                        </Suspense>
                      }
                    />

                    {/* Dashboard */}
                    <Route
                      path="/dashboard"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Dashboard />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/onboarding"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Onboarding />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Profile />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/pricing"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Pricing />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/brand-studio"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <BrandStudio />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/achievements"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Achievements />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/rewards"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Rewards />
                        </Suspense>
                      }
                    />

                    {/* Contractor Experience */}
                    <Route
                      path="/contractor"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ContractorProjects />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/contractor/wizard"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ProjectWizard />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/contractor/projects/:id"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ProjectDashboard />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/clients"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ClientManagement />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/analytics"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <EstimateAnalytics />
                        </Suspense>
                      }
                    />

                    {/* Learn workspace */}
                    <Route
                      path="/learn"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Learn />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/learn/category/:categorySlug"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <LearnCategory />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/learn/:articleSlug"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <LearnArticle />
                        </Suspense>
                      }
                    />

                    {/* Account / About / Contact */}
                    <Route
                      path="/contact"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Contact />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/about"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <About />
                        </Suspense>
                      }
                    />

                    {/* Legal pages */}
                    <Route
                      path="/privacy-policy"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <PrivacyPolicy />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/terms"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Terms />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/cookie-policy"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <CookiePolicy />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/disclaimer"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Disclaimer />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/ai-disclaimer"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <AiDisclaimer />
                        </Suspense>
                      }
                    />

                    {/* Pro Connect — Professional Network */}
                    <Route
                      path="/pro-connect"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ProConnectDirectory />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/pro-connect/register"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ProConnectRegister />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/pro-connect/dashboard"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ProConnectDashboard />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/pro-connect/:slug"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ProConnectProfile />
                        </Suspense>
                      }
                    />

                    {/* Marketplace — wrapped in dedicated MarketplaceLayout */}
                    <Route
                      path="/marketplace"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <MarketplaceLayout />
                        </Suspense>
                      }
                    >
                      <Route index element={<MarketplaceHome />} />
                      <Route path="post" element={<PostListing />} />
                      <Route path="my-listings" element={<MyListings />} />
                      <Route
                        path="category/:categorySlug"
                        element={<MarketplaceCategoryPage />}
                      />
                      <Route
                        path="sellers/:locationSlug"
                        element={<MarketplaceLocationPage />}
                      />
                      <Route
                        path=":categorySlug/:locationSlug"
                        element={<MarketplaceCategoryLocationPage />}
                      />
                      <Route path="products/post" element={<PostProduct />} />
                      <Route path="products/my" element={<MyProducts />} />
                      <Route
                        path="seller-dashboard"
                        element={<SellerDashboard />}
                      />
                      <Route path="products/:id" element={<ProductDetail />} />
                      <Route path="products" element={<MarketplaceHome />} />
                      <Route path="orders/:id" element={<OrderDetail />} />
                      <Route path=":id" element={<ListingDetail />} />
                    </Route>
                    <Route
                      path="/pro/:categorySlug/:locationSlug"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ProCategoryLocationPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/messages"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Messages />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/messages/:conversationId"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <Messages />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/worker-channels"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <WorkerChannels />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/worker-channels/:channelSlug"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <WorkerChannels />
                        </Suspense>
                      }
                    />
                    <Route
                      path="*"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <NotFound />
                        </Suspense>
                      }
                    />
                  </Route>

                  {/* ─────────────────────────────────────────────────────── */}
                  {/* AUTH PAGES — standalone, no public Layout or admin chrome */}
                  {/* ─────────────────────────────────────────────────────── */}
                  <Route
                    path="/admin/login"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <AdminLogin />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/login"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Login />
                      </Suspense>
                    }
                  />

                  {/* ─────────────────────────────────────────────────────── */}
                  {/* ADMIN PANEL — completely separated from public site. */}
                  {/* Protected by RequireAdmin. No public Layout wrapping. */}
                  {/* ─────────────────────────────────────────────────────── */}
                  <Route
                    path="/admin"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <RequireAdmin>
                          <ErrorBoundary boundaryName="admin">
                            <AdminLayout />
                          </ErrorBoundary>
                        </RequireAdmin>
                      </Suspense>
                    }
                  >
                    {/* Dashboard */}
                    <Route index element={<AdminOverview />} />

                    {/* AI Assistant */}
                    <Route path="ai-assistant" element={<AdminAIAssistant />} />

                    {/* Content */}
                    <Route path="learn" element={<AdminLearn />} />
                    <Route
                      path="ai-learning"
                      element={<AdminAiLearningAssistant />}
                    />
                    <Route path="legal" element={<AdminLegal />} />
                    <Route path="contact" element={<AdminContactMessages />} />

                    {/* Color Library */}
                    <Route path="colors" element={<AdminColors />} />

                    {/* Media Library */}
                    <Route path="media" element={<AdminMedia />} />

                    {/* Calculators */}
                    <Route
                      path="estimation-config"
                      element={<AdminEstimationConfig />}
                    />
                    <Route path="templates" element={<AdminTemplates />} />
                    <Route
                      path="estimation-products"
                      element={<AdminEstimationProducts />}
                    />
                    <Route
                      path="estimation-materials"
                      element={<AdminEstimationMaterials />}
                    />
                    <Route
                      path="estimation-pricing"
                      element={<AdminEstimationPricing />}
                    />
                    <Route
                      path="estimation-estimates"
                      element={<AdminEstimationEstimates />}
                    />
                    <Route
                      path="estimation-audit"
                      element={<AdminEstimationAudit />}
                    />
                    <Route
                      path="estimation-production"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminEstimationProduction />
                        </Suspense>
                      }
                    />
                    <Route
                      path="paint-engine-test"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminPaintEngineTest />
                        </Suspense>
                      }
                    />
                    <Route
                      path="tyrolene-config"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminTyroleneConfig />
                        </Suspense>
                      }
                    />
                    <Route path="paint-types" element={<AdminPaintTypes />} />
                    <Route
                      path="screeding"
                      element={<AdminScreedingMaterials />}
                    />
                    <Route
                      path="pop-materials"
                      element={<AdminPopMaterials />}
                    />
                    <Route
                      path="tile-materials"
                      element={<AdminTileMaterials />}
                    />

                    {/* Pricing */}
                    <Route path="pricing" element={<AdminPricing />} />
                    <Route
                      path="price-updater"
                      element={<AdminPriceUpdater />}
                    />
                    <Route
                      path="labour-settings"
                      element={<AdminLabourSettings />}
                    />

                    {/* AI */}
                    <Route
                      path="ai-monetization"
                      element={<AdminAiMonetization />}
                    />
                    <Route path="ai-settings" element={<AdminAiSettings />} />
                    <Route path="ads" element={<AdminAds />} />
                    <Route
                      path="rewarded-access"
                      element={<AdminRewardedAccess />}
                    />
                    <Route path="branding" element={<AdminBranding />} />
                    <Route path="pdf-branding" element={<AdminPdfBranding />} />

                    {/* Users */}
                    <Route path="users" element={<AdminUsers />} />

                    {/* Analytics */}
                    <Route path="analytics" element={<AdminAnalytics />} />
                    <Route
                      path="integrations"
                      element={<AdminIntegrations />}
                    />

                    {/* Error Monitor */}
                    <Route
                      path="errors"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminErrors />
                        </Suspense>
                      }
                    />
                    <Route
                      path="system-health"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <SystemHealth />
                        </Suspense>
                      }
                    />
                    {/* Pro Connect */}
                    <Route path="pro-connect" element={<AdminProConnect />} />
                    <Route
                      path="image-estimation"
                      element={<AdminImageEstimation />}
                    />
                    <Route path="marketplace" element={<AdminMarketplace />} />
                    <Route path="markets" element={<AdminMarkets />} />
                    <Route
                      path="market-intelligence"
                      element={<AdminMarketIntelligence />}
                    />
                    <Route
                      path="engine-config"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminEngineConfig />
                        </Suspense>
                      }
                    />
                    <Route
                      path="seo-location"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminSeoLocation />
                        </Suspense>
                      }
                    />
                    <Route path="rewards" element={<AdminRewards />} />
                    <Route path="credits-ads" element={<AdminCreditsAds />} />

                    {/* Contractor Config */}
                    <Route
                      path="gallery-moderation"
                      element={<AdminGallery />}
                    />
                    <Route
                      path="paint-comparison"
                      element={<AdminPaintComparison />}
                    />
                    <Route
                      path="material-prices"
                      element={<AdminMaterialPrices />}
                    />
                    <Route
                      path="surface-conditions"
                      element={<AdminSurfaceConditions />}
                    />
                    <Route
                      path="project-stages"
                      element={<AdminProjectStages />}
                    />
                    <Route
                      path="material-catalog"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminMaterialCatalog />
                        </Suspense>
                      }
                    />
                    <Route
                      path="timeline-templates"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminTimelineTemplates />
                        </Suspense>
                      }
                    />
                    <Route
                      path="quotation-settings"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminQuotationSettings />
                        </Suspense>
                      }
                    />

                    {/* SEO */}
                    <Route path="seo" element={<AdminSeo />} />

                    {/* System */}
                    <Route path="typography" element={<AdminTypography />} />
                    <Route path="settings" element={<AdminSettings />} />

                    {/* AI Developer Studio (nested) */}
                    <Route path="studio" element={<StudioLayout />}>
                      <Route index element={<StudioOverview />} />
                      {/* Error analysis uses a dedicated component */}
                      <Route
                        path="error_analysis"
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <ErrorAnalysis />
                          </Suspense>
                        }
                      />
                      {/* All other tools — StudioDispatcher reads :toolSlug
                           and routes to StudioTool (chat/generation) or
                           StudioManagement (plugins/prompts/etc) */}
                      <Route path=":toolSlug" element={<StudioTool />} />
                    </Route>
                  </Route>

                  <Route
                    path="/credits"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <CreditsPage />
                      </Suspense>
                    }
                  />
                  {/* Project intelligence routes */}
                  <Route
                    path="/paint-comparison"
                    element={<PaintComparison />}
                  />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/gallery/new" element={<GalleryUpload />} />
                  <Route
                    path="/surface-assessment"
                    element={<SurfaceAssessment />}
                  />
                  <Route
                    path="/project-workspace"
                    element={<ProjectWorkspace />}
                  />
                  <Route
                    path="/project-workspace/:id"
                    element={<ProjectDetail />}
                  />
                  <Route
                    path="/project-workspace/:id/client-estimate/new"
                    element={<ClientEstimateEditor />}
                  />
                  <Route
                    path="/material-prices"
                    element={<MaterialPriceTracker />}
                  />
                  <Route
                    path="/estimate/:token"
                    element={<ClientEstimateView />}
                  />
                  {/* Fallback for unmatched admin routes */}
                  <Route path="/admin/*" element={<NotFound />} />
                </SentryRoutes>
              </BrowserRouter>
            </CreditsProvider>
          </ToastProvider>
        </MarketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
