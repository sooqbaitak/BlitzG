import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gift, X, Sparkles } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import type { SeasonalCampaign } from '../lib/types';

function campaignText(c: SeasonalCampaign, lang: 'ar' | 'en' | 'he', kind: 'title' | 'message') {
  if (kind === 'title') return lang === 'ar' ? (c.titleAr || c.titleEn) : lang === 'he' ? (c.titleHe || c.titleEn) : c.titleEn;
  return lang === 'ar' ? (c.messageAr || c.messageEn) : lang === 'he' ? (c.messageHe || c.messageEn) : c.messageEn;
}

export function SeasonalCampaigns() {
  const { db, lang, dir } = useApp();
  const location = useLocation();
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('blitz-dismissed-campaigns') || '[]') as string[]; } catch { return []; }
  });
  const now = Date.now();
  const campaign = useMemo(() => (db.store.seasonalCampaigns ?? []).find((c) => {
    if (!c.active || dismissed.includes(c.id)) return false;
    if (c.startsAt && new Date(c.startsAt).getTime() > now) return false;
    if (c.endsAt && new Date(c.endsAt).getTime() < now) return false;
    if (c.pageTargets?.length && !c.pageTargets.includes('*') && !c.pageTargets.includes(location.pathname)) return false;
    return true;
  }), [db.store.seasonalCampaigns, dismissed, location.pathname, now]);
  if (!campaign) return null;
  const dismiss = () => {
    const next = [...dismissed, campaign.id]; setDismissed(next);
    try { sessionStorage.setItem('blitz-dismissed-campaigns', JSON.stringify(next)); } catch { /* ignore */ }
  };
  const title = campaignText(campaign, lang, 'title');
  const message = campaignText(campaign, lang, 'message');
  const anim = campaign.animation === 'pulse' ? 'animate-pulse' : campaign.animation === 'slide' ? 'animate-[campaign-slide_.35s_ease-out]' : campaign.animation === 'fade' ? 'animate-[campaign-fade_.3s_ease-out]' : campaign.animation === 'bounce' ? 'animate-[campaign-bounce_.55s_ease-out]' : campaign.animation === 'glow' ? 'animate-[campaign-glow_1.8s_ease-in-out_infinite]' : '';
  const campaignStyle = { background: campaign.backgroundColor || '#111114', color: campaign.textColor || '#fff', fontFamily: campaign.fontFamily || 'inherit', fontSize: campaign.fontSize ? `${campaign.fontSize}px` : undefined, animationDuration: `${Math.max(0.15, Math.min(3, campaign.animationDurationSeconds ?? 0.35))}s`, borderRadius: `${Math.max(0, Math.min(40, campaign.borderRadiusPx ?? 16))}px` };
  const floatingPosition = campaign.position ?? 'end-bottom';
  const floatingPositionClass = floatingPosition === 'start-top' ? 'top-24 start-3 md:top-24 md:start-5' : floatingPosition === 'end-top' ? 'top-24 end-3 md:top-24 md:end-5' : floatingPosition === 'start-bottom' ? 'bottom-24 start-3 md:bottom-5 md:start-5' : 'bottom-24 end-3 md:bottom-5 md:end-5';
  const floatingWidth = campaign.widthPreset === 'compact' ? 'min(88vw, 290px)' : campaign.widthPreset === 'wide' ? 'min(94vw, 520px)' : 'min(92vw, 380px)';
  const content = <div className={`relative flex items-center gap-3 ${anim}`} style={campaignStyle}>
    {campaign.imageUrl && <img src={campaign.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-contain sm:h-20 sm:w-20"/>}
    <div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{title || <><Gift size={16} className="inline"/> {lang === 'ar' ? 'مفاجأة من بلتز' : lang === 'he' ? 'הפתעה מ-BLITZ' : 'A BLITZ surprise'}</>}</p>{message && <p className="mt-1 text-xs leading-relaxed opacity-90">{message}</p>}</div>
    {campaign.linkUrl && (campaign.linkUrl.startsWith('http') ? <a href={campaign.linkUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-electric px-3 py-2 text-xs font-bold text-ink">{lang === 'ar' ? 'اكتشف' : lang === 'he' ? 'לצפייה' : 'Explore'}</a> : <Link to={campaign.linkUrl} className="shrink-0 rounded-lg bg-electric px-3 py-2 text-xs font-bold text-ink">{lang === 'ar' ? 'اكتشف' : lang === 'he' ? 'לצפייה' : 'Explore'}</Link>)}
    {campaign.dismissible && <button type="button" onClick={dismiss} className="absolute end-1 top-1 rounded-md p-1 opacity-75 hover:opacity-100" aria-label={lang === 'ar' ? 'إغلاق' : lang === 'he' ? 'סגירה' : 'Dismiss'}><X size={15}/></button>}
  </div>;

  if (campaign.placement === 'modal') return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" dir={dir} role="dialog" aria-modal="true" aria-label={title}><div className="relative w-full overflow-hidden border border-line shadow-2xl" style={{ maxWidth: campaign.widthPreset === 'compact' ? 360 : campaign.widthPreset === 'wide' ? 680 : 512, borderRadius: `${Math.max(0, Math.min(40, campaign.borderRadiusPx ?? 16))}px` }}><div className="absolute start-3 top-3 z-10 rounded-full bg-electric/20 p-2 text-electric"><Sparkles size={17}/></div><button type="button" onClick={dismiss} className="absolute end-2 top-2 z-10 rounded-lg bg-black/30 p-2" aria-label="Close"><X size={18}/></button>{content}</div></div>;
  if (campaign.placement === 'top-banner') return <section dir={dir} className={`border-b border-line ${anim}`}><div className="mx-auto max-w-7xl px-3 py-2 sm:px-4" style={{ maxWidth: campaign.widthPreset === 'compact' ? 900 : campaign.widthPreset === 'wide' ? 1440 : 1280 }}>{content}</div></section>;
  return <aside dir={dir} className={`fixed ${floatingPositionClass} z-[58] max-w-[94vw] overflow-hidden border border-line shadow-2xl shadow-black/40 ${anim}`} style={{ width: floatingWidth, borderRadius: `${Math.max(0, Math.min(40, campaign.borderRadiusPx ?? 16))}px` }}>{content}</aside>;
}
