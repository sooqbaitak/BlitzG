// BLITZ GAMING — app routes
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { useApp } from './lib/AppContext';
import { useEffect } from 'react';

import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { CategoryPage } from './pages/CategoryPage';
import { Brands } from './pages/Brands';
import { Offers } from './pages/Offers';
import { BuildSetup } from './pages/BuildSetup';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { Wishlist } from './pages/Wishlist';
import { Account } from './pages/Account';
import { TrackOrder } from './pages/TrackOrder';
import { StaticPage } from './pages/StaticPage';

import { AdminLayout } from './admin/AdminLayout';
import { AdminLogin } from './admin/AdminLogin';
import { Dashboard } from './admin/Dashboard';
import { ProductsAdmin } from './admin/ProductsAdmin';
import { BuildSetupAdmin } from './admin/BuildSetupAdmin';
import { AnalyticsAdmin } from './admin/AnalyticsAdmin';
import { CategoriesAdmin } from './admin/CategoriesAdmin';
import { BrandsAdmin } from './admin/BrandsAdmin';
import { InventoryAdmin } from './admin/InventoryAdmin';
import { OrdersAdmin } from './admin/OrdersAdmin';
import { CustomersAdmin } from './admin/CustomersAdmin';
import { CouponsAdmin } from './admin/CouponsAdmin';
import { CsvTools } from './admin/CsvTools';
import { HomepageAdmin } from './admin/HomepageAdmin';
import { PagesAdmin } from './admin/PagesAdmin';
import { DeliveryAdmin } from './admin/DeliveryAdmin';
import { StoreSettingsAdmin } from './admin/StoreSettingsAdmin';
import { StorefrontTextAdmin } from './admin/StorefrontTextAdmin';
import { AppearanceAdmin } from './admin/AppearanceAdmin';
import { CampaignsAdmin } from './admin/CampaignsAdmin';
import { OffersAdmin } from './admin/OffersAdmin';
import { AdminUsersAdmin } from './admin/AdminUsersAdmin';

function StoreBrandingMeta() {
  const { db } = useApp();
  useEffect(() => {
    const href = db.store.faviconUrl?.trim() || '/favicon.svg';
    let icon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; document.head.appendChild(icon); }
    icon.href = href;
    const title = db.store.nameEn?.trim() || 'BLITZ GAMING';
    document.title = `${title} | بلتز قيمنق — Gaming Gear in Palestine`;
  }, [db.store.faviconUrl, db.store.nameEn]);
  return null;
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
      <HashRouter>
        <ScrollToTop />
        <StoreBrandingMeta />
        <Toasts />
        <Routes>
          {/* storefront */}
          <Route path="/" element={<StorefrontLayout><Home /></StorefrontLayout>} />
          <Route path="/shop" element={<StorefrontLayout><Shop /></StorefrontLayout>} />
          <Route path="/offers" element={<StorefrontLayout><Offers /></StorefrontLayout>} />
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
            <Route path="storefront-text" element={<StorefrontTextAdmin />} />
            <Route path="pages" element={<PagesAdmin />} />
            <Route path="delivery" element={<DeliveryAdmin />} />
            <Route path="settings" element={<StoreSettingsAdmin />} />
            <Route path="users" element={<AdminUsersAdmin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
