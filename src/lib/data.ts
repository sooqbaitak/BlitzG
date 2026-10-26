// ─────────────────────────────────────────────────────────────────────────────
// BLITZ GAMING — demo catalog seed (stored in browser localStorage; not production persistence)
// ─────────────────────────────────────────────────────────────────────────────
import type { Db, Category, Brand, Product, Coupon, AdminUser } from './types';

const img = (n: string) => `/img/${n}`;

const heCategoryNames: Record<string, string> = {
  'c-keyboards':'מקלדות', 'c-mice':'עכברי גיימינג', 'c-headsets':'אוזניות', 'c-controllers':'בקרים',
  'c-mousepads':'משטחי עכבר', 'c-combos':'ערכות גיימינג', 'c-cooling':'משטחי קירור', 'c-cases':'מארזי מחשב',
  'c-monitors':'מסכים', 'c-mics':'מיקרופונים', 'c-cables':'כבלים ואביזרים', 'c-components':'רכיבי מחשב',
  'c-motherboards':'לוחות אם', 'c-gpus':'כרטיסים גרפיים', 'c-cpus':'מעבדים', 'c-ram':'זיכרון RAM',
  'c-storage':'אחסון SSD', 'c-cpu-coolers':'קירורי מעבד', 'c-fans':'מאווררי מחשב', 'c-cable-management':'ניהול כבלים',
  'c-pcs':'מחשבי גיימינג והרכבות', 'c-speakers':'רמקולים', 'c-tables':'שולחנות גיימינג', 'c-chairs':'כיסאות גיימינג',
};

const cat = (
  id: string, slug: string, nameEn: string, nameAr: string,
  image: string | undefined, parentId: string | null, order: number,
  extra?: Partial<Category>
): Category => ({ id, slug, nameEn, nameAr, image, parentId, order, visible: true, featured: true, ...extra, nameHe: extra?.nameHe ?? heCategoryNames[id] ?? nameEn });

export const defaultCategories: Category[] = [
  cat('c-keyboards', 'keyboards', 'Keyboards', 'لوحات مفاتيح', img('keyboard.jpg'), null, 1),
  cat('c-mice', 'gaming-mice', 'Gaming Mice', 'فئران قيمنق', img('mouse.jpg'), null, 2),
  cat('c-headsets', 'headsets', 'Headsets', 'سماعات', img('headset.jpg'), null, 3),
  cat('c-controllers', 'controllers', 'Controllers', 'يدات تحكم', img('controller.jpg'), null, 4),
  cat('c-mousepads', 'mouse-pads', 'Mouse Pads', 'ماوس باد', img('mousepad.jpg'), null, 5),
  cat('c-combos', 'gaming-combos', 'Gaming Combos', 'بكجات قيمنق', img('combo.jpg'), null, 6),
  cat('c-cooling', 'cooling-pads', 'Cooling Pads', 'قاعدة تبريد', img('cooling.jpg'), null, 7),
  cat('c-cases', 'pc-cases', 'PC Cases', 'كيسات PC', img('pccase.jpg'), null, 8),
  cat('c-monitors', 'monitors', 'Monitors', 'شاشات', img('monitor.jpg'), null, 9),
  cat('c-mics', 'microphones', 'Microphones', 'مايكروفونات', img('microphone.jpg'), null, 10),
  cat('c-cables', 'cables-accessories', 'Cables & Accessories', 'كابلات وملحقات', img('cables.jpg'), null, 11),
  cat('c-components', 'pc-components', 'PC Components', 'قطع كمبيوتر', img('gpu.jpg'), null, 12),
  cat('c-motherboards', 'motherboards', 'Motherboards', 'لوحات أم', img('motherboard.jpg'), 'c-components', 1),
  cat('c-gpus', 'graphics-cards', 'Graphics Cards', 'بطاقات رسومية', img('gpu.jpg'), 'c-components', 2),
  cat('c-cpus', 'processors', 'CPUs / Processors', 'معالجات', img('pcbuild.jpg'), 'c-components', 3),
  cat('c-ram', 'memory-ram', 'Memory / RAM', 'ذاكرة RAM', img('ram.jpg'), 'c-components', 4),
  cat('c-storage', 'storage', 'SSD & Storage', 'تخزين SSD', img('ssd.jpg'), 'c-components', 5),
  cat('c-cpu-coolers', 'cpu-coolers', 'CPU Coolers', 'مبردات المعالج', img('cooling.jpg'), 'c-components', 6),
  cat('c-fans', 'pc-fans', 'PC Fans', 'مراوح الكمبيوتر', img('cooling.jpg'), 'c-components', 7),
  cat('c-cable-management', 'cable-management', 'Cable Management', 'تنظيم الكابلات', img('cables.jpg'), 'c-components', 8),
  cat('c-pcs', 'gaming-pcs', 'Gaming PCs & Builds', 'أجهزة وتجميعات قيمنق', img('pcbuild.jpg'), null, 13),
  cat('c-speakers', 'speakers', 'Speakers', 'سماعات مكتبية', img('headset.jpg'), null, 14),
  cat('c-tables', 'gaming-tables', 'Gaming Tables', 'طاولات قيمنق', img('chair.jpg'), null, 15),
  cat('c-chairs', 'chairs-setup', 'Gaming Chairs', 'كراسي قيمنق', img('chair.jpg'), null, 16),
];

export const defaultBrands: Brand[] = [
  'Razer', 'Logitech G', 'Corsair', 'SteelSeries', 'HyperX', 'Redragon',
  'ASUS ROG', 'MSI', 'Gigabyte', 'Lenovo Legion', 'Apple', 'Havit',
].map((name, i) => ({
  id: `b-${i + 1}`,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  visible: true,
  featured: i < 8,
}));

const brandId = (name: string) =>
  defaultBrands.find((b) => b.name === name)?.id ?? 'b-1';

let pid = 0;
const p = (
  partial: Omit<Product, 'id' | 'createdAt' | 'rating' | 'sold' | 'status'> &
    Partial<Pick<Product, 'createdAt' | 'rating' | 'sold' | 'status'>>
): Product => ({
  id: `p-${++pid}`,
  // Keep demo data honest: show no review/sales figures until real data exists.
  rating: 0,
  sold: 0,
  status: 'active',
  createdAt: `2026-0${((pid % 9) + 1)}-15T10:00:00Z`,
  ...partial,
});

