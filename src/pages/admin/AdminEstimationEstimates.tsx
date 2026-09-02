import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Search, Filter, Calendar, User, Layers, AlertTriangle, Lightbulb } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminHeader, AdminCard, StateMessage, AdminInput, AdminSelect } from '@/components/admin/AdminUi';

interface EstimationEstimate {
  id: string;
  estimate_ref: string;
  user_id: string | null;
  client_hash: string | null;
  calculator_type: string;
  project_description: string | null;
  inputs: Record<string, unknown>;
  calculation_method: string;
  calc_version_id: string | null;
  calculated_quantities: Record<string, unknown>;
  total_material_cost: number;
  currency: string;
  labour_status: 'not_included' | 'negotiated_separately' | 'included';
  warnings: unknown[];
  recommendations: unknown[];
  notes: string | null;
  status: 'draft' | 'calculated' | 'adjusted' | 'saved' | 'shared' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface EstimationEstimateItem {
  id: string;
  estimate_id: string;
  item_name: string;
  item_type: 'product' | 'material' | 'primer' | 'sealer' | 'labour' | 'other';
  product_id: string | null;
  quality_level_id: string | null;
  material_id: string | null;
  quantity_required: number;
  practical_purchase_qty: number;
  unit: string;
  pack_size: number | null;
  unit_price: number;
  total_price: number;
  price_snapshot: Record<string, unknown>;
  calculation_source: 'calculated' | 'manual' | 'adjusted' | 'negotiated';
  adjustment_status: 'none' | 'adjusted' | 'pending_review';
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function formatCurrency(amount: number, currency: string = 'NGN'): string {
  const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `;
  return `${symbol}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'draft':
      return 'bg-muted text-card-foreground border-border';
    case 'calculated':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'adjusted':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'saved':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'shared':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-muted text-card-foreground border-border';
  }
}

function getLabourBadge(status: string) {
  switch (status) {
    case 'not_included':
      return 'bg-muted text-muted-foreground border-border';
    case 'negotiated_separately':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'included':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function getItemTypeBadge(type: string) {
  switch (type) {
    case 'product':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'material':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'primer':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'sealer':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'labour':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-muted/50 dark:bg-white/5 text-card-foreground border-border';
  }
}

export default function AdminEstimationEstimates() {
  const [estimates, setEstimates] = useState<EstimationEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded estimate state and line items cache
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<string, EstimationEstimateItem[]>>({});
  const [itemsLoading, setItemsLoading] = useState<Record<string, boolean>>({});

  // Filters
  const [calcFilter, setCalcFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadEstimates = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('estimation_estimates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setEstimates((data as EstimationEstimate[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEstimates();
  }, [loadEstimates]);

  const loadEstimateItems = async (estimateId: string) => {
    if (itemsCache[estimateId]) return;

    setItemsLoading((prev) => ({ ...prev, [estimateId]: true }));
    const { data, error } = await supabase
      .from('estimation_estimate_items')
      .select('*')
      .eq('estimate_id', estimateId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (!error && data) {
      setItemsCache((prev) => ({ ...prev, [estimateId]: data as EstimationEstimateItem[] }));
    }
    setItemsLoading((prev) => ({ ...prev, [estimateId]: false }));
  };

  const toggleExpand = (estimateId: string) => {
    if (expandedId === estimateId) {
      setExpandedId(null);
    } else {
      setExpandedId(estimateId);
      loadEstimateItems(estimateId);
    }
  };

  const filteredEstimates = estimates.filter((est) => {
    if (calcFilter !== 'all' && est.calculator_type !== calcFilter) return false;
    if (statusFilter !== 'all' && est.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const ref = est.estimate_ref.toLowerCase();
      const desc = (est.project_description || '').toLowerCase();
      const calc = est.calculator_type.toLowerCase();
      return ref.includes(q) || desc.includes(q) || calc.includes(q);
    }
    return true;
  });

  return (
    <>
      <AdminHeader
        title="Estimation Records"
        subtitle="Read-only view of calculation estimates and itemized cost breakdowns generated across all tools."
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Calculator:</span>
            <AdminSelect
              className="text-xs py-1.5"
              value={calcFilter}
              onChange={(e) => setCalcFilter(e.target.value)}
            >
              <option value="all">All Calculators</option>
              <option value="painting">Painting</option>
              <option value="tyrolene">Tyrolene</option>
              <option value="grafitex">Grafitex</option>
              <option value="screeding">Screeding</option>
              <option value="pop">POP</option>
              <option value="tile">Tile</option>
            </AdminSelect>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Status:</span>
            <AdminSelect
              className="text-xs py-1.5"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="calculated">Calculated</option>
              <option value="adjusted">Adjusted</option>
              <option value="saved">Saved</option>
              <option value="shared">Shared</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </AdminSelect>
          </div>
        </div>

        <div className="relative w-full lg:w-72">
          <Search aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <AdminInput
 type="text"
 placeholder="Search estimate ref or description..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <StateMessage type="loading" title="Loading estimates..." message="Fetching estimate history." />
      ) : filteredEstimates.length === 0 ? (
        <StateMessage
          type="empty"
          title="No estimate records found"
          message={searchQuery || calcFilter !== 'all' || statusFilter !== 'all' ? 'Try clearing or modifying your search filters.' : 'Estimates generated by users and admins will appear here.'}
        />
      ) : (
        <div className="space-y-4">
          {filteredEstimates.map((est) => {
            const isExpanded = expandedId === est.id;
            const lineItems = itemsCache[est.id] || [];
            const isItemLoading = itemsLoading[est.id];

            return (
              <AdminCard key={est.id} className="transition-all">
                <div
                  className="flex cursor-pointer flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => toggleExpand(est.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground dark:text-primary-foreground">
                        {est.estimate_ref}
                      </span>

                      <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold capitalize text-card-foreground border border-border">
                        {est.calculator_type}
                      </span>

                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${getStatusBadge(est.status)}`}>
                        {est.status}
                      </span>

                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${getLabourBadge(est.labour_status)}`}>
                        Labour: {est.labour_status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {est.project_description && (
                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">
                        {est.project_description}
                      </p>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground dark:text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar aria-hidden="true" className="h-3 w-3" /> {new Date(est.created_at).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User aria-hidden="true" className="h-3 w-3" /> {est.user_id ? `User: ${est.user_id.slice(0, 8)}...` : est.client_hash ? `Anon: ${est.client_hash.slice(0, 8)}...` : 'System'}
                      </span>
                      <span>Method: {est.calculation_method}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <span className="text-base font-extrabold text-foreground dark:text-primary-foreground">
                        {formatCurrency(est.total_material_cost, est.currency)}
                      </span>
                      <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">Total Material Cost</p>
                    </div>

                    <div className="rounded-full bg-muted p-2 text-muted-foreground hover:bg-muted">
                      {isExpanded ? <ChevronUp aria-hidden="true" className="h-4 w-4" /> : <ChevronDown aria-hidden="true" className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Line Items Detail Panel */}
                {isExpanded && (
                  <div className="mt-5 border-t border-border pt-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Layers aria-hidden="true" className="h-3.5 w-3.5 text-brand-purple" />
                        Estimate Line Items ({lineItems.length})
                      </h4>
                    </div>

                    {isItemLoading ? (
                      <div className="p-4 text-center text-xs text-muted-foreground dark:text-muted-foreground">Loading line items...</div>
                    ) : lineItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic p-2">No line items recorded for this estimate.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/50 dark:bg-white/5 font-semibold text-muted-foreground border-b border-border">
                            <tr>
                              <th className="p-2.5">Item Name</th>
                              <th className="p-2.5">Type</th>
                              <th className="p-2.5 text-right">Req. Qty</th>
                              <th className="p-2.5 text-right">Practical Qty</th>
                              <th className="p-2.5 text-right">Unit Price</th>
                              <th className="p-2.5 text-right">Total Price</th>
                              <th className="p-2.5">Source</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {lineItems.map((item) => (
                              <tr key={item.id} className="hover:bg-muted/50 dark:bg-white/5/80">
                                <td className="p-2.5 font-medium text-foreground">
                                  {item.item_name}
                                  {item.notes && <p className="text-[10px] text-muted-foreground italic">{item.notes}</p>}
                                </td>
                                <td className="p-2.5">
                                  <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${getItemTypeBadge(item.item_type)}`}>
                                    {item.item_type}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-mono">
                                  {item.quantity_required} {item.unit}
                                </td>
                                <td className="p-2.5 text-right font-mono font-semibold text-card-foreground dark:text-muted-foreground/60">
                                  {item.practical_purchase_qty} {item.unit}
                                  {item.pack_size && <span className="block text-[9px] text-muted-foreground dark:text-muted-foreground">Pack: {item.pack_size}</span>}
                                </td>
                                <td className="p-2.5 text-right font-mono">
                                  {formatCurrency(item.unit_price, est.currency)}
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-foreground dark:text-primary-foreground">
                                  {formatCurrency(item.total_price, est.currency)}
                                </td>
                                <td className="p-2.5 capitalize text-muted-foreground text-[11px]">
                                  {item.calculation_source}
                                  {item.adjustment_status !== 'none' && (
                                    <span className="ml-1 text-[10px] text-orange-600">({item.adjustment_status})</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Additional Metadata / Warnings / Notes */}
                    {(est.notes || (est.warnings && est.warnings.length > 0) || (est.recommendations && est.recommendations.length > 0)) && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
                        {est.warnings && est.warnings.length > 0 && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-800">
                            <span className="font-bold flex items-center gap-1 mb-1 text-[11px]">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Warnings
                            </span>
                            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                              {est.warnings.map((w, idx) => (
                                <li key={idx}>{typeof w === 'string' ? w : JSON.stringify(w)}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {est.recommendations && est.recommendations.length > 0 && (
                          <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-blue-800">
                            <span className="font-bold flex items-center gap-1 mb-1 text-[11px]">
                              <Lightbulb className="h-3.5 w-3.5 text-blue-600" /> Recommendations
                            </span>
                            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                              {est.recommendations.map((r, idx) => (
                                <li key={idx}>{typeof r === 'string' ? r : JSON.stringify(r)}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {est.notes && (
                          <div className="rounded-lg border border-border bg-muted/50 dark:bg-white/5 dark:border-white/5 p-2.5 text-card-foreground sm:col-span-2">
                            <span className="font-bold block mb-1 text-[11px]">Notes</span>
                            <p className="text-[11px]">{est.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </AdminCard>
            );
          })}
        </div>
      )}
    </>
  );
}
