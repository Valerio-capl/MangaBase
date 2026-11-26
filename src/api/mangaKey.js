// A manga is identified by the pair (source, id).
// Nothing is persisted, the key is always derived from fields already stored with each entry.

const LOCAL_SOURCE = 'local';
const clean = (value) => (value === undefined || value === null ? '' : String(value));

export const resolveSource = (manga) => {
  const source = clean(manga?.source);
  return source === LOCAL_SOURCE ? clean(manga?.originalSource) : source;
};

export const getMangaKey = (manga) => {
  const id = clean(manga?.id);
  const source = resolveSource(manga);
  return source ? `${source}:${id}` : id;
};

export const isSameManga = (a, b) => {
  const idA = clean(a?.id);
  if (!idA || idA !== clean(b?.id)) return false;

  const sourceA = resolveSource(a);
  const sourceB = resolveSource(b);
  // legacy entries saved without a source still match by id alone
  if (!sourceA || !sourceB) return true;
  return sourceA === sourceB;
};