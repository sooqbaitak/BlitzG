import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useApp } from '../lib/AppContext';

export function BackToTop() {
  const { lang, dir } = useApp();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 360);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  if (!visible) return null;
  return <button type="button" onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })} aria-label={lang === 'ar' ? 'العودة إلى الأعلى' : lang === 'he' ? 'חזרה למעלה' : 'Back to top'} title={lang === 'ar' ? 'العودة إلى الأعلى' : lang === 'he' ? 'חזרה למעלה' : 'Back to top'} dir={dir} className="fixed bottom-[5.8rem] end-3 z-[55] flex h-11 w-11 items-center justify-center rounded-full border border-electric/50 bg-panel/95 text-electric shadow-xl shadow-black/30 backdrop-blur transition hover:-translate-y-1 hover:bg-electric hover:text-ink md:bottom-6 md:end-6"><ArrowUp size={20} strokeWidth={2.5}/></button>;
}
