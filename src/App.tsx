// BLITZ GAMING — app routes
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppProvider } from './lib/AppContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { CompareBar } from './components/CompareBar';
import { Toasts } from './components/Toasts';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ScrollToTop } from './components/ScrollToTop';
import { BackToTop } from './components/BackToTop';
import { SeasonalCampaigns } from './components/SeasonalCampaigns';
import { useApp } from './lib/useApp';
import { useEffect } from 'react';

const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })));
const Shop = lazy(() => import('./pages/Shop').then((module) => ({ default: module.Shop })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then((module) => ({ default: module.ProductDetail })));
const CategoryPage = lazy(() => import('./pages/CategoryPage').then((module) => ({ default: module.CategoryPage })));
const Brands = lazy(() => import('./pages/Brands').then((module) => ({ default: module.Brands })));
const Offers = lazy(() => import('./pages/Offers').then((module) => ({ default: module.Offers })));
const BuildSetup = lazy(() => import('./pages/BuildSetup').then((module) => ({ default: module.BuildSetup })));
const Cart = lazy(() => import('./pages/Cart').then((module) => ({ default: module.Cart })));
const Checkout = lazy(() => import('./pages/Checkout').then((module) => ({ default: module.Checkout })));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation').then((module) => ({ default: module.OrderConfirmation })));
const Wishlist = lazy(() => import('./pages/Wishlist').then((module) => ({ default: module.Wishlist })));
const Account = lazy(() => import('./pages/Account').then((module) => ({ default: module.Account })));
const TrackOrder = lazy(() => import('./pages/TrackOrder').then((module) => ({ default: module.TrackOrder })));
const StaticPage = lazy(() => import('./pages/StaticPage').then((module) => ({ default: module.StaticPage })));
const VideoAds = lazy(() => import('./pages/VideoAds').then((module) => ({ default: module.VideoAds })));
const AdminLogin = lazy(() => import('./admin/AdminLogin').then((module) => ({ default: module.AdminLogin })));
const AdminLayout = lazy(() => import('./admin/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const Dashboard = lazy(() => import('./admin/Dashboard').then((module) => ({ default: module.Dashboard })));
const ProductsAdmin = lazy(() => import('./admin/ProductsAdmin').then((module) => ({ default: module.ProductsAdmin })));
const BuildSetupAdmin = lazy(() => import('./admin/BuildSetupAdmin').then((module) => ({ default: module.BuildSetupAdmin })));
const AnalyticsAdmin = lazy(() => import('./admin/AnalyticsAdmin').then((module) => ({ default: module.AnalyticsAdmin })));
const CategoriesAdmin = lazy(() => import('./admin/CategoriesAdmin').then((module) => ({ default: module.CategoriesAdmin })));
const BrandsAdmin = lazy(() => import('./admin/BrandsAdmin').then((module) => ({ default: module.BrandsAdmin })));
const InventoryAdmin = lazy(() => import('./admin/InventoryAdmin').then((module) => ({ default: module.InventoryAdmin })));
const OrdersAdmin = lazy(() => import('./admin/OrdersAdmin').then((module) => ({ default: module.OrdersAdmin })));
const CustomersAdmin = lazy(() => import('./admin/CustomersAdmin').then((module) => ({ default: module.CustomersAdmin })));
const CouponsAdmin = lazy(() => import('./admin/CouponsAdmin').then((module) => ({ default: module.CouponsAdmin })));
const CsvTools = lazy(() => import('./admin/CsvTools').then((module) => ({ default: module.CsvTools })));
const HomepageAdmin = lazy(() => import('./admin/HomepageAdmin').then((module) => ({ default: module.HomepageAdmin })));
const PagesAdmin = lazy(() => import('./admin/PagesAdmin').then((module) => ({ default: module.PagesAdmin })));
const DeliveryAdmin = lazy(() => import('./admin/DeliveryAdmin').then((module) => ({ default: module.DeliveryAdmin })));
const StoreSettingsAdmin = lazy(() => import('./admin/StoreSettingsAdmin').then((module) => ({ default: module.StoreSettingsAdmin })));
const StorefrontTextAdmin = lazy(() => import('./admin/StorefrontTextAdmin').then((module) => ({ default: module.StorefrontTextAdmin })));
const AppearanceAdmin = lazy(() => import('./admin/AppearanceAdmin').then((module) => ({ default: module.AppearanceAdmin })));
const CampaignsAdmin = lazy(() => import('./admin/CampaignsAdmin').then((module) => ({ default: module.CampaignsAdmin })));
const OffersAdmin = lazy(() => import('./admin/OffersAdmin').then((module) => ({ default: module.OffersAdmin })));
const AdminUsersAdmin = lazy(() => import('./admin/AdminUsersAdmin').then((module) => ({ default: module.AdminUsersAdmin })));
const VideoAdsAdmin = lazy(() => import('./admin/VideoAdsAdmin').then((module) => ({ default: module.VideoAdsAdmin })));

function StoreBrandingMeta() {
  const { db, lang } = useApp();
  const location = useLocation();
  useEffect(() => {
    const href = db.store.faviconUrl?.trim() || '/favicon.svg';
    let icon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; document.head.appendChild(icon); }
    icon.href = href;

    const slug = location.pathname.startsWith('/product/') ? location.pathname.split('/')[2] : '';
    const product = slug ? db.products.find((item) => item.slug === slug && item.status === 'active') : undefined;
    const categorySlug = location.pathname.startsWith('/category/') ? location.pathname.split('/')[2] : '';
    const category = categorySlug ? db.categories.find((item) => item.slug === categorySlug && item.visible) : undefined;
    const brand = product ? db.brands.find((item) => item.id === product.brandId) : undefined;
    const pageSlug = location.pathname.startsWith('/page/') ? location.pathname.split('/')[2] : '';
    const customPage = pageSlug ? db.pages.find((item) => item.slug === pageSlug && item.visible) : undefined;
    const storeName = db.store.nameEn?.trim() || 'BLITZ GAMING';
    const pageTitle: Record<string, string> = {
      '/shop': lang === 'ar' ? 'تسوّق المنتجات' : lang === 'he' ? 'חנות מוצרים' : 'Shop Gaming Gear',
      '/offers': lang === 'ar' ? 'العروض والخصومات' : lang === 'he' ? 'מבצעים והנחות' : 'Offers & Deals',
      '/brands': lang === 'ar' ? 'العلامات التجارية' : lang === 'he' ? 'מותגים' : 'Gaming Brands',
      '/build-your-setup': lang === 'ar' ? 'كوّن تجميعتك' : lang === 'he' ? 'בנה את הסטאפ שלך' : 'Build Your Setup',
      '/videos': lang === 'ar' ? 'فيديوهات المنتجات' : lang === 'he' ? 'סרטוני מוצרים' : 'Product Videos',
      '/track-order': lang === 'ar' ? 'تتبع طلبك' : lang === 'he' ? 'מעקב הזמנה' : 'Track Your Order',
    };
    const categoryName = category ? (lang === 'ar' ? category.nameAr : lang === 'he' ? (category.nameHe || category.nameEn) : category.nameEn) : '';
    // Product model names intentionally stay in their original display language (English),
    // matching the storefront's productName() helper. Only Arabic has a separate product-name field.
    const customPageTitle = customPage ? (lang === 'ar' ? customPage.titleAr : lang === 'he' ? (customPage.titleHe || customPage.titleEn) : customPage.titleEn) : '';
    const title = product ? `${lang === 'ar' ? product.nameAr : product.nameEn} | ${brand?.name || storeName}` : category ? `${categoryName} | ${storeName}` : customPage ? `${customPageTitle} | ${storeName}` : location.pathname === '/' ? `${storeName} | بلتز قيمنق — Gaming Gear in Palestine` : `${pageTitle[location.pathname] || storeName} | ${storeName}`;
    const description = product
      ? (lang === 'ar' ? (product.descAr || product.descEn) : lang === 'he' ? (product.descHe || product.descEn) : product.descEn).replace(/\s+/g, ' ').slice(0, 160)
      : category ? (lang === 'ar' ? `تسوّق ${category.nameAr} من BLITZ GAMING في فلسطين. اكتشف المنتجات والأسعار وخيارات التوصيل.` : lang === 'he' ? `קנו ${category.nameHe || category.nameEn} ב-BLITZ GAMING בפלסטין. גלו מוצרים, מחירים ואפשרויות משלוח.` : `Shop ${category.nameEn} at BLITZ GAMING in Palestine. Explore products, prices and delivery options.`)
      : customPage ? (lang === 'ar' ? (customPage.bodyAr || customPage.bodyEn) : lang === 'he' ? (customPage.bodyHe || customPage.bodyEn) : customPage.bodyEn).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 160)
      : lang === 'ar' ? 'تسوّق ملحقات القيمنق ومكوّنات الكمبيوتر من BLITZ GAMING في فلسطين. اكتشف المنتجات والعروض وخيارات التوصيل.' : lang === 'he' ? 'Gaming peripherals, PC components and accessories from BLITZ GAMING in Palestine. Explore products, offers and delivery options.' : 'Shop gaming peripherals, PC components and accessories from BLITZ GAMING in Palestine. Explore products, offers and delivery options.';
    document.title = title;
    const setMeta = (selector: string, attribute: 'name' | 'property', key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.appendChild(element); }
      element.content = content;
    };
    const privateRoute = location.pathname.startsWith('/admin') || ['/cart', '/checkout', '/account', '/wishlist', '/track-order'].includes(location.pathname) || location.pathname.startsWith('/order-confirmation/');
    const missingPublicContent = (location.pathname.startsWith('/product/') && !product) || (location.pathname.startsWith('/category/') && !category) || (location.pathname.startsWith('/page/') && !customPage);
    setMeta('meta[name="robots"]', 'name', 'robots', privateRoute || missingPublicContent ? 'noindex,nofollow' : 'index,follow');
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    // Clean path URLs give every public product/category/page a distinct canonical address.
    canonical.href = new URL(location.pathname, window.location.origin).href;
    document.documentElement.lang = lang === 'ar' ? 'ar' : lang === 'he' ? 'he' : 'en';
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:type"]', 'property', 'og:type', product ? 'product' : 'website');
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', lang === 'ar' ? 'ar_PS' : lang === 'he' ? 'he_IL' : 'en_US');
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonical.href);
    const image = product?.images?.[0] ? new URL(product.images[0], window.location.origin).href : `${window.location.origin}/img/hero.jpg`;
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', storeName);
    setMeta('meta[property="og:image"]', 'property', 'og:image', image);
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);

    let storeStructuredData = document.getElementById('blitz-store-jsonld') as HTMLScriptElement | null;
    if (!storeStructuredData) { storeStructuredData = document.createElement('script'); storeStructuredData.id = 'blitz-store-jsonld'; storeStructuredData.type = 'application/ld+json'; document.head.appendChild(storeStructuredData); }
    const sameAs = [db.store.facebook, db.store.instagram].filter((value) => /^https:\/\//i.test(value || ''));
    storeStructuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'OnlineStore', name: storeName,
      alternateName: db.store.nameAr || 'بلتز قيمنق', url: window.location.origin,
      description: 'Gaming peripherals, PC components and gaming accessories from BLITZ GAMING in Palestine.',
      email: db.store.email || undefined, telephone: db.store.phone || undefined,
      sameAs: sameAs.length ? sameAs : undefined,
    });

    let structuredData = document.getElementById('blitz-product-jsonld') as HTMLScriptElement | null;
    if (product) {
      if (!structuredData) { structuredData = document.createElement('script'); structuredData.id = 'blitz-product-jsonld'; structuredData.type = 'application/ld+json'; document.head.appendChild(structuredData); }
      const price = product.salePrice !== null && product.salePrice < product.price ? product.salePrice : product.price;
      const availability = product.stock > 0 || product.variants.some((variant) => variant.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
      structuredData.textContent = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Product', name: lang === 'ar' ? product.nameAr : product.nameEn,
        description, sku: product.sku, image: product.images.map((src) => new URL(src, window.location.origin).href), brand: brand ? { '@type': 'Brand', name: brand.name } : undefined,
        offers: { '@type': 'Offer', priceCurrency: 'ILS', price: Number(price.toFixed(2)), availability, url: canonical.href },
      });
    } else if (structuredData) structuredData.remove();
  }, [db.store.faviconUrl, db.store.nameEn, db.store.nameAr, db.store.facebook, db.store.instagram, db.store.email, db.store.phone, db.products, db.categories, db.brands, db.pages, lang, location.pathname, location.search]);
  return null;
}

