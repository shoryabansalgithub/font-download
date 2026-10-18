/** Adds https:// to a bare host so "stripe.com" and "https://stripe.com" scan the same page. */
export function normalizeScanUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** "https://www.stripe.com/path" -> "stripe.com"; anything unparseable is shown as typed. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
