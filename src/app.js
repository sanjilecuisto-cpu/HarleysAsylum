import { validateEntry, filterEntries, mergeImportedEntries, collectionStats, groupComics } from './library.js';
import { seedEntries } from './seed.js';
import { comicsEntries } from './comics-seed.js';
const $ = s => document.querySelector(s);
const key = 'harleys-asylum-library-v1';
let entries = [], category = 'all', status = 'all', editing = null;
let pageMode = 'collection', layout = 'grid';
try { layout = localStorage.getItem('harleys-layout') === 'list' ? 'list' : 'grid'; } catch {}
const expandedSeries = new Set();
let storageLoaded = false;
try { const saved = JSON.parse(localStorage.getItem(key) || '[]'); if (!Array.isArray(saved)) throw Error(); entries = saved.map(validateEntry); storageLoaded = true; } catch { notify('Saved collection could not be loaded. Your original data has not been changed.'); }
if (storageLoaded) {
  try {
    for (const [importedKey, incoming] of [['harleys-asylum-sheet-import-v1', seedEntries], ['harleys-asylum-comicgeeks-import-v1', comicsEntries]]) {
    if (!localStorage.getItem(importedKey)) {
      const merged = mergeImportedEntries(entries, incoming.map(validateEntry));
      localStorage.setItem(key, JSON.stringify(merged));
      localStorage.setItem(importedKey, 'done');
      const added = merged.length - entries.length;
      entries = merged;
      if (added) notify(`Imported ${added} stories from your spreadsheet.`);
    }
    }
  } catch { notify('Spreadsheet import could not be saved. Please check browser storage settings.'); }
}
function notify(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); setTimeout(() => $('#toast').classList.remove('visible'), 4500); }
function persist(next) { if (!storageLoaded) { notify('Saving is disabled to protect your unreadable saved collection.'); return false; } try { localStorage.setItem(key, JSON.stringify(next)); entries = next; render(); return true; } catch { notify('Unable to save. Please check your browser storage settings.'); return false; } }
function element(tag, cls, text) { const e = document.createElement(tag); e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function render() {
  for (const c of ['Books', 'Comics', 'Manga']) $(`#count-${c}`).textContent = entries.filter(e => e.category === c).length;
  const scoped = entries.filter(e => category === 'all' || e.category === category);
  $('#total').textContent = scoped.length; $('#reading').textContent = scoped.filter(e => e.status === 'Reading').length; $('#completed').textContent = scoped.filter(e => e.status === 'Completed').length;
  $('.collection').hidden = pageMode === 'stats';
  $('#stats-page').hidden = pageMode !== 'stats';
  $('#stats-nav').classList.toggle('active', pageMode === 'stats');
  document.querySelectorAll('[data-category]').forEach(b => b.classList.toggle('active', b.dataset.category === category));
  $('#stats-category').value = category;
  $('#cards').classList.toggle('list-view', layout === 'list');
  $('#grid-view').setAttribute('aria-pressed', String(layout === 'grid'));
  $('#list-view').setAttribute('aria-pressed', String(layout === 'list'));
  $('#breadcrumb').textContent = category === 'all' ? 'Overview' : category;
  $('#heading').textContent = category === 'all' ? 'Your stories, all together.' : `Your ${category.toLowerCase()} collection.`;
  if (pageMode === 'stats') {
    $('#breadcrumb').textContent = `Statistics / ${category === 'all' ? 'All categories' : category}`;
    $('#heading').textContent = category === 'all' ? 'A little perspective on your stories.' : `${category} in numbers.`;
    renderStatistics();
    return;
  }
  const shown = filterEntries(entries, category, status, $('#search').value, $('#sort').value);
  $('#result-count').textContent = shown.length; $('#cards').replaceChildren(); $('#empty').hidden = shown.length > 0;
  const groups = groupComics(shown);
  if ($('#sort').value === 'title') groups.sort((a,b) => (a.title || a.entry.title).localeCompare(b.title || b.entry.title));
  const seriesCount = groups.filter(g => g.type === 'series').length;
  $('#result-count').textContent = seriesCount ? `${seriesCount} series · ${shown.length} entries` : shown.length;
  for (const group of groups) {
    if (group.type === 'entry') { $('#cards').append(renderCard(group.entry)); continue; }
    const details = element('details', 'series-group');
    details.open = expandedSeries.has(group.key);
    details.addEventListener('toggle', () => { if (details.open) expandedSeries.add(group.key); else expandedSeries.delete(group.key); });
    const summary = element('summary', 'series-summary');
    const art = element('span', 'series-art', '✦');
    const info = element('div', 'series-info');
    info.append(element('span', 'series-publisher', group.publisher || 'COMICS'), element('h3', '', group.title));
    const allIssues = entries.filter(e => e.category === 'Comics' && `${e.publisher || ''}\u0000${e.series?.trim()}` === group.key);
    const read = allIssues.filter(e => e.status === 'Completed').length;
    const owned = allIssues.filter(e => e.owned === true).length;
    const wishlisted = allIssues.filter(e => e.wishlisted === true).length;
    info.append(element('p', 'series-counts', `${allIssues.length} entries · ${read} read · ${owned} owned${wishlisted ? ` · ${wishlisted} wishlisted` : ''}`));
    if (group.entries.length !== allIssues.length) info.append(element('p', 'series-matches', `${group.entries.length} matching current filters`));
    const progress = element('div', 'progress'); const fill = element('span', ''); fill.style.width = `${read / allIssues.length * 100}%`; progress.append(fill); info.append(progress);
    summary.append(art, info, element('span', 'series-chevron', '⌄'));
    const issues = element('div', 'series-issues');
    for (const entry of group.entries) issues.append(renderCard(entry));
    details.append(summary, issues); $('#cards').append(details);
  }
}
function renderCard(entry) {
    const card = element('article', 'card');
    const cover = element('div', `cover ${entry.category.toLowerCase()}`);
    cover.append(element('span', 'cover-category', entry.category === 'Books' ? 'THE BOOKSHELF' : entry.category === 'Comics' ? 'ILLUSTRATED WORLDS' : '物語 · MANGA'), element('span', 'cover-art', entry.category === 'Books' ? '✳' : entry.category === 'Comics' ? '✦' : '◉'), element('h3', '', entry.title), element('span', 'cover-author', entry.creator || 'A story waiting for you'));
    const body = element('div', 'card-body'); const meta = element('div', 'card-meta'); meta.append(element('span', 'category-tag', entry.category), element('span', `status ${entry.status === 'Reading' ? 'reading' : entry.status === 'Completed' ? 'done' : ''}`, entry.status));
    body.append(meta, element('h3', 'entry-title', entry.title), element('p', 'creator', entry.creator || 'Unknown creator'));
    const progress = element('div', 'progress'); const bar = element('span', ''); bar.style.width = `${entry.status === 'Completed' ? 100 : entry.total ? entry.progress / entry.total * 100 : 0}%`; progress.append(bar);
    const unit = entry.unit || (entry.category === 'Books' ? 'pages' : entry.category === 'Comics' ? 'issues' : 'chapters');
    body.append(progress, element('p', 'progress-label', `${entry.progress}${entry.total ? ` / ${entry.total}` : ''} ${unit}${entry.progressKind === 'reread' ? ' read' : ''}`));
    if (entry.category === 'Comics' && entry.comicGeeks) body.append(element('p', 'comic-collection', `${entry.owned ? 'Owned' : 'Not owned'}${entry.wishlisted ? ' · Wishlisted' : ''}${entry.rating !== null ? ` · ★ ${entry.rating}/5` : ''}`));
    if (entry.notes) body.append(element('p', 'notes', entry.notes));
    if (entry.volumes?.length) {
      const details = element('details', 'volume-details');
      details.append(element('summary', '', `Owned volumes (${entry.volumes.length})`));
      const list = element('ul', 'volume-list');
      for (const volume of entry.volumes) list.append(element('li', '', `Vol. ${volume.number} · ${volume.reread ? 'Read' : 'To read'}${volume.notes ? ' — ' + volume.notes : ''}`));
      details.append(list, element('p', 'volume-note', 'Volume details reflect the spreadsheet snapshot. Editing the story’s progress updates its overall counter.'));
      body.append(details);
    }
    const actions = element('div', 'card-actions'); const edit = element('button', '', 'Edit story ↗'); edit.addEventListener('click', () => openEditor(entry)); const del = element('button', 'delete', 'Delete'); del.addEventListener('click', () => { if (confirm(`Remove “${entry.title}” from your collection?`)) persist(entries.filter(e => e.id !== entry.id)); }); actions.append(edit, del); body.append(actions); card.append(cover, body); return card;
}
function openEditor(entry) { editing = entry?.id || null; $('#entry-form').reset(); $('#form-error').textContent = ''; $('#dialog-title').textContent = entry ? 'Edit your story' : 'Add to your collection'; if (entry) for (const name of ['title','creator','series','category','status','progress','total','notes']) $('#entry-form').elements[name].value = entry[name] ?? ''; else if (category !== 'all') $('#entry-form').elements.category.value = category; $('#entry-form').elements.progress.previousSibling.textContent = entry?.progressKind === 'reread' ? 'Volumes read' : 'Progress'; $('#entry-form').elements.total.previousSibling.textContent = entry?.unit === 'volumes' ? 'Owned volumes' : 'Total pages / issues / chapters'; $('#editor').showModal(); }
$('#add').onclick = $('#empty-add').onclick = () => openEditor(); $('#close').onclick = $('#cancel').onclick = () => $('#editor').close();
$('#entry-form').onsubmit = event => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); try { const old = entries.find(e => e.id === editing); const entry = validateEntry({ ...old, ...values, id: editing || crypto.randomUUID(), createdAt: old?.createdAt || Date.now(), progress: Number(values.progress), total: values.total === '' ? null : Number(values.total) }); if (persist(editing ? entries.map(e => e.id === editing ? entry : e) : [...entries, entry])) { $('#editor').close(); notify('Your story is saved.'); } } catch (error) { $('#form-error').textContent = error.message; } };
document.querySelectorAll('[data-category]').forEach(button => button.onclick = () => { category = button.dataset.category; render(); });
document.querySelectorAll('[data-status]').forEach(button => button.onclick = () => { status = button.dataset.status; document.querySelectorAll('[data-status]').forEach(b => b.classList.toggle('selected', b === button)); render(); });
$('#search').oninput = render; $('#sort').onchange = render; render();

