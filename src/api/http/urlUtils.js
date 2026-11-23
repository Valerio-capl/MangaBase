// URL utility helpers

export function getHost(url) {
  const m = (url || '').match(/^https?:\/\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : '';
}

export function isDataUri(value) {
  return (value || '').trimStart().toLowerCase().startsWith('data:');
}

export function fixUrl(url, baseUrl) {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;
  if (isDataUri(trimmed)) return null;
  if (trimmed.toLowerCase().startsWith('javascript:')) return null;
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  const base = (baseUrl || '').replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

export function shortenUrl(url, max = 80) {
  if (!url || url.length <= max) return url;
  return url.slice(0, max) + '…';
}
