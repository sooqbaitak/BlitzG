import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Gift, X, Sparkles } from 'lucide-react';
import { useApp } from '../lib/useApp';
import { resolveSafeLink } from '../lib/safeLinks';
import type { SeasonalCampaign } from '../lib/types';

function campaignText(c: SeasonalCampaign, lang: 'ar' | 'en' | 'he', kind: 'title' | 'message') {
  if (kind === 'title') return lang === 'ar' ? (c.titleAr || c.titleEn) : lang === 'he' ? (c.titleHe || c.titleEn) : c.titleEn;
  return lang === 'ar' ? (c.messageAr || c.messageEn) : lang === 'he' ? (c.messageHe || c.messageEn) : c.messageEn;
}

export function SeasonalCampaigns() {
  const { db, lang, dir } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('blitz-dismissed-campaigns') || '[]') as string[]; } catch { return []; }
  });
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); }, []);
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
  const safeCampaignLink = resolveSafeLink(campaign.linkUrl);
  const clickThrough = campaign.fullBannerClickable !== false && Boolean(safeCampaignLink);
  const onCampaignClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!clickThrough || !safeCampaignLink || (event.target as HTMLElement).closest('button,a')) return;
    if (safeCampaignLink.kind === 'external') window.open(safeCampaignLink.href, '_blank', 'noopener,noreferrer'); else navigate(safeCampaignLink.href);
  };
  const content = <div className={`relative flex items-center gap-3 ${campaign.dismissible ? 'pe-12' : ''} ${anim} ${clickThrough ? 'cursor-pointer' : ''}`} style={campaignStyle} onClick={onCampaignClick} onKeyDown={(event) => { if (clickThrough && safeCampaignLink && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); if (safeCampaignLink.kind === 'external') window.open(safeCampaignLink.href, '_blank', 'noopener,noreferrer'); else navigate(safeCampaignLink.href); } }} role={clickThrough ? 'link' : undefined} tabIndex={clickThrough ? 0 : undefined}>
    {campaign.imageUrl && <img src={campaign.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-contain sm:h-20 sm:w-20"/>}
    <div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{title || <><Gift size={16} className="inline"/> {lang === 'ar' ? 'مفاجأة من بلتز' : lang === 'he' ? 'הפתעה מ-BLITZ' : 'A BLITZ surprise'}</>}</p>{message && <p className="mt-1 text-xs leading-relaxed opacity-90">{message}</p>}</div>
    {safeCampaignLink && !clickThrough && (safeCampaignLink.kind === 'external' ? <a href={safeCampaignLink.href} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-electric px-3 py-2 text-xs font-bold text-ink">{lang === 'ar' ? 'اكتشف' : lang === 'he' ? 'לצפייה' : 'Explore'}</a> : <Link to={safeCampaignLink.href} className="shrink-0 rounded-lg bg-electric px-3 py-2 text-xs font-bold text-ink">{lang === 'ar' ? 'اكتشف' : lang === 'he' ? 'לצפייה' : 'Explore'}</Link>)}
    {campaign.dismissible && <button type="button" onClick={(event) => { event.stopPropagation(); dismiss(); }} className="absolute end-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/70 bg-black/75 text-white shadow-lg transition hover:scale-105 hover:bg-red-600" aria-label={lang === 'ar' ? 'إغلاق' : lang === 'he' ? 'סגירה' : 'Dismiss'}><X size={19}/></button>}
  </div>;

  if (campaign.placement === 'modal') return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" dir={dir} role="dialog" aria-modal="true" aria-label={title}><div className="relative w-full overflow-hidden border border-line shadow-2xl" style={{ width: campaign.widthPx ? `min(${campaign.widthPx}px, 96vw)` : undefined, height: campaign.heightPx ? `min(${campaign.heightPx}px, 90vh)` : undefined, maxWidth: campaign.widthPx ? undefined : (campaign.widthPreset === 'compact' ? 360 : campaign.widthPreset === 'wide' ? 680 : 512), borderRadius: `${Math.max(0, Math.min(40, campaign.borderRadiusPx ?? 16))}px` }}><div className="absolute start-3 top-3 z-10 rounded-full bg-electric/20 p-2 text-electric"><Sparkles size={17}/></div>{content}</div></div>;
  if (campaign.placement === 'top-banner') return <section dir={dir} className={`border-b border-line ${anim}`}><div className="mx-auto max-w-7xl px-3 py-2 sm:px-4" style={{ maxWidth: campaign.widthPx ? `min(${campaign.widthPx}px, 100%)` : (campaign.widthPreset === 'compact' ? 900 : campaign.widthPreset === 'wide' ? 1440 : 1280), height: campaign.heightPx ? `${Math.min(1000, campaign.heightPx)}px` : undefined }}>{content}</div></section>;
  const floatingWidthValue = campaign.widthPx ? `min(${Math.min(1600, campaign.widthPx)}px, 94vw)` : floatingWidth;
  if (campaign.placement === 'side-banner') {
    const onStart = floatingPosition.startsWith('start');
    return <aside dir={dir} className={`fixed ${onStart ? 'start-0' : 'end-0'} top-1/2 z-[58] max-w-[94vw] -translate-y-1/2 overflow-hidden border border-line shadow-2xl shadow-black/40 ${anim}`} style={{ width: floatingWidthValue, height: campaign.heightPx ? `min(${campaign.heightPx}px, 82vh)` : undefined, borderRadius: `${Math.max(0, Math.min(40, campaign.borderRadiusPx ?? 16))}px` }}>{content}</aside>;
  }
  if (campaign.placement === 'corner-oblique') {
    const onStart = floatingPosition.startsWith('start');
    const onTop = floatingPosition.endsWith('top');
    return <aside dir={dir} className={`fixed ${onStart ? 'start-0' : 'end-0'} ${onTop ? 'top-20' : 'bottom-20'} z-[58] max-w-[94vw] overflow-hidden border border-line shadow-2xl shadow-black/40 ${anim}`} style={{ width: floatingWidthValue, height: campaign.heightPx ? `min(${campaign.heightPx}px, 60vh)` : undefined, clipPath: onStart ? (onTop ? 'polygon(0 0,100% 0,100% 88%,12% 100%,0 88%)' : 'polygon(0 12%,12% 0,100% 0,100% 100%,0 100%)') : (onTop ? 'polygon(0 0,100% 0,100% 100%,88% 100%,0 88%)' : 'polygon(0 0,100% 0,100% 88%,88% 100%,0 100%)'), borderRadius: `${Math.max(0, Math.min(40, campaign.borderRadiusPx ?? 16))}px` }}>{content}</aside>;
  }
  return <aside dir={dir} className={`fixed ${floatingPositionClass} z-[58] max-w-[94vw] overflow-hidden border border-line shadow-2xl shadow-black/40 ${anim}`} style={{ width: floatingWidthValue, height: campaign.heightPx ? `min(${campaign.heightPx}px, 80vh)` : undefined, borderRadius: `${Math.max(0, Math.min(40, campaign.borderRadiusPx ?? 16))}px` }}>{content}</aside>;
}
