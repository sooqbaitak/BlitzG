// BLITZ GAMING — admin: products (search, bulk actions, full editor with variants)
import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Archive, Eye, EyeOff, Pencil, Copy, X, Package, ImagePlus, Upload, Tag } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { Button, Input, Select, TextArea, Modal, SectionTitle, EmptyState } from '../components/ui';
import { fmtPrice } from '../lib/i18n';
import type { Product, ProductVariant } from '../lib/types';

function parseVariantAttributes(value: string): Record<string, string> {
  return Object.fromEntries(value.split(';').map((part) => part.trim()).filter(Boolean).map((part) => { const index = part.indexOf('='); return index < 0 ? ['', ''] : [part.slice(0, index).trim(), part.slice(index + 1).trim()]; }).filter(([key, val]) => Boolean(key && val)));
}
function stringifyVariantAttributes(value?: Record<string, string>): string { return Object.entries(value ?? {}).map(([key, val]) => `${key}=${val}`).join('; '); }

import { imageFileToDataUrl } from '../lib/images';
import { cloudConfigured, uploadImageFile } from '../lib/cloud';
import { categoryTreeIds, productMatchesCategoryTree } from '../lib/categories';

const emptyProduct = (): Product => ({
  id: `p-${Date.now()}`,
  sku: `BZ-${Math.floor(100000 + Math.random() * 900000)}`,
  slug: `product-${Date.now()}`,
  nameEn: '',
  nameAr: '',
  brandId: '',
  categoryId: '',
  price: 0,
  salePrice: null,
  stock: 0,
  images: ['/img/keyboard.jpg'],
  descEn: '',
  descAr: '',
  specs: [],
  variants: [],
  tags: [],
  status: 'draft',
  rating: 0,
  sold: 0,
  createdAt: new Date().toISOString(),
});

