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

export function collectionStats(entries, category = 'all') {
  const raw = entries.filter(e => category === 'all' || e.category === category);
  const scoped = collectionItems(raw);
  const statuses = Object.fromEntries(['Want to read', 'Reading', 'Completed'].map(s => [s, scoped.filter(e => e.status === s).length]));
  const categories = Object.fromEntries(['Books', 'Comics', 'Manga'].map(c => [c, scoped.filter(e => e.category === c).length]));
  const ratings = raw.map(e => e.rating).filter(r => typeof r === 'number' && Number.isFinite(r));
  const progress = {};
  for (const e of raw.filter(e => e.category !== 'Comics' || e.owned === true)) {
    const unit = e.unit === 'issue' ? 'issues' : e.unit || (e.category === 'Books' ? 'pages' : e.category === 'Comics' ? 'issues' : 'chapters');
    const label = `${unit} read`;
    if (!progress[label]) progress[label] = { current: 0, total: 0, unknownTotals: 0 };
    progress[label].current += e.progress;
    if (e.total !== null) progress[label].total += e.total;
    else progress[label].unknownTotals++;
  }
  return { total: scoped.length, statuses, categories, progress, owned: raw.reduce((sum,e) => sum + (typeof e.owned === 'number' ? e.owned : e.owned === true ? 1 : 0), 0), ownershipUnknown: raw.filter(e => e.owned === undefined).length, wishlisted: raw.filter(e => e.wishlisted === true).length, ratingCount: ratings.length, averageRating: ratings.length ? ratings.reduce((a,b) => a+b,0) / ratings.length : null, completion: scoped.length ? Math.round(statuses.Completed / scoped.length * 100) : 0 };
}

export function seriesSummary(group) {
  const owned = group.entries.filter(e => e.owned === true);
  const read = owned.filter(e => e.status === 'Completed').length;
  return { owned, read, total: owned.length, percent: owned.length ? Math.round(read / owned.length * 100) : 0, status: owned.length && read === owned.length ? 'Completed' : owned.some(e => e.status === 'Reading') || read > 0 ? 'Reading' : 'Want to read' };
}

export function comicSeries(entries) {
  return groupComics(entries.filter(e => e.category === 'Comics')).map(g => g.type === 'series' ? g : { type: 'series', key: `standalone:${g.entry.id}`, title: g.entry.title, publisher: g.entry.publisher || '', entries: [g.entry] });
}

export function collectionItems(entries) {
  return [...entries.filter(e => e.category !== 'Comics'), ...comicSeries(entries).map(group => {
    const summary = seriesSummary(group);
    return { id: group.key, title: group.title, creator: '', category: 'Comics', series: group.title, publisher: group.publisher, status: summary.status, progress: summary.read, total: summary.total, owned: summary.total, unit: 'issues', createdAt: Math.max(...group.entries.map(e => e.createdAt || 0)), group };
  })];
}

export function groupComics(entries) {
  const groups = [], bySeries = new Map();
  for (const entry of entries) {
    if (entry.category !== 'Comics' || !entry.series?.trim()) {
      groups.push({ type: 'entry', entry });
      continue;
    }
    const key = `${entry.publisher || ''}\u0000${entry.series.trim()}`;
    let group = bySeries.get(key);
    if (!group) {
      group = { type: 'series', key, title: entry.series.trim(), publisher: entry.publisher || '', entries: [] };
      bySeries.set(key, group); groups.push(group);
    }
    group.entries.push(entry);
  }
  for (const group of bySeries.values()) group.entries.sort((a,b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
  return groups;
}
