// BLITZ GAMING — toast stack
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useApp } from '../lib/AppContext';

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[90] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? AlertCircle : Info;
          const tone = toast.kind === 'success' ? 'border-emerald-500/40 text-emerald-400' : toast.kind === 'error' ? 'border-red-500/40 text-red-400' : 'border-electric/40 text-electric';
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              className={`pointer-events-auto flex w-full items-center gap-2 rounded-xl border bg-panel/95 px-4 py-2.5 text-[12px] font-semibold text-white shadow-xl backdrop-blur ${tone}`}
            >
              <Icon size={17} className="shrink-0" />
              <span className="text-white/90">{toast.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