export function ProductsAdmin() {
  const { db, setDb, lang, toast } = useApp();
  const ar = lang === 'ar';
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);

  const filtered = useMemo(() => {
    let list = [...db.products];
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.nameEn.toLowerCase().includes(q) || p.nameAr.includes(query.trim()) || p.sku.toLowerCase().includes(q));
    if (catFilter) list = list.filter((p) => productMatchesCategoryTree(p, categoryTreeIds(db.categories, catFilter)));
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [db.products, db.categories, query, catFilter, statusFilter]);

  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map((p) => p.id));
  const toggleOne = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const bulkSetStatus = (status: Product['status']) => {
    setDb((d) => ({ ...d, products: d.products.map((p) => (selected.includes(p.id) ? { ...p, status } : p)) }));
    toast('success', ar ? 'تم تحديث المنتجات المحددة' : 'Selected products updated');
    setSelected([]);
  };
  const bulkDelete = () => {
    setDb((d) => ({ ...d, products: d.products.filter((p) => !selected.includes(p.id)) }));
    toast('success', ar ? 'تم حذف المنتجات المحددة' : 'Selected products deleted');
    setSelected([]);
  };

  const save = (p: Product) => {
    if (!p.nameEn.trim() || !p.brandId || !p.categoryId || p.price < 0) {
      toast('error', ar ? 'الاسم والماركة والفئة والسعر مطلوبة' : 'Name, brand, category and price are required');
      return;
    }
    const slug = p.slug.trim() || p.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const product = { ...p, slug, categoryIds: [...new Set([...(p.categoryIds ?? []).filter((id) => id && id !== p.categoryId), p.categoryId])] };
    setDb((d) => ({
      ...d,
      products: isNew ? [product, ...d.products] : d.products.map((x) => (x.id === product.id ? product : x)),
    }));
    toast('success', isNew ? (ar ? 'أُضيف المنتج' : 'Product created') : (ar ? 'حُفظ المنتج' : 'Product saved'));
    setEditing(null);
  };

  const duplicateProduct = (source: Product) => {
    let stamp = '';
    let suffix = '';
    let sku = '';
    let slug = '';
    do {
      stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      suffix = Math.random().toString(36).slice(2, 9).toUpperCase();
      sku = `${source.sku.slice(0, 30)}-C${suffix}`.slice(0, 40);
      slug = `${source.slug}-copy-${suffix.toLowerCase()}`;
    } while (db.products.some((product) => product.sku.toLowerCase() === sku.toLowerCase() || product.slug.toLowerCase() === slug.toLowerCase()));
    const copy: Product = {
      ...source,
      id: `p-copy-${stamp}`,
      sku,
      slug,
      nameEn: `${source.nameEn} (Copy)`,
      nameAr: source.nameAr ? `${source.nameAr} (نسخة)` : source.nameEn + ' (Copy)',
      status: 'draft', stock: 0, sold: 0, rating: 0, createdAt: new Date().toISOString(),
      variants: source.variants.map((variant, index) => ({ ...variant, id: `v-copy-${stamp}-${index}`, stock: 0 })),
      specs: source.specs.map((spec) => ({ ...spec })),
      images: [...source.images], tags: [...source.tags], customTags: [...(source.customTags ?? [])],
    };
    setDb((d) => ({ ...d, products: [copy, ...d.products] }));
    toast('success', ar ? 'تم نسخ المنتج كمسودة ومخزونه صفر' : 'Product duplicated as a draft with zero stock');
  };

  const totalStock = db.products.reduce((s, p) => s + p.stock, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle sub={`${db.products.length} ${ar ? 'منتج' : 'products'} · ${totalStock} ${ar ? 'قطعة مخزون' : 'units in stock'}`}>{ar ? 'المنتجات' : 'Products'}</SectionTitle>
        <Button onClick={() => { setEditing(emptyProduct()); setIsNew(true); }}><Plus size={17} strokeWidth={2.6} />{ar ? 'منتج جديد' : 'Add Product'}</Button>
      </div>

      {/* toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-mute" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={ar ? 'ابحث بالاسم أو SKU…' : 'Search by name or SKU…'} className="h-10 w-full rounded-xl border border-line bg-panel2 ps-10 pe-3 text-[12px] outline-none focus:border-electric" />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="h-10 rounded-xl border border-line bg-panel2 px-3 text-[12px] text-white outline-none focus:border-electric">
          <option value="">{ar ? 'كل الفئات' : 'All categories'}</option>
          {db.categories.slice().sort((a, b) => a.order - b.order).map((c) => <option key={c.id} value={c.id}>{c.parentId ? '↳ ' : ''}{ar ? c.nameAr : lang === 'he' ? (c.nameHe || c.nameEn) : c.nameEn}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-line bg-panel2 px-3 text-[12px] text-white outline-none focus:border-electric">
          <option value="">{ar ? 'كل الحالات' : 'All statuses'}</option>
          <option value="active">{ar ? 'منشور' : 'Active'}</option>
          <option value="draft">{ar ? 'مسودة' : 'Draft'}</option>
          <option value="archived">{ar ? 'مؤرشف' : 'Archived'}</option>
        </select>
      </div>

      {/* bulk bar */}
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-electric/40 bg-electric/10 px-3 py-2">
          <span className="text-[12px] font-bold text-electric">{selected.length} {ar ? 'محدد' : 'selected'}</span>
          <button onClick={() => bulkSetStatus('active')} className="flex h-8 items-center gap-1 rounded-lg border border-emerald-500/40 px-3 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/10"><Eye size={13} />{ar ? 'نشر' : 'Publish'}</button>
          <button onClick={() => bulkSetStatus('draft')} className="flex h-8 items-center gap-1 rounded-lg border border-amber-500/40 px-3 text-[11px] font-bold text-amber-400 hover:bg-amber-500/10"><EyeOff size={13} />{ar ? 'مسودة' : 'Draft'}</button>
          <button onClick={() => bulkSetStatus('archived')} className="flex h-8 items-center gap-1 rounded-lg border border-line px-3 text-[11px] font-bold text-mute hover:text-white"><Archive size={13} />{ar ? 'أرشفة' : 'Archive'}</button>
          <button onClick={bulkDelete} className="flex h-8 items-center gap-1 rounded-lg border border-red-500/40 px-3 text-[11px] font-bold text-red-400 hover:bg-red-500/10"><Trash2 size={13} />{ar ? 'حذف' : 'Delete'}</button>
          <button onClick={() => setSelected([])} className="ms-auto rounded-lg p-1.5 text-mute hover:text-white"><X size={16} /></button>
        </div>
      )}

      {/* table */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Package size={34} />} title={ar ? 'لا توجد منتجات مطابقة' : 'No matching products'} hint={ar ? 'عدّل البحث أو الفلاتر' : 'Adjust your search or filters'} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[720px] text-[11.5px]">
            <thead className="bg-panel2 text-start text-[10px] font-bold uppercase tracking-wider text-mute">
              <tr>
                <th className="w-10 p-3 text-start"><input type="checkbox" className="accent-[#00a8ff]" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} aria-label="Select all" /></th>
                <th className="p-3 text-start">{ar ? 'المنتج' : 'Product'}</th>
                <th className="p-3 text-start">SKU</th>
                <th className="p-3 text-start">{ar ? 'الفئة' : 'Category'}</th>
                <th className="p-3 text-start">{ar ? 'السعر' : 'Price'}</th>
                <th className="p-3 text-start">{ar ? 'المخزون' : 'Stock'}</th>
                <th className="p-3 text-start">{ar ? 'الحالة' : 'Status'}</th>
                <th className="p-3 text-start"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-panel">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-panel2/60">
                  <td className="p-3"><input type="checkbox" className="accent-[#00a8ff]" checked={selected.includes(p.id)} onChange={() => toggleOne(p.id)} aria-label="Select" /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <img src={p.images[0]} alt="" className="h-11 w-11 rounded-lg object-cover" />
                      <span className="max-w-52"><span className="line-clamp-1 font-semibold text-white/90">{ar ? p.nameAr : p.nameEn}</span><span className="text-[9px] font-bold uppercase text-electric">{db.brands.find((b) => b.id === p.brandId)?.name}</span></span>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-[10px] text-mute">{p.sku}</td>
                  <td className="p-3 text-mute">{ar ? db.categories.find((c) => c.id === p.categoryId)?.nameAr : db.categories.find((c) => c.id === p.categoryId)?.nameEn}</td>
                  <td className="p-3 font-display font-bold text-white">{fmtPrice(p.salePrice ?? p.price, lang)}{p.salePrice && <span className="ms-1 block text-[9px] text-mute line-through">{fmtPrice(p.price, lang)}</span>}</td>
                  <td className={`p-3 font-bold ${p.stock <= 5 ? 'text-amber-400' : 'text-white/85'}`}>{p.stock}</td>
                  <td className="p-3"><StatusBadge status={p.status} ar={ar} /></td>
                  <td className="p-3 whitespace-nowrap"><button onClick={() => { setEditing({ ...p }); setIsNew(false); }} className="rounded-lg p-2 text-mute hover:bg-panel3 hover:text-electric" aria-label="Edit" title={ar ? 'تعديل' : 'Edit'}><Pencil size={16} /></button><button onClick={() => duplicateProduct(p)} className="rounded-lg p-2 text-mute hover:bg-panel3 hover:text-electric" aria-label="Duplicate product" title={ar ? 'نسخ المنتج' : 'Duplicate product'}><Copy size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* editor modal */}
      <ProductEditor
        product={editing}
        isNew={isNew}
        onClose={() => setEditing(null)}
        onSave={save}
      />
    </div>
  );
}

