import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useApp } from '../lib/AppContext';

export function FlashIcon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#101016" />
      <rect width="64" height="64" rx="14" fill="none" stroke="#24242c" />
      <path d="M37 8 L18 38 H30.5 L26 56 L46 27 H33.5 Z" fill="url(#lg)" stroke="#00a8ff" strokeWidth="1.4" strokeLinejoin="round" />
      <defs><linearGradient id="lg" x1="18" y1="8" x2="46" y2="56"><stop offset="0" stopColor="#00a8ff" /><stop offset="0.55" stopColor="#2fd6ff" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  const { db } = useApp();
  const ratio = db.store.logoAspectRatio ?? 'square';
  const fit = db.store.logoObjectFit ?? 'contain';
  const dims: Record<string, { width: number; height: number }> = {
    natural: { width: compact ? 30 : 36, height: compact ? 30 : 36 },
    square: { width: compact ? 30 : 36, height: compact ? 30 : 36 },
    wide: { width: compact ? 54 : 68, height: compact ? 30 : 36 },
    landscape: { width: compact ? 42 : 50, height: compact ? 30 : 36 },
    portrait: { width: compact ? 24 : 28, height: compact ? 30 : 36 },
  };
  const size = dims[ratio] ?? dims.square;
  useEffect(() => {
    const href = db.store.faviconUrl?.trim() || '/favicon.svg';
    let icon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; document.head.appendChild(icon); }
    icon.href = href;
    document.title = `${db.store.nameEn?.trim() || 'BLITZ GAMING'} | بلتز قيمنق — Gaming Gear in Palestine`;
  }, [db.store.faviconUrl, db.store.nameEn]);
  return (
    <Link to="/" className="flex min-w-0 shrink items-center gap-1.5 select-none sm:gap-2" aria-label="BLITZ GAMING — home">
      {db.store.logoUrl ? <img src={db.store.logoUrl} alt={db.store.nameEn || 'BLITZ GAMING'} style={{ width: size.width, height: size.height, objectFit: fit }} className="shrink-0 rounded-lg" /> : <FlashIcon size={compact ? 30 : 36} />}
      {!compact && <span className="flex min-w-0 flex-col leading-none"><span className="whitespace-nowrap font-display text-[13px] font-bold tracking-normal text-white min-[390px]:text-[15px] sm:text-[22px] sm:tracking-[0.08em]">BLITZ<span className="text-electric"> GAMING</span></span><span className="mt-0.5 hidden whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.34em] text-mute sm:block">Blitz Gaming · بلتز قيمنق</span></span>}
    </Link>
  );
}