export const defaultProducts: Product[] = [
  p({ sku: 'BZ-KB-1001', slug: 'razer-blackwidow-v4-pro', nameEn: 'Razer BlackWidow V4 Pro Mechanical', nameAr: 'رازر بلاك ويدو V4 برو ميكانيكي', brandId: brandId('Razer'), categoryId: 'c-keyboards', price: 749, salePrice: 649, stock: 24, images: [img('keyboard.jpg')], descEn: 'Full-size mechanical keyboard with Razer Green clicky switches, per-key Razer Chroma RGB, dedicated macro keys, multi-function command dial and braided cable.', descAr: 'لوحة مفاتيح ميكانيكية كاملة الحجم بسويتشات Razer خضراء سريعة، إضاءة RGB لكل مفتاح، أزرار ماكرو مخصصة وقرص تحكم متعدد الوظائف مع كابل مجدول.', specs: [{ key: 'Switch', value: 'Razer Green (Clicky)' }, { key: 'Layout', value: 'Full-size + macro' }, { key: 'Polling rate', value: '1000 Hz' }, { key: 'Connection', value: 'Wired USB-C' }], variants: [{ id: 'v-g', label: 'Green switches', priceDelta: 0, stock: 14 }, { id: 'v-y', label: 'Yellow switches', priceDelta: 20, stock: 10 }], tags: ['featured', 'bestseller', 'deal'] }),
  p({ sku: 'BZ-KB-1002', slug: 'logitech-g-pro-x-tkl', nameEn: 'Logitech G PRO X TKL Lightspeed', nameAr: 'لوجيتك G برو X TKL لايتسبيد', brandId: brandId('Logitech G'), categoryId: 'c-keyboards', price: 689, salePrice: null, stock: 31, images: [img('keyboard.jpg')], descEn: 'Tournament-grade tenkeyless wireless keyboard with LIGHTSPEED 2.4 GHz, LIGHTSYNC RGB and hot-swappable switches. Built for esports pros.', descAr: 'لوحة مفاتيح احترافية لاسلكية بدون لوحة أرقام بتقنية LIGHTSPEED، إضاءة LIGHTSYNC وسويتشات قابلة للتبديل. صُنعت لمحترفي الرياضات الإلكترونية.', specs: [{ key: 'Switch', value: 'GX Brown (Tactile)' }, { key: 'Layout', value: 'TKL 80%' }, { key: 'Connection', value: 'LIGHTSPEED + Bluetooth' }, { key: 'Battery', value: '50 hrs RGB off' }], variants: [{ id: 'v-b', label: 'GX Brown', priceDelta: 0, stock: 18 }, { id: 'v-r', label: 'GX Red', priceDelta: 0, stock: 13 }], tags: ['featured', 'bestseller'], }),
  p({ sku: 'BZ-KB-1003', slug: 'redragon-k552-kumara', nameEn: 'Redragon Kumara K552 RGB', nameAr: 'ريدراغون كومارا K552 RGB', brandId: brandId('Redragon'), categoryId: 'c-keyboards', price: 179, salePrice: 149, stock: 80, images: [img('keyboard.jpg')], descEn: 'Compact 87-key mechanical keyboard, Outemu blue switches, rainbow RGB backlighting and splash-proof metal alloy top plate. Unbeatable value.', descAr: 'لوحة مفاتيح ميكانيكية مدمجة 87 مفتاحاً بسويتشات Outemu زرقاء وإضاءة RGB معدنية مقاومة للرذاذ. بأفضل قيمة مقابل السعر.', specs: [{ key: 'Switch', value: 'Outemu Blue (Clicky)' }, { key: 'Layout', value: 'TKL 87-key' }, { key: 'Connection', value: 'Wired USB' }, { key: 'Anti-ghosting', value: 'N-key rollover' }], variants: [], tags: ['deal', 'popular', 'bestseller'] }),
  p({ sku: 'BZ-KB-1004', slug: 'hyperx-alloy-origins-65', nameEn: 'HyperX Alloy Origins 65', nameAr: 'هايبرإكس ألوي أوريجنز 65', brandId: brandId('HyperX'), categoryId: 'c-keyboards', price: 429, salePrice: null, stock: 42, images: [img('keyboard.jpg')], descEn: '65% aircraft-grade aluminum keyboard with HyperX Red linear switches, compact form factor for small desks, USB-C detachable cable.', descAr: 'لوحة مفاتيح ألومنيوم 65% بسويتشات HyperX حمراء انسيابية، تصميم مدمج للمكاتب الصغيرة مع كابل USB-C قابل للفصل.', specs: [{ key: 'Switch', value: 'HyperX Red (Linear)' }, { key: 'Layout', value: '65%' }, { key: 'Body', value: 'Aluminum' }], variants: [], tags: ['new'] }),
  p({ sku: 'BZ-MS-2001', slug: 'razer-deathadder-v3-pro', nameEn: 'Razer DeathAdder V3 Pro', nameAr: 'رازر دث أدر V3 برو', brandId: brandId('Razer'), categoryId: 'c-mice', price: 549, salePrice: 479, stock: 35, images: [img('mouse.jpg')], descEn: 'Ultra-lightweight 63g esports wireless mouse. Focus Pro 30K optical sensor, 90-hour battery, 4K Hz polling over HyperSpeed.', descAr: 'ماوس لاسلكي فائق الخفة 63 غرام للرياضات الإلكترونية. حساس Focus Pro بدقة 30K وعمر بطارية 90 ساعة مع معدل مسح 4K هرتز.', specs: [{ key: 'Sensor', value: 'Focus Pro 30K' }, { key: 'Weight', value: '63 g' }, { key: 'Battery', value: '90 hrs' }, { key: 'Connection', value: 'HyperSpeed + BT + USB' }], variants: [{ id: 'v-blk', label: 'Black', priceDelta: 0, stock: 20 }, { id: 'v-wht', label: 'White', priceDelta: 0, stock: 15 }], tags: ['featured', 'deal', 'bestseller'] }),
  p({ sku: 'BZ-MS-2002', slug: 'logitech-g-pro-x-superlight-2', nameEn: 'Logitech G PRO X SUPERLIGHT 2', nameAr: 'لوجيتك G برو X سوبرلايت 2', brandId: brandId('Logitech G'), categoryId: 'c-mice', price: 649, salePrice: null, stock: 28, images: [img('mouse.jpg')], descEn: 'The esports icon, evolved. 60g design, HERO 2 sensor with 32K DPI, LIGHTFORCE hybrid switches and 95-hour battery.', descAr: 'أيقونة الرياضات الإلكترونية بتطورها الأحدث. وزن 60 غرام، حساس HERO 2 بدقة 32K وبطارية تدوم 95 ساعة.', specs: [{ key: 'Sensor', value: 'HERO 2 — 32K DPI' }, { key: 'Weight', value: '60 g' }, { key: 'Switch', value: 'LIGHTFORCE hybrid' }, { key: 'Battery', value: '95 hrs' }], variants: [{ id: 'v-blk', label: 'Black', priceDelta: 0, stock: 16 }, { id: 'v-wht', label: 'White', priceDelta: 0, stock: 12 }], tags: ['featured', 'bestseller', 'new'] }),
  p({ sku: 'BZ-MS-2003', slug: 'redragon-m612-predator', nameEn: 'Redragon Predator M612', nameAr: 'ريدراغون بريداتور M612', brandId: brandId('Redragon'), categoryId: 'c-mice', price: 129, salePrice: 99, stock: 110, images: [img('mouse.jpg')], descEn: '11-button gaming mouse with PAW3327 12,000 DPI optical sensor, adjustable 26K cyclic RGB, ergonomic thumb rest.', descAr: 'ماوس قيمنق بـ 11 زر وأدنى حساس PAW3327 بدقة 12,000 DPI، إضاءة RGB قابلة للتخصيص ومريح بمسند إبهام.', specs: [{ key: 'Sensor', value: 'PAW3327 — 12K DPI' }, { key: 'Buttons', value: '11' }, { key: 'Weight', value: '90 g' }], variants: [], tags: ['deal', 'popular'] }),
  p({ sku: 'BZ-MS-2004', slug: 'steelseries-rival-3-wireless', nameEn: 'SteelSeries Rival 3 Wireless', nameAr: 'ستيل سيريس ريفل 3 لاسلكي', brandId: brandId('SteelSeries'), categoryId: 'c-mice', price: 289, salePrice: null, stock: 47, images: [img('mouse.jpg')], descEn: 'Quantum 2.0 wireless with both 2.4 GHz and Bluetooth, TrueMove Air 18K sensor, 400-hour battery life.', descAr: 'لاسلكي Quantum 2.0 بتقنيتي 2.4GHz وبلوتوث، حساس TrueMove Air بدقة 18K وعمر بطارية 400 ساعة.', specs: [{ key: 'Sensor', value: 'TrueMove Air — 18K' }, { key: 'Battery', value: '400 hrs' }, { key: 'Connection', value: '2.4 GHz + BT' }], variants: [], tags: ['popular'] }),
  p({ sku: 'BZ-HS-3001', slug: 'razer-blackshark-v2-pro', nameEn: 'Razer BlackShark V2 Pro', nameAr: 'رازر بلاك شارك V2 برو', brandId: brandId('Razer'), categoryId: 'c-headsets', price: 699, salePrice: 599, stock: 22, images: [img('headset.jpg')], descEn: 'Pro-esports wireless headset with TriForce Titanium 50mm drivers, HyperSpeed wireless, 70-hour battery and detachable broadcast mic.', descAr: 'سماعة لاسلكية احترافية بغشايات تيتانيوم 50 ملم، اتصال HyperSpeed، بطارية 70 ساعة وميكروفون قابل للفصل.', specs: [{ key: 'Drivers', value: 'TriForce Titanium 50mm' }, { key: 'Battery', value: '70 hrs' }, { key: 'Mic', value: 'Detachable broadcast' }, { key: 'Connection', value: 'HyperSpeed + BT' }], variants: [], tags: ['featured', 'deal'] }),
  p({ sku: 'BZ-HS-3002', slug: 'hyperx-cloud-iii', nameEn: 'HyperX Cloud III', nameAr: 'هايبرإكس كلاود III', brandId: brandId('HyperX'), categoryId: 'c-headsets', price: 379, salePrice: null, stock: 55, images: [img('headset.jpg')], descEn: 'Signature comfort meets 53mm angled drivers, DTS Headphone:X spatial audio and a 10mm improved microphone.', descAr: 'راحة HyperX المميزة مع غشايات 53 ملم مائلة، صوت محيطي DTS وميكروفون محسّن 10 ملم.', specs: [{ key: 'Drivers', value: '53mm angled' }, { key: 'Audio', value: 'DTS Headphone:X' }, { key: 'Mic', value: '10mm cardioid' }], variants: [{ id: 'v-blk', label: 'Black', priceDelta: 0, stock: 33 }, { id: 'v-red', label: 'Black/Red', priceDelta: 0, stock: 22 }], tags: ['bestseller', 'popular'] }),
  p({ sku: 'BZ-HS-3003', slug: 'logitech-g-435-lightspeed', nameEn: 'Logitech G435 LIGHTSPEED', nameAr: 'لوجيتك G435 لايتسبيد', brandId: brandId('Logitech G'), categoryId: 'c-headsets', price: 249, salePrice: 199, stock: 63, images: [img('headset.jpg')], descEn: 'Ultra-light 165g wireless headset with dual beamforming mics, LIGHTSPEED + Bluetooth, built from recycled materials.', descAr: 'سماعة لاسلكية خفيفة للغاية 165 غرام بميكروفونين ثنائي الاتجاه، LIGHTSPEED وبلوتوث، مصنوعة من مواد معاد تدويرها.', specs: [{ key: 'Weight', value: '165 g' }, { key: 'Battery', value: '18 hrs' }, { key: 'Connection', value: 'LIGHTSPEED + BT' }], variants: [{ id: 'v-blk', label: 'Black', priceDelta: 0, stock: 30 }, { id: 'v-wht', label: 'White', priceDelta: 0, stock: 20 }, { id: 'v-org', label: 'Orange', priceDelta: 0, stock: 13 }], tags: ['deal', 'new'] }),
  p({ sku: 'BZ-CT-4001', slug: 'razer-raiju-v3-pro', nameEn: 'Razer Raiju V3 Pro', nameAr: 'رازر راجو V3 برو', brandId: brandId('Razer'), categoryId: 'c-controllers', price: 749, salePrice: null, stock: 18, images: [img('controller.jpg')], descEn: 'Pro wireless esports controller for PlayStation 5 and PC: claw-grip back buttons, HyperSpeed wireless and remappable controls.', descAr: 'يد تحكم لاسلكية احترافية لبلايستيشن 5 والكمبيوتر: أزرار خلفية بتصميم كلاو، اتصال HyperSpeed وأزرار قابلة لإعادة البرمجة.', specs: [{ key: 'Platform', value: 'PS5 / PC' }, { key: 'Connection', value: 'HyperSpeed + USB' }, { key: 'Buttons', value: '4 remappable back buttons' }], variants: [], tags: ['new', 'featured'] }),
  p({ sku: 'BZ-CT-4002', slug: '8bitdo-ultimate-2c', nameEn: '8BitDo Ultimate 2C', nameAr: 'إيت بيدو ألتيمت 2C', brandId: brandId('SteelSeries'), categoryId: 'c-controllers', price: 159, salePrice: 129, stock: 74, images: [img('controller.jpg')], descEn: 'Hall-effect sticks that never drift, 1000Hz polling wired mode and pro-grade D-pad at an incredible price.', descAr: 'عصي Hall Effect لا تنجرف أبداً، معدل مسح 1000 هرتز في الوضع السلكي ومفاتيح D-pad احترافية بسعر لا يقاوم.', specs: [{ key: 'Sticks', value: 'Hall Effect' }, { key: 'Connection', value: '2.4 GHz / BT / USB' }, { key: 'Polling', value: '1000 Hz (wired)' }], variants: [{ id: 'v-blk', label: 'Black', priceDelta: 0, stock: 40 }, { id: 'v-pur', label: 'Purple', priceDelta: 0, stock: 34 }], tags: ['deal', 'popular', 'bestseller'] }),
  p({ sku: 'BZ-CT-4003', slug: 'xbox-wireless-controller-stellar-black', nameEn: 'Xbox Wireless Controller', nameAr: 'يد إكس بوكس اللاسلكية', brandId: brandId('MSI'), categoryId: 'c-controllers', price: 279, salePrice: null, stock: 58, images: [img('controller.jpg')], descEn: 'The classic Xbox controller with textured grip, hybrid D-pad, USB-C and Bluetooth. Works on console, PC and Android.', descAr: 'يد إكس بوكس الكلاسيكية بقبضة محكمّة، أزرار D-pad هجينة ومنفذ USB-C وبلوتوث. تعمل على الكونسول والكمبيوتر وأندرويد.', specs: [{ key: 'Connection', value: 'Xbox wireless + BT + USB-C' }, { key: 'Battery', value: '2x AA' }, { key: 'Compatibility', value: 'Xbox / PC / Android' }], variants: [], tags: ['bestseller'] }),
  p({ sku: 'BZ-PD-5001', slug: 'blitz-desk-pro-xl-rgb', nameEn: 'BLITZ Desk Pro XL 900×400 RGB', nameAr: 'بلتز ديسك برو XL 900×400 RGB', brandId: brandId('Havit'), categoryId: 'c-mousepads', price: 139, salePrice: 109, stock: 140, images: [img('mousepad.jpg')], descEn: 'Extra-large desk mat 900×400mm with stitched edges, ultra-smooth micro-texture surface and 15 lighting effects via USB hub.', descAr: 'ماوس باد عملاق للمكتب 900×400 ملم بحواف مخيطة، سطح ناعم للغاية و15 تأثير إضاءة عبر منفذ USB.', specs: [{ key: 'Size', value: '900×400 mm' }, { key: 'Thickness', value: '4 mm' }, { key: 'Edge', value: 'Stitched' }], variants: [], tags: ['deal', 'popular'] }),
  p({ sku: 'BZ-PD-5002', slug: 'steelseries-qck-heavy-xxl', nameEn: 'SteelSeries QCK Heavy XXL', nameAr: 'ستيل سيريس كيو سي كاي هيفي XXL', brandId: brandId('SteelSeries'), categoryId: 'c-mousepads', price: 119, salePrice: null, stock: 95, images: [img('mousepad.jpg')], descEn: 'The legendary cloth pad in XXL 900×400. Dense micro-woven cloth, non-slip rubber base — tournament proven.', descAr: 'الماوس باد القماشي الأسطوري بمقاس XXL 900×400. قماش منسوج كثيف وقاعدة مطاطية مضادة للانزلاق — مجرّب في البطولات.', specs: [{ key: 'Size', value: '900×400 mm' }, { key: 'Surface', value: 'Micro-woven cloth' }, { key: 'Base', value: 'Non-slip rubber' }], variants: [], tags: ['bestseller'] }),
  p({ sku: 'BZ-CB-6001', slug: 'blitz-striker-pro-4in1', nameEn: 'BLITZ Striker Pro 4-in-1 Combo', nameAr: 'بكج بلتز سترايكر برو 4×1', brandId: brandId('Havit'), categoryId: 'c-combos', price: 449, salePrice: 369, stock: 38, images: [img('combo.jpg')], descEn: 'Everything you need to start gaming tonight: mechanical keyboard, 7-button RGB mouse, 50mm headset and XXL mouse pad. One box.', descAr: 'كل ما تحتاجه لبدء اللعب الليلة: لوحة مفاتيح ميكانيكية، ماوس RGB بسبعة أزرار، سماعة 50 ملم وماوس باد XXL. صندوق واحد متكامل.', specs: [{ key: 'Keyboard', value: '87-key mechanical RGB' }, { key: 'Mouse', value: '7-button, 7200 DPI' }, { key: 'Headset', value: '50mm stereo' }, { key: 'Pad', value: 'XXL 800×300mm' }], variants: [], tags: ['combo', 'featured', 'deal'] }),
  p({ sku: 'BZ-CB-6002', slug: 'razer-essentials-bundle', nameEn: 'Razer Essentials Bundle', nameAr: 'باقة رازر إسنشيالز', brandId: brandId('Razer'), categoryId: 'c-combos', price: 1399, salePrice: 1199, stock: 15, images: [img('combo.jpg')], descEn: 'Razer Cynosa V2 keyboard, Basilisk V3 mouse and BlackShark V2 headset — the official starter trio for serious players.', descAr: 'لوحة Cynosa V2 وماوس Basilisk V3 وسماعة BlackShark V2 — الثلاثي الرسمي للاعبين الجادين.', specs: [{ key: 'Keyboard', value: 'Cynosa V2 membrane RGB' }, { key: 'Mouse', value: 'Basilisk V3 — 26K' }, { key: 'Headset', value: 'BlackShark V2 USB' }], variants: [], tags: ['combo', 'deal', 'new'] }),
  p({ sku: 'BZ-CP-7001', slug: 'blitz-chillzone-x15-rgb', nameEn: 'BLITZ ChillZone X15 RGB Cooling Pad', nameAr: 'بلتز شيل زون X15 قاعدة تبريد RGB', brandId: brandId('Havit'), categoryId: 'c-cooling', price: 119, salePrice: 89, stock: 88, images: [img('cooling.jpg')], descEn: 'Dual 120mm silent fans, fits 11–17″ laptops, height-adjustable with ergonomic stand and RGB light strip.', descAr: 'مروحتان 120 ملم صامتتان، تناسب لابتوب 11–17 بوصة، قاعدة قابلة لتعديل الارتفاع مع شريط إضاءة RGB.', specs: [{ key: 'Fans', value: '2 × 120mm' }, { key: 'Fits', value: '11–17 inch' }, { key: 'Noise', value: '<25 dB' }], variants: [], tags: ['deal', 'popular'] }),
  p({ sku: 'BZ-CP-7002', slug: 'havit-hv-f2063-tri-fan', nameEn: 'Havit HV-F2063 Tri-Fan', nameAr: 'هافيت HV-F2063 ثلاثية المراوح', brandId: brandId('Havit'), categoryId: 'c-cooling', price: 159, salePrice: null, stock: 66, images: [img('cooling.jpg')], descEn: 'Three silent fans (110mm + 2×85mm), mesh metal surface, two wind modes and slim foldable stand.', descAr: 'ثلاث مراوح صامتة، سطح معدني شبكي، وضعا نفخ للهواء وقاعدة نحيفة قابلة للطي.', specs: [{ key: 'Fans', value: '3 (110mm + 2×85mm)' }, { key: 'Surface', value: 'Metal mesh' }, { key: 'Fits', value: '12–17 inch' }], variants: [], tags: ['popular'] }),
  p({ sku: 'BZ-CS-8001', slug: 'blitz-venom-argb-midtower', nameEn: 'BLITZ Venom ARGB Mid Tower', nameAr: 'بلتز فينوم ARGB ميد تاور', brandId: brandId('Havit'), categoryId: 'c-cases', price: 349, salePrice: 289, stock: 27, images: [img('pccase.jpg')], descEn: 'Tempered glass mid tower with 4 pre-installed ARGB fans, magnetic dust filters and PSU shroud. Fits 280mm radiators.', descAr: 'كيس ميد تاور بزجاج مقسّى مع 4 مراوح ARGB مسبقة التركيب وفلاتر غبار مغناطيسية وغطاء مزود. يستوعب مبرد 280 ملم.', specs: [{ key: 'Fans', value: '4 × ARGB pre-installed' }, { key: 'Radiator', value: 'Up to 280mm front' }, { key: 'GPU clearance', value: '360 mm' }], variants: [{ id: 'v-blk', label: 'Black', priceDelta: 0, stock: 15 }, { id: 'v-wht', label: 'White', priceDelta: 20, stock: 12 }], tags: ['deal', 'new'] }),
  p({ sku: 'BZ-CS-8002', slug: 'corsair-4000d-airflow', nameEn: 'Corsair 4000D Airflow', nameAr: 'كورسير 4000D إيرفلو', brandId: brandId('Corsair'), categoryId: 'c-cases', price: 549, salePrice: null, stock: 21, images: [img('pccase.jpg')], descEn: 'The benchmark mid tower for high-end airflow: perforated steel front, tool-free tempered glass, iCUE ready.', descAr: 'معيار التبريد بالمid-tower: واجهة فولاذية مثقبة، زجاج مقسّى بدون أدوات ويدعم iCUE.', specs: [{ key: 'Front', value: 'High-airflow steel' }, { key: 'Side', value: 'Tool-free tempered glass' }, { key: 'Fans', value: '2 pre-installed' }], variants: [], tags: ['featured'] }),
  p({ sku: 'BZ-MN-9001', slug: 'blitz-viper-27-165hz', nameEn: 'BLITZ Viper 27″ 165Hz QHD', nameAr: 'بلتز ڤايبر 27″ 165Hz QHD', brandId: brandId('Havit'), categoryId: 'c-monitors', price: 1099, salePrice: 899, stock: 19, images: [img('monitor.jpg')], descEn: '27″ QHD 2560×1440 Fast IPS, 165Hz, 1ms, HDR400, 99% sRGB — the sweet spot for competitive + content.', descAr: 'شاشة 27 بوصة QHD Fast IPS بتردد 165 هرتز وزمن استجابة 1 مللي ثانية وHDR400 وتغطية 99% sRGB — الخيار الأمثل للمنافسة وصناعة المحتوى.', specs: [{ key: 'Panel', value: '27″ Fast IPS' }, { key: 'Resolution', value: '2560×1440' }, { key: 'Refresh', value: '165Hz, 1ms' }, { key: 'HDR', value: 'HDR400' }], variants: [], tags: ['deal', 'featured'] }),
  p({ sku: 'BZ-MN-9002', slug: 'msi-g244f-24-180hz', nameEn: 'MSI G244F 24″ 180Hz', nameAr: 'إم إس آي G244F 24″ 180Hz', brandId: brandId('MSI'), categoryId: 'c-monitors', price: 749, salePrice: null, stock: 34, images: [img('monitor.jpg')], descEn: '24″ Rapid IPS 1080p at 180Hz with 1ms response, G-SYNC compatible and a fully adjustable stand.', descAr: 'شاشة 24 بوصة Rapid IPS بدقة 1080p وتردد 180 هرتز وزمن استجابة 1 مللي ثانية، متوافقة مع G-SYNC وقاعدة قابلة للتعديل بالكامل.', specs: [{ key: 'Panel', value: '24″ Rapid IPS' }, { key: 'Refresh', value: '180Hz, 1ms' }, { key: 'Adaptive sync', value: 'G-SYNC Compatible' }], variants: [], tags: ['bestseller'] }),
  p({ sku: 'BZ-MC-10001', slug: 'blitz-voicepro-usb', nameEn: 'BLITZ VoicePro USB Condenser', nameAr: 'بلتز فويس برو مكثف USB', brandId: brandId('Havit'), categoryId: 'c-mics', price: 229, salePrice: 179, stock: 51, images: [img('microphone.jpg')], descEn: 'Cardioid condenser USB microphone with metal shock mount, touch mute, zero-latency monitoring and tripod stand.', descAr: 'ميكروفون مكثف USB بنمط Cardioid مع قاعدة مقاومة اهتزاز معدنية، كتم لمس، مراقبة بدون تأخير وحامل ثلاثي.', specs: [{ key: 'Pattern', value: 'Cardioid' }, { key: 'Connection', value: 'USB-C' }, { key: 'Monitoring', value: '3.5mm zero-latency' }], variants: [], tags: ['deal', 'new'] }),
  p({ sku: 'BZ-MC-10002', slug: 'hyperx-quadcast-2', nameEn: 'HyperX QuadCast 2', nameAr: 'هايبرإكس كوادركاست 2', brandId: brandId('HyperX'), categoryId: 'c-mics', price: 679, salePrice: null, stock: 16, images: [img('microphone.jpg')], descEn: 'Multi-pattern streaming condenser with tap-to-mute sensor, built-in pop filter and auto gain control.', descAr: 'ميكروفون مكثف للبث بأنماط متعددة، كتم باللمس، مرشح بوب مدمج وتحكم تلقائي بالكسب.', specs: [{ key: 'Patterns', value: '4 (cardioid/omni/stereo/bi)' }, { key: 'Connection', value: 'USB-C' }, { key: 'Features', value: 'Tap-to-mute, pop filter' }], variants: [], tags: ['featured'] }),
  p({ sku: 'BZ-CB-11001', slug: 'blitz-coiled-usbc-aviator', nameEn: 'BLITZ Coiled Aviator USB-C', nameAr: 'بلتز كويল্ড إيفيتور USB-C', brandId: brandId('Havit'), categoryId: 'c-cables', price: 79, salePrice: 59, stock: 160, images: [img('cables.jpg')], descEn: 'Aviator-style coiled USB-C to USB-A cable, paracord sleeving, aircraft-grade metal GX12 connector — the keyboard essential.', descAr: 'كابل Aviator USB-C إلى USB-A مجدول، تغليف خيوط Paracord وموصل معدني GX12 — الإضافة الأساسية للوحتك.', specs: [{ key: 'Length', value: '85cm coiled' }, { key: 'Connector', value: 'GX12 aviator' }, { key: 'Sleeve', value: 'Paracord' }], variants: [{ id: 'v-neb', label: 'Nebula Blue', priceDelta: 0, stock: 60 }, { id: 'v-vio', label: 'Violet Haze', priceDelta: 0, stock: 55 }, { id: 'v-blk', label: 'Black', priceDelta: 0, stock: 45 }], tags: ['deal', 'popular', 'new'] }),
  p({ sku: 'BZ-CB-11002', slug: 'blitz-braided-usb-kit-6in1', nameEn: 'BLITZ Braided USB Kit 6-in-1', nameAr: 'بلتز طقم كابلات 6 في 1', brandId: brandId('Havit'), categoryId: 'c-cables', price: 69, salePrice: null, stock: 120, images: [img('cables.jpg')], descEn: 'Six braided USB extensions and adapters — hub, A-to-C and C-to-C, velcro-bundled. Cable chaos, solved.', descAr: 'ستة كابلات ومهايئات مضفرة — هاب ومقابس A-C و C-C مع أربطة فيلكرو. الفوضى، انتهت.', specs: [{ key: 'Contents', value: '6 cables + hub' }, { key: 'Length', value: '1m each' }], variants: [], tags: ['popular'] }),
  p({ sku: 'BZ-PC-12001', slug: 'nvidia-rtx-4060-dual', nameEn: 'NVIDIA GeForce RTX 4060 8GB Dual', nameAr: 'إنفيديا جي فورس RTX 4060 8GB', brandId: brandId('ASUS ROG'), categoryId: 'c-components', price: 1499, salePrice: 1399, stock: 14, images: [img('gpu.jpg')], descEn: 'RTX 4060 8GB GDDR6 with DLSS 3.5, dual-fan Axial-tech cooler and HDMI 2.1 — 1080p ultra, 1440p high.', descAr: 'RTX 4060 بذاكرة 8GB GDDR6 مع DLSS 3.5 ومبرد مروحتين Axial-tech وHDMI 2.1 — 1080p ألترا و1440p عالي.', specs: [{ key: 'VRAM', value: '8GB GDDR6' }, { key: 'CUDA', value: '3072 cores' }, { key: 'Outputs', value: '3 × DP 1.4a + HDMI 2.1' }], variants: [], tags: ['deal', 'bestseller'] }),
  p({ sku: 'BZ-PC-12002', slug: 'corsair-vengeance-ddr5-32gb', nameEn: 'Corsair Vengeance RGB 32GB DDR5', nameAr: 'كورسير فينجانس RGB 32GB DDR5', brandId: brandId('Corsair'), categoryId: 'c-components', price: 469, salePrice: null, stock: 45, images: [img('ram.jpg')], descEn: '32GB (2×16GB) DDR5-6000 CL30 RGB kit — the sweet spot for modern gaming and fast productivity.', descAr: 'طقم 32GB (2×16GB) DDR5-6000 CL30 بإضاءة RGB — التوازن المثالي للألعاب الحديثة والإنتاجية السريعة.', specs: [{ key: 'Capacity', value: '32GB (2×16GB)' }, { key: 'Speed', value: 'DDR5-6000 CL30' }, { key: 'Lighting', value: 'RGB, iCUE sync' }], variants: [], tags: ['popular'] }),
  p({ sku: 'BZ-PC-12003', slug: 'samsung-990-pro-1tb', nameEn: 'Samsung 990 PRO 1TB NVMe', nameAr: 'سامسونج 990 برو 1TB NVMe', brandId: brandId('Gigabyte'), categoryId: 'c-components', price: 449, salePrice: 399, stock: 70, images: [img('ssd.jpg')], descEn: 'PCIe 4.0 with 7,450 MB/s reads, 6,900 MB/s writes, built-in nickel heatsink. The fastest Gen4 mainstream drive.', descAr: 'PCIe 4.0 بسرعة قراءة 7,450 م.ب/ث وكتابة 6,900 م.ب/ث مع مشتت نيكل مدمج. أسرع أقراص Gen4.', specs: [{ key: 'Capacity', value: '1TB' }, { key: 'Interface', value: 'PCIe 4.0 x4' }, { key: 'Seq read', value: '7,450 MB/s' }], variants: [{ id: 'v-1t', label: '1TB', priceDelta: 0, stock: 40 }, { id: 'v-2t', label: '2TB', priceDelta: 380, stock: 30 }], tags: ['deal'] }),
  p({ sku: 'BZ-PC-12004', slug: 'msi-b650-tomahawk-wifi', nameEn: 'MSI B650 Tomahawk WiFi', nameAr: 'إم إس آي B650 توماهوك واي فاي', brandId: brandId('MSI'), categoryId: 'c-components', price: 899, salePrice: null, stock: 17, images: [img('motherboard.jpg')], descEn: 'AM5 ATX, DDR5, PCIe 4.0, WiFi 6E, 2.5G LAN, 14+2+1 power stages — the ultimate Ryzen 7000/9000 board.', descAr: 'AM5 ATX، DDR5، PCIe 4.0، WiFi 6E، شبكة 2.5G و14+2+1 مرحلة طاقة — لوحة Ryzen 7000/9000 المثلى.', specs: [{ key: 'Socket', value: 'AM5' }, { key: 'Memory', value: 'DDR5, 4 slots, 192GB max' }, { key: 'Network', value: '2.5G LAN + WiFi 6E' }], variants: [], tags: ['new'] }),
  p({ sku: 'BZ-PB-13001', slug: 'blitz-rift-1440-elite', nameEn: 'BLITZ Rift 1440 Elite — Full PC', nameAr: 'بلتز ريفت 1440 إيليت — جهاز كامل', brandId: brandId('Havit'), categoryId: 'c-pcs', price: 4899, salePrice: 4499, stock: 8, images: [img('pcbuild.jpg')], descEn: 'Ryzen 7 7800X3D · RTX 4060 Ti 16GB · 32GB DDR5-6000 · 1TB Gen4 · 750W Gold — 1440p ultra at high FPS, assembled and stress-tested by BLITZ.', descAr: 'رايزن 7 7800X3D · RTX 4060 Ti 16GB · ذاكرة 32GB DDR5-6000 · 1TB Gen4 · مزود 750W Gold — 1440p ألترا بإطارات عالية، مُجمّع ومختبر تحت الضغط لدى بلتز.', specs: [{ key: 'CPU', value: 'Ryzen 7 7800X3D' }, { key: 'GPU', value: 'RTX 4060 Ti 16GB' }, { key: 'RAM', value: '32GB DDR5-6000 CL30' }, { key: 'Storage', value: '1TB NVMe Gen4' }, { key: 'PSU', value: '750W 80+ Gold' }, { key: 'Cooling', value: '240mm ARGB AIO' }], variants: [], tags: ['combo', 'featured', 'deal'] }),
  p({ sku: 'BZ-PB-13002', slug: 'blitz-inferno-1080-pro', nameEn: 'BLITZ Inferno 1080 Pro — Full PC', nameAr: 'بلتز إنفيرنو 1080 برو — جهاز كامل', brandId: brandId('Havit'), categoryId: 'c-pcs', price: 3299, salePrice: null, stock: 12, images: [img('pcbuild.jpg')], descEn: 'Ryzen 5 7600 · RTX 4060 8GB · 16GB DDR5-5200 · 512GB NVMe — the 1080p high-refresh monster for competitive play.', descAr: 'رايزن 5 7600 · RTX 4060 8GB · ذاكرة 16GB DDR5-5200 · 512GB NVMe — وحش 1080p بتردد عالٍ للعب التنافسي.', specs: [{ key: 'CPU', value: 'Ryzen 5 7600' }, { key: 'GPU', value: 'RTX 4060 8GB' }, { key: 'RAM', value: '16GB DDR5-5200' }, { key: 'Storage', value: '512GB NVMe' }], variants: [], tags: ['new'] }),
  p({ sku: 'BZ-CH-14001', slug: 'blitz-throne-ergonomic', nameEn: 'BLITZ Throne Ergonomic Racing Chair', nameAr: 'بلتز ثرون كرسي سباق مريح', brandId: brandId('Havit'), categoryId: 'c-chairs', price: 899, salePrice: 749, stock: 25, images: [img('chair.jpg')], descEn: 'High-back racing chair with 4D armrests, cold-cure foam, Class-4 gas lift and 2D lumbar support. Certified to 150kg.', descAr: 'كرسي سباق عالي الظهر بأذرع 4D، إسفنج Cold-Cure، قاعدة رفع غاز تصنيف 4 ودعم قطني 2D. معتمد حتى 150 كجم.', specs: [{ key: 'Armrests', value: '4D' }, { key: 'Foam', value: 'Cold-cure high density' }, { key: 'Class', value: 'Class-4 gas lift, 150kg' }], variants: [{ id: 'v-blk', label: 'Black', priceDelta: 0, stock: 15 }, { id: 'v-blue', label: 'Black/Blue', priceDelta: 0, stock: 10 }], tags: ['deal', 'bestseller'] }),
  p({ sku: 'BZ-CH-14002', slug: 'blitz-ascend-mesh-chair', nameEn: 'BLITZ Ascend Mesh Office Pro', nameAr: 'بلتز أسند كرسي شبكي أوفيس برو', brandId: brandId('Havit'), categoryId: 'c-chairs', price: 1099, salePrice: null, stock: 19, images: [img('chair.jpg')], descEn: 'Full-mesh task chair with synchro-tilt, adjustable lumbar, breathable back — all-day comfort for marathon sessions.', descAr: 'كرسي مهام بشبكة كاملة مع ميل متزامن ودعم قطني قابل للتعديل وظِهر مهوّى — راحة طوال اليوم لجلسات الماراثون.', specs: [{ key: 'Back', value: 'Breathable mesh' }, { key: 'Mechanism', value: 'Synchro-tilt' }, { key: 'Armrests', value: '3D soft-touch' }], variants: [], tags: ['new'] }),
];

