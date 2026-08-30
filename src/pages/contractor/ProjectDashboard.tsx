/**
 * FRELUX — Smart Project Dashboard
 * Main project view showing aggregated project data with tabbed sections:
 * Overview | Rooms | Labour | Shopping | Quotation | Timeline | Notes
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package, Users, DollarSign, Clock, TrendingUp, Plus, Trash2, Edit,
  Download, Share2, Printer, FileText, Calendar, CheckCircle2, Circle,
  Upload, ClipboardList, Hammer, ArrowLeft, Save, X, Loader2, AlertCircle, Brain,
} from 'lucide-react';
import {
  fetchContractorProject, fetchProjectRooms, fetchLabourPlan, fetchShoppingList,
  fetchTimeline, fetchQuotations, recalculateProjectTotals,
  updateContractorProject, createProjectVersion,
  createProjectRoom, updateProjectRoom, deleteProjectRoom,
  createLabourPlanItem, updateLabourPlanItem, deleteLabourPlanItem,
  generateShoppingList, saveShoppingList, updateShoppingItem,
  generateQuotation, updateQuotation,
  generateTimeline, updateTimelinePhase,
  fetchAttachments, deleteAttachment,
} from '@/lib/contractor';
import { generateQuotationPDF, generateShoppingListPDF } from '@/lib/pdf';
import { AiProjectPanel } from '@/components/ai/AiProjectPanel';
import type {
  DbContractorProject, DbProjectRoom, DbProjectLabourPlan,
  DbProjectShoppingItem, DbProjectTimeline, DbProjectQuotation,
  DbProjectAttachment,
  SurfaceCondition, SurfaceType, WallSmoothness, Porosity,
  RoomType, RoomCalcType, LabourRole, TimelinePhase,
} from '@/types/database';
import { useSeo } from '@/lib/seo';

// ============================================================
// CONSTANTS & HELPERS
// ============================================================

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value || 0);
}

type TabKey = 'overview' | 'rooms' | 'labour' | 'shopping' | 'quotation' | 'timeline' | 'notes' | 'ai';

const TABS: { key: TabKey; label: string; icon: typeof Package }[] = [
  { key: 'overview', label: 'Overview', icon: TrendingUp },
  { key: 'rooms', label: 'Rooms', icon: Package },
  { key: 'labour', label: 'Labour', icon: Users },
  { key: 'shopping', label: 'Shopping', icon: ClipboardList },
  { key: 'quotation', label: 'Quotation', icon: FileText },
  { key: 'timeline', label: 'Timeline', icon: Calendar },
  { key: 'notes', label: 'Notes', icon: Hammer },
  { key: 'ai', label: 'AI Assistant', icon: Brain },
];

const ROOM_TYPES: RoomType[] = ['living_room', 'bedroom', 'kitchen', 'bathroom', 'balcony', 'hallway', 'staircase', 'office', 'dining', 'custom'];
const CALC_TYPES: RoomCalcType[] = ['paint', 'screeding', 'pop_ceiling', 'tiling'];
const SURFACE_CONDITIONS: SurfaceCondition[] = ['excellent', 'good', 'fair', 'poor', 'damaged'];
const SURFACE_TYPES: SurfaceType[] = ['fresh_plaster', 'old_paint', 'peeling_paint', 'moisture', 'cracks', 'mould', 'concrete', 'wood', 'metal'];
const WALL_SMOOTHNESS: WallSmoothness[] = ['smooth', 'slightly_rough', 'rough', 'very_rough'];
const POROSITY_LEVELS: Porosity[] = ['low', 'medium', 'high', 'very_high'];
const LABOUR_ROLES: LabourRole[] = ['painter', 'pop_installer', 'wall_screeder', 'tile_installer', 'labourer', 'foreman', 'electrician', 'plumber', 'carpenter', 'supervisor'];

const PHASE_COLORS: Record<TimelinePhase, string> = {
  preparation: 'bg-blue-500',
  screeding: 'bg-amber-500',
  pop_installation: 'bg-purple-500',
  primer: 'bg-cyan-500',
  painting: 'bg-indigo-500',
  tiling: 'bg-rose-500',
  drying: 'bg-gray-400',
  inspection: 'bg-teal-500',
  completion: 'bg-green-500',
  touch_up: 'bg-orange-500',
  cleanup: 'bg-slate-500',
};

const PHASE_TEXT_COLORS: Record<TimelinePhase, string> = {
  preparation: 'text-blue-600',
  screeding: 'text-amber-600',
  pop_installation: 'text-purple-600',
  primer: 'text-cyan-600',
  painting: 'text-indigo-600',
  tiling: 'text-rose-600',
  drying: 'text-gray-500',
  inspection: 'text-teal-600',
  completion: 'text-green-600',
  touch_up: 'text-orange-600',
  cleanup: 'text-slate-600',
};

function prettify(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================
// ROOM FORM TYPES
// ============================================================

interface RoomFormData {
  name: string;
  room_type: RoomType;
  calculation_type: RoomCalcType;
  length_m: string;
  width_m: string;
  height_m: string;
  unit: 'meters' | 'feet';
  surface_condition: SurfaceCondition;
  surface_type: SurfaceType;
  wall_smoothness: WallSmoothness;
  porosity: Porosity;
}

const emptyRoomForm: RoomFormData = {
  name: '',
  room_type: 'living_room',
  calculation_type: 'paint',
  length_m: '',
  width_m: '',
  height_m: '',
  unit: 'meters',
  surface_condition: 'good',
  surface_type: 'fresh_plaster',
  wall_smoothness: 'smooth',
  porosity: 'medium',
};

// ============================================================
// LABOUR FORM TYPES
// ============================================================

interface LabourFormData {
  role: LabourRole;
  worker_count: string;
  days_required: string;
  daily_wage: string;
  notes: string;
}

const emptyLabourForm: LabourFormData = {
  role: 'painter',
  worker_count: '1',
  days_required: '1',
  daily_wage: '5000',
  notes: '',
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  useSeo({ title: 'FRELUX', description: 'FRELUX', noIndex: true });
  const navigate = useNavigate();

  // ── State ──
  const [project, setProject] = useState<DbContractorProject | null>(null);
  const [rooms, setRooms] = useState<DbProjectRoom[]>([]);
  const [labourPlan, setLabourPlan] = useState<DbProjectLabourPlan[]>([]);
  const [shoppingList, setShoppingList] = useState<DbProjectShoppingItem[]>([]);
  const [timeline, setTimeline] = useState<DbProjectTimeline[]>([]);
  const [quotations, setQuotations] = useState<DbProjectQuotation[]>([]);
  const [attachments, setAttachments] = useState<DbProjectAttachment[]>([]);
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Room form state ──
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormData>(emptyRoomForm);

  // ── Labour form state ──
  const [showLabourForm, setShowLabourForm] = useState(false);
  const [editingLabourId, setEditingLabourId] = useState<string | null>(null);
  const [labourForm, setLabourForm] = useState<LabourFormData>(emptyLabourForm);

  // ── Quotation form state ──
  const [quotMarkup, setQuotMarkup] = useState('15');
  const [quotProfit, setQuotProfit] = useState('10');
  const [quotTax, setQuotTax] = useState('7.5');
  const [quotTransport, setQuotTransport] = useState('0');
  const [quotMisc, setQuotMisc] = useState('0');

  // ── Initial fetch ──
  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [proj, rm, lp, sl, tl, qt, att] = await Promise.all([
        fetchContractorProject(id),
        fetchProjectRooms(id),
        fetchLabourPlan(id),
        fetchShoppingList(id),
        fetchTimeline(id),
        fetchQuotations(id),
        fetchAttachments(id),
      ]);
      if (!proj) {
        setError('Project not found.');
        return;
      }
      setProject(proj);
      setRooms(rm);
      setLabourPlan(lp);
      setShoppingList(sl);
      setTimeline(tl);
      setQuotations(qt);
      setAttachments(att);
      setNotes(proj.notes ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project data.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Recalculate totals ──
  const doRecalculate = useCallback(async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      const updated = await recalculateProjectTotals(id);
      setProject(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recalculation failed.');
    } finally {
      setActionLoading(false);
    }
  }, [id]);

  // ============================================================
  // ROOM ACTIONS
  // ============================================================

  const handleRoomSubmit = async () => {
    if (!id || !roomForm.name.trim()) return;
    try {
      setActionLoading(true);
      const dims = {
        length_m: roomForm.length_m ? parseFloat(roomForm.length_m) : undefined,
        width_m: roomForm.width_m ? parseFloat(roomForm.width_m) : undefined,
        height_m: roomForm.height_m ? parseFloat(roomForm.height_m) : undefined,
        unit: roomForm.unit,
        surface_condition: roomForm.surface_condition,
        surface_type: roomForm.surface_type,
        wall_smoothness: roomForm.wall_smoothness,
        porosity: roomForm.porosity,
        calculation_type: roomForm.calculation_type,
        calculation_input: {
          length: parseFloat(roomForm.length_m) || 0,
          width: parseFloat(roomForm.width_m) || 0,
          height: parseFloat(roomForm.height_m) || 0,
        },
      };

      if (editingRoomId) {
        await updateProjectRoom(editingRoomId, {
          name: roomForm.name,
          room_type: roomForm.room_type,
          ...dims,
        });
      } else {
        await createProjectRoom({
          project_id: id,
          name: roomForm.name,
          room_type: roomForm.room_type,
          ...dims,
        });
      }

      const refreshed = await fetchProjectRooms(id);
      setRooms(refreshed);
      await doRecalculate();
      setShowRoomForm(false);
      setEditingRoomId(null);
      setRoomForm(emptyRoomForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save room.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditRoom = (room: DbProjectRoom) => {
    setEditingRoomId(room.id);
    setRoomForm({
      name: room.name,
      room_type: room.room_type,
      calculation_type: room.calculation_type,
      length_m: room.length_m?.toString() ?? '',
      width_m: room.width_m?.toString() ?? '',
      height_m: room.height_m?.toString() ?? '',
      unit: room.unit,
      surface_condition: room.surface_condition,
      surface_type: room.surface_type,
      wall_smoothness: room.wall_smoothness,
      porosity: room.porosity,
    });
    setShowRoomForm(true);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!id) return;
    try {
      setActionLoading(true);
      await deleteProjectRoom(roomId);
      const refreshed = await fetchProjectRooms(id);
      setRooms(refreshed);
      await doRecalculate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete room.');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // LABOUR ACTIONS
  // ============================================================

  const handleLabourSubmit = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      const wc = parseInt(labourForm.worker_count) || 1;
      const dr = parseInt(labourForm.days_required) || 1;
      const dw = parseFloat(labourForm.daily_wage) || 0;

      if (editingLabourId) {
        await updateLabourPlanItem(editingLabourId, {
          role: labourForm.role,
          worker_count: wc,
          days_required: dr,
          daily_wage: dw,
          notes: labourForm.notes || null,
        });
      } else {
        await createLabourPlanItem(id, labourForm.role, wc, dr, dw, labourForm.notes || undefined);
      }

      const refreshed = await fetchLabourPlan(id);
      setLabourPlan(refreshed);
      await doRecalculate();
      setShowLabourForm(false);
      setEditingLabourId(null);
      setLabourForm(emptyLabourForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save labour item.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditLabour = (item: DbProjectLabourPlan) => {
    setEditingLabourId(item.id);
    setLabourForm({
      role: item.role,
      worker_count: item.worker_count.toString(),
      days_required: item.days_required.toString(),
      daily_wage: item.daily_wage.toString(),
      notes: item.notes ?? '',
    });
    setShowLabourForm(true);
  };

  const handleDeleteLabour = async (labourId: string) => {
    if (!id) return;
    try {
      setActionLoading(true);
      await deleteLabourPlanItem(labourId);
      const refreshed = await fetchLabourPlan(id);
      setLabourPlan(refreshed);
      await doRecalculate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete labour item.');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // SHOPPING LIST ACTIONS
  // ============================================================

  const handleGenerateShoppingList = async () => {
    if (!id || !project) return;
    try {
      setActionLoading(true);
      const items = await generateShoppingList({
        rooms,
        projectType: project.project_type,
        finishQuality: project.finish_quality,
        currency: project.currency,
        currencySymbol: project.currency_symbol,
      });
      const saved = await saveShoppingList(id, items);
      setShoppingList(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate shopping list.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePurchased = async (item: DbProjectShoppingItem) => {
    try {
      await updateShoppingItem(item.id, { is_purchased: !item.is_purchased });
      setShoppingList(prev =>
        prev.map(i => (i.id === item.id ? { ...i, is_purchased: !i.is_purchased } : i))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item.');
    }
  };

  const handlePrintShoppingList = () => {
    window.print();
  };

  const handleDownloadShoppingPDF = async () => {
    if (!project || shoppingList.length === 0) return;
    try {
      await generateShoppingListPDF(project, shoppingList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF generation failed.');
    }
  };

  const handleShareWhatsApp = () => {
    if (!project || shoppingList.length === 0) return;
    const total = shoppingList.reduce((sum, i) => sum + i.total_price, 0);
    const purchased = shoppingList.filter(i => i.is_purchased).length;
    const summary = `*${project.name}: Shopping List*\n\n` +
      `Items: ${shoppingList.length}\n` +
      `Purchased: ${purchased}/${shoppingList.length}\n` +
      `Estimated Total: ${project.currency_symbol}${total.toLocaleString('en-NG')}\n\n` +
      shoppingList.slice(0, 20).map(i =>
        `${i.is_purchased ? '✅' : '⬜'} ${i.name}, ${i.quantity} ${i.unit} (${project.currency_symbol}${i.total_price.toLocaleString('en-NG')})`
      ).join('\n') +
      (shoppingList.length > 20 ? `\n...and ${shoppingList.length - 20} more items` : '');
    window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, '_blank');
  };

  // ============================================================
  // QUOTATION ACTIONS
  // ============================================================

  const handleGenerateQuotation = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await generateQuotation(id, {
        markupPercentage: parseFloat(quotMarkup) || 0,
        profitPercentage: parseFloat(quotProfit) || 0,
        taxPercentage: parseFloat(quotTax) || 0,
        transportCost: parseFloat(quotTransport) || 0,
        miscCost: parseFloat(quotMisc) || 0,
      });
      const refreshed = await fetchQuotations(id);
      setQuotations(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quotation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadQuotationPDF = async (quotation: DbProjectQuotation) => {
    if (!project) return;
    try {
      await generateQuotationPDF(project, quotation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF generation failed.');
    }
  };

  const handleSendQuotation = async (quotationId: string) => {
    try {
      setActionLoading(true);
      await updateQuotation(quotationId, { status: 'sent' });
      setQuotations(prev => prev.map(q => (q.id === quotationId ? { ...q, status: 'sent' } : q)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quotation.');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // TIMELINE ACTIONS
  // ============================================================

  const handleGenerateTimeline = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      const generated = await generateTimeline(id);
      setTimeline(generated);
      const proj = await fetchContractorProject(id);
      if (proj) setProject(proj);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate timeline.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPhaseComplete = async (phase: DbProjectTimeline) => {
    try {
      setActionLoading(true);
      const isCompleted = !phase.is_completed;
      await updateTimelinePhase(phase.id, {
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      });
      setTimeline(prev =>
        prev.map(p => (p.id === phase.id ? { ...p, is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null } : p))
      );

      // Update progress
      if (project && id) {
        const completedCount = timeline.filter(p => p.is_completed).length + (isCompleted ? 1 : -1);
        const totalCount = timeline.length;
        const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        const updated = await updateContractorProject(id, { progress_percentage: progressPct });
        setProject(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update phase.');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // NOTES ACTIONS
  // ============================================================

  const handleSaveNotes = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      const updated = await updateContractorProject(id, { notes });
      setProject(updated);
      setNotesDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save notes.');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // ATTACHMENTS
  // ============================================================

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!id) return;
    try {
      setActionLoading(true);
      await deleteAttachment(attachmentId);
      const refreshed = await fetchAttachments(id);
      setAttachments(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete attachment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // File upload is handled via Supabase storage — simplified UI here
    // The actual upload logic would use a Supabase storage bucket
    e.target.value = '';
  };

  // ============================================================
  // DERIVED VALUES
  // ============================================================

  const totalMaterialCost = project?.total_material_cost ?? 0;
  const totalLabourCost = project?.total_labour_cost ?? 0;
  const totalProjectCost = project?.total_project_cost ?? 0;
  const estimatedDuration = project?.estimated_duration_days ?? 0;
  const progress = project?.progress_percentage ?? 0;

  const shoppingTotal = useMemo(
    () => shoppingList.reduce((sum, i) => sum + i.total_price, 0),
    [shoppingList]
  );
  const shoppingPurchased = useMemo(
    () => shoppingList.filter(i => i.is_purchased).length,
    [shoppingList]
  );

  const maxTimelineDay = useMemo(
    () => timeline.length > 0 ? Math.max(...timeline.map(t => t.end_day)) : 0,
    [timeline]
  );

  const completedPhases = useMemo(
    () => timeline.filter(t => t.is_completed).length,
    [timeline]
  );

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-sm font-medium">Loading project dashboard…</p>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle aria-hidden="true" className="h-10 w-10 text-red-500" />
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{project.name}</h1>
                <p className="text-sm text-gray-500">
                  {prettify(project.project_type)} · {prettify(project.status)} · {prettify(project.finish_quality)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={doRecalculate}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <TrendingUp aria-hidden="true" className="h-4 w-4" /> Recalculate
              </button>
              <button
                onClick={() => createProjectVersion(id!, 'Manual version snapshot')}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Save aria-hidden="true" className="h-4 w-4" /> Snapshot
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <nav className="mt-4 flex gap-1 overflow-x-auto pb-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-violet-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-amber-600 hover:text-amber-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Tab content ── */}
      <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <OverviewTab
            totalMaterialCost={totalMaterialCost}
            totalLabourCost={totalLabourCost}
            totalProjectCost={totalProjectCost}
            estimatedDuration={estimatedDuration}
            progress={progress}
            roomCount={rooms.length}
            labourCount={labourPlan.length}
            shoppingItemCount={shoppingList.length}
            quotationCount={quotations.length}
            timelinePhaseCount={timeline.length}
            completedPhases={completedPhases}
            project={project}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomsTab
            rooms={rooms}
            showRoomForm={showRoomForm}
            roomForm={roomForm}
            setRoomForm={setRoomForm}
            editingRoomId={editingRoomId}
            actionLoading={actionLoading}
            onShowForm={() => { setEditingRoomId(null); setRoomForm(emptyRoomForm); setShowRoomForm(true); }}
            onCancelForm={() => { setShowRoomForm(false); setEditingRoomId(null); setRoomForm(emptyRoomForm); }}
            onSubmit={handleRoomSubmit}
            onEdit={handleEditRoom}
            onDelete={handleDeleteRoom}
            currencySymbol={project.currency_symbol}
          />
        )}

        {activeTab === 'labour' && (
          <LabourTab
            labourPlan={labourPlan}
            showLabourForm={showLabourForm}
            labourForm={labourForm}
            setLabourForm={setLabourForm}
            editingLabourId={editingLabourId}
            actionLoading={actionLoading}
            onShowForm={() => { setEditingLabourId(null); setLabourForm(emptyLabourForm); setShowLabourForm(true); }}
            onCancelForm={() => { setShowLabourForm(false); setEditingLabourId(null); setLabourForm(emptyLabourForm); }}
            onSubmit={handleLabourSubmit}
            onEdit={handleEditLabour}
            onDelete={handleDeleteLabour}
            currencySymbol={project.currency_symbol}
          />
        )}

        {activeTab === 'shopping' && (
          <ShoppingTab
            shoppingList={shoppingList}
            shoppingTotal={shoppingTotal}
            shoppingPurchased={shoppingPurchased}
            actionLoading={actionLoading}
            onGenerate={handleGenerateShoppingList}
            onTogglePurchased={handleTogglePurchased}
            onPrint={handlePrintShoppingList}
            onDownloadPDF={handleDownloadShoppingPDF}
            onShareWhatsApp={handleShareWhatsApp}
            currencySymbol={project.currency_symbol}
          />
        )}

        {activeTab === 'quotation' && (
          <QuotationTab
            quotations={quotations}
            quotMarkup={quotMarkup}
            quotProfit={quotProfit}
            quotTax={quotTax}
            quotTransport={quotTransport}
            quotMisc={quotMisc}
            setQuotMarkup={setQuotMarkup}
            setQuotProfit={setQuotProfit}
            setQuotTax={setQuotTax}
            setQuotTransport={setQuotTransport}
            setQuotMisc={setQuotMisc}
            actionLoading={actionLoading}
            onGenerate={handleGenerateQuotation}
            onDownloadPDF={handleDownloadQuotationPDF}
            onSend={handleSendQuotation}
            currencySymbol={project.currency_symbol}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineTab
            timeline={timeline}
            maxTimelineDay={maxTimelineDay}
            completedPhases={completedPhases}
            actionLoading={actionLoading}
            onGenerate={handleGenerateTimeline}
            onMarkComplete={handleMarkPhaseComplete}
          />
        )}

        {activeTab === 'notes' && (
          <NotesTab
            notes={notes}
            setNotes={setNotes}
            notesDirty={notesDirty}
            setNotesDirty={setNotesDirty}
            actionLoading={actionLoading}
            onSave={handleSaveNotes}
            attachments={attachments}
            onFileChange={handleFileChange}
            onDeleteAttachment={handleDeleteAttachment}
          />
        )}
        {activeTab === 'ai' && (
          <AiProjectPanel projectData={{
            name: project.name,
            project_type: project.project_type,
            building_type: project.building_type,
            finish_quality: project.finish_quality,
            budget_level: project.budget_level,
            status: project.status,
            rooms: rooms.map(r => ({
              name: r.name,
              calculation_type: r.calculation_type,
              surface_area: (r.calculation_result as Record<string, unknown>)?.totalArea as number ?? 0,
              material_cost: r.material_cost ?? 0,
              labour_cost: r.labour_cost ?? 0,
              input_data: r.calculation_input,
            })),
            total_material_cost: project.total_material_cost,
            total_labour_cost: project.total_labour_cost,
            total_project_cost: project.total_project_cost,
            currency: project.currency,
            currency_symbol: project.currency_symbol,
            notes: project.notes ?? undefined,
          }} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// OVERVIEW TAB
// ============================================================

interface OverviewTabProps {
  totalMaterialCost: number;
  totalLabourCost: number;
  totalProjectCost: number;
  estimatedDuration: number;
  progress: number;
  roomCount: number;
  labourCount: number;
  shoppingItemCount: number;
  quotationCount: number;
  timelinePhaseCount: number;
  completedPhases: number;
  project: DbContractorProject;
}

function OverviewTab(props: OverviewTabProps) {
  const stats = [
    { label: 'Material Cost', value: formatCurrency(props.totalMaterialCost), icon: Package, color: 'bg-blue-500' },
    { label: 'Labour Cost', value: formatCurrency(props.totalLabourCost), icon: Users, color: 'bg-amber-500' },
    { label: 'Total Cost', value: formatCurrency(props.totalProjectCost), icon: DollarSign, color: 'bg-violet-600' },
    { label: 'Est. Duration', value: `${props.estimatedDuration} days`, icon: Clock, color: 'bg-teal-500' },
    { label: 'Progress', value: `${props.progress}%`, icon: TrendingUp, color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-lg ${stat.color} p-2.5`}>
                  <Icon aria-hidden="true" className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">{stat.label}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Project Progress</h3>
          <span className="text-lg font-bold text-violet-600">{props.progress}%</span>
        </div>
        <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${Math.min(100, props.progress)}%` }}
          />
        </div>
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Rooms', value: props.roomCount, icon: Package },
          { label: 'Labour Roles', value: props.labourCount, icon: Users },
          { label: 'Shopping Items', value: props.shoppingItemCount, icon: ClipboardList },
          { label: 'Quotations', value: props.quotationCount, icon: FileText },
          { label: 'Timeline Phases', value: props.timelinePhaseCount, icon: Calendar },
          { label: 'Completed Phases', value: props.completedPhases, icon: CheckCircle2 },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <Icon aria-hidden="true" className="mx-auto h-5 w-5 text-gray-400" />
              <p className="mt-2 text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          );
        })}
      </div>

      {/* Client info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Client Information</h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Client Name</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{props.project.client_name ?? 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Phone</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{props.project.client_phone ?? 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Email</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{props.project.client_email ?? 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Address</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{props.project.client_address ?? 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ROOMS TAB
// ============================================================

interface RoomsTabProps {
  rooms: DbProjectRoom[];
  showRoomForm: boolean;
  roomForm: RoomFormData;
  setRoomForm: React.Dispatch<React.SetStateAction<RoomFormData>>;
  editingRoomId: string | null;
  actionLoading: boolean;
  onShowForm: () => void;
  onCancelForm: () => void;
  onSubmit: () => void;
  onEdit: (room: DbProjectRoom) => void;
  onDelete: (roomId: string) => void;
  currencySymbol: string;
}

function RoomsTab(props: RoomsTabProps) {
  const { rooms, showRoomForm, roomForm, setRoomForm, editingRoomId, actionLoading, onShowForm, onCancelForm, onSubmit, onEdit, onDelete, currencySymbol } = props;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Project Rooms ({rooms.length})</h2>
        <button
          onClick={onShowForm}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Add Room
        </button>
      </div>

      {/* Inline room form */}
      {showRoomForm && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              {editingRoomId ? 'Edit Room' : 'New Room'}
            </h3>
            <button onClick={onCancelForm} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600">Room Name</label>
              <input
                type="text"
                value={roomForm.name}
                onChange={e => setRoomForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Master Bedroom"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Room type */}
            <div>
              <label className="block text-xs font-medium text-gray-600">Room Type</label>
              <select
                value={roomForm.room_type}
                onChange={e => setRoomForm(p => ({ ...p, room_type: e.target.value as RoomType }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                {ROOM_TYPES.map(t => <option key={t} value={t}>{prettify(t)}</option>)}
              </select>
            </div>

            {/* Calculation type */}
            <div>
              <label className="block text-xs font-medium text-gray-600">Calculation Type</label>
              <select
                value={roomForm.calculation_type}
                onChange={e => setRoomForm(p => ({ ...p, calculation_type: e.target.value as RoomCalcType }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                {CALC_TYPES.map(t => <option key={t} value={t}>{prettify(t)}</option>)}
              </select>
            </div>

            {/* Dimensions */}
            <div>
              <label className="block text-xs font-medium text-gray-600">Length</label>
              <input
                type="number"
                step="0.1"
                value={roomForm.length_m}
                onChange={e => setRoomForm(p => ({ ...p, length_m: e.target.value }))}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Width</label>
              <input
                type="number"
                step="0.1"
                value={roomForm.width_m}
                onChange={e => setRoomForm(p => ({ ...p, width_m: e.target.value }))}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Height</label>
              <input
                type="number"
                step="0.1"
                value={roomForm.height_m}
                onChange={e => setRoomForm(p => ({ ...p, height_m: e.target.value }))}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-medium text-gray-600">Unit</label>
              <select
                value={roomForm.unit}
                onChange={e => setRoomForm(p => ({ ...p, unit: e.target.value as 'meters' | 'feet' }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                <option value="meters">Meters</option>
                <option value="feet">Feet</option>
              </select>
            </div>

            {/* Surface assessment dropdowns */}
            <div>
              <label className="block text-xs font-medium text-gray-600">Surface Condition</label>
              <select
                value={roomForm.surface_condition}
                onChange={e => setRoomForm(p => ({ ...p, surface_condition: e.target.value as SurfaceCondition }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                {SURFACE_CONDITIONS.map(t => <option key={t} value={t}>{prettify(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Surface Type</label>
              <select
                value={roomForm.surface_type}
                onChange={e => setRoomForm(p => ({ ...p, surface_type: e.target.value as SurfaceType }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                {SURFACE_TYPES.map(t => <option key={t} value={t}>{prettify(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Wall Smoothness</label>
              <select
                value={roomForm.wall_smoothness}
                onChange={e => setRoomForm(p => ({ ...p, wall_smoothness: e.target.value as WallSmoothness }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                {WALL_SMOOTHNESS.map(t => <option key={t} value={t}>{prettify(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Porosity</label>
              <select
                value={roomForm.porosity}
                onChange={e => setRoomForm(p => ({ ...p, porosity: e.target.value as Porosity }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                {POROSITY_LEVELS.map(t => <option key={t} value={t}>{prettify(t)}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={onSubmit}
              disabled={actionLoading || !roomForm.name.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
              {editingRoomId ? 'Update Room' : 'Create Room'}
            </button>
            <button
              onClick={onCancelForm}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rooms list */}
      {rooms.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white py-16">
          <Package aria-hidden="true" className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No rooms yet. Add your first room to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map(room => {
            const dims = [
              room.length_m != null ? `L: ${room.length_m}${room.unit === 'meters' ? 'm' : 'ft'}` : null,
              room.width_m != null ? `W: ${room.width_m}${room.unit === 'meters' ? 'm' : 'ft'}` : null,
              room.height_m != null ? `H: ${room.height_m}${room.unit === 'meters' ? 'm' : 'ft'}` : null,
            ].filter(Boolean);

            return (
              <div key={room.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{room.name}</h3>
                    <p className="text-xs text-gray-500">{prettify(room.room_type)} · {prettify(room.calculation_type)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(room)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-violet-600">
                      <Edit aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(room.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {dims.length > 0 && (
                  <p className="mt-2 text-xs text-gray-600">{dims.join(' · ')}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-1">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                    {prettify(room.surface_condition)}
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                    Waste: {room.waste_factor_percentage}%
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-gray-100 pt-3">
                  <div>
                    <p className="text-xs text-gray-500">Material</p>
                    <p className="text-sm font-semibold text-gray-900">{currencySymbol}{room.material_cost.toLocaleString('en-NG')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Labour</p>
                    <p className="text-sm font-semibold text-gray-900">{currencySymbol}{room.labour_cost.toLocaleString('en-NG')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-sm font-semibold text-violet-600">{currencySymbol}{room.room_total_cost.toLocaleString('en-NG')}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// LABOUR TAB
// ============================================================

interface LabourTabProps {
  labourPlan: DbProjectLabourPlan[];
  showLabourForm: boolean;
  labourForm: LabourFormData;
  setLabourForm: React.Dispatch<React.SetStateAction<LabourFormData>>;
  editingLabourId: string | null;
  actionLoading: boolean;
  onShowForm: () => void;
  onCancelForm: () => void;
  onSubmit: () => void;
  onEdit: (item: DbProjectLabourPlan) => void;
  onDelete: (labourId: string) => void;
  currencySymbol: string;
}

function LabourTab(props: LabourTabProps) {
  const { labourPlan, showLabourForm, labourForm, setLabourForm, editingLabourId, actionLoading, onShowForm, onCancelForm, onSubmit, onEdit, onDelete, currencySymbol } = props;

  const totalCost = labourPlan.reduce((sum, l) => sum + l.total_cost, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Labour Plan ({labourPlan.length})</h2>
        <button
          onClick={onShowForm}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Add Role
        </button>
      </div>

      {/* Inline labour form */}
      {showLabourForm && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              {editingLabourId ? 'Edit Labour Role' : 'New Labour Role'}
            </h3>
            <button onClick={onCancelForm} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-gray-600">Role</label>
              <select
                value={labourForm.role}
                onChange={e => setLabourForm(p => ({ ...p, role: e.target.value as LabourRole }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                {LABOUR_ROLES.map(r => <option key={r} value={r}>{prettify(r)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Worker Count</label>
              <input
                type="number"
                min="1"
                value={labourForm.worker_count}
                onChange={e => setLabourForm(p => ({ ...p, worker_count: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Days Required</label>
              <input
                type="number"
                min="1"
                value={labourForm.days_required}
                onChange={e => setLabourForm(p => ({ ...p, days_required: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Daily Wage ({currencySymbol})</label>
              <input
                type="number"
                min="0"
                step="100"
                value={labourForm.daily_wage}
                onChange={e => setLabourForm(p => ({ ...p, daily_wage: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-600">Notes</label>
            <input
              type="text"
              value={labourForm.notes}
              onChange={e => setLabourForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes…"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* Computed preview */}
          <div className="mt-4 rounded-lg bg-violet-100 px-4 py-3">
            <p className="text-sm text-violet-800">
              Total Cost: <span className="font-bold">
                {currencySymbol}{((parseInt(labourForm.worker_count) || 0) * (parseInt(labourForm.days_required) || 0) * (parseFloat(labourForm.daily_wage) || 0)).toLocaleString('en-NG')}
              </span>
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={onSubmit}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
              {editingLabourId ? 'Update Role' : 'Add Role'}
            </button>
            <button
              onClick={onCancelForm}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Labour table */}
      {labourPlan.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white py-16">
          <Users aria-hidden="true" className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No labour roles yet. Add workers to plan your project.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-brand-navy-mid dark:border-white/5 md:block">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Role</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Workers</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Days</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Daily Wage</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {labourPlan.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{prettify(item.role)}</p>
                      {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{item.worker_count}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{item.days_required}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">{currencySymbol}{item.daily_wage.toLocaleString('en-NG')}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-violet-600">{currencySymbol}{item.total_cost.toLocaleString('en-NG')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => onEdit(item)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-violet-600">
                          <Edit aria-hidden="true" className="h-4 w-4" />
                        </button>
                        <button onClick={() => onDelete(item.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Labour Cost:</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-violet-600">{currencySymbol}{totalCost.toLocaleString('en-NG')}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {labourPlan.map(item => (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{prettify(item.role)}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(item)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-violet-600">
                      <Edit aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(item.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {item.notes && <p className="mt-1 text-xs text-gray-500">{item.notes}</p>}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Workers</p>
                    <p className="text-sm font-semibold text-gray-900">{item.worker_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Days</p>
                    <p className="text-sm font-semibold text-gray-900">{item.days_required}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Wage</p>
                    <p className="text-sm font-semibold text-gray-900">{currencySymbol}{item.daily_wage.toLocaleString('en-NG')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-sm font-semibold text-violet-600">{currencySymbol}{item.total_cost.toLocaleString('en-NG')}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-between rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-sm font-semibold text-gray-700">Total Labour Cost:</span>
              <span className="text-sm font-bold text-violet-600">{currencySymbol}{totalCost.toLocaleString('en-NG')}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// SHOPPING TAB
// ============================================================

interface ShoppingTabProps {
  shoppingList: DbProjectShoppingItem[];
  shoppingTotal: number;
  shoppingPurchased: number;
  actionLoading: boolean;
  onGenerate: () => void;
  onTogglePurchased: (item: DbProjectShoppingItem) => void;
  onPrint: () => void;
  onDownloadPDF: () => void;
  onShareWhatsApp: () => void;
  currencySymbol: string;
}

function ShoppingTab(props: ShoppingTabProps) {
  const { shoppingList, shoppingTotal, shoppingPurchased, actionLoading, onGenerate, onTogglePurchased, onPrint, onDownloadPDF, onShareWhatsApp, currencySymbol } = props;

  const categories = useMemo(() => {
    const map = new Map<string, DbProjectShoppingItem[]>();
    for (const item of shoppingList) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return Array.from(map.entries());
  }, [shoppingList]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Shopping List ({shoppingList.length})</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onGenerate}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {actionLoading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ClipboardList aria-hidden="true" className="h-4 w-4" />}
            Generate Shopping List
          </button>
          <button
            onClick={onPrint}
            disabled={shoppingList.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Printer aria-hidden="true" className="h-4 w-4" /> Print
          </button>
          <button
            onClick={onDownloadPDF}
            disabled={shoppingList.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download aria-hidden="true" className="h-4 w-4" /> PDF
          </button>
          <button
            onClick={onShareWhatsApp}
            disabled={shoppingList.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
          >
            <Share2 aria-hidden="true" className="h-4 w-4" /> WhatsApp
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {shoppingList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase text-gray-500">Total Items</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{shoppingList.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase text-gray-500">Purchased</p>
            <p className="mt-1 text-lg font-bold text-green-600">{shoppingPurchased}/{shoppingList.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase text-gray-500">Est. Total</p>
            <p className="mt-1 text-lg font-bold text-violet-600">{currencySymbol}{shoppingTotal.toLocaleString('en-NG')}</p>
          </div>
        </div>
      )}

      {/* Shopping list grouped by category */}
      {shoppingList.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white py-16">
          <ClipboardList aria-hidden="true" className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No shopping list yet. Click "Generate" to create one from your rooms.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map(([category, items]) => {
            const categoryTotal = items.reduce((sum, i) => sum + i.total_price, 0);
            return (
              <div key={category} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-brand-navy-mid dark:border-white/5">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <h3 className="text-sm font-semibold capitalize text-gray-700">{prettify(category)}</h3>
                  <span className="text-sm font-semibold text-violet-600">{currencySymbol}{categoryTotal.toLocaleString('en-NG')}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                      <button
                        onClick={() => onTogglePurchased(item)}
                        className={`shrink-0 rounded ${item.is_purchased ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'}`}
                      >
                        {item.is_purchased ? <CheckCircle2 aria-hidden="true" className="h-5 w-5" /> : <Circle aria-hidden="true" className="h-5 w-5" />}
                      </button>
                      <div className={`flex-1 ${item.is_purchased ? 'line-through opacity-60' : ''}`}>
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.quantity} {item.unit} · {currencySymbol}{item.estimated_price.toLocaleString('en-NG')} each
                        </p>
                      </div>
                      <span className={`text-sm font-semibold ${item.is_purchased ? 'text-gray-400' : 'text-gray-900'}`}>
                        {currencySymbol}{item.total_price.toLocaleString('en-NG')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// QUOTATION TAB
// ============================================================

interface QuotationTabProps {
  quotations: DbProjectQuotation[];
  quotMarkup: string;
  quotProfit: string;
  quotTax: string;
  quotTransport: string;
  quotMisc: string;
  setQuotMarkup: (v: string) => void;
  setQuotProfit: (v: string) => void;
  setQuotTax: (v: string) => void;
  setQuotTransport: (v: string) => void;
  setQuotMisc: (v: string) => void;
  actionLoading: boolean;
  onGenerate: () => void;
  onDownloadPDF: (quotation: DbProjectQuotation) => void;
  onSend: (quotationId: string) => void;
  currencySymbol: string;
}

const QUOTATION_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-amber-100 text-amber-700',
  revised: 'bg-purple-100 text-purple-700',
};

function QuotationTab(props: QuotationTabProps) {
  const { quotations, quotMarkup, quotProfit, quotTax, quotTransport, quotMisc, setQuotMarkup, setQuotProfit, setQuotTax, setQuotTransport, setQuotMisc, actionLoading, onGenerate, onDownloadPDF, onSend, currencySymbol } = props;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Quotations ({quotations.length})</h2>

      {/* Quotation generator inputs */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Generate New Quotation</h3>
        <p className="mt-1 text-sm text-gray-500">Adjust markup, profit, tax, and additional costs to generate a quotation.</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <label className="block text-xs font-medium text-gray-600">Markup %</label>
            <input
              type="number"
              step="0.5"
              value={quotMarkup}
              onChange={e => setQuotMarkup(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Profit %</label>
            <input
              type="number"
              step="0.5"
              value={quotProfit}
              onChange={e => setQuotProfit(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Tax %</label>
            <input
              type="number"
              step="0.5"
              value={quotTax}
              onChange={e => setQuotTax(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Transport Cost</label>
            <input
              type="number"
              step="100"
              value={quotTransport}
              onChange={e => setQuotTransport(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Misc Cost</label>
            <input
              type="number"
              step="100"
              value={quotMisc}
              onChange={e => setQuotMisc(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={actionLoading}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {actionLoading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <FileText aria-hidden="true" className="h-4 w-4" />}
          Generate Quotation
        </button>
      </div>

      {/* Generated quotations */}
      {quotations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white py-16">
          <FileText aria-hidden="true" className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No quotations yet. Set your parameters above and generate one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotations.map(quot => (
            <div key={quot.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{quot.quotation_number}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${QUOTATION_STATUS_COLORS[quot.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {prettify(quot.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(quot.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
                    {quot.company_name && ` · ${quot.company_name}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onDownloadPDF(quot)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Download aria-hidden="true" className="h-4 w-4" /> PDF
                  </button>
                  {quot.status === 'draft' && (
                    <button
                      onClick={() => onSend(quot.id)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      <Share2 aria-hidden="true" className="h-4 w-4" /> Mark Sent
                    </button>
                  )}
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Materials</p>
                  <p className="text-sm font-semibold text-gray-900">{currencySymbol}{quot.material_cost.toLocaleString('en-NG')}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Labour</p>
                  <p className="text-sm font-semibold text-gray-900">{currencySymbol}{quot.labour_cost.toLocaleString('en-NG')}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Markup ({quot.markup_percentage}%)</p>
                  <p className="text-sm font-semibold text-gray-900">{currencySymbol}{quot.markup_amount.toLocaleString('en-NG')}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Profit ({quot.profit_percentage}%)</p>
                  <p className="text-sm font-semibold text-gray-900">{currencySymbol}{quot.profit_amount.toLocaleString('en-NG')}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Tax ({quot.tax_percentage}%)</p>
                  <p className="text-sm font-semibold text-gray-900">{currencySymbol}{quot.tax_amount.toLocaleString('en-NG')}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Transport</p>
                  <p className="text-sm font-semibold text-gray-900">{currencySymbol}{quot.transport_cost.toLocaleString('en-NG')}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Misc</p>
                  <p className="text-sm font-semibold text-gray-900">{currencySymbol}{quot.misc_cost.toLocaleString('en-NG')}</p>
                </div>
                <div className="rounded-lg bg-violet-50 p-3">
                  <p className="text-xs text-violet-500">Grand Total</p>
                  <p className="text-sm font-bold text-violet-700">{currencySymbol}{quot.grand_total.toLocaleString('en-NG')}</p>
                </div>
              </div>

              {/* Footer info */}
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                {quot.validity_days && <span>Valid for {quot.validity_days} days</span>}
                {quot.timeline_days && <span>Timeline: {quot.timeline_days} days</span>}
                {quot.payment_terms && <span>Terms: {quot.payment_terms}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// TIMELINE TAB
// ============================================================

interface TimelineTabProps {
  timeline: DbProjectTimeline[];
  maxTimelineDay: number;
  completedPhases: number;
  actionLoading: boolean;
  onGenerate: () => void;
  onMarkComplete: (phase: DbProjectTimeline) => void;
}

function TimelineTab(props: TimelineTabProps) {
  const { timeline, maxTimelineDay, completedPhases, actionLoading, onGenerate, onMarkComplete } = props;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Project Timeline ({timeline.length})</h2>
        <button
          onClick={onGenerate}
          disabled={actionLoading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {actionLoading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Calendar aria-hidden="true" className="h-4 w-4" />}
          Generate Timeline
        </button>
      </div>

      {timeline.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white py-16">
          <Calendar aria-hidden="true" className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No timeline generated yet. Click "Generate" to create a project timeline.</p>
        </div>
      ) : (
        <>
          {/* Progress summary */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700">{completedPhases} of {timeline.length} phases completed</span>
            </div>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                style={{ width: `${timeline.length > 0 ? (completedPhases / timeline.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Gantt-like visual timeline */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Timeline Schedule</h3>

            {/* Day axis */}
            <div className="mb-2 flex justify-between text-xs text-gray-400">
              <span>Day 0</span>
              <span>Day {Math.ceil(maxTimelineDay / 2)}</span>
              <span>Day {maxTimelineDay}</span>
            </div>

            <div className="space-y-3">
              {timeline.map((phase: DbProjectTimeline) => {
                const leftPercent = maxTimelineDay > 0 ? (phase.start_day / maxTimelineDay) * 100 : 0;
                const widthPercent = maxTimelineDay > 0 ? ((phase.end_day - phase.start_day) / maxTimelineDay) * 100 : 0;
                const barColor = PHASE_COLORS[phase.phase] ?? 'bg-gray-500';

                return (
                  <div key={phase.id} className="group">
                    {/* Label row */}
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {phase.is_completed ? (
                          <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className={`h-4 w-4 ${PHASE_TEXT_COLORS[phase.phase] ?? 'text-gray-400'}`} />
                        )}
                        <span className={`text-sm font-medium ${phase.is_completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {phase.name}
                        </span>
                        <span className="text-xs text-gray-400">({prettify(phase.phase)})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          Day {phase.start_day}–{phase.end_day} ({phase.days_required}d)
                        </span>
                        <button
                          onClick={() => onMarkComplete(phase)}
                          disabled={actionLoading}
                          className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                            phase.is_completed
                              ? 'border-gray-300 text-gray-500 hover:bg-gray-50'
                              : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {phase.is_completed ? 'Undo' : 'Mark Complete'}
                        </button>
                      </div>
                    </div>

                    {/* Bar row */}
                    <div className="relative h-7 w-full rounded bg-gray-100">
                      <div
                        className={`absolute top-0 flex h-7 items-center justify-center rounded text-xs font-medium text-white ${barColor} ${phase.is_completed ? 'opacity-40' : ''}`}
                        style={{ left: `${leftPercent}%`, width: `${Math.max(widthPercent, 2)}%` }}
                      >
                        {widthPercent > 15 && <span>{phase.days_required}d</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total duration */}
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-sm font-medium text-gray-600">Total Estimated Duration</span>
              <span className="text-sm font-bold text-violet-600">{maxTimelineDay} days</span>
            </div>
          </div>

          {/* Phase legend */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h4 className="mb-3 text-xs font-semibold uppercase text-gray-500">Phase Legend</h4>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(PHASE_COLORS) as TimelinePhase[]).map(phase => (
                <div key={phase} className="flex items-center gap-1.5">
                  <div className={`h-3 w-3 rounded ${PHASE_COLORS[phase]}`} />
                  <span className="text-xs text-gray-600">{prettify(phase)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// NOTES & ATTACHMENTS TAB
// ============================================================

interface NotesTabProps {
  notes: string;
  setNotes: (v: string) => void;
  notesDirty: boolean;
  setNotesDirty: (v: boolean) => void;
  actionLoading: boolean;
  onSave: () => void;
  attachments: DbProjectAttachment[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteAttachment: (attachmentId: string) => void;
}

function NotesTab(props: NotesTabProps) {
  const { notes, setNotes, notesDirty, setNotesDirty, actionLoading, onSave, attachments, onFileChange, onDeleteAttachment } = props;

  return (
    <div className="space-y-6">
      {/* Notes section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Hammer aria-hidden="true" className="h-5 w-5 text-violet-600" /> Project Notes
          </h3>
          {notesDirty && (
            <button
              onClick={onSave}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
              Save Notes
            </button>
          )}
        </div>
        <textarea
          value={notes}
          onChange={e => { setNotes(e.target.value); setNotesDirty(true); }}
          placeholder="Add project notes, observations, instructions, or reminders…"
          rows={10}
          className="mt-3 w-full resize-y rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
        <p className="mt-2 text-xs text-gray-500">
          {notesDirty ? 'Unsaved changes, click "Save Notes" to persist.' : 'All changes saved.'}
        </p>
      </div>

      {/* Attachments section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <Upload aria-hidden="true" className="h-5 w-5 text-violet-600" /> Attachments
        </h3>

        {/* Upload area */}
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center transition-colors hover:border-violet-400 hover:bg-violet-50">
          <Upload aria-hidden="true" className="h-8 w-8 text-gray-400" />
          <p className="text-sm font-medium text-gray-600">Click to upload files</p>
          <p className="text-xs text-gray-400">Photos, documents, blueprints, or any project file</p>
          <input
            type="file"
            multiple
            onChange={onFileChange}
            className="hidden"
          />
        </label>

        {/* Attachment list */}
        {attachments.length > 0 && (
          <div className="mt-4 space-y-2">
            {attachments.map(att => (
              <div key={att.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                  <FileText aria-hidden="true" className="h-5 w-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{att.file_name}</p>
                  <p className="text-xs text-gray-500">
                    {(att.file_size / 1024).toFixed(1)} KB · {new Date(att.created_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
                {att.public_url && (
                  <a
                    href={att.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-violet-600"
                  >
                    <Download aria-hidden="true" className="h-4 w-4" />
                  </a>
                )}
                <button
                  onClick={() => onDeleteAttachment(att.id)}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