export function StatusBadge({ status, ar }: { status: Product['status']; ar: boolean }) {
  const m = { active: { en: 'Active', ar: 'منشور', cls: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' }, draft: { en: 'Draft', ar: 'مسودة', cls: 'text-amber-400 border-amber-500/40 bg-amber-500/10' }, archived: { en: 'Archived', ar: 'مؤرشف', cls: 'text-mute border-line bg-panel3' } } as const;
  const s = m[status];
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${s.cls}`}>{ar ? s.ar : s.en}</span>;
}

function ProductEditor({ product, isNew, onClose, onSave }: { product: Product | null; isNew: boolean; onClose: () => void; onSave: (p: Product) => void }) {
  const { db, lang } = useApp();
  const ar = lang === 'ar';
  const [p, setP] = useState<Product | null>(product);
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  // reset when product changes
  if (product && p?.id !== product.id) setP(product);
  if (!product) { if (p) setP(null); return <Modal open={false} onClose={onClose} title="">{null}</Modal>; }
  if (!p) return null;

  const set = (patch: Partial<Product>) => setP({ ...p, ...patch });
  const addVariant = () => set({ variants: [...p.variants, { id: `v-${Date.now()}`, label: '', priceDelta: 0, stock: 0 }] });
  const updateVariant = (id: string, patch: Partial<ProductVariant>) => set({ variants: p.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)) });
  const removeVariant = (id: string) => set({ variants: p.variants.filter((v) => v.id !== id) });
  const addSpec = () => { if (specKey.trim() && specValue.trim()) { set({ specs: [...p.specs, { key: specKey.trim(), value: specValue.trim() }] }); setSpecKey(''); setSpecValue(''); } };
  const removeSpec = (i: number) => set({ specs: p.specs.filter((_, idx) => idx !== i) });
  const toggleTag = (tag: Product['tags'][number]) => set({ tags: p.tags.includes(tag) ? p.tags.filter((x) => x !== tag) : [...p.tags, tag] });
  const addCustomTag = () => { const tag = customTag.trim(); if (tag && !(p.customTags ?? []).some((x) => x.toLowerCase() === tag.toLowerCase())) set({ customTags: [...(p.customTags ?? []), tag] }); setCustomTag(''); };
  const addImageFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingImages(true);
    try {
      const incoming = await Promise.all(Array.from(files).slice(0, Math.max(0, 10 - p.images.length)).map(async (file) => {
        if (!cloudConfigured) return imageFileToDataUrl(file);
        const dataUrl = await imageFileToDataUrl(file);
        const blob = await (await fetch(dataUrl)).blob();
        const safeName = file.name.replace(/\.[^.]+$/, '') + '.webp';
        return uploadImageFile(new File([blob], safeName, { type: 'image/webp' }));
      }));
      set({ images: [...p.images, ...incoming] });
    } catch (e) { alert(e instanceof Error ? e.message : 'Image upload failed.'); }
    finally { setUploadingImages(false); }
  };

  const TAGS: { id: Product['tags'][number]; en: string; ar: string }[] = [
    { id: 'featured', en: 'Featured', ar: 'مميز' }, { id: 'bestseller', en: 'Best Seller', ar: 'الأكثر مبيعاً' },
    { id: 'new', en: 'New', ar: 'جديد' }, { id: 'deal', en: 'Deal', ar: 'عرض' },
    { id: 'combo', en: 'Combo', ar: 'بكج' }, { id: 'popular', en: 'Popular', ar: 'رائج' },
  ];

  return (
    <Modal open={Boolean(product)} onClose={onClose} wide title={isNew ? (ar ? 'منتج جديد' : 'New Product') : (ar ? 'تعديل المنتج' : 'Edit Product')}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={ar ? 'الاسم (EN)' : 'Name (EN)'} value={p.nameEn} onChange={(e) => set({ nameEn: e.target.value })} placeholder="Razer BlackWidow V4" />
          <Input label={ar ? 'الاسم (AR)' : 'Name (AR)'} value={p.nameAr} onChange={(e) => set({ nameAr: e.target.value })} placeholder="رازر بلاك ويدو V4" dir="rtl" />
          <Input label="SKU" value={p.sku} onChange={(e) => set({ sku: e.target.value })} />
          <Input label={ar ? 'الرابط (slug)' : 'Slug'} value={p.slug} onChange={(e) => set({ slug: e.target.value })} />
          <Select label={ar ? 'الماركة' : 'Brand'} value={p.brandId} onChange={(e) => set({ brandId: e.target.value })}>
            <option value="">{ar ? '— اختر —' : '— select —'}</option>
            {db.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Select label={ar ? 'الفئة' : lang === 'he' ? 'קטגוריה' : 'Category'} value={p.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
            <option value="">{ar ? '— اختر —' : lang === 'he' ? '— בחר —' : '— select —'}</option>
            {db.categories.map((c) => <option key={c.id} value={c.id}>{c.parentId ? '— ' : ''}{ar ? c.nameAr : lang === 'he' ? (c.nameHe || c.nameEn) : c.nameEn}</option>)}
          </Select>
          <div className="rounded-xl border border-line bg-panel2 p-3 sm:col-span-2">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/75">{ar ? 'فئات إضافية / فئات فرعية' : lang === 'he' ? 'קטגוריות ותתי-קטגוריות נוספות' : 'Additional categories / subcategories'}</p>
            <p className="mb-2 text-[10px] text-mute">{ar ? 'الفئة الأساسية محددة أعلاه. يمكنك إسناد المنتج أيضاً لفئات فرعية أو أخرى ليظهر عند تصفحها.' : 'The primary category is selected above. Select extra categories or subcategories to make this product appear in those listings too.'}</p>
            <div className="grid max-h-44 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
              {db.categories.slice().sort((a, b) => a.order - b.order).map((c) => {
                const assigned = c.id === p.categoryId || (p.categoryIds ?? []).includes(c.id);
                const label = ar ? c.nameAr : lang === 'he' ? (c.nameHe || c.nameEn) : c.nameEn;
                return <label key={c.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] ${assigned ? 'bg-electric/10 text-electric' : 'text-white/75 hover:bg-panel'}`}><input type="checkbox" checked={assigned} disabled={c.id === p.categoryId} onChange={(e) => set({ categoryIds: e.target.checked ? [...new Set([...(p.categoryIds ?? []), c.id])] : (p.categoryIds ?? []).filter((id) => id !== c.id) })} className="accent-[#00a8ff]"/><span>{c.parentId ? '↳ ' : ''}{label}</span>{c.id === p.categoryId && <span className="ms-auto text-[9px]">{ar ? 'أساسية' : 'Primary'}</span>}</label>;
              })}
            </div>
          </div>
          <Input label={ar ? 'السعر ₪' : 'Price ₪'} type="number" min={0} value={p.price} onChange={(e) => set({ price: Math.max(0, Number(e.target.value)) })} />
          <Input label={ar ? 'سعر العرض ₪ (اختياري)' : 'Sale price ₪ (optional)'} type="number" min={0} value={p.salePrice ?? ''} onChange={(e) => set({ salePrice: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })} />
          <Input label={ar ? 'سعر التكلفة ₪ (اختياري — للإدارة فقط)' : 'Cost price ₪ (optional — admin only)'} type="number" min={0} value={p.costPrice ?? ''} onChange={(e) => set({ costPrice: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })} />
          <Input label={ar ? 'نقاط الولاء لكل قطعة (اختياري)' : 'Loyalty points per unit (optional)'} type="number" min={0} value={p.loyaltyPoints ?? ''} onChange={(e) => set({ loyaltyPoints: e.target.value === '' ? undefined : Math.max(0, Math.floor(Number(e.target.value))) })} />
          <Input label={ar ? 'المخزون' : 'Stock'} type="number" min={0} value={p.stock} onChange={(e) => set({ stock: Math.max(0, Number(e.target.value)) })} />
          <Select label={ar ? 'الحالة' : 'Status'} value={p.status} onChange={(e) => set({ status: e.target.value as Product['status'] })}>
            <option value="active">{ar ? 'منشور' : 'Active'}</option>
            <option value="draft">{ar ? 'مسودة' : 'Draft'}</option>
            <option value="archived">{ar ? 'مؤرشف' : 'Archived'}</option>
          </Select>
        </div>
        {/* image gallery: links plus local file upload */}
        <div className="rounded-xl border border-line bg-panel2 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-[11px] font-bold text-white/80"><ImagePlus size={15} className="text-electric"/>{ar ? 'صور المنتج (حتى 10 صور)' : 'Product gallery (up to 10 images)'}</span><label className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-electric/40 px-3 text-[10px] font-bold text-electric hover:bg-electric/10 ${uploadingImages ? 'opacity-50' : ''}`}><Upload size={14}/>{uploadingImages ? (ar ? 'جارٍ الرفع…' : 'Uploading…') : (ar ? 'رفع من الجهاز' : 'Upload from device')}<input type="file" accept="image/*" multiple className="hidden" disabled={uploadingImages || p.images.length >= 10} onChange={(e) => { void addImageFiles(e.target.files); e.currentTarget.value = ''; }} /></label></div>
          <p className="mb-3 text-[10px] leading-relaxed text-mute">{cloudConfigured ? (ar ? 'سيتم رفع الصور إلى التخزين السحابي.' : 'Images upload to shared cloud storage.') : (ar ? 'في وضع المعاينة تُحفظ الصور داخل المتصفح فقط؛ لإتاحتها لكل الأجهزة اربط Supabase.' : 'Preview mode stores images in this browser only; configure Supabase for shared images.')}</p>
          <div className="space-y-2">{p.images.map((image, index) => <div key={`${index}-${image.slice(0, 24)}`} className="flex items-center gap-2"><img src={image} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover"/><input value={image} onChange={(e) => set({ images: p.images.map((url, i) => i === index ? e.target.value : url) })} placeholder={ar ? `رابط الصورة ${index + 1}` : `Image URL ${index + 1}`} className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-panel px-2.5 text-[10px] text-white outline-none focus:border-electric"/><button type="button" onClick={() => set({ images: p.images.filter((_, i) => i !== index) })} className="rounded-lg p-2 text-mute hover:text-red-400" aria-label="Remove image"><X size={15}/></button></div>)}</div>
          <div className="mt-2 flex gap-2"><input id="add-image-url" placeholder={ar ? 'ألصق رابط صورة ثم اضغط إضافة' : 'Paste an image URL and click Add'} className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-panel px-2.5 text-[10px] text-white outline-none focus:border-electric" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const el = e.currentTarget; const url = el.value.trim(); if (url && p.images.length < 10) { set({ images: [...p.images, url] }); el.value = ''; } } }} /><button type="button" onClick={() => { const el = document.getElementById('add-image-url') as HTMLInputElement | null; const url = el?.value.trim(); if (url && p.images.length < 10) { set({ images: [...p.images, url] }); if (el) el.value = ''; } }} className="h-9 rounded-lg border border-line px-3 text-[10px] font-bold text-white/80 hover:border-electric"><Plus size={13} className="inline"/> {ar ? 'إضافة' : 'Add URL'}</button></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextArea label={ar ? 'الوصف (EN)' : 'Description (EN)'} value={p.descEn} onChange={(e) => set({ descEn: e.target.value })} />
          <TextArea label={ar ? 'الوصف (AR)' : 'Description (AR)'} value={p.descAr} onChange={(e) => set({ descAr: e.target.value })} dir="rtl" />
          <TextArea label="Description (HE)" value={p.descHe ?? ''} onChange={(e) => set({ descHe: e.target.value })} dir="rtl" />
        </div>

        {/* tags */}
        <div>
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-white/70">{ar ? 'الوسوم' : 'Tags'}</span>
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map((tg) => (
              <button key={tg.id} type="button" onClick={() => toggleTag(tg.id)} className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition-colors ${p.tags.includes(tg.id) ? 'border-electric bg-electric/20 text-electric' : 'border-line text-mute hover:text-white'}`}>
                {ar ? tg.ar : tg.en}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">{(p.customTags ?? []).map((tag) => <button key={tag} type="button" onClick={() => set({ customTags: (p.customTags ?? []).filter((x) => x !== tag) })} className="inline-flex items-center gap-1 rounded-full border border-violet-accent/40 bg-violet-accent/10 px-2.5 py-1 text-[10px] font-bold text-violet-200">{tag}<X size={11}/></button>)}</div>
          <div className="mt-2 flex gap-2"><input value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())} placeholder={ar ? 'إنشاء وسم مخصص…' : 'Create a custom tag…'} className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-panel2 px-2.5 text-[11px] outline-none focus:border-electric"/><button type="button" onClick={addCustomTag} className="h-9 rounded-lg border border-violet-accent/40 px-3 text-[10px] font-bold text-violet-200"><Tag size={13} className="inline"/> {ar ? 'إنشاء وسم' : 'Add custom tag'}</button></div>
        </div>

        {/* specs */}
        <div>
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-white/70">{ar ? 'المواصفات المخصصة' : 'Custom Specifications'}</span>
          <div className="space-y-1.5">
            {p.specs.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="min-w-24 rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[10.5px] font-bold text-white/75">{s.key}</span>
                <span className="flex-1 rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[10.5px] text-mute">{s.value}</span>
                <button onClick={() => removeSpec(i)} className="rounded-lg p-1.5 text-mute hover:text-red-400"><X size={14} /></button>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-2">
            <input value={specKey} onChange={(e) => setSpecKey(e.target.value)} placeholder={ar ? 'المفتاح (مثلاً Switch)' : 'Key (e.g. Sensor)'} className="h-9 w-32 rounded-lg border border-line bg-panel2 px-2.5 text-[11px] outline-none focus:border-electric" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpec())} />
            <input value={specValue} onChange={(e) => setSpecValue(e.target.value)} placeholder={ar ? 'القيمة' : 'Value'} className="h-9 flex-1 rounded-lg border border-line bg-panel2 px-2.5 text-[11px] outline-none focus:border-electric" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpec())} />
            <button onClick={addSpec} className="h-9 rounded-lg border border-electric/50 px-3 text-[11px] font-bold text-electric hover:bg-electric hover:text-ink">{ar ? 'أضف' : 'Add'}</button>
          </div>
        </div>

        {/* variants */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wide text-white/70">{ar ? 'المتغيرات (لون، سويتش، حجم…)' : 'Variants (color, switch, size…)'}</span>
            <button onClick={addVariant} className="flex h-7 items-center gap-1 rounded-lg border border-line px-2 text-[10px] font-bold text-electric hover:border-electric"><Plus size={12} />{ar ? 'متغير' : 'Variant'}</button>
          </div>
          <div className="space-y-3">
            {p.variants.map((v) => (
              <div key={v.id} className="rounded-xl border border-line bg-panel2 p-3">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <Input label={ar ? 'اسم الخيار الظاهر' : 'Displayed variant label'} value={v.label} onChange={(e) => updateVariant(v.id, { label: e.target.value })} placeholder="Black / Wireless / Red Switch" />
                  <Input label={ar ? 'اسم الخاصية (اختياري)' : 'Option name (optional)'} value={v.optionName ?? ''} onChange={(e) => updateVariant(v.id, { optionName: e.target.value })} placeholder="Color / Connection / Switch" />
                  <Input label={ar ? 'قيمة الخاصية (اختياري)' : 'Option value (optional)'} value={v.optionValue ?? ''} onChange={(e) => updateVariant(v.id, { optionValue: e.target.value })} placeholder="Black / Wireless / Red" />
                  <Input label={ar ? 'خصائص الفلترة المتعددة' : 'Filter attributes (Name=Value; …)'} value={stringifyVariantAttributes(v.attributes)} onChange={(e) => updateVariant(v.id, { attributes: parseVariantAttributes(e.target.value) })} placeholder="Color=White; Layout=60%" />
                  <Input label={ar ? 'تغيير السعر (+ أو - شيكل)' : 'Price adjustment (+/- ILS)'} type="number" step="0.01" value={v.priceDelta} onChange={(e) => updateVariant(v.id, { priceDelta: Number(e.target.value) || 0 })} />
                  <Input label={ar ? 'مخزون هذا الخيار' : 'Variant stock'} type="number" min={0} value={v.stock} onChange={(e) => updateVariant(v.id, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
                  <label className="text-[10px] font-bold text-mute">{ar ? 'الصورة المرتبطة' : 'Linked gallery image'}<select value={v.imageIndex === undefined ? '' : String(v.imageIndex)} onChange={(e) => updateVariant(v.id, { imageIndex: e.target.value === '' ? undefined : Number(e.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-line bg-panel px-2 text-[10px] text-white outline-none focus:border-electric"><option value="">{ar ? 'لا توجد صورة مرتبطة' : 'No linked image'}</option>{p.images.map((image, index) => <option key={`${index}-${image.slice(0, 12)}`} value={index}>{index + 1}. {image.length > 32 ? `${image.slice(0, 32)}…` : image}</option>)}</select></label>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[9px] text-mute">{ar ? 'السعر النهائي = سعر المنتج + تعديل هذا الخيار، ولا يصبح السعر أقل من صفر.' : 'Final price = product price + this option adjustment; final price never goes below zero.'}</span><button onClick={() => removeVariant(v.id)} className="rounded-lg border border-red-500/30 p-2 text-red-400 hover:bg-red-500/10" title={ar ? 'حذف الخيار' : 'Remove variant'}><Trash2 size={14} /></button></div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={onClose}>{ar ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={() => onSave(p)}>{ar ? 'حفظ المنتج' : 'Save Product'}</Button>
        </div>
      </div>
    </Modal>
  );
}
