import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import Layout from '@/components/layout/Layout';
import Home from '@/pages/Home';
import Colors from '@/pages/Colors';
import NotFound from '@/pages/NotFound';
import Login from '@/pages/Login';

// Lazy-loaded public pages for code splitting
const ColorDetail = lazy(() => import('@/pages/ColorDetail'));
const Learn = lazy(() => import('@/pages/learn/Learn'));
const PaintCalculator = lazy(() => import('@/pages/PaintCalculator'));
const CostEstimator = lazy(() => import('@/pages/CostEstimator'));
const AiColorAssistant = lazy(() => import('@/pages/AiColorAssistant'));
const Contact = lazy(() => import('@/pages/Contact'));
const About = lazy(() => import('@/pages/legal/About'));
const PrivacyPolicy = lazy(() => import('@/pages/legal/PrivacyPolicy'));
const Terms = lazy(() => import('@/pages/legal/Terms'));
const CookiePolicy = lazy(() => import('@/pages/legal/CookiePolicy'));
const Disclaimer = lazy(() => import('@/pages/legal/Disclaimer'));
const AiDisclaimer = lazy(() => import('@/pages/legal/AiDisclaimer'));
const ScreedingCalculator = lazy(() => import('@/pages/ScreedingCalculator'));
const ScreedingCostEstimator = lazy(() => import('@/pages/ScreedingCostEstimator'));
const LearnCategory = lazy(() => import('@/pages/learn/LearnCategory'));
const LearnArticle = lazy(() => import('@/pages/learn/LearnArticle'));
const PopCeilingCalculator = lazy(() => import('@/pages/PopCeilingCalculator'));
const PopCeilingCostEstimator = lazy(() => import('@/pages/PopCeilingCostEstimator'));
const TileCalculator = lazy(() => import('@/pages/TileCalculator'));
const TileCostEstimator = lazy(() => import('@/pages/TileCostEstimator'));
const PaintColorDetail = lazy(() => import('@/pages/PaintColorDetail'));
const CompareColors = lazy(() => import('@/pages/CompareColors'));
const MyProjects = lazy(() => import('@/pages/MyProjects'));
const SharedProject = lazy(() => import('@/pages/SharedProject'));

