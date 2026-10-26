// BLITZ GAMING — footer
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Zap, ShieldCheck, Truck, Banknote, ChevronLeft, Facebook, Instagram, Youtube, Twitch, Music2, MessageCircle, ExternalLink } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { Logo } from './Logo';
import { WhatsAppIcon } from './Header';

export function Footer() {
  const { db, lang, t, dir } = useApp();
  const s = db.store;
  const year = new Date().getFullYear();
  const footerText = (key: string, fallback: { en: string; ar: string; he: string }) => {
    const suffix = lang === 'ar' ? 'Ar' : lang === 'he' ? 'He' : 'En';
    const value = (s.footerContent as Record<string, string | undefined> | undefined)?.[`${key}${suffix}`];
    return value && value.trim() ? value : fallback[lang];
  };

  const topCats = db.categories.filter((c) => !c.parentId && c.visible).slice(0, 6);
  const pages = db.pages.filter((p) => p.visible);
  const socialLinks = (s.socialLinks !== undefined ? s.socialLinks : [
    { id: 'facebook', label: 'Facebook', platform: 'facebook', url: s.facebook, active: true },
    { id: 'instagram', label: 'Instagram', platform: 'instagram', url: s.instagram, active: true },
    { id: 'email', label: 'Gmail', platform: 'email', url: `mailto:${s.email}`, active: true },
  ]).filter((link) => link.url && link.active !== false);
  const socialIcon = (platform: string) => {
    const key = platform.toLowerCase();
    if (key.includes('facebook')) return Facebook;
    if (key.includes('instagram')) return Instagram;
    if (key.includes('youtube')) return Youtube;
    if (key.includes('twitch')) return Twitch;
    if (key.includes('tiktok')) return Music2;
    if (key.includes('email') || key.includes('gmail') || key.includes('mail')) return Mail;
    if (key.includes('discord') || key.includes('telegram') || key.includes('whatsapp')) return MessageCircle;
    return ExternalLink;
  };

  return (
    <footer className="border-t border-line bg-[#0c0c0f]">
      {/* trust strip */}
      <div className="border-b border-line">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4 sm:py-5">
          {[
            { icon: Banknote, key: 'trustCash', fallback: { en: 'Cash on Delivery', ar: 'الدفع عند الاستلام', he: 'תשלום במזומן במסירה' } },
            { icon: Truck, key: 'trustDelivery', fallback: { en: 'Clear Regional Delivery Fees', ar: 'رسوم توصيل واضحة حسب المنطقة', he: 'דמי משלוח ברורים לפי אזור' } },
            { icon: ShieldCheck, key: 'trustSupport', fallback: { en: 'WhatsApp Customer Support', ar: 'دعم العملاء عبر واتساب', he: 'שירות לקוחות ב-WhatsApp' } },
            { icon: Zap, key: 'trustGaming', fallback: { en: 'Gaming Gear & Accessories', ar: 'معدات وملحقات قيمنق', he: 'ציוד ואביזרי גיימינג' } },
          ].map(({ icon: Icon, key, fallback }, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="rounded-lg border border-electric/25 bg-electric/10 p-2 text-electric"><Icon size={17} /></div>
              <span className="text-[10px] font-semibold leading-tight text-white/80 sm:text-[11px]">{footerText(key, fallback)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:py-12">
        {/* brand + contact */}
        <div className="space-y-3">
          <Logo />
          <p className="text-[12px] leading-relaxed text-mute">{footerText('description', { en: 'Gaming gear and accessories, with clear prices, regional delivery fees and cash on delivery.', ar: 'متجر لمعدات الألعاب وملحقاتها، مع معلومات واضحة عن الأسعار ورسوم التوصيل والدفع عند الاستلام.', he: 'ציוד ואביזרי גיימינג, עם מחירים ברורים, דמי משלוח לפי אזור ותשלום במזומן במסירה.' })}</p>
          <div className="space-y-1.5 text-[12px] text-white/75">
            <a href={`tel:${s.phone}`} className="flex items-center gap-2 hover:text-electric"><Phone size={14} className="text-electric" />{s.phone}</a>
            <a href={`mailto:${s.email}`} className="flex items-center gap-2 hover:text-electric"><Mail size={14} className="text-electric" />{s.email}</a>
            <span className="flex items-center gap-2"><MapPin size={14} className="text-electric" />{lang === 'ar' ? s.addressAr : lang === 'he' ? (s.addressHe || s.addressEn) : s.addressEn}</span>
            <span className="flex items-center gap-2"><Clock size={14} className="text-electric" />{lang === 'ar' ? s.hoursAr : lang === 'he' ? (s.hoursHe || s.hoursEn) : s.hoursEn}</span>
          </div>
          <a href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-4 py-2 text-[12px] font-bold text-[#25D366] hover:bg-[#25D366]/20">
            <WhatsAppIcon size={16} /> WhatsApp
          </a>
          <div className="flex flex-wrap gap-2 pt-1">
            {socialLinks.map((link) => {
              const Icon = socialIcon(link.platform || link.label);
              const href = /^mailto:/i.test(link.url) || /^https?:\/\//i.test(link.url) ? link.url : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(link.url) ? `mailto:${link.url}` : `https://${link.url}`);
              const external = !href.startsWith('mailto:');
              return <a key={link.id} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} aria-label={link.label} title={link.label} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel2 text-white/75 transition-colors hover:border-electric/50 hover:text-electric"><Icon size={16}/></a>;
            })}
          </div>
        </div>

        {/* shop */}
        <div>
          <h4 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-white">{footerText('shopHeading', { en: 'Shop', ar: 'تسوّق', he: 'קנייה' })}</h4>
          <ul className="space-y-1.5 text-[12px] text-mute">
            {topCats.map((c) => (
              <li key={c.id}><Link to={`/category/${c.slug}`} className="hover:text-electric">{lang === 'ar' ? c.nameAr : lang === 'he' ? (c.nameHe || c.nameEn) : c.nameEn}</Link></li>
            ))}
            <li><Link to="/shop" className="font-bold text-electric hover:text-white inline-flex items-center gap-1">{t('view_all')}<ChevronLeft size={13} className={dir === 'rtl' ? '' : 'rotate-180'} /></Link></li>
          </ul>
        </div>

        {/* company */}
        <div>
          <h4 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-white">{footerText('companyHeading', { en: 'Company', ar: 'المتجر', he: 'החנות' })}</h4>
          <ul className="space-y-1.5 text-[12px] text-mute">
            {pages.map((p) => (
              <li key={p.id}><Link to={`/page/${p.slug}`} className="hover:text-electric">{lang === 'ar' ? p.titleAr : lang === 'he' ? (p.titleHe || p.titleEn) : p.titleEn}</Link></li>
            ))}
            <li><Link to="/brands" className="hover:text-electric">{lang === 'ar' ? 'الماركات' : lang === 'he' ? 'מותגים' : 'Brands'}</Link></li>
            <li><Link to="/offers" className="hover:text-electric">{lang === 'ar' ? 'العروض' : lang === 'he' ? 'מבצעים' : 'Offers'}</Link></li>
            <li><Link to="/build-your-setup" className="hover:text-electric">{t('build_setup')}</Link></li>
            <li><Link to="/admin/login" className="hover:text-electric">{t('admin_dashboard')}</Link></li>
          </ul>
        </div>

        {/* newsletter-ish + delivery fees */}
        <div>
          <h4 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-white">{footerText('deliveryHeading', { en: 'Delivery Fees', ar: 'رسوم التوصيل', he: 'דמי משלוח' })}</h4>
          <ul className="space-y-1.5 text-[12px] text-mute">
            <li className="flex items-center justify-between border-b border-line/60 pb-1"><span>{t('westbank')}</span><span className="font-display font-bold text-white">₪{db.delivery.westbank}</span></li>
            <li className="flex items-center justify-between border-b border-line/60 pb-1"><span>{t('jerusalem')}</span><span className="font-display font-bold text-white">₪{db.delivery.jerusalem}</span></li>
            <li className="flex items-center justify-between border-b border-line/60 pb-1"><span>{t('inside48')}</span><span className="font-display font-bold text-white">₪{db.delivery.inside48}</span></li>
          </ul>
          <p className="mt-3 text-[10px] leading-relaxed text-mute">{footerText('deliveryNote', { en: 'One delivery fee per order regardless of item count.', ar: 'رسوم توصيل واحدة لكل طلب بغض النظر عن عدد القطع.', he: 'דמי משלוח אחד לכל הזמנה, ללא קשר למספר הפריטים.' })}</p>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-3 text-[10px] text-mute sm:flex-row">
          <span>© {year} BLITZ GAMING · بلتز قيمنق. {lang === 'ar' ? 'جميع الحقوق محفوظة' : lang === 'he' ? 'כל הזכויות שמורות.' : 'All rights reserved.'}</span>
          <span className="flex items-center gap-1.5"><Zap size={11} className="text-electric" />{footerText('slogan', { en: 'Built with speed & power in Palestine', ar: 'صُنع بسرعة وقوة في فلسطين', he: 'נבנה במהירות ובעוצמה בפלסטין' })}</span>
        </div>
      </div>
    </footer>
  );
}
