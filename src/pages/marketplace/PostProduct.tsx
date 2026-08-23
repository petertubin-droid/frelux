import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Send, Upload, X, Plus, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createProduct, fetchProductCategories } from '@/lib/marketplace-products';
import { uploadProductImage } from '@/lib/storage';
import LocationPicker from '@/components/ui/LocationPicker';
import { useLocation } from '@/lib/location';
import type { DbProductCategory, ProductCondition } from '@/types/marketplace-products';
import { useSeo } from '@/lib/seo';

const NIGERIAN_STATES = [
  'Lagos', 'Abuja FCT', 'Rivers', 'Kano', 'Oyo', 'Kaduna', 'Enugu', 'Delta', 'Edo', 'Ogun', 'Anambra', 'Imo',
  'Akwa Ibom', 'Cross River', 'Benue', 'Osun', 'Ondo', 'Ekiti', 'Kwara', 'Nasarawa', 'Plateau', 'Bauchi',
];

const CONDITIONS: { value: ProductCondition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

export default function PostProduct() {
  useSeo({ title: 'Post a Product — FRELUX Marketplace', canonicalPath: '/marketplace/products/post' });
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [negotiable, setNegotiable] = useState(false);
  const [condition, setCondition] = useState<ProductCondition>('new');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [pickupAvailable, setPickupAvailable] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<DbProductCategory[]>([]);
  const [userLocation, setUserLocation] = useState<ReturnType<typeof useLocation>['location']>(null);

  useEffect(() => {
    fetchProductCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (userLocation?.state && !state) setState(userLocation.state);
    if (userLocation?.city && !city) setCity(userLocation.city);
  }, [userLocation]);

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          setError('Each image must be under 5MB');
          continue;
        }
        const url = await uploadProductImage(file);
        setImages((prev) => [...prev, url]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    setImages(images.filter((_, i) => i !== idx));
  }

  function moveImage(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= images.length) return;
    const newImages = [...images];
    [newImages[idx], newImages[newIdx]] = [newImages[newIdx], newImages[idx]];
    setImages(newImages);
  }

  async function handleSubmit() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setError('');
    if (!title.trim()) { setError('Please enter a product title'); return; }
    if (!price) { setError('Please enter a price'); return; }
    if (images.length === 0) { setError('Please upload at least one product image'); return; }

    setSubmitting(true);
    try {
      const product = await createProduct({
        seller_id: user.id,
        title: title.trim(),
        description: description.trim() || undefined,
        category_id: categoryId || undefined,
        price: parseFloat(price),
        compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : undefined,
        currency: 'NGN',
        negotiable,
        condition,
        quantity: parseInt(quantity) || 1,
        unit: unit || undefined,
        images,
        primary_image_idx: 0,
        location_state: state || undefined,
        location_city: city || undefined,
        location_area: area || undefined,
        latitude: userLocation?.latitude || undefined,
        longitude: userLocation?.longitude || undefined,
        delivery_available: deliveryAvailable,
        delivery_fee: deliveryFee ? parseFloat(deliveryFee) : undefined,
        pickup_available: pickupAvailable,
        tags,
        brand: brand.trim() || undefined,
      });
      navigate(`/marketplace/products/${product.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post product');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Post a Product for Sale</h1>
        <p className="mt-1 text-sm text-neutral-500">Building materials, painting supplies, interior design products, tools & more.</p>
      </div>

      <div className="space-y-5 rounded-xl border border-neutral-200 p-6 dark:border-white/10">
        {/* Title */}
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Product Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Dulux Vinyl Matt Emulsion — 4 Litres (White)"
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
          />
        </div>

        {/* Category + Brand */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Brand</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Dulux"
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the product, condition, specifications, what's included..."
            rows={4}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
          />
        </div>

        {/* Price + Condition */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Price (₦) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 15000"
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Compare-at Price</label>
            <input
              type="number"
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
              placeholder="e.g. 20000"
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as ProductCondition)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
            >
              {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {/* Quantity + Unit + Negotiable */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Unit</label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. bag, litre, piece"
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} className="rounded" />
              <span className="text-neutral-700 dark:text-neutral-200">Price negotiable</span>
            </label>
          </div>
        </div>

        {/* Images */}
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Product Images *</label>
          <div className="mt-2 space-y-3">
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((img, idx) => (
                  <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 dark:border-white/10">
                    <img src={img} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex gap-1">
                        <button onClick={() => moveImage(idx, -1)} disabled={idx === 0} className="rounded bg-white/90 p-1 text-xs disabled:opacity-30">←</button>
                        <button onClick={() => removeImage(idx)} className="rounded bg-red-500 p-1 text-white"><X className="h-3 w-3" /></button>
                        <button onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1} className="rounded bg-white/90 p-1 text-xs disabled:opacity-30">→</button>
                      </div>
                    </div>
                    {idx === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-brand-purple px-1.5 py-0.5 text-[10px] font-bold text-white">COVER</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-200 p-4 text-sm text-neutral-500 hover:border-brand-purple dark:border-white/10 dark:text-neutral-400">
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="h-4 w-4" /> Upload images (max 8)</>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files)}
                disabled={uploading || images.length >= 8}
              />
            </label>
          </div>
        </div>

        {/* Location */}
        <div className="mb-2">
          <LocationPicker onLocationChange={setUserLocation} showRadius={false} compact />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
            >
              <option value="">Select state</option>
              {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Lekki"
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Area</label>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Phase 1"
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
            />
          </div>
        </div>

        {/* Delivery / Pickup */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={deliveryAvailable} onChange={(e) => setDeliveryAvailable(e.target.checked)} className="rounded" />
              <span className="text-neutral-700 dark:text-neutral-200">Delivery available</span>
            </label>
            {deliveryAvailable && (
              <input
                type="number"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                placeholder="Delivery fee (₦)"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
              />
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pickupAvailable} onChange={(e) => setPickupAvailable(e.target.checked)} className="rounded" />
              <span className="text-neutral-700 dark:text-neutral-200">Pickup available</span>
            </label>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Tags</label>
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-md bg-brand-purple/10 px-2 py-1 text-xs text-brand-purple">
                {t}
                <button onClick={() => setTags(tags.filter((x) => x !== t))} className="text-brand-purple/60 hover:text-brand-purple"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="mt-1 flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add a tag and press Enter"
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
            />
            <button onClick={addTag} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10"><Plus className="h-4 w-4" /></button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 border-t border-neutral-100 pt-4 dark:border-white/5">
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !price || images.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-purple-dark disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post Product
          </button>
          <button
            onClick={() => navigate('/marketplace')}
            className="rounded-lg border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-600 dark:border-white/10 dark:text-neutral-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
