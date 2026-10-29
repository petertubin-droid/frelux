import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bookmark,
  Folder,
  Clock,
  Trash2,
  Copy,
  Plus,
  AlertCircle,
  Palette as PaletteIcon,
  Calculator,
  DollarSign,
  Layers,
  Pencil,
  Check,
  X,
  Pin,
  Search,
  Share2,
  ArrowRight,
  MapPin,
  Briefcase,
  Smartphone,
  Cloud,
  HardHat,
  LogIn,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonGrid } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  fetchFavoriteColors,
  fetchFavoritePalettes,
  fetchUserProjects,
  deleteUserProject,
  duplicateUserProject,
  saveUserProject,
  fetchUserCollections,
  createUserCollection,
  deleteUserCollection,
  fetchCollectionColors,
  renameUserCollection,
  moveColorToCollection,
  fetchRecentlyViewedColors,
  clearRecentlyViewed,
  togglePinRecentlyViewed,
  createShareableLink,
} from "@/lib/queries";
import {
  fetchContractorProjects,
  deleteContractorProject,
} from "@/lib/contractor";
import {
  getLocalProjects,
  deleteLocalProject,
  type LocalProject,
} from "@/lib/local-projects";
import { useSeo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { readableTextColor } from "@/lib/colors";
import type {
  DbPaintColor,
  DbColorCombination,
  DbUserProject,
  DbContractorProject,
  DbUserCollection,
  ShareableResourceType,
} from "@/types/database";
import { SITE_URL } from "@/lib/seo";
import LocationCard from "@/components/location/LocationCard";
import {
  saveUserProjectLocation,
  locationFromProjectRow,
  formatLocationLabel,
  type FreluxLocation,
} from "@/lib/location-intelligence";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";

type Tab = "projects" | "colors" | "palettes" | "collections" | "recent";
type ProjectSubFilter = "all" | "contractor" | "estimates" | "device";
type Status = "loading" | "ready" | "error";

export default function MyProjects() {
  const { t } = useLanguage();
  useSeo({
    title: "My Projects: Saved Calculations, Workspaces & Favorites",
    description:
      "View your saved contractor projects, calculator estimates, colors, and collections in one unified workspace.",
    canonicalPath: "/my-projects",
    ogType: "website",
    noIndex: true,
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("projects");
  const [projectSubFilter, setProjectSubFilter] =
    useState<ProjectSubFilter>("all");
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [projects, setProjects] = useState<DbUserProject[]>([]);
  const [contractorProjects, setContractorProjects] = useState<
    DbContractorProject[]
  >([]);
  const [localProjects, setLocalProjects] = useState<LocalProject[]>([]);

  const [favColors, setFavColors] = useState<DbPaintColor[]>([]);
  const [favPalettes, setFavPalettes] = useState<DbColorCombination[]>([]);
  const [collections, setCollections] = useState<DbUserCollection[]>([]);
  const [collectionColors, setCollectionColors] = useState<
    Record<string, DbPaintColor[]>
  >({});
  const [recentlyViewed, setRecentlyViewed] = useState<DbPaintColor[]>([]);
  const [newCollName, setNewCollName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [locationProject, setLocationProject] = useState<DbUserProject | null>(
    null,
  );
  const [moveState, setMoveState] = useState<{
    colorId: string;
    fromColl: string;
  } | null>(null);

  const loadAll = useCallback(async () => {
    setStatus("loading");
    setError("");

    // 1. Always load local device projects
    const locals = getLocalProjects();
    setLocalProjects(locals);

    // 2. If guest, don't attempt authenticated fetches
    if (!user) {
      setProjects([]);
      setContractorProjects([]);
      setFavColors([]);
      setFavPalettes([]);
      setCollections([]);
      setRecentlyViewed([]);
      setStatus("ready");
      return;
    }

    try {
      const [
        projRes,
        contractorList,
        favColRes,
        favPalRes,
        collRes,
        recentRes,
      ] = await Promise.all([
        fetchUserProjects().catch(() => ({
          data: [] as DbUserProject[],
          error: null,
        })),
        fetchContractorProjects().catch(() => [] as DbContractorProject[]),
        fetchFavoriteColors().catch(() => ({
          data: [] as DbPaintColor[],
          error: null,
        })),
        fetchFavoritePalettes().catch(() => ({
          data: [] as DbColorCombination[],
          error: null,
        })),
        fetchUserCollections().catch(() => ({
          data: [] as DbUserCollection[],
          error: null,
        })),
        fetchRecentlyViewedColors(20).catch(() => ({
          data: [] as DbPaintColor[],
          error: null,
        })),
      ]);

      setProjects(projRes.data || []);
      setContractorProjects(contractorList || []);
      setFavColors(favColRes.data || []);
      setFavPalettes(favPalRes.data || []);
      setCollections(collRes.data || []);
      setRecentlyViewed(recentRes.data || []);

      const collColors: Record<string, DbPaintColor[]> = {};
      if (collRes.data && collRes.data.length > 0) {
        await Promise.all(
          collRes.data.map(async (c) => {
            const { data } = await fetchCollectionColors(c.id);
            collColors[c.id] = data;
          }),
        );
      }
      setCollectionColors(collColors);
      setStatus("ready");
    } catch {
      setError("Failed to load your data. Please try again.");
      setStatus("error");
    }
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleDeleteProject(id: string) {
    if (!confirm("Delete this estimate?")) return;
    await deleteUserProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Estimate deleted", type: "success" });
  }

  async function handleDeleteContractorProject(id: string) {
    if (!confirm("Delete this contractor workspace project?")) return;
    try {
      await deleteContractorProject(id);
      setContractorProjects((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Contractor project deleted", type: "success" });
    } catch (e) {
      toast({ title: (e as Error).message, type: "error" });
    }
  }

  function handleDeleteLocalProject(id: string) {
    if (!confirm("Remove this saved estimate from this device?")) return;
    deleteLocalProject(id);
    setLocalProjects(getLocalProjects());
    toast({ title: "Estimate removed from device", type: "success" });
  }

  async function handleSyncLocalToCloud(lp: LocalProject) {
    if (!user) {
      navigate("/login/?redirect=/my-projects");
      return;
    }
    const typeMapping: Record<string, DbUserProject["project_type"]> = {
      paint_calc: "paint_calc",
      cost_estimate: "cost_estimate",
      screeding_calc: "screeding",
      tile_calc: "tile",
      pop_calc: "pop_ceiling",
      wall_finishing: "wall_finishing",
    };
    const mappedType = typeMapping[lp.type] || "cost_estimate";
    const { data, error: err } = await saveUserProject(
      lp.name,
      mappedType,
      lp.data,
    );
    if (err) {
      toast({ title: "Failed to sync to cloud", message: err, type: "error" });
    } else {
      deleteLocalProject(lp.id);
      setLocalProjects(getLocalProjects());
      if (data) setProjects((prev) => [data, ...prev]);
      toast({
        title: "Estimate synced to your cloud account!",
        type: "success",
      });
    }
  }

  async function handleDuplicate(id: string) {
    await duplicateUserProject(id);
    loadAll();
  }

  const PROJECT_ROUTES: Record<string, string> = {
    screeding: "/screeding-calculator",
    wall_finishing: "/wall-finish-estimator",
    paint_calc: "/paint-calculator",
    cost_estimate: "/paint-calculator?mode=cost",
    ai_recommendation: "/ai-color-assistant",
    custom: "/paint-calculator",
    pop_ceiling: "/pop-ceiling-calculator",
    pop_estimate: "/pop-ceiling-calculator?mode=cost",
    tile: "/tile-calculator",
    tile_estimate: "/tile-calculator?mode=cost",
    painting: "/paint-calculator?mode=room-estimate",
    tyrolene: "/finish-estimator?mode=tyrolene",
    finish: "/finish-estimator",
    screeding_cost: "/screeding-calculator?mode=cost",
  };

  const LOCAL_PROJECT_ROUTES: Record<string, string> = {
    paint_calc: "/paint-calculator",
    cost_estimate: "/cost-estimator",
    screeding_calc: "/screeding-calculator",
    tile_calc: "/tile-calculator",
    pop_calc: "/pop-ceiling-calculator",
    wall_finishing: "/finish-estimator",
  };

  function handleOpenProject(p: DbUserProject) {
    const route = PROJECT_ROUTES[p.project_type] ?? "/paint-calculator";
    navigate(route, {
      state: {
        projectData: p.project_data,
        projectId: p.id,
        projectName: p.name,
        projectLocation: p.location,
      },
    });
  }

  function handleOpenLocalProject(lp: LocalProject) {
    const route = LOCAL_PROJECT_ROUTES[lp.type] ?? "/cost-estimator";
    navigate(route, {
      state: {
        projectData: lp.data,
        projectName: lp.name,
      },
    });
  }

  async function handleSaveProjectLocation(loc: FreluxLocation | null) {
    if (!locationProject) return;
    const res = await saveUserProjectLocation(locationProject.id, loc);
    if (res.ok) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === locationProject.id
            ? { ...p, location: loc as unknown as Record<string, unknown> }
            : p,
        ),
      );
      toast({ title: "Project location saved", variant: "success" });
      setLocationProject(null);
    } else {
      toast({
        title: "Could not save location",
        message: res.error ?? undefined,
        variant: "error",
      });
    }
  }

  async function handleCreateCollection() {
    if (!newCollName.trim()) return;
    setCreating(true);
    const { error: err } = await createUserCollection(newCollName.trim());
    setCreating(false);
    if (err) {
      setError(err);
      return;
    }
    setNewCollName("");
    loadAll();
  }

  async function handleDeleteCollection(id: string) {
    if (!confirm("Delete this collection and all its colors?")) return;
    await deleteUserCollection(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) return;
    const { error: err } = await renameUserCollection(id, renameValue.trim());
    if (err) {
      setError(err);
      return;
    }
    setRenamingId(null);
    loadAll();
  }

  async function handleMoveColor(toCollectionId: string) {
    if (!moveState) return;
    const { error: err } = await moveColorToCollection(
      moveState.fromColl,
      toCollectionId,
      moveState.colorId,
    );
    if (err) {
      setError(err);
      return;
    }
    setMoveState(null);
    loadAll();
  }

  async function handleClearRecent() {
    if (!confirm("Clear all unpinned recently viewed colors?")) return;
    await clearRecentlyViewed();
    loadAll();
  }

  async function handlePinRecent(colorId: string) {
    await togglePinRecentlyViewed(colorId);
    loadAll();
  }

  async function handleShare(
    resourceType: ShareableResourceType,
    resourceId: string,
  ) {
    const { data } = await createShareableLink(resourceType, resourceId);
    if (data) {
      const link = `${SITE_URL}/shared/${data.id}`;
      if (navigator.clipboard) navigator.clipboard.writeText(link);
      toast({
        type: "success",
        title: "Share link copied",
        message: "The shareable link has been copied to your clipboard.",
      });
    } else {
      toast({ type: "error", title: "Failed to create share link" });
    }
  }

  const filteredCollections = useMemo(() => {
    if (!search) return collections;
    return collections.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [collections, search]);

  const filteredProjects = useMemo(() => {
    if (!search) return projects;
    return projects.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [projects, search]);

  const filteredContractors = useMemo(() => {
    if (!search) return contractorProjects;
    return contractorProjects.filter(
      (cp) =>
        cp.name.toLowerCase().includes(search.toLowerCase()) ||
        (cp.client_name &&
          cp.client_name.toLowerCase().includes(search.toLowerCase())),
    );
  }, [contractorProjects, search]);

  const filteredLocals = useMemo(() => {
    if (!search) return localProjects;
    return localProjects.filter((lp) =>
      lp.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [localProjects, search]);

  const totalProjectsCount =
    projects.length + contractorProjects.length + localProjects.length;

  if (status === "loading") {
    return (
      <>
        <PageHeader
          eyebrow="Your workspace"
          title={t("My Projects & Estimates")}
          subtitle="Your saved contractor projects, calculator estimates, colors, and custom collections, all in one place."
          breadcrumbs={[{ label: "My Projects" }]}
        />
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <SkeletonGrid count={6} />
        </div>
      </>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <AlertCircle
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-red-400"
        />
        <p className="mt-3 text-sm text-red-600">{error}</p>
        <Button
          variant="ghost"
          onClick={() => loadAll()}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          {t("Try Again")}
        </Button>
      </div>
    );
  }

  const projectIcon = (type: string) => {
    switch (type) {
      case "screeding":
        return <Layers className="h-5 w-5 text-accent-cyan" />;
      case "wall_finishing":
        return <Layers className="h-5 w-5 text-brand-purple" />;
      case "paint_calc":
        return <Calculator className="h-5 w-5 text-accent-orange" />;
      case "cost_estimate":
        return <DollarSign className="h-5 w-5 text-accent-green" />;
      case "ai_recommendation":
        return <PaletteIcon className="h-5 w-5 text-brand-purple" />;
      case "pop_ceiling":
      case "pop_estimate":
        return <Layers className="h-5 w-5 text-indigo-500" />;
      case "tile":
      case "tile_estimate":
        return <Layers className="h-5 w-5 text-emerald-500" />;
      default:
        return <Folder className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Folder; count: number }[] =
    [
      {
        id: "projects",
        label: "Projects & Estimates",
        icon: Folder,
        count: totalProjectsCount,
      },
      {
        id: "colors",
        label: "Favorite Colors",
        icon: Bookmark,
        count: favColors.length,
      },
      {
        id: "palettes",
        label: "Favorite Palettes",
        icon: PaletteIcon,
        count: favPalettes.length,
      },
      {
        id: "collections",
        label: "Collections",
        icon: Folder,
        count: collections.length,
      },
      {
        id: "recent",
        label: "Recently Viewed",
        icon: Clock,
        count: recentlyViewed.length,
      },
    ];

  return (
    <>
      <PageHeader
        eyebrow="Your workspace"
        title={t("My Projects & Estimates")}
        subtitle="Manage your contractor workspaces, calculator estimates, colors, and collections in one place."
        breadcrumbs={[{ label: "My Projects" }]}
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Guest Banner if not signed in */}
        {!user && (
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">
                  {t("Guest Device Mode")}
                </h4>
                <p className="text-xs text-muted-foreground">
                  You are viewing estimates saved on this browser. Sign in to
                  sync across devices and access full Contractor Workspaces.
                </p>
              </div>
            </div>
            <Link
              to="/login/?redirect=/my-projects"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shrink-0"
            >
              <LogIn className="h-3.5 w-3.5" /> {t("Sign in to sync")}
            </Link>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <Button
                variant="ghost"
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setSearch("");
                }}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
                  tab === t.id
                    ? "border-brand-purple bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-brand-purple dark:border-white/5 dark:bg-card dark:text-muted-foreground/80 dark:hover:text-brand-purple-lighter"
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}{" "}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    tab === t.id ? "bg-white/20" : "bg-muted"
                  }`}
                >
                  {t.count}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Search bar for projects/collections */}
        {(tab === "projects" || tab === "collections") && (
          <div className="relative mb-6 w-full sm:max-w-xs">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              aria-label={t("Search projects")}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${tab}…`}
              className="input-field pl-9 dark:bg-card dark:border-white/10"
            />
          </div>
        )}

        {/* ── PROJECTS TAB ── */}
        {tab === "projects" && (
          <div className="space-y-6">
            {/* Sub-filter and Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setProjectSubFilter("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    projectSubFilter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All ({totalProjectsCount})
                </Button>
                {contractorProjects.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProjectSubFilter("contractor")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      projectSubFilter === "contractor"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Contractor Workspaces ({contractorProjects.length})
                  </Button>
                )}
                {projects.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProjectSubFilter("estimates")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      projectSubFilter === "estimates"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Calculator Estimates ({projects.length})
                  </Button>
                )}
                {localProjects.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProjectSubFilter("device")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      projectSubFilter === "device"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Saved on Device ({localProjects.length})
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/contractor"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-all"
                >
                  <HardHat className="h-3.5 w-3.5" />{" "}
                  {t("Contractor Workspace")}
                </Link>
                <Link
                  to="/calculators"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("New Estimate")}
                </Link>
              </div>
            </div>

            {totalProjectsCount === 0 ? (
              <EmptyState
                illustration="projects"
                title={t("No saved projects or estimates yet")}
                description="Save calculations, estimates, or contractor workspaces to access them here anytime."
                actionLabel="Explore Calculators"
                actionTo="/calculators"
              />
            ) : (
              <div className="space-y-6">
                {/* 1. CONTRACTOR PROJECTS SECTION */}
                {(projectSubFilter === "all" ||
                  projectSubFilter === "contractor") &&
                  filteredContractors.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <HardHat className="h-3.5 w-3.5 text-primary" />{" "}
                          Contractor Workspaces
                        </h3>
                        <Link
                          to="/contractor"
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          View all in Contractor Mode →
                        </Link>
                      </div>
                      <div className="space-y-2.5">
                        {filteredContractors.map((cp) => (
                          <div
                            key={cp.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primary/20 bg-card p-4 transition-all hover:border-primary/40 shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <div className="rounded-lg bg-primary/10 p-2.5 text-primary mt-0.5">
                                <HardHat className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-foreground">
                                    {cp.name}
                                  </h4>
                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary capitalize">
                                    {cp.status.replace("_", " ")}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                                  {cp.project_type.replace(/_/g, " ")} •{" "}
                                  {cp.building_type}
                                  {cp.client_name
                                    ? ` • Client: ${cp.client_name}`
                                    : ""}
                                </p>
                                <p className="text-[11px] text-muted-foreground/70 mt-1">
                                  Updated{" "}
                                  {new Date(cp.updated_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  navigate(`/contractor/projects/${cp.id}/`)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                              >
                                Open Workspace{" "}
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteContractorProject(cp.id)
                                }
                                className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/20"
                                title={t("Delete")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* 2. CLOUD CALCULATOR ESTIMATES SECTION */}
                {(projectSubFilter === "all" ||
                  projectSubFilter === "estimates") &&
                  filteredProjects.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Cloud className="h-3.5 w-3.5 text-accent-cyan" /> Cloud
                        Calculator Estimates
                      </h3>
                      <div className="space-y-2.5">
                        {filteredProjects.map((p) => (
                          <div
                            key={p.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {projectIcon(p.project_type)}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-foreground">
                                  {p.name}
                                </h4>
                                {p.description && (
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {p.description}
                                  </p>
                                )}
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Updated{" "}
                                  {new Date(p.updated_at).toLocaleDateString()}
                                  {p.location && (
                                    <>
                                      {" · "}
                                      <MapPin
                                        aria-hidden="true"
                                        className="inline h-3 w-3"
                                      />{" "}
                                      {formatLocationLabel(
                                        locationFromProjectRow(p),
                                      )}
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenProject(p)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                                title={t("Open in Calculator")}
                              >
                                <ArrowRight className="h-3.5 w-3.5" />{" "}
                                {t("Open")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleShare("project", p.id)}
                                className="rounded-lg border border-border p-2 text-muted-foreground hover:text-brand-purple"
                                title={t("Share")}
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLocationProject(p)}
                                className="rounded-lg border border-border p-2 text-muted-foreground hover:text-brand-purple"
                                title={
                                  p.location ? "Edit location" : "Set location"
                                }
                              >
                                <MapPin className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDuplicate(p.id)}
                                className="rounded-lg border border-border p-2 text-muted-foreground hover:text-brand-purple"
                                title={t("Duplicate")}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProject(p.id)}
                                className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/20"
                                title={t("Delete")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* 3. LOCAL DEVICE ESTIMATES SECTION */}
                {(projectSubFilter === "all" ||
                  projectSubFilter === "device") &&
                  filteredLocals.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Smartphone className="h-3.5 w-3.5 text-accent-orange" />{" "}
                          Saved on This Device
                        </h3>
                        {user && (
                          <span className="text-xs text-muted-foreground">
                            Synced to local storage · Cloud sync available
                          </span>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        {filteredLocals.map((lp) => (
                          <div
                            key={lp.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-card/60 p-4 transition-all hover:border-primary/40"
                          >
                            <div className="flex items-start gap-3">
                              <div className="rounded-lg bg-muted p-2 text-muted-foreground mt-0.5">
                                <Smartphone className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-foreground">
                                  {lp.name}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                                  {lp.type.replace(/_/g, " ")} • Saved{" "}
                                  {new Date(lp.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenLocalProject(lp)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                              >
                                <ArrowRight className="h-3.5 w-3.5" />{" "}
                                {t("Open")}
                              </Button>
                              {user ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSyncLocalToCloud(lp)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                                  title={t("Upload to Cloud Account")}
                                >
                                  <Cloud className="h-3.5 w-3.5" /> Sync to
                                  Cloud
                                </Button>
                              ) : (
                                <Link
                                  to="/login/?redirect=/my-projects"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                                >
                                  <LogIn className="h-3.5 w-3.5" /> Sign in to
                                  sync
                                </Link>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLocalProject(lp.id)}
                                className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/20"
                                title={t("Delete from device")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {/* ── FAVORITE COLORS TAB ── */}
        {tab === "colors" &&
          (favColors.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {favColors.map((c) => (
                <Link
                  key={c.id}
                  to={`/colors/paint/${c.slug}/`}
                  className="group overflow-hidden rounded-lg border border-border bg-card transition-all dark:border-white/5 dark:bg-card hover:-translate-y-1 hover:shadow-md"
                >
                  <div
                    className="aspect-square"
                    style={{ background: c.hex_code }}
                  >
                    <span
                      className="flex h-full items-center justify-center text-xs font-bold uppercase"
                      style={{ color: readableTextColor(c.hex_code) }}
                    >
                      {c.hex_code}
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-semibold text-foreground dark:text-primary-foreground">
                      {c.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              illustration="favorites"
              title={t("No favorite colors yet")}
              description="Tap the heart icon on any color to save it here."
              actionLabel="Browse colors"
              actionTo="/colors"
            />
          ))}

        {/* ── FAVORITE PALETTES TAB ── */}
        {tab === "palettes" &&
          (favPalettes.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {favPalettes.map((p) => (
                <Link
                  key={p.id}
                  to={`/colors/${p.slug}/`}
                  className="group overflow-hidden rounded-xl border border-border bg-card transition-all dark:border-white/5 dark:bg-card hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={p.image_url}
                      alt={p.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 flex gap-1 bg-white/90 p-2 backdrop-blur dark:bg-background/90">
                      {[
                        p.main_color_code,
                        p.secondary_color_code,
                        p.accent_color_code,
                      ].map((hex) => (
                        <div
                          key={hex}
                          className="h-5 flex-1 rounded ring-1 ring-black/5"
                          style={{ background: hex }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-bold text-foreground dark:text-primary-foreground">
                      {p.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              illustration="favorites"
              title={t("No favorite palettes yet")}
              description="Browse color palettes and save the ones you love."
              actionLabel="Browse palettes"
              actionTo="/colors"
            />
          ))}

        {/* ── COLLECTIONS TAB ── */}
        {tab === "collections" && (
          <>
            <div className="mb-6 flex gap-2">
              <input
                aria-label={t("New collection name")}
                value={newCollName}
                onChange={(e) => setNewCollName(e.target.value)}
                placeholder={t(
                  "New collection name (e.g., Luxury Living Room)",
                )}
                className="input-field flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleCreateCollection()}
              />
              <Button
                variant="default"
                type="button"
                onClick={handleCreateCollection}
                disabled={creating || !newCollName.trim()}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-primary/90"
              >
                <Plus aria-hidden="true" className="h-4 w-4" /> {t("Create")}
              </Button>
            </div>
            {filteredCollections.length > 0 ? (
              <div className="space-y-4">
                {filteredCollections.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-border bg-card p-4 dark:border-white/5 dark:bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {renamingId === c.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              aria-label={t("Rename collection")}
                              className="input-field flex-1 text-sm font-bold"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              autoFocus
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleRename(c.id)
                              }
                            />
                            <Button
                              variant="ghost"
                              type="button"
                              onClick={() => handleRename(c.id)}
                              className="rounded-md bg-primary p-1.5 text-primary-foreground"
                            >
                              <Check aria-hidden="true" className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              type="button"
                              onClick={() => setRenamingId(null)}
                              className="rounded-md border border-border p-1.5 text-muted-foreground dark:border-white/5 dark:text-muted-foreground"
                            >
                              <X aria-hidden="true" className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">
                              {c.name}
                            </h3>
                            {c.description && (
                              <p className="text-xs text-muted-foreground">
                                {c.description}
                              </p>
                            )}
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {(collectionColors[c.id] ?? []).length} colors
                            </p>
                          </>
                        )}
                      </div>
                      {renamingId !== c.id && (
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() => {
                              setRenamingId(c.id);
                              setRenameValue(c.name);
                            }}
                            className="rounded-lg border border-border p-2 text-muted-foreground hover:text-brand-purple dark:border-white/5 dark:text-muted-foreground dark:hover:text-brand-purple-lighter"
                            title={t("Rename")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() => handleDeleteCollection(c.id)}
                            className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"
                            title={t("Delete")}
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {(collectionColors[c.id] ?? []).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(collectionColors[c.id] ?? []).map((col) => (
                          <div
                            key={col.id}
                            className="group relative flex items-center gap-2 rounded-lg border border-border p-1.5 pr-3 hover:border-brand-purple"
                          >
                            <Link
                              to={`/colors/paint/${col.slug}/`}
                              className="flex items-center gap-2"
                            >
                              <div
                                className="h-8 w-8 rounded"
                                style={{ background: col.hex_code }}
                              />
                              <span className="text-xs font-medium text-card-foreground dark:text-muted-foreground/60">
                                {col.name}
                              </span>
                            </Link>
                            {collections.length > 1 && (
                              <div className="relative">
                                <Button
                                  variant="ghost"
                                  type="button"
                                  onClick={() =>
                                    setMoveState({
                                      colorId: col.id,
                                      fromColl: c.id,
                                    })
                                  }
                                  className="rounded p-0.5 text-muted-foreground hover:text-brand-purple"
                                  title={t("Move to another collection")}
                                >
                                  <ArrowRight
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5"
                                  />
                                </Button>
                                {moveState?.colorId === col.id && (
                                  <div className="absolute right-0 top-6 z-10 w-48 rounded-lg border border-border bg-card p-2 shadow-lg dark:border-white/5 dark:bg-card">
                                    <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                                      {t("Move to")}
                                    </p>
                                    {collections
                                      .filter((oc) => oc.id !== c.id)
                                      .map((oc) => (
                                        <Button
                                          variant="ghost"
                                          key={oc.id}
                                          type="button"
                                          onClick={() => handleMoveColor(oc.id)}
                                          className="block w-full rounded px-2 py-1.5 text-left text-xs font-medium text-card-foreground dark:text-muted-foreground/60 hover:bg-muted"
                                        >
                                          {oc.name}
                                        </Button>
                                      ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                illustration="projects"
                title={t("No collections yet")}
                description="Create custom collections to organize your favorite colors by project or theme."
              />
            )}
          </>
        )}

        {/* ── RECENTLY VIEWED TAB ── */}
        {tab === "recent" && (
          <>
            {recentlyViewed.length > 0 ? (
              <>
                <div className="mb-4 flex justify-end">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={handleClearRecent}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-red-500 dark:border-white/5 dark:text-muted-foreground/80 dark:hover:text-red-400"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" /> Clear
                    History
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {recentlyViewed.map((c) => (
                    <div
                      key={c.id}
                      className="group relative overflow-hidden rounded-lg border border-border bg-card transition-all dark:border-white/5 dark:bg-card hover:-translate-y-1 hover:shadow-md"
                    >
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => handlePinRecent(c.id)}
                        className="absolute right-2 top-2 z-10 rounded-full bg-white/80 p-1.5 text-muted-foreground dark:bg-background/80 dark:text-muted-foreground hover:text-brand-purple"
                        title={t("Pin/Unpin")}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </Button>
                      <Link to={`/colors/paint/${c.slug}/`}>
                        <div
                          className="aspect-square"
                          style={{ background: c.hex_code }}
                        >
                          <span
                            className="flex h-full items-center justify-center text-xs font-bold uppercase"
                            style={{ color: readableTextColor(c.hex_code) }}
                          >
                            {c.hex_code}
                          </span>
                        </div>
                        <div className="p-2">
                          <p className="truncate text-xs font-semibold text-foreground dark:text-primary-foreground">
                            {c.name}
                          </p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                illustration="generic"
                title={t("No recently viewed colors")}
                description="Browse the color library and your viewed colors will appear here."
                actionLabel="Browse colors"
                actionTo="/colors"
              />
            )}
          </>
        )}
      </div>

      {/* Project location dialog */}
      {locationProject && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("Project location")}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-md rounded-2xl border border-border/40 bg-card p-5 shadow-premium-lg sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">
                {locationProject.name} · Location
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocationProject(null)}
                aria-label={t("Close")}
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Set this project's location to unlock regional market data:
              calculators opened from this project will follow its currency.
            </p>
            <LocationCard
              initialLocation={locationFromProjectRow(locationProject)}
              onSave={handleSaveProjectLocation}
            />
          </div>
        </div>
      )}
    </>
  );
}
