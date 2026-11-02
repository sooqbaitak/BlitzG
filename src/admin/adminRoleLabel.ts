export function roleLabel(role: string, ar: boolean, he = false): string {
  const labels: Record<string, { en: string; ar: string; he: string }> = {
    owner: { en: 'Owner', ar: 'مالك', he: 'בעלים' },
    manager: { en: 'Manager', ar: 'مدير', he: 'מנהל' },
    staff: { en: 'Staff', ar: 'موظف', he: 'צוות' },
  };
  return ar ? labels[role]?.ar ?? role : he ? labels[role]?.he ?? role : labels[role]?.en ?? role;
}