function renderStatistics() {
  const stats = collectionStats(entries, category);
  $('#stats-metrics').replaceChildren();
  for (const [label,value,note] of [['Collection entries',stats.total,'In the selected category'],['Completion',`${stats.completion}%`,'Entries marked completed'],['Owned items',stats.owned.toLocaleString(),'Known owned volumes and issues'],['Wishlisted',stats.wishlisted,'Explicitly marked in your data']]) {
    const metric=element('article','metric');metric.append(element('span','',label),element('strong','',value),element('small','',note));$('#stats-metrics').append(metric);
  }
  function chart(target, values) {
    const container=$(target);container.replaceChildren();
    for (const [label,count] of Object.entries(values)) {
      const row=element('div','chart-row');const text=element('div','chart-label');text.append(element('span','',label),element('strong','',String(count)));
      const track=element('div','chart-track');const fill=element('div','chart-fill');fill.style.width=`${stats.total ? count / stats.total * 100 : 0}%`;track.append(fill);row.append(text,track);container.append(row);
    }
    if (!stats.total) container.append(element('p','stats-explainer','No entries in this category yet.'));
  }
  chart('#status-chart',stats.statuses);chart('#category-chart',stats.categories);
  $('#unit-progress').replaceChildren();
  for (const [label,progress] of Object.entries(stats.progress)) {
    const row=element('div','stat-detail');row.append(element('span','',label),element('strong','',`${progress.current.toLocaleString()} / ${progress.total.toLocaleString()}${progress.unknownTotals ? ' + unknown totals' : ''}`));$('#unit-progress').append(row);
  }
  if (!Object.keys(stats.progress).length) $('#unit-progress').append(element('p','stats-explainer','Add a story to start tracking your progress.'));
  $('#stats-details').replaceChildren();
  for (const [label,value] of [['Average rating',stats.averageRating === null ? 'No ratings yet' : `${stats.averageRating.toFixed(2)} / 5`],['Rated entries',stats.ratingCount],['Entries with unknown ownership',stats.ownershipUnknown],['Want to read',stats.statuses['Want to read']]]) {
    const row=element('div','stat-detail');row.append(element('span','',label),element('strong','',String(value)));$('#stats-details').append(row);
  }
}
$('#stats-nav').onclick = () => { pageMode = pageMode === 'stats' ? 'collection' : 'stats'; render(); };
$('#stats-category').onchange = event => { category = event.target.value; render(); };
for (const [id,value] of [['grid-view','grid'],['list-view','list']]) $("#"+id).onclick = () => { layout=value;try { localStorage.setItem('harleys-layout',layout); } catch {} render(); };

$('#back-collection').onclick = () => { pageMode = 'collection'; render(); };
