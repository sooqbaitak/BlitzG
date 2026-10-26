import { useEffect, useRef } from 'react';
import { fetchCloudOrders } from '../lib/cloud';
import { getAdminSession } from '../lib/db';

/** Works while the authorized admin dashboard is open; a true background push service needs a push worker/provider. */
export function OrderNotificationWatcher({ enabled, sound }: { enabled: boolean; sound: boolean }) {
  const knownNumbers = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    let alive = true;
    const poll = async () => {
      const session = getAdminSession();
      if (!session?.accessToken) return;
      try {
        const orders = await fetchCloudOrders(session.accessToken, true);
        if (!alive) return;
        const known = knownNumbers.current;
        if (!known) { knownNumbers.current = new Set(orders.map((o) => o.number)); return; }
        const newOrders = orders.filter((o) => !known.has(o.number));
        orders.forEach((o) => known.add(o.number));
        for (const order of newOrders.slice(0, 5)) {
          const notice = new Notification(`New BLITZ order ${order.number}`, { body: `${order.customerName || 'Customer'} · ₪${Number(order.total || 0).toFixed(2)} · ${order.items?.length ?? 0} line(s)`, icon: '/favicon.svg', tag: `blitz-order-${order.number}` });
          notice.onclick = () => { window.focus(); window.location.hash = '/admin/orders'; notice.close(); };
          if (sound && 'AudioContext' in window) {
            try { const Ctx = window.AudioContext; const ctx = new Ctx(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = 880; gain.gain.value = 0.04; osc.start(); osc.stop(ctx.currentTime + .12); osc.onended = () => void ctx.close(); } catch { /* browser may block sound until a user gesture */ }
          }
        }
      } catch (error) { console.warn('Order notification polling failed:', error); }
    };
    void poll(); const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void poll(); }, 20000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [enabled, sound]);
  return null;
}