// Admin pages — all lazy-loaded to keep the public bundle small
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'));
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'));
const RequireAdmin = lazy(() => import('@/components/admin/RequireAdmin'));
const AdminOverview = lazy(() => import('@/pages/admin/AdminOverview'));
const AdminPaintTypes = lazy(() => import('@/pages/admin/AdminPaintTypes'));
const AdminPricing = lazy(() => import('@/pages/admin/AdminPricing'));
const AdminLabourSettings = lazy(() => import('@/pages/admin/AdminLabourSettings'));
const AdminColors = lazy(() => import('@/pages/admin/AdminColors'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminLegal = lazy(() => import('@/pages/admin/AdminLegal'));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'));
const AdminAiMonetization = lazy(() => import('@/pages/admin/AdminAiMonetization'));
const AdminAds = lazy(() => import('@/pages/admin/AdminAds'));
const AdminRewardedAccess = lazy(() => import('@/pages/admin/AdminRewardedAccess'));
const AdminBranding = lazy(() => import('@/pages/admin/AdminBranding'));
const AdminScreedingMaterials = lazy(() => import('@/pages/admin/AdminScreedingMaterials'));
const AdminLearn = lazy(() => import('@/pages/admin/AdminLearn'));
const AdminAiLearningAssistant = lazy(() => import('@/pages/admin/AdminAiLearningAssistant'));
const AdminPopMaterials = lazy(() => import('@/pages/admin/AdminPopMaterials'));
const AdminTileMaterials = lazy(() => import('@/pages/admin/AdminTileMaterials'));
const AdminMedia = lazy(() => import('@/pages/admin/AdminMedia'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminSeo = lazy(() => import('@/pages/admin/AdminSeo'));
const StudioLayout = lazy(() => import('@/components/studio/StudioLayout'));
const StudioOverview = lazy(() => import('@/pages/studio/StudioOverview'));
const StudioTool = lazy(() => import('@/pages/studio/StudioTool'));
const StudioManagement = lazy(() => import('@/pages/studio/StudioManagement'));

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
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-brand-purple" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* ─────────────────────────────────────────────────────── */}
          {/* PUBLIC SITE — all public-facing pages under Layout */}
          {/* No admin links, routes, or components appear here. */}
          {/* ─────────────────────────────────────────────────────── */}
          <Route element={<Layout />}>
            {/* Home workspace */}
            <Route path="/" element={<Home />} />

            {/* Calculate workspace */}
            <Route path="/paint-calculator" element={<Suspense fallback={<PageLoader />}><PaintCalculator /></Suspense>} />
            <Route path="/screeding-calculator" element={<Suspense fallback={<PageLoader />}><ScreedingCalculator /></Suspense>} />
            <Route path="/pop-ceiling-calculator" element={<Suspense fallback={<PageLoader />}><PopCeilingCalculator /></Suspense>} />
            <Route path="/tile-calculator" element={<Suspense fallback={<PageLoader />}><TileCalculator /></Suspense>} />

            {/* Estimate workspace */}
            <Route path="/cost-estimator" element={<Suspense fallback={<PageLoader />}><CostEstimator /></Suspense>} />
            <Route path="/screeding-cost-estimator" element={<Suspense fallback={<PageLoader />}><ScreedingCostEstimator /></Suspense>} />
            <Route path="/pop-ceiling-cost-estimator" element={<Suspense fallback={<PageLoader />}><PopCeilingCostEstimator /></Suspense>} />
            <Route path="/tile-cost-estimator" element={<Suspense fallback={<PageLoader />}><TileCostEstimator /></Suspense>} />

            {/* Colors workspace */}
            <Route path="/colors" element={<Colors />} />
            <Route path="/colors/compare" element={<Suspense fallback={<PageLoader />}><CompareColors /></Suspense>} />
            <Route path="/colors/paint/:slug" element={<Suspense fallback={<PageLoader />}><PaintColorDetail /></Suspense>} />
            <Route path="/colors/:slug" element={<Suspense fallback={<PageLoader />}><ColorDetail /></Suspense>} />

            {/* AI workspace */}
            <Route path="/ai-color-assistant" element={<Suspense fallback={<PageLoader />}><AiColorAssistant /></Suspense>} />

            {/* Projects workspace */}
            <Route path="/my-projects" element={<Suspense fallback={<PageLoader />}><MyProjects /></Suspense>} />
            <Route path="/shared/:id" element={<Suspense fallback={<PageLoader />}><SharedProject /></Suspense>} />

            {/* Learn workspace */}
            <Route path="/learn" element={<Suspense fallback={<PageLoader />}><Learn /></Suspense>} />
            <Route path="/learn/category/:categorySlug" element={<Suspense fallback={<PageLoader />}><LearnCategory /></Suspense>} />
            <Route path="/learn/:articleSlug" element={<Suspense fallback={<PageLoader />}><LearnArticle /></Suspense>} />

            {/* Account / About / Contact */}
            <Route path="/contact" element={<Suspense fallback={<PageLoader />}><Contact /></Suspense>} />
            <Route path="/about" element={<Suspense fallback={<PageLoader />}><About /></Suspense>} />

            {/* Legal pages */}
            <Route path="/privacy-policy" element={<Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>} />
            <Route path="/terms" element={<Suspense fallback={<PageLoader />}><Terms /></Suspense>} />
            <Route path="/cookie-policy" element={<Suspense fallback={<PageLoader />}><CookiePolicy /></Suspense>} />
            <Route path="/disclaimer" element={<Suspense fallback={<PageLoader />}><Disclaimer /></Suspense>} />
            <Route path="/ai-disclaimer" element={<Suspense fallback={<PageLoader />}><AiDisclaimer /></Suspense>} />

            <Route path="*" element={<NotFound />} />
          </Route>

          {/* ─────────────────────────────────────────────────────── */}
          {/* AUTH PAGES — standalone, no public Layout or admin chrome */}
          {/* ─────────────────────────────────────────────────────── */}
          <Route path="/admin/login" element={<Suspense fallback={<PageLoader />}><AdminLogin /></Suspense>} />
          <Route path="/login" element={<Login />} />

          {/* ─────────────────────────────────────────────────────── */}
          {/* ADMIN PANEL — completely separated from public site. */}
          {/* Protected by RequireAdmin. No public Layout wrapping. */}
          {/* ─────────────────────────────────────────────────────── */}
          <Route
            path="/admin"
            element={
              <Suspense fallback={<PageLoader />}>
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              </Suspense>
            }
          >
            {/* Dashboard */}
            <Route index element={<AdminOverview />} />

            {/* Content */}
            <Route path="learn" element={<AdminLearn />} />
            <Route path="ai-learning" element={<AdminAiLearningAssistant />} />
            <Route path="legal" element={<AdminLegal />} />

            {/* Color Library */}
            <Route path="colors" element={<AdminColors />} />

            {/* Media Library */}
            <Route path="media" element={<AdminMedia />} />

            {/* Calculators */}
            <Route path="paint-types" element={<AdminPaintTypes />} />
            <Route path="screeding" element={<AdminScreedingMaterials />} />
            <Route path="pop-materials" element={<AdminPopMaterials />} />
            <Route path="tile-materials" element={<AdminTileMaterials />} />

            {/* Pricing */}
            <Route path="pricing" element={<AdminPricing />} />
            <Route path="labour-settings" element={<AdminLabourSettings />} />

            {/* AI */}
            <Route path="ai-monetization" element={<AdminAiMonetization />} />
            <Route path="ads" element={<AdminAds />} />
            <Route path="rewarded-access" element={<AdminRewardedAccess />} />
            <Route path="branding" element={<AdminBranding />} />

            {/* Users */}
            <Route path="users" element={<AdminUsers />} />

            {/* Analytics */}
            <Route path="analytics" element={<AdminAnalytics />} />

            {/* SEO */}
            <Route path="seo" element={<AdminSeo />} />

            {/* System */}
            <Route path="settings" element={<AdminSettings />} />

            {/* AI Developer Studio (nested) */}
            <Route path="studio" element={<StudioLayout />}>
              <Route index element={<StudioOverview />} />
              <Route path="chat" element={<StudioTool />} />
              <Route path="page_builder" element={<StudioTool />} />
              <Route path="crud_generator" element={<StudioTool />} />
              <Route path="db_designer" element={<StudioTool />} />
              <Route path="api_builder" element={<StudioTool />} />
              <Route path="dashboard_builder" element={<StudioTool />} />
              <Route path="form_builder" element={<StudioTool />} />
              <Route path="workflow_builder" element={<StudioTool />} />
              <Route path="feature_generator" element={<StudioTool />} />
              <Route path="component_generator" element={<StudioTool />} />
              <Route path="code_generator" element={<StudioTool />} />
              <Route path="bug_detection" element={<StudioTool />} />
              <Route path="refactoring" element={<StudioTool />} />
              <Route path="test_generator" element={<StudioTool />} />
              <Route path="docs_generator" element={<StudioTool />} />
              <Route path="deploy_assistant" element={<StudioTool />} />
              <Route path="plugin_manager" element={<StudioManagement />} />
              <Route path="prompt_library" element={<StudioManagement />} />
              <Route path="integration_center" element={<StudioManagement />} />
              <Route path="feature_management" element={<StudioManagement />} />
              <Route path="role_management" element={<StudioManagement />} />
              <Route path="system_monitoring" element={<StudioManagement />} />
              <Route path="version_history" element={<StudioManagement />} />
              <Route path="project_explorer" element={<StudioManagement />} />
              <Route path="file_manager" element={<StudioManagement />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
