/** Resolve administrator-configured links without allowing script/data URL schemes. */
export type SafeLink = { kind: 'external' | 'internal'; href: string };

export function resolveSafeLink(raw: string | null | undefined): SafeLink | null {
  const value = String(raw ?? '').trim();
  if (!value || value.startsWith('//') || value.includes('\\')) return null;

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      return { kind: 'external', href: url.href };
    } catch {
      return null;
    }
  }

  // App navigation must be a root-relative route; reject javascript:, data:, mailto:, etc.
  if (value.startsWith('/') && !/^\/\//.test(value) && !/^[a-z][a-z\d+.-]*:/i.test(value)) {
    return { kind: 'internal', href: value };
  }
  return null;
}

export function safeHttpUrl(raw: string | null | undefined): string | null {
  const resolved = resolveSafeLink(raw);
  return resolved?.kind === 'external' ? resolved.href : null;
}
