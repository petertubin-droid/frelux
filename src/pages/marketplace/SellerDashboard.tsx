import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Store,
  Package,
  DollarSign,
  TrendingUp,
  Loader2,
  Plus,
  Edit,
  BadgeCheck,
  MapPin,
  Phone,
  Truck,
  CheckCircle2,
  Clock,
  MessageSquare,
  Mail,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import {
  AdminButton,
  AdminInput,
  AdminSelect,
} from "@/components/admin/AdminUi";
import type {
  DbMarketplaceSellerProfile,
  SellerType,
} from "@/types/marketplace-expansion";
import {
  SELLER_TYPE_LABELS,
  SELLER_VERIFICATION_LABELS,
} from "@/types/marketplace-expansion";
import type {
  DbMarketplaceProduct,
  DbProductInquiry,
} from "@/types/marketplace-products";
import {
  fetchInquiriesForSeller,
  fetchMyProducts,
  updateInquiryStatus,
} from "@/lib/marketplace-products";
import AdminPagination from "@/components/admin/AdminPagination";
import { PRODUCT_STATUS_LABELS } from "@/types/marketplace-products";
import { Button } from "@/components/ui/shadcn/button";
import { formatByCode } from "@/lib/international/currency-format";
import { useLanguage } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";

const PAGE_SIZE = 10;