const adminHash = 'c9c64b20f12761cc672c867868acd458eabab549039c213d846f09f983881f88';

export const defaultAdmins: AdminUser[] = [
  { id: 'a-1', username: 'admin', passwordHash: adminHash, name: 'Store Owner', role: 'owner', active: true, createdAt: '2026-01-01T00:00:00Z' },
];

export const defaultCoupons: Coupon[] = [
  { id: 'cp-1', code: 'BLITZ10', description: 'Sample code — review and activate before use', type: 'percent', value: 10, target: 'products', minSubtotal: 0, productIds: [], categoryIds: [], startsAt: '2026-01-01', expiresAt: '2027-12-31', usageLimit: null, perCustomerLimit: 1, usedCount: 0, active: false },
  { id: 'cp-2', code: 'FREEDEL', description: 'Sample delivery promotion — review and activate before use', type: 'fixed', value: 0, target: 'delivery', minSubtotal: 0, productIds: [], categoryIds: [], startsAt: '2026-01-01', expiresAt: '2027-12-31', usageLimit: 500, perCustomerLimit: null, usedCount: 0, active: false },
  { id: 'cp-3', code: 'WELCOME50', description: 'Sample code — review and activate before use', type: 'fixed', value: 50, target: 'products', minSubtotal: 500, productIds: [], categoryIds: [], startsAt: '2026-01-01', expiresAt: '2027-12-31', usageLimit: 300, perCustomerLimit: 1, usedCount: 0, active: false },
  { id: 'cp-4', code: 'GEAR20', description: 'Sample category promotion — review and activate before use', type: 'percent', value: 20, target: 'products', minSubtotal: 0, productIds: [], categoryIds: ['c-keyboards', 'c-mice', 'c-headsets'], startsAt: '2026-10-01', expiresAt: '2027-11-30', usageLimit: 200, perCustomerLimit: 2, usedCount: 0, active: false },
];