function RouteLoading() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center bg-ink px-4" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-5 py-4 text-sm font-semibold text-white">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-electric/30 border-t-electric" aria-hidden="true" />
        <span>Loading BLITZ…</span>
      </div>
    </div>
  );
}

function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="storefront-shell flex min-h-screen flex-col bg-ink pb-20 md:pb-0">
      <Header />
      <SeasonalCampaigns />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <CompareBar />
      <MobileBottomNav />
      <BackToTop />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ScrollToTop />
        <StoreBrandingMeta />
        <Toasts />
        <Suspense fallback={<RouteLoading />}>
        <Routes>
          {/* storefront */}
          <Route path="/" element={<StorefrontLayout><Home /></StorefrontLayout>} />
          <Route path="/shop" element={<StorefrontLayout><Shop /></StorefrontLayout>} />
          <Route path="/offers" element={<StorefrontLayout><Offers /></StorefrontLayout>} />
          <Route path="/videos" element={<StorefrontLayout><VideoAds /></StorefrontLayout>} />
          <Route path="/brands" element={<StorefrontLayout><Brands /></StorefrontLayout>} />
          <Route path="/category/:slug" element={<StorefrontLayout><CategoryPage /></StorefrontLayout>} />
          <Route path="/product/:slug" element={<StorefrontLayout><ProductDetail /></StorefrontLayout>} />
          <Route path="/build-your-setup" element={<StorefrontLayout><BuildSetup /></StorefrontLayout>} />
          <Route path="/cart" element={<StorefrontLayout><Cart /></StorefrontLayout>} />
          <Route path="/checkout" element={<StorefrontLayout><Checkout /></StorefrontLayout>} />
          <Route path="/order-confirmation/:number" element={<StorefrontLayout><OrderConfirmation /></StorefrontLayout>} />
          <Route path="/wishlist" element={<StorefrontLayout><Wishlist /></StorefrontLayout>} />
          <Route path="/account" element={<StorefrontLayout><Account /></StorefrontLayout>} />
          <Route path="/track-order" element={<StorefrontLayout><TrackOrder /></StorefrontLayout>} />
          <Route path="/page/:slug" element={<StorefrontLayout><StaticPage /></StorefrontLayout>} />

          {/* admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<ProductsAdmin />} />
            <Route path="build-setup" element={<BuildSetupAdmin />} />
            <Route path="analytics" element={<AnalyticsAdmin />} />
            <Route path="categories" element={<CategoriesAdmin />} />
            <Route path="brands" element={<BrandsAdmin />} />
            <Route path="inventory" element={<InventoryAdmin />} />
            <Route path="orders" element={<OrdersAdmin />} />
            <Route path="customers" element={<CustomersAdmin />} />
            <Route path="coupons" element={<CouponsAdmin />} />
            <Route path="csv" element={<CsvTools />} />
            <Route path="homepage" element={<HomepageAdmin />} />
            <Route path="appearance" element={<AppearanceAdmin />} />
            <Route path="campaigns" element={<CampaignsAdmin />} />
            <Route path="offers" element={<OffersAdmin />} />
            <Route path="videos" element={<VideoAdsAdmin />} />
            <Route path="storefront-text" element={<StorefrontTextAdmin />} />
            <Route path="pages" element={<PagesAdmin />} />
            <Route path="delivery" element={<DeliveryAdmin />} />
            <Route path="settings" element={<StoreSettingsAdmin />} />
            <Route path="users" element={<AdminUsersAdmin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  );
}
