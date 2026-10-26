// ─────────────────────────────────────────────────────────────────────────────
// BLITZ GAMING — data types
// ─────────────────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  nameHe?: string;
  image?: string;
  parentId: string | null;
  order: number;
  visible: boolean;
  featured: boolean;
  /** Preferred rendering for non-standard category banner imagery. */
  imageFit?: 'cover' | 'contain' | 'fill';
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  visible: boolean;
  featured: boolean;
}

export interface ProductVariant {
  id: string;
  label: string;
  priceDelta: number; // add-on on top of base price (ILS)
  stock: number;
  /** Optional attribute group/value used by customizable variant selectors. */
  optionName?: string;
  optionValue?: string;
  /** Zero-based index into Product.images; selecting this variant shows the linked image. */
  imageIndex?: number;
  /** Optional multi-attribute variant facets, e.g. { Color: 'White', Layout: '60%' }. */
  attributes?: Record<string, string>;
}

export interface Product {
  id: string;
  sku: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  brandId: string;
  categoryId: string; // primary category
  /** Additional category/subcategory assignments, excluding categoryId when convenient. */
  categoryIds?: string[];
  price: number;
  salePrice: number | null;
  /** Optional per-unit acquisition cost (ILS), visible to admins only. */
  costPrice?: number | null;
  /** Optional loyalty points awarded per purchased unit; undefined uses store default. */
  loyaltyPoints?: number;
  stock: number;
  images: string[];
  descEn: string;
  descAr: string;
  descHe?: string;
  specs: { key: string; value: string }[];
  variants: ProductVariant[];
  tags: ('featured' | 'bestseller' | 'new' | 'deal' | 'combo' | 'popular')[];
  customTags?: string[];
  status: 'active' | 'draft' | 'archived';
  rating: number;
  sold: number;
  createdAt: string;
  lowStockAt?: number;
}

export type CouponTarget = 'products' | 'delivery';
export type CouponType = 'percent' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: CouponType;
  value: number;
  target: CouponTarget;
  minSubtotal: number;
  productIds: string[];      // empty + categoryIds empty => all products
  categoryIds: string[];
  startsAt: string;          // ISO date
  expiresAt: string;         // ISO date
  usageLimit: number | null; // null = unlimited
  perCustomerLimit: number | null;
  usedCount: number;
  active: boolean;
  category?: 'standard' | 'loyalty';
  pointsCost?: number;
}

export type DeliveryArea = 'westbank' | 'jerusalem' | 'inside48' | (string & {});

export interface DeliveryLocation { id: string; nameEn: string; nameAr: string; nameHe?: string; fee: number; active: boolean }

export interface OrderItem {
  productId: string;
  categoryId?: string;
  categoryIds?: string[];
  brandId?: string;
  variantId?: string;
  sku: string;
  name: string;
  variantLabel?: string;
  qty: number;
  unitPrice: number;
  /** Cost snapshot at the time of sale, absent when cost was not entered. */
  unitCost?: number;
  image: string;
}

export interface OrderStatusEvent { status: 'new' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'; at: string; message?: string }

export interface Order {
  id: string;
  number: string;
  createdAt: string;
  customerName: string;
  phone: string;
  email?: string;
  area: DeliveryArea;
  areaName?: string;
  buildPreference?: 'assemble' | 'parts';
  userId?: string;
  loyaltyPointsEarned?: number;
  personalDiscount?: number;
  city: string;
  address: string;
  notes?: string;
  items: OrderItem[];
  productSubtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  couponCode?: string;
  payment: 'cod' | 'card' | 'paypal' | 'apple_pay' | 'google_pay' | 'bank_transfer';
  /** Payment state is separate from delivery/order fulfillment status. */
  paymentStatus?: 'pay_on_delivery' | 'awaiting_payment' | 'awaiting_transfer' | 'paid' | 'failed' | 'cancelled';
  paymentReference?: string;
  status: 'new' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  statusUpdatedAt?: string;
  statusHistory?: OrderStatusEvent[];
  carrierName?: string;
  trackingUrl?: string;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  trackingMessage?: string;
}

export type AdminRole = 'owner' | 'manager' | 'staff';

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
}

export interface DeliverySettings {
  westbank: number;
  jerusalem: number;
  inside48: number;
  additionalAreas?: DeliveryLocation[];
}

export interface SocialLink { id: string; label: string; url: string; platform?: string; active?: boolean }
export interface AnnouncementSlot { id: string; textEn: string; textAr: string; textHe?: string; url?: string; active: boolean }
export interface LocalizedOverride { en?: string; ar?: string; he?: string }

export interface HomeHeroSlide {
  id: string;
  kind: 'image' | 'video';
  url: string;
  active: boolean;
  altEn?: string;
  altAr?: string;
  altHe?: string;
}

export interface StoreAppearance {
  accent: string; accentHover: string; secondaryAccent: string; background: string; panel: string; panelAlt: string; border: string; text: string; muted: string;
  bodyFont: string; displayFont: string; radius: 'compact' | 'rounded' | 'soft';
  /** Global typography scale, site header treatment, card depth and primary button style. */
  textScale: 'compact' | 'standard' | 'large';
  headerStyle: 'solid' | 'glass';
  cardStyle: 'glow' | 'bordered' | 'flat';
  buttonStyle: 'solid' | 'gradient' | 'outline';
}