export const defaultPages = [
  { id: 'pg-1', slug: 'about', titleEn: 'About BLITZ GAMING', titleAr: 'من نحن', titleHe: 'אודות BLITZ GAMING', visible: true, bodyHe: 'BLITZ GAMING היא חנות לציוד גיימינג, כולל מקלדות, עכברים, אוזניות, בקרים ואביזרי מחשב. ניתן לעיין בקטלוג ולפנות אלינו לקבלת מידע על מוצרים לפני ההזמנה. תשלום במזומן בעת המסירה זמין, ודמי המשלוח נקבעים לפי האזור שנבחר.', bodyEn: 'BLITZ GAMING is a gaming store for keyboards, mice, headsets, controllers, PC accessories and setup essentials. Browse the catalog, check availability and contact us for product information before ordering. Cash on delivery is available; delivery fees depend on your selected region.', bodyAr: 'بلتز قيمنق متجر لمستلزمات الألعاب، بما فيها لوحات المفاتيح والفئران والسماعات وأيدي التحكم وملحقات الكمبيوتر. تصفح المنتجات وتأكد من التوفر وتواصل معنا للحصول على معلومات المنتج قبل الطلب. يتوفر الدفع عند الاستلام، وتُحدد رسوم التوصيل حسب المنطقة المختارة.' },
  { id: 'pg-2', slug: 'shipping', titleEn: 'Delivery & Returns', titleAr: 'التوصيل والاسترجاع', titleHe: 'משלוחים והחזרות', visible: true, bodyHe: 'דמי משלוח: הגדה המערבית — ₪20 · ירושלים — ₪50 · אזורי 1948 — ₪70. נגבים דמי משלוח אחד לכל הזמנה והסכום הסופי מוצג בקופה. תשלום במזומן בעת המסירה זמין. זמני המשלוח, האחריות ותנאי ההחזרה עשויים להשתנות לפי המוצר והאזור; פנו אלינו ב-WhatsApp לאישור לפני ההזמנה. עדכנו את הדף במדיניות הסופית לפני ההשקה.', bodyEn: 'Delivery fees: West Bank — ₪20 · Jerusalem — ₪50 · 1948 areas — ₪70. One delivery fee applies per order and the selected fee is shown at checkout. Cash on delivery is available. Delivery timing, warranty coverage and return eligibility can depend on the item and location; contact us on WhatsApp to confirm before ordering. Update this page with your final store policy before launch.', bodyAr: 'رسوم التوصيل: الضفة الغربية — ٢٠ شيكل · القدس — ٥٠ شيكل · أراضي ١٩٤٨ — ٧٠ شيكل. تُحسب رسوم توصيل واحدة لكل طلب وتظهر الرسوم المختارة عند إتمام الطلب. يتوفر الدفع عند الاستلام. قد تختلف مدة التوصيل والكفالة وشروط الاسترجاع بحسب المنتج والمنطقة؛ تواصل معنا عبر واتساب للتأكيد قبل الطلب. حدّث هذه الصفحة بسياسة المتجر النهائية قبل الإطلاق.' },
  { id: 'pg-3', slug: 'faq', titleEn: 'FAQ', titleAr: 'الأسئلة الشائعة', titleHe: 'שאלות נפוצות', visible: true, bodyHe: 'ש: האם ניתן לשלם בעת המסירה? ת: התשלום הראשוני הוא במזומן בעת המסירה.\nש: מהם דמי המשלוח? ת: הגדה המערבית ₪20, ירושלים ₪50 ואזורי 1948 ₪70 לכל הזמנה.\nש: כיצד מוודאים זמינות, אחריות או תנאי החזרה? ת: פנו אלינו ב-WhatsApp במספר +970595210647 לפני ההזמנה.', bodyEn: 'Q: Can I pay on delivery? A: Cash on delivery is the initial payment option.\nQ: What is the delivery fee? A: West Bank ₪20, Jerusalem ₪50, and 1948 areas ₪70 per order.\nQ: How do I confirm product availability, warranty or return terms? A: Contact us on WhatsApp at +970595210647 before ordering.', bodyAr: 'س: هل يمكن الدفع عند الاستلام؟ ج: يتوفر الدفع عند الاستلام كطريقة الدفع الأساسية.\nس: ما رسوم التوصيل؟ ج: الضفة ٢٠ شيكل، القدس ٥٠ شيكل، وأراضي ١٩٤٨ ٧٠ شيكل لكل طلب.\nس: كيف أتأكد من توفر المنتج أو الكفالة أو شروط الاسترجاع؟ ج: تواصل معنا عبر واتساب على ‎+970595210647 قبل الطلب.' },
];

