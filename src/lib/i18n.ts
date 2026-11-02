// ─────────────────────────────────────────────────────────────────────────────
// BLITZ GAMING — i18n (English / Arabic / Hebrew RTL)
// ─────────────────────────────────────────────────────────────────────────────
export type Lang = 'en' | 'ar' | 'he';

const dict = {
  en: {
    search_ph: 'Search products, brands, SKUs…',
    home: 'Home', shop_all: 'Shop All', offers: 'Offers', brands: 'Brands',
    search: 'Search', account: 'Account', wishlist: 'Wishlist', cart: 'Cart',
    add_to_cart: 'Add to Cart', buy_now: 'Buy Now', view_all: 'View all',
    featured: 'Featured Products', best_sellers: 'Best Sellers', new_arrivals: 'New Arrivals',
    deals: 'Hot Deals', popular: 'Popular Accessories', categories: 'Shop by Category',
    brand_strip: 'Top Brands', free_delivery: 'Free delivery', in_stock: 'In Stock',
    low_stock: 'Low stock', out_of_stock: 'Out of stock', save: 'Save',
    subtotal: 'Subtotal', shipping: 'Delivery', discount: 'Discount', total: 'Total',
    checkout: 'Checkout', place_order: 'Place Order — Cash on Delivery',
    empty_cart: 'Your cart is empty', continue_shopping: 'Continue Shopping',
    build_setup: 'Build Your Gaming Setup', wishlist_empty: 'No items in wishlist yet',
    compare: 'Compare', add_to_compare: 'Add to compare', filters: 'Filters', sort: 'Sort',
    apply: 'Apply', clear_all: 'Clear all', no_results: 'No products found',
    load_more: 'Load more', results: 'results', qty: 'Qty', sku: 'SKU', brand: 'Brand',
    specs: 'Specifications', related: 'Related Products', delivery_returns: 'Delivery & Support',
    full_name: 'Full Name', phone: 'Phone Number', area: 'Delivery Area', city: 'Town / City',
    address: 'Detailed Address', email_opt: 'Email (optional)', notes: 'Order notes (optional)',
    promo: 'Promo code', apply_promo: 'Apply', remove: 'Remove', order_placed: 'Order placed!',
    order_number: 'Your order number', thank_you: 'Thank you! We will contact you shortly to confirm delivery.',
    cash_on_delivery: 'Cash on Delivery', westbank: 'West Bank', jerusalem: 'Jerusalem', inside48: '1948 Areas (داخل الخط الأخضر)',
    min_order: 'Minimum order', copy: 'Copy', copied: 'Copied!', in_stock_n: 'in stock',
    admin_dashboard: 'Admin Dashboard',
    write_in_arabic: '',
  },
  ar: {
    search_ph: 'ابحث عن منتجات، ماركات، رموز…',
    home: 'الرئيسية', shop_all: 'كل المنتجات', offers: 'العروض', brands: 'الماركات',
    search: 'بحث', account: 'حسابي', wishlist: 'المفضلة', cart: 'السلة',
    add_to_cart: 'أضف إلى السلة', buy_now: 'اشتري الآن', view_all: 'عرض الكل',
    featured: 'منتجات مميزة', best_sellers: 'الأكثر مبيعاً', new_arrivals: 'وصل حديثاً',
    deals: 'عروض نارية', popular: 'إكسسوارات رائجة', categories: 'تسوق حسب الفئة',
    brand_strip: 'أفضل الماركات', free_delivery: 'توصيل مجاني', in_stock: 'متوفر',
    low_stock: 'كمية قليلة', out_of_stock: 'غير متوفر', save: 'وفّر',
    subtotal: 'المجموع الفرعي', shipping: 'التوصيل', discount: 'الخصم', total: 'الإجمالي',
    checkout: 'إتمام الطلب', place_order: 'تأكيد الطلب — الدفع عند الاستلام',
    empty_cart: 'سلتك فارغة', continue_shopping: 'متابعة التسوق',
    build_setup: 'جهّز تجميعتك القيمنق', wishlist_empty: 'لا توجد منتجات في المفضلة بعد',
    compare: 'مقارنة', add_to_compare: 'أضف للمقارنة', filters: 'الفلاتر', sort: 'الترتيب',
    apply: 'تطبيق', clear_all: 'مسح الكل', no_results: 'لا توجد نتائج',
    load_more: 'عرض المزيد', results: 'نتيجة', qty: 'الكمية', sku: 'رمز المنتج', brand: 'الماركة',
    specs: 'المواصفات', related: 'منتجات مشابهة', delivery_returns: 'التوصيل والدعم',
    full_name: 'الاسم الكامل', phone: 'رقم الهاتف', area: 'منطقة التوصيل', city: 'المدينة / البلدة',
    address: 'العنوان بالتفصيل', email_opt: 'البريد الإلكتروني (اختياري)', notes: 'ملاحظات الطلب (اختياري)',
    promo: 'كود الخصم', apply_promo: 'تطبيق', remove: 'إزالة', order_placed: 'تم استلام طلبك!',
    order_number: 'رقم طلبك', thank_you: 'شكراً لك! سنتواصل معك قريباً لتأكيد موعد التوصيل.',
    cash_on_delivery: 'الدفع عند الاستلام', westbank: 'الضفة الغربية', jerusalem: 'القدس', inside48: 'داخل الخط الأخضر — أراضي ١٩٤٨',
    min_order: 'الحد الأدنى للطلب', copy: 'نسخ', copied: 'تم النسخ!', in_stock_n: 'متوفر',
    admin_dashboard: 'لوحة الإدارة',
    write_in_arabic: '',
  },
  he: {
    search_ph: 'חיפוש מוצרים, מותגים ומק״טים…',
    home: 'ראשי', shop_all: 'כל המוצרים', offers: 'מבצעים', brands: 'מותגים',
    search: 'חיפוש', account: 'החשבון שלי', wishlist: 'מועדפים', cart: 'סל קניות',
    add_to_cart: 'הוספה לסל', buy_now: 'קנייה עכשיו', view_all: 'הצג הכל',
    featured: 'מוצרים נבחרים', best_sellers: 'הנמכרים ביותר', new_arrivals: 'מוצרים חדשים',
    deals: 'מבצעים חמים', popular: 'אביזרים פופולריים', categories: 'קנייה לפי קטגוריה',
    brand_strip: 'מותגים מובילים', free_delivery: 'משלוח חינם', in_stock: 'במלאי',
    low_stock: 'מלאי נמוך', out_of_stock: 'אזל מהמלאי', save: 'חיסכון',
    subtotal: 'סכום ביניים', shipping: 'משלוח', discount: 'הנחה', total: 'סה״כ',
    checkout: 'לתשלום', place_order: 'ביצוע הזמנה — תשלום במזומן במסירה',
    empty_cart: 'סל הקניות ריק', continue_shopping: 'המשך בקניות',
    build_setup: 'בנו את עמדת הגיימינג שלכם', wishlist_empty: 'אין מוצרים במועדפים עדיין',
    compare: 'השוואה', add_to_compare: 'הוסף להשוואה', filters: 'מסננים', sort: 'מיון',
    apply: 'החל', clear_all: 'נקה הכל', no_results: 'לא נמצאו מוצרים',
    load_more: 'טען עוד', results: 'תוצאות', qty: 'כמות', sku: 'מק״ט', brand: 'מותג',
    specs: 'מפרט טכני', related: 'מוצרים דומים', delivery_returns: 'משלוח ותמיכה',
    full_name: 'שם מלא', phone: 'מספר טלפון', area: 'אזור משלוח', city: 'עיר / יישוב',
    address: 'כתובת מלאה', email_opt: 'דוא״ל (לא חובה)', notes: 'הערות להזמנה (לא חובה)',
    promo: 'קוד קופון', apply_promo: 'החל', remove: 'הסר', order_placed: 'ההזמנה התקבלה!',
    order_number: 'מספר ההזמנה', thank_you: 'תודה! ניצור קשר בקרוב לאישור המשלוח.',
    cash_on_delivery: 'תשלום במזומן בעת המסירה', westbank: 'הגדה המערבית', jerusalem: 'ירושלים', inside48: 'אזורי 1948',
    min_order: 'הזמנה מינימלית', copy: 'העתק', copied: 'הועתק!', in_stock_n: 'במלאי',
    admin_dashboard: 'לוח ניהול',
    write_in_arabic: '',
  },
} as const;

export type TKey = keyof typeof dict['en'];
export const translationKeys = Object.keys(dict.en) as TKey[];
export const t = (lang: Lang, key: TKey): string => dict[lang][key] ?? key;

export const dirOf = (lang: Lang): 'rtl' | 'ltr' => (lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr');
export const fmtPrice = (n: number, lang: Lang): string =>
  `₪${n.toLocaleString(lang === 'ar' ? 'ar-PS' : lang === 'he' ? 'he-IL' : 'en-US', { maximumFractionDigits: 0 })}`;
export const fmtDate = (iso: string, lang: Lang): string =>
  new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-PS' : lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
