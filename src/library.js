export function validateEntry(entry) {
  if (!entry.title.trim()) throw new Error('Please enter a title.');
  if (!['Books', 'Comics', 'Manga'].includes(entry.category)) throw new Error('Choose a category.');
  if (!['Want to read', 'Reading', 'Completed'].includes(entry.status)) throw new Error('Choose a status.');
  if (!Number.isInteger(entry.progress) || entry.progress < 0 || entry.progress > 100000) throw new Error('Enter a valid progress number.');
  if (entry.total !== null && (!Number.isInteger(entry.total) || entry.total < 1 || entry.total > 100000)) throw new Error('Enter a valid total.');
  if (entry.total !== null && entry.progress > entry.total) throw new Error('Progress cannot exceed the total.');
  return { ...entry, title: entry.title.trim(), progress: entry.status === 'Completed' && entry.total !== null ? entry.total : entry.progress };
}
export function filterEntries(entries, category, status, search, sort) {
  return entries.filter(e => (category === 'all' || e.category === category) && (status === 'all' || e.status === status) && `${e.title} ${e.creator} ${e.series || ''} ${e.publisher || ''}`.toLowerCase().includes(search.toLowerCase())).sort((a,b) => sort === 'title' ? a.title.localeCompare(b.title) : b.createdAt - a.createdAt);
}

export function mergeImportedEntries(existing, incoming) {
  const identity = e => [e.category, e.title.trim().toLocaleLowerCase(), (e.creator || '').trim().toLocaleLowerCase()].join('\u0000');
  const ids = new Set(existing.map(e => e.id));
  const identities = new Set(existing.map(identity));
  const additions = incoming.filter(e => {
    if (ids.has(e.id) || identities.has(identity(e))) return false;
    ids.add(e.id); identities.add(identity(e)); return true;
  });
  return [...existing, ...additions];
}