export function seedDb(): Db {
  return {
    categories: defaultCategories,
    brands: defaultBrands,
    products: defaultProducts,
    coupons: defaultCoupons,
    orders: [],
    admins: defaultAdmins,
    delivery: { westbank: 20, jerusalem: 50, inside48: 70 },
    store: {
      nameEn: 'BLITZ GAMING',
      nameAr: 'بلتز قيمنق',
      whatsapp: '+970595210647',
      phone: '+970595210647',
      email: 'sooqbaitak@gmail.com',
      facebook: 'https://www.facebook.com/profile.php?id=61591200376695',
      instagram: 'https://www.instagram.com/blitzyard/',
      addressEn: 'Serving Palestine',
      addressAr: 'نخدم مناطق فلسطين',
      addressHe: 'משלוחים ברחבי פלסטין',
      hoursEn: 'Contact us via WhatsApp',
      hoursAr: 'للتواصل عبر واتساب',
      hoursHe: 'ליצירת קשר דרך WhatsApp',
      announcementEn: 'Gaming gear · Delivery across Palestine · Cash on delivery',
      announcementAr: 'مستلزمات قيمنق · توصيل لمناطق فلسطين · الدفع عند الاستلام',
      announcementHe: 'ציוד גיימינג · משלוחים ברחבי פלסטין · תשלום במזומן בעת המסירה',
      announcementItems: [
        { id: 'announcement-main', textEn: 'Gaming gear · Delivery across Palestine', textAr: 'مستلزمات قيمنق · توصيل لمناطق فلسطين', textHe: 'ציוד גיימינג · משלוחים ברחבי פלסטין', active: true },
        { id: 'announcement-delivery', textEn: 'West Bank ₪20 · Jerusalem ₪50 · 1948 Areas ₪70', textAr: 'الضفة 20 شيكل · القدس 50 شيكل · أراضي 1948 70 شيكل', textHe: 'הגדה המערבית ₪20 · ירושלים ₪50 · אזורי 1948 ₪70', active: true },
        { id: 'announcement-payment', textEn: 'Cash on delivery · Customer support on WhatsApp', textAr: 'الدفع عند الاستلام · دعم العملاء عبر واتساب', textHe: 'תשלום במזומן במסירה · תמיכה ב-WhatsApp', active: true },
      ],
      announcementBgColor: '#07131f',
      announcementTextColor: '#49c6ff',
      announcementFontSize: 12,
      announcementSpeedSeconds: 32,
      announcementFontWeight: 'bold',
      announcementBorderColor: '#12334a',
      announcementPauseOnHover: true,
      announcementShowIcon: true,
      theme: 'night',
      uiTextOverrides: {},
      footerContent: {
        descriptionEn: 'Gaming gear and accessories, with clear prices, regional delivery fees and cash on delivery.',
        descriptionAr: 'متجر لمعدات الألعاب وملحقاتها، مع معلومات واضحة عن الأسعار ورسوم التوصيل والدفع عند الاستلام.',
        descriptionHe: 'ציוד ואביזרי גיימינג, עם מחירים ברורים, דמי משלוח לפי אזור ותשלום במזומן במסירה.',
        trustCashEn: 'Cash on Delivery', trustCashAr: 'الدفع عند الاستلام', trustCashHe: 'תשלום במזומן במסירה',
        trustDeliveryEn: 'Clear Regional Delivery Fees', trustDeliveryAr: 'رسوم توصيل واضحة حسب المنطقة', trustDeliveryHe: 'דמי משלוח ברורים לפי אזור',
        trustSupportEn: 'WhatsApp Customer Support', trustSupportAr: 'دعم العملاء عبر واتساب', trustSupportHe: 'שירות לקוחות ב-WhatsApp',
        trustGamingEn: 'Gaming Gear & Accessories', trustGamingAr: 'معدات وملحقات قيمنق', trustGamingHe: 'ציוד ואביזרי גיימינג',
        shopHeadingEn: 'Shop', shopHeadingAr: 'تسوّق', shopHeadingHe: 'קנייה',
        companyHeadingEn: 'Company', companyHeadingAr: 'المتجر', companyHeadingHe: 'החנות',
        deliveryHeadingEn: 'Delivery Fees', deliveryHeadingAr: 'رسوم التوصيل', deliveryHeadingHe: 'דמי משלוח',
        deliveryNoteEn: 'One delivery fee per order regardless of item count.', deliveryNoteAr: 'رسوم توصيل واحدة لكل طلب بغض النظر عن عدد القطع.', deliveryNoteHe: 'דמי משלוח אחד לכל הזמנה, ללא קשר למספר הפריטים.',
        copyrightEn: 'All rights reserved', copyrightAr: 'جميع الحقوق محفوظة', copyrightHe: 'כל הזכויות שמורות.',
        sloganEn: 'Built with speed & power in Palestine', sloganAr: 'صُنع بسرعة وقوة في فلسطين', sloganHe: 'נבנה במהירות ובעוצמה בפלסטין',
      },
      logoUrl: '',
      logoAspectRatio: 'square',
      logoObjectFit: 'contain',
      faviconUrl: '',
      mobileBottomBarItems: ['home', 'shop', 'account', 'cart', 'whatsapp', 'theme'],
      homeHeroSlides: [],
      homeHeroIntervalSeconds: 6,
      homeHeroAutoplay: true,
      homeHeroShowControls: true,
      homeHeroTransition: 'fade',
      loyaltyPointsPer10Ils: 1,
      buildSetupCategoryIds: ['c-keyboards', 'c-mice', 'c-headsets', 'c-controllers', 'c-monitors', 'c-chairs'],
      buildSetupNoticeEn: 'Build your setup your way — choose products from each category and see your total update instantly.',
      buildSetupNoticeAr: 'كوّن إعدادك على طريقتك — اختر المنتجات من كل فئة وشاهد الإجمالي يتحدث فوراً.',
      buildSetupNoticeHe: 'בנו את הסטאפ בדרך שלכם — בחרו מוצרים מכל קטגוריה וצפו בסכום מתעדכן מיד.',
      socialLinks: [
        { id: 'social-facebook', label: 'Facebook', platform: 'facebook', url: 'https://www.facebook.com/profile.php?id=61591200376695', active: true },
        { id: 'social-instagram', label: 'Instagram', platform: 'instagram', url: 'https://www.instagram.com/blitzyard/', active: true },
        { id: 'social-email', label: 'Gmail', platform: 'email', url: 'mailto:sooqbaitak@gmail.com', active: true },
      ],
      paymentMethods: [
        { id: 'cod', enabled: true },
        { id: 'card', enabled: false },
        { id: 'paypal', enabled: false },
        { id: 'apple_pay', enabled: false },
        { id: 'google_pay', enabled: false },
        { id: 'bank_transfer', enabled: false },
      ],
      orderNotificationEmail: 'sooqbaitak@gmail.com',
      orderEmailSubject: 'New Blitz Gaming order {{order_number}}',
      orderEmailTemplate: 'A new order has been placed on Blitz Gaming.\n\nOrder: {{order_number}}\nDate: {{created_at}}\nCustomer: {{customer_name}}\nPhone: {{phone}}\nEmail: {{email}}\nDelivery area: {{delivery_area}}\nCity: {{city}}\nAddress: {{address}}\n\nItems:\n{{items}}\n\nSubtotal: ₪{{subtotal}}\nDiscount: ₪{{discount}}\nDelivery fee: ₪{{delivery_fee}}\nTOTAL: ₪{{total}}\nCoupon: {{coupon_code}}\nPC assembly preference: {{build_preference}}\nNotes: {{notes}}',
    },
    pages: defaultPages,
    couponUses: [],
  };
}
