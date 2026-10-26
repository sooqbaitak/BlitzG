/** Calls the hosting provider API function to email the configured store owner. */
export async function notifyAdminOfNewOrder(orderNumber: string): Promise<void> {
  const response = await fetch('/api/order-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber }),
  });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || `Email notification failed (${response.status})`);
}