export type CampaignPlacement = 'top-banner' | 'floating' | 'modal';
export type CampaignAnimation = 'fade' | 'slide' | 'pulse' | 'none';
export interface SeasonalCampaign {
  id: string; active: boolean; placement: CampaignPlacement; animation: CampaignAnimation;
  titleEn: string; titleAr: string; titleHe?: string; messageEn: string; messageAr: string; messageHe?: string;
  imageUrl?: string; linkUrl?: string; backgroundColor: string; textColor: string;
  fontFamily?: string; fontSize?: number; animationDurationSeconds?: number;
  startsAt?: string; endsAt?: string; pageTargets: string[]; dismissible: boolean;
}

export type MobileBottomBarItemId = 'home' | 'shop' | 'account' | 'wishlist' | 'cart' | 'whatsapp' | 'track' | 'build' | 'theme';
export interface FooterContent {
  descriptionEn?: string; descriptionAr?: string; descriptionHe?: string;
  trustCashEn?: string; trustCashAr?: string; trustCashHe?: string;
  trustDeliveryEn?: string; trustDeliveryAr?: string; trustDeliveryHe?: string;
  trustSupportEn?: string; trustSupportAr?: string; trustSupportHe?: string;
  trustGamingEn?: string; trustGamingAr?: string; trustGamingHe?: string;
  shopHeadingEn?: string; shopHeadingAr?: string; shopHeadingHe?: string;
  companyHeadingEn?: string; companyHeadingAr?: string; companyHeadingHe?: string;
  deliveryHeadingEn?: string; deliveryHeadingAr?: string; deliveryHeadingHe?: string;
  deliveryNoteEn?: string; deliveryNoteAr?: string; deliveryNoteHe?: string;
  copyrightEn?: string; copyrightAr?: string; copyrightHe?: string;
  sloganEn?: string; sloganAr?: string; sloganHe?: string;
}

export type PaymentMethodId = 'cod' | 'card' | 'paypal' | 'apple_pay' | 'google_pay' | 'bank_transfer';
export interface PaymentMethodToggle { id: PaymentMethodId; enabled: boolean }
export interface BankTransferDetails { bankName: string; accountHolder: string; accountNumber: string; iban: string; swiftBic: string; instructionsEn: string; instructionsAr: string; instructionsHe: string }

export interface StoreSettings {
  nameEn: string;
  nameAr: string;
  whatsapp: string;
  phone: string;
  email: string;
  facebook: string;
  instagram: string;
  addressEn: string;
  addressAr: string;
  addressHe?: string;
  hoursEn: string;
  hoursAr: string;
  hoursHe?: string;
  announcementEn: string;
  announcementAr: string;
  announcementHe?: string;
  announcementItems?: AnnouncementSlot[];
  announcementBgColor?: string;
  announcementTextColor?: string;
  announcementFontSize?: number;
  announcementSpeedSeconds?: number;
  announcementFontWeight?: 'normal' | 'medium' | 'bold';
  announcementBorderColor?: string;
  announcementPauseOnHover?: boolean;
  announcementShowIcon?: boolean;
  theme?: 'night' | 'day';
  /** If disabled, visitors use the store's default theme. */
  allowCustomerThemeToggle?: boolean;
  appearance?: StoreAppearance;
  seasonalCampaigns?: SeasonalCampaign[];
  browserOrderNotificationsEnabled?: boolean;
  browserOrderNotificationSound?: boolean;
  uiTextOverrides?: Record<string, LocalizedOverride>;
  footerContent?: FooterContent;
  /** Localized text for editable homepage hero and promotional sections. */
  homeContent?: Record<string, LocalizedOverride>;
  homeHeroImageUrl?: string;
  homePcBuildImageUrl?: string;
  logoUrl?: string;
  logoAspectRatio?: 'natural' | 'square' | 'wide' | 'landscape' | 'portrait';
  logoObjectFit?: 'contain' | 'cover' | 'fill';
  faviconUrl?: string;
  mobileBottomBarItems?: MobileBottomBarItemId[];
  homeHeroSlides?: HomeHeroSlide[];
  homeHeroIntervalSeconds?: number;
  homeHeroAutoplay?: boolean;
  homeHeroShowControls?: boolean;
  homeHeroTransition?: 'fade' | 'slide';
  loyaltyPointsPer10Ils?: number;
  socialLinks?: SocialLink[];
  orderNotificationEmail?: string;
  orderEmailSubject?: string;
  orderEmailTemplate?: string;
  buildSetupCategoryIds?: string[];
  buildSetupNoticeEn?: string;
  buildSetupNoticeAr?: string;
  buildSetupNoticeHe?: string;
  /** Admin-controlled checkout payment options; only COD is initially enabled. */
  paymentMethods?: PaymentMethodToggle[];
  /** Bank transfer details are intentionally public, since customers need them to transfer funds. */
  bankTransferDetails?: BankTransferDetails;
}

export interface PageBlock {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  titleHe?: string;
  bodyEn: string;
  bodyAr: string;
  bodyHe?: string;
  visible: boolean;
}

export interface Db {
  categories: Category[];
  brands: Brand[];
  products: Product[];
  coupons: Coupon[];
  orders: Order[];
  admins: AdminUser[];
  delivery: DeliverySettings;
  store: StoreSettings;
  pages: PageBlock[];
  couponUses: { couponId: string; phone: string; at: string }[];
}

export interface CartLine {
  productId: string;
  variantId: string | null;
  qty: number;
}
