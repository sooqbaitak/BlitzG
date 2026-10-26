// BLITZ GAMING — static content pages (admin-editable)
import { useParams, Link, Navigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../lib/AppContext';

export function StaticPage() {
  const { slug } = useParams<{ slug: string }>();
  const { db, lang, t, dir } = useApp();
  const ar = lang === 'ar';
  const page = db.pages.find((p) => p.slug === slug && p.visible);
  if (!page) return <Navigate to="/" replace />;
  const body = ar ? page.bodyAr : lang === 'he' ? (page.bodyHe || page.bodyEn) : page.bodyEn;
  const title = ar ? page.titleAr : lang === 'he' ? (page.titleHe || page.titleEn) : page.titleEn;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-4 flex items-center gap-1.5 text-[11px] font-semibold text-mute">
        <Link to="/" className="hover:text-electric">{t('home')}</Link>
        <ChevronRight size={12} className={dir === 'rtl' ? 'rotate-180' : ''} />
        <span className="text-electric">{title}</span>
      </nav>
      <h1 className="font-display text-3xl font-bold text-white">{title}</h1>
      <div className="prose-invert mt-4 whitespace-pre-line rounded-2xl border border-line bg-panel p-6 text-[13.5px] leading-7 text-white/80">{body}</div>
      <div className="mt-6 border-t border-line pt-4 text-center">
        <Link to="/shop" className="inline-flex h-11 items-center rounded-xl bg-electric px-8 text-[13px] font-bold text-ink hover:bg-[#33baff]">{t('continue_shopping')}</Link>
      </div>
    </div>
  );
}
