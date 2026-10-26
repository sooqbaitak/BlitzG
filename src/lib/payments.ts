import type { PaymentMethodToggle } from './types';

/** Payment types available in checkout. Only COD is connected by default. */
export const PAYMENT_METHODS = [
  { id: 'cod', labelEn: 'Cash on Delivery', labelAr: 'الدفع عند الاستلام', labelHe: 'תשלום בעת המסירה', detailEn: 'Pay the courier when your order arrives.', detailAr: 'ادفع للمندوب عند استلام الطلب.', detailHe: 'תשלום לשליח בעת קבלת ההזמנה.', needsGateway: false },
  { id: 'card', labelEn: 'Visa / Mastercard / American Express', labelAr: 'Visa / Mastercard / American Express', labelHe: 'Visa / Mastercard / American Express', detailEn: 'Credit or debit card. A payment gateway must be connected before accepting payments.', detailAr: 'بطاقة ائتمان أو خصم. يلزم ربط بوابة دفع قبل استقبال المدفوعات.', detailHe: 'כרטיס אשראי או חיוב. יש לחבר ספק סליקה לפני קבלת תשלומים.', needsGateway: true },
  { id: 'paypal', labelEn: 'PayPal', labelAr: 'PayPal', labelHe: 'PayPal', detailEn: 'PayPal checkout requires a configured PayPal integration.', detailAr: 'يتطلب الدفع عبر PayPal ربط الخدمة أولاً.', detailHe: 'תשלום PayPal דורש חיבור PayPal מוגדר.', needsGateway: true },
  { id: 'apple_pay', labelEn: 'Apple Pay', labelAr: 'Apple Pay', labelHe: 'Apple Pay', detailEn: 'Requires a supported card processor and merchant setup.', detailAr: 'يتطلب معالج بطاقات مدعوماً وإعداد حساب التاجر.', detailHe: 'דורש ספק סליקה נתמך והגדרת חשבון סוחר.', needsGateway: true },
  { id: 'google_pay', labelEn: 'Google Pay', labelAr: 'Google Pay', labelHe: 'Google Pay', detailEn: 'Requires a supported card processor and merchant setup.', detailAr: 'يتطلب معالج بطاقات مدعوماً وإعداد حساب التاجر.', detailHe: 'דורש ספק סליקה נתמך והגדרת חשבון סוחר.', needsGateway: true },
  { id: 'bank_transfer', labelEn: 'Bank Transfer', labelAr: 'تحويل بنكي', labelHe: 'העברה בנקאית', detailEn: 'Transfer directly to the store bank account. The order remains unpaid until the store verifies the transfer.', detailAr: 'حوّل مباشرة إلى حساب المتجر البنكي. يبقى الطلب غير مدفوع حتى يتحقق المتجر من التحويل.', detailHe: 'העבירו לחשבון הבנק של החנות. ההזמנה נשארת לא משולמת עד שהחנות תאמת את ההעברה.', needsGateway: false },
] as const;

export type PaymentMethodId = typeof PAYMENT_METHODS[number]['id'];
export const DEFAULT_PAYMENT_METHODS: PaymentMethodToggle[] = PAYMENT_METHODS.map((method) => ({ id: method.id, enabled: method.id === 'cod' }));

export function normalizePaymentMethods(value?: PaymentMethodToggle[] | null): PaymentMethodToggle[] {
  const incoming = new Map((value ?? []).map((entry) => [entry.id, Boolean(entry.enabled)]));
  return DEFAULT_PAYMENT_METHODS.map((method) => ({ ...method, enabled: incoming.has(method.id) ? Boolean(incoming.get(method.id)) : method.enabled }));
}

export function paymentMethodText(methodId: PaymentMethodId, lang: 'en' | 'ar' | 'he'): string {
  const method = PAYMENT_METHODS.find((entry) => entry.id === methodId)!;
  return lang === 'ar' ? method.labelAr : lang === 'he' ? method.labelHe : method.labelEn;
}

export function hasBankTransferDetails(details?: { bankName?: string; accountHolder?: string; accountNumber?: string; iban?: string } | null): boolean {
  return Boolean(details && details.bankName?.trim() && details.accountHolder?.trim() && (details.iban?.trim() || details.accountNumber?.trim()));
}

/** Card, PayPal, Apple Pay and Google Pay are only operational when the server reports a provider integration. */
export function isOperationalPaymentMethod(id: PaymentMethodId, args: { cloudConfigured: boolean; cardGatewayReady: boolean; bankTransferReady: boolean }): boolean {
  if (id === 'cod') return true;
  if (!args.cloudConfigured) return false;
  if (id === 'card') return args.cardGatewayReady;
  if (id === 'bank_transfer') return args.bankTransferReady;
  return false;
}
