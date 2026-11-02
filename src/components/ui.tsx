// BLITZ GAMING — shared UI atoms
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ size = 18, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger' | 'ghost' | 'violet';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}
export function Button({ variant = 'primary', size = 'md', loading, className = '', children, disabled, ...rest }: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-electric';
  const sizes = { sm: 'h-9 px-3 text-[12px]', md: 'h-11 px-5 text-[13px]', lg: 'h-12 px-7 text-sm' };
  const variants = {
    primary: 'bg-electric text-ink hover:bg-[#33baff]',
    outline: 'border border-line bg-panel2 text-white hover:border-electric hover:text-electric',
    danger: 'bg-red-600 text-white hover:bg-red-500',
    ghost: 'text-white/80 hover:bg-panel2 hover:text-white',
    violet: 'bg-violet-accent text-white hover:bg-[#9d78ff]',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled || loading} {...rest}>
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; hint?: string }
export function Input({ label, error, hint, className = '', ...rest }: FieldProps) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-white/70">{label}</span>}
      <input
        className={`h-11 w-full rounded-xl border bg-panel2 px-3.5 text-[13px] text-white placeholder-mute outline-none transition-colors focus:border-electric ${error ? 'border-red-500/60' : 'border-line'} ${className}`}
        {...rest}
      />
      {error && <span className="mt-1 block text-[11px] font-semibold text-red-400">{error}</span>}
      {hint && !error && <span className="mt-1 block text-[10px] text-mute">{hint}</span>}
    </label>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; error?: string }
export function TextArea({ label, error, className = '', ...rest }: TextAreaProps) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-white/70">{label}</span>}
      <textarea
        className={`min-h-[84px] w-full rounded-xl border bg-panel2 px-3.5 py-3 text-[13px] text-white placeholder-mute outline-none transition-colors focus:border-electric ${error ? 'border-red-500/60' : 'border-line'} ${className}`}
        {...rest}
      />
      {error && <span className="mt-1 block text-[11px] font-semibold text-red-400">{error}</span>}
    </label>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; error?: string }
export function Select({ label, error, className = '', children, ...rest }: SelectProps) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-white/70">{label}</span>}
      <select
        className={`h-11 w-full rounded-xl border bg-panel2 px-3.5 text-[13px] text-white outline-none transition-colors focus:border-electric ${error ? 'border-red-500/60' : 'border-line'} ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-[11px] font-semibold text-red-400">{error}</span>}
    </label>
  );
}

export function StatCard({ label, value, sub, tone = 'electric' }: { label: string; value: ReactNode; sub?: string; tone?: 'electric' | 'violet' | 'emerald' | 'amber' | 'red' }) {
  const tones: Record<string, string> = {
    electric: 'text-electric border-electric/30',
    violet: 'text-violet-accent border-violet-accent/30',
    emerald: 'text-emerald-400 border-emerald-400/30',
    amber: 'text-amber-400 border-amber-400/30',
    red: 'text-red-400 border-red-400/30',
  };
  return (
    <div className={`rounded-2xl border bg-panel p-4 ${tones[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] font-semibold text-mute">{sub}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-panel px-6 py-14 text-center">
      <div className="rounded-2xl border border-line bg-panel2 p-5 text-mute">{icon}</div>
      <p className="text-base font-bold text-white/90">{title}</p>
      {hint && <p className="max-w-sm text-[12px] text-mute">{hint}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h1 className="font-display text-xl font-bold uppercase tracking-wide text-white sm:text-2xl">{children}</h1>
      {sub && <p className="mt-0.5 text-[12px] text-mute">{sub}</p>}
    </div>
  );
}

/** simple in-app modal */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative max-h-[94vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 sm:rounded-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-mute hover:bg-panel2 hover:text-white" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
