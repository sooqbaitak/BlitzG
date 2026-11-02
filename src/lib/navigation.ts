export interface MainMenuItem { id: string; labelEn: string; labelAr: string; to: string; catSlug?: string }

export const MAIN_MENU_ITEMS: MainMenuItem[] = [
  { id: '__all_categories__', labelEn: 'All Categories', labelAr: 'كل الفئات', to: '/shop' },
  { id: '/', labelEn: 'Home', labelAr: 'الرئيسية', to: '/' },
  { id: '/shop', labelEn: 'Shop All', labelAr: 'كل المنتجات', to: '/shop' },
  { id: '/shop?cat=keyboards', labelEn: 'Keyboards', labelAr: 'لوحات مفاتيح', to: '/shop?cat=keyboards', catSlug: 'keyboards' },
  { id: '/shop?cat=gaming-mice', labelEn: 'Gaming Mice', labelAr: 'فئران قيمنق', to: '/shop?cat=gaming-mice', catSlug: 'gaming-mice' },
  { id: '/shop?cat=headsets', labelEn: 'Headsets', labelAr: 'سماعات', to: '/shop?cat=headsets', catSlug: 'headsets' },
  { id: '/shop?cat=controllers', labelEn: 'Controllers', labelAr: 'يدات تحكم', to: '/shop?cat=controllers', catSlug: 'controllers' },
  { id: '/shop?cat=mouse-pads', labelEn: 'Mouse Pads', labelAr: 'ماوس باد', to: '/shop?cat=mouse-pads', catSlug: 'mouse-pads' },
  { id: '/shop?cat=gaming-combos', labelEn: 'Gaming Combos', labelAr: 'بكجات', to: '/shop?cat=gaming-combos', catSlug: 'gaming-combos' },
  { id: '/shop?cat=cooling-pads', labelEn: 'Cooling Pads', labelAr: 'تبريد', to: '/shop?cat=cooling-pads', catSlug: 'cooling-pads' },
  { id: '/shop?cat=pc-cases', labelEn: 'PC Cases', labelAr: 'كيسات PC', to: '/shop?cat=pc-cases', catSlug: 'pc-cases' },
  { id: '/shop?cat=monitors', labelEn: 'Monitors', labelAr: 'شاشات', to: '/shop?cat=monitors', catSlug: 'monitors' },
  { id: '/shop?cat=microphones', labelEn: 'Microphones', labelAr: 'مايكروفونات', to: '/shop?cat=microphones', catSlug: 'microphones' },
  { id: '/shop?cat=cables-accessories', labelEn: 'Cables & Accessories', labelAr: 'كابلات وملحقات', to: '/shop?cat=cables-accessories', catSlug: 'cables-accessories' },
  { id: '/shop?cat=pc-components', labelEn: 'PC Components', labelAr: 'قطع كمبيوتر', to: '/shop?cat=pc-components', catSlug: 'pc-components' },
  { id: '/shop?cat=gaming-pcs', labelEn: 'Gaming PCs', labelAr: 'أجهزة قيمنق', to: '/shop?cat=gaming-pcs', catSlug: 'gaming-pcs' },
  { id: '/shop?cat=chairs-setup', labelEn: 'Chairs & Setup', labelAr: 'كراسي وتجهيزات', to: '/shop?cat=chairs-setup', catSlug: 'chairs-setup' },
  { id: '/brands', labelEn: 'Brands', labelAr: 'الماركات', to: '/brands' },
  { id: '/offers', labelEn: 'Offers', labelAr: 'العروض', to: '/offers' },
  { id: '/track-order', labelEn: 'Track My Order', labelAr: 'تتبع الطلب', to: '/track-order' },
];
export const DEFAULT_MAIN_MENU_ORDER = MAIN_MENU_ITEMS.map((item) => item.id);