export default function SellerDashboard() {
  const { t } = useLanguage();
  useSeo({
    title: "Seller Dashboard | FRELUX Marketplace",
    description:
      "Manage your seller profile, products, and sales on FRELUX Marketplace.",
    canonicalPath: "/marketplace/seller-dashboard",
  });

  const navigate = useNavigate();
  const [profile, setProfile] = useState<DbMarketplaceSellerProfile | null>(
    null,
  );
  const [products, setProducts] = useState<DbMarketplaceProduct[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [productPage, setProductPage] = useState(0);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);
  const [activeProducts, setActiveProducts] = useState(0);
  const [inquiries, setInquiries] = useState<DbProductInquiry[]>([]);
  const [inquiryTotal, setInquiryTotal] = useState(0);
  const [inquiryPage, setInquiryPage] = useState(0);
  const [pendingInquiries, setPendingInquiries] = useState(0);
  const [inquiryBusyId, setInquiryBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [sellerType, setSellerType] = useState<SellerType>("individual");
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [pickupAvailable, setPickupAvailable] = useState(true);

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data, error } = await supabase
      .from("marketplace_seller_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    setProfile(data as unknown as DbMarketplaceSellerProfile | null);

    if (data) {
      const p = data as unknown as DbMarketplaceSellerProfile;
      setSellerType(p.seller_type);
      setBusinessName(p.business_name || "");
      setBusinessPhone(p.business_phone || "");
      setBusinessAddress(p.business_address || "");
      setDeliveryAvailable(p.default_delivery_available);
      setPickupAvailable(p.default_pickup_available);
    }

    // Products are paged by their own effect below; a 50-row cap here quietly
    // hid every listing a busy seller added after the fiftieth.
    setSellerId(user.id);

    // Buyer leads were being written to marketplace_product_inquiries with no
    // screen to read them, so sellers never saw an offer. This is that inbox.
    // A failure here must not take the rest of the dashboard down.
    // The inbox is paged by its own effect; a single unpaged read grew with
    // every enquiry a seller ever received.
  }, [navigate]);

  useEffect(() => {
    if (!sellerId) return;
    let alive = true;
    setInquiriesLoading(true);
    fetchInquiriesForSeller(sellerId, {
      limit: PAGE_SIZE,
      offset: inquiryPage * PAGE_SIZE,
    })
      .then(({ inquiries: rows, total }) => {
        if (!alive) return;
        setInquiries(rows);
        setInquiryTotal(total);
      })
      .catch(() => {
        if (alive) setInquiries([]);
      })
      .finally(() => {
        if (alive) setInquiriesLoading(false);
      });
    // The pending badge counts the whole inbox, not the page on screen.
    supabase
      .from("marketplace_product_inquiries")
      .select("id, product:marketplace_products!inner(seller_id)", {
        count: "exact",
        head: true,
      })
      .eq("product.seller_id", sellerId)
      .eq("status", "pending")
      .then(({ count }) => {
        if (alive) setPendingInquiries(count ?? 0);
      });
    return () => {
      alive = false;
    };
  }, [sellerId, inquiryPage]);

  useEffect(() => {
    if (!sellerId) return;
    let alive = true;
    setProductsLoading(true);
    fetchMyProducts(sellerId, {
      limit: PAGE_SIZE,
      offset: productPage * PAGE_SIZE,
    })
      .then(({ products: rows, total }) => {
        if (!alive) return;
        setProducts(rows);
        setProductTotal(total);
      })
      .catch(() => {
        if (alive) setProducts([]);
      })
      .finally(() => {
        if (alive) setProductsLoading(false);
      });
    supabase
      .from("marketplace_products")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .then(({ count }) => {
        if (alive) setActiveProducts(count ?? 0);
      });
    return () => {
      alive = false;
    };
  }, [sellerId, productPage]);

  async function handleInquiryStatus(
    inquiryId: string,
    status: "responded" | "closed",
  ) {
    setInquiryBusyId(inquiryId);
    try {
      await updateInquiryStatus(inquiryId, status);
      setInquiries((current) =>
        current.map((item) =>
          item.id === inquiryId ? { ...item, status } : item,
        ),
      );
    } catch {
      /* leave the row as it was */
    } finally {
      setInquiryBusyId(null);
    }
  }

  useEffect(() => {
    loadProfile()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadProfile]);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from("marketplace_seller_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const payload = {
        user_id: user.id,
        seller_type: sellerType,
        business_name: businessName || null,
        business_phone: businessPhone || null,
        business_address: businessAddress || null,
        default_delivery_available: deliveryAvailable,
        default_pickup_available: pickupAvailable,
      };

      if (existing) {
        const { error } = await supabase
          .from("marketplace_seller_profiles")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("marketplace_seller_profiles")
          .insert(payload);
        if (error) throw error;
      }
      setEditing(false);
      loadProfile();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2
          aria-hidden="true"
          className="h-6 w-6 animate-spin text-brand-purple"
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        variant="data"
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: t("Marketplace"), path: "/marketplace" },
          { label: t("Seller Dashboard") },
        ]}
        eyebrow={t("Marketplace")}
        title={t("Seller Dashboard")}
        subtitle={t("Manage your profile, products, and sales")}
        actions={
          <Link
            to="/marketplace/products/post/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />{" "}
            {t("List a Product")}
          </Link>
        }
      />

      <Container className="max-w-5xl pb-12 pt-6">
        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard
            icon={<Package aria-hidden="true" className="h-5 w-5" />}
            label="Active Products"
            value={activeProducts}
          />
          <StatCard
            icon={<TrendingUp aria-hidden="true" className="h-5 w-5" />}
            label="Total Products"
            value={productTotal}
          />
          <StatCard
            icon={null}
            label="Rating"
            value={
              profile
                ? `${profile.rating_avg.toFixed(1)} (${profile.rating_count})`
                : ""
            }
          />
          <StatCard
            icon={<DollarSign aria-hidden="true" className="h-5 w-5" />}
            label="Total Sales"
            value={profile?.total_sales ?? 0}
          />
          <StatCard
            icon={<MessageSquare aria-hidden="true" className="h-5 w-5" />}
            label="New Inquiries"
            value={pendingInquiries}
          />
        </div>

        {/* Profile Card */}
        <div className="mb-6 rounded-xl border border-border p-5 dark:border-white/10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Store className="h-6 w-6 text-brand-purple" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground dark:text-primary-foreground">
                    {businessName || "Individual Seller"}
                  </h2>
                  {profile?.verification_status === "verified" && (
                    <BadgeCheck
                      aria-hidden="true"
                      className="h-4 w-4 text-brand-purple"
                    />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {SELLER_TYPE_LABELS[sellerType]}
                  {profile &&
                    ` · ${SELLER_VERIFICATION_LABELS[profile.verification_status]}`}
                </p>
              </div>
            </div>
            {!editing && (
              <Button
                variant="ghost"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground"
              >
                <Edit aria-hidden="true" className="h-4 w-4" /> {t("Edit")}
              </Button>
            )}
          </div>

          {!editing ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {businessPhone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone aria-hidden="true" className="h-4 w-4" />{" "}
                  {businessPhone}
                </div>
              )}
              {businessAddress && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin aria-hidden="true" className="h-4 w-4" />{" "}
                  {businessAddress}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4" />{" "}
                {deliveryAvailable ? "Delivery available" : "No delivery"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />{" "}
                {pickupAvailable ? "Pickup available" : "No pickup"}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("Seller Type")}
                  </label>
                  <AdminSelect
                    value={sellerType}
                    onChange={(e) =>
                      setSellerType(e.target.value as SellerType)
                    }
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                  >
                    {Object.entries(SELLER_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </AdminSelect>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("Business Name")}
                  </label>
                  <AdminInput
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={t("Your business name")}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("Business Phone")}
                  </label>
                  <AdminInput
                    type="text"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    placeholder={t("Country code + number, e.g. +234...")}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("Business Address")}
                  </label>
                  <AdminInput
                    type="text"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder={t("Your address")}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground/80">
                  <input
                    aria-label={t("Business Address")}
                    type="checkbox"
                    checked={deliveryAvailable}
                    onChange={(e) => setDeliveryAvailable(e.target.checked)}
                    className="rounded"
                  />{" "}
                  Delivery available
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground/80">
                  <input
                    type="checkbox"
                    checked={pickupAvailable}
                    onChange={(e) => setPickupAvailable(e.target.checked)}
                    className="rounded"
                  />{" "}
                  Pickup available
                </label>
              </div>
              <div className="flex gap-2">
                <AdminButton
                  variant="primary"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}{" "}
                  Save Profile
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  onClick={() => setEditing(false)}
                >
                  {t("Cancel")}
                </AdminButton>
              </div>
            </div>
          )}

          {profile?.verification_status === "unverified" && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              <Clock className="h-4 w-4" />
              Your seller profile is unverified. Submit verification documents
              to get a verified badge.
            </div>
          )}
        </div>

        {/* Buyer Inquiries */}
        <div className="mb-6 rounded-xl border border-border dark:border-white/10">
          <div className="flex items-center justify-between border-b border-border p-4 dark:border-white/10">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t("Buyer Inquiries")}
            </h2>
            <span className="text-xs text-muted-foreground">
              {inquiryTotal} {inquiryTotal === 1 ? "enquiry" : "enquiries"}
            </span>
          </div>
          {inquiries.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Mail
                aria-hidden="true"
                className="mx-auto mb-2 h-6 w-6 opacity-60"
              />
              {t(
                "No buyer inquiries yet. Offers and questions will appear here.",
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border dark:divide-white/10">
              {inquiries.map((inquiry) => (
                <li key={inquiry.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                        {inquiry.buyer?.full_name || t("A buyer")}
                        {inquiry.product?.title && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {inquiry.product.title}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 whitespace-pre-line break-words text-sm text-muted-foreground">
                        {inquiry.message}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {inquiry.offered_price != null && (
                          <span className="font-semibold text-brand-purple">
                            {t("Offer")}:{" "}
                            {formatByCode(
                              inquiry.offered_price,
                              inquiry.product?.currency ?? "NGN",
                            )}
                          </span>
                        )}
                        {inquiry.contact_phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone aria-hidden="true" className="h-3 w-3" />
                            {inquiry.contact_phone}
                          </span>
                        )}
                        <span>
                          {new Date(inquiry.created_at).toLocaleDateString()}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 font-medium capitalize">
                          {inquiry.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/messages"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-brand-purple hover:text-brand-purple dark:border-white/10"
                      >
                        <MessageSquare
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />
                        {t("Reply")}
                      </Link>
                      {inquiry.status === "pending" && (
                        <Button
                          variant="ghost"
                          disabled={inquiryBusyId === inquiry.id}
                          onClick={() =>
                            handleInquiryStatus(inquiry.id, "responded")
                          }
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium dark:border-white/10"
                        >
                          {t("Mark answered")}
                        </Button>
                      )}
                      {inquiry.status !== "closed" && (
                        <Button
                          variant="ghost"
                          disabled={inquiryBusyId === inquiry.id}
                          onClick={() =>
                            handleInquiryStatus(inquiry.id, "closed")
                          }
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium dark:border-white/10"
                        >
                          {t("Close")}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {inquiryTotal > PAGE_SIZE && (
            <div className="border-t border-border p-3 dark:border-white/10">
              <AdminPagination
                page={inquiryPage}
                pageSize={PAGE_SIZE}
                total={inquiryTotal}
                onPageChange={setInquiryPage}
                loading={inquiriesLoading}
              />
            </div>
          )}
        </div>

        {/* Products Table */}
        <div className="rounded-xl border border-border dark:border-white/10">
          <div className="border-b border-border p-4 dark:border-white/10">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t("Your Products")}
            </h2>
          </div>
          {products.length === 0 ? (
            <div className="py-12 text-center">
              <Package
                aria-hidden="true"
                className="mx-auto h-10 w-10 text-muted-foreground/80"
              />
              <p className="mt-3 text-sm font-medium text-foreground dark:text-primary-foreground">
                {t("No products yet")}
              </p>
              <Link
                to="/marketplace/products/post/"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Plus aria-hidden="true" className="h-4 w-4" /> List Your First
                Product
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/50 dark:divide-white/5">
              {products.map((p) => {
                const prod = p as unknown as Record<string, unknown>;
                return (
                  <Link
                    key={prod.id as string}
                    to={`/marketplace/products/${prod.id}/`}
                    className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50 dark:hover:bg-white/5"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted dark:bg-white/5">
                      {Array.isArray(prod.images) &&
                      (prod.images as unknown[]).length > 0 ? (
                        <img
                          src={
                            (prod.images as string[])[
                              (prod.primary_image_idx as number) || 0
                            ]
                          }
                          alt={prod.title as string}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <Package
                          aria-hidden="true"
                          className="m-auto h-6 w-6 text-muted-foreground/80"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground dark:text-primary-foreground">
                        {prod.title as string}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {PRODUCT_STATUS_LABELS[
                          prod.status as keyof typeof PRODUCT_STATUS_LABELS
                        ] || (prod.status as string)}
                        ·{" "}
                        {new Date(
                          prod.created_at as string,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-brand-purple">
                      {formatByCode(
                        Number(prod.price),
                        prod.currency as string,
                      )}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
          {productTotal > PAGE_SIZE && (
            <div className="border-t border-border p-3 dark:border-white/10">
              <AdminPagination
                page={productPage}
                pageSize={PAGE_SIZE}
                total={productTotal}
                onPageChange={setProductPage}
                loading={productsLoading}
              />
            </div>
          )}
        </div>
      </Container>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-border p-4 dark:border-white/10">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-foreground dark:text-primary-foreground">
        {value}
      </p>
    </div>
  );
}
