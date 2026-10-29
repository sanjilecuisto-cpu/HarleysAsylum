import { validateEntry, filterEntries, mergeImportedEntries } from './library.js';
import { seedEntries } from './seed.js';
import { comicsEntries } from './comics-seed.js';
const $ = s => document.querySelector(s);
const key = 'harleys-asylum-library-v1';
let entries = [], category = 'all', status = 'all', editing = null;
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
  $('#breadcrumb').textContent = category === 'all' ? 'Overview' : category;
  $('#heading').textContent = category === 'all' ? 'Your stories, all together.' : `Your ${category.toLowerCase()} collection.`;
  const shown = filterEntries(entries, category, status, $('#search').value, $('#sort').value);
  $('#result-count').textContent = shown.length; $('#cards').replaceChildren(); $('#empty').hidden = shown.length > 0;
  for (const entry of shown) {
    const card = element('article', 'card');
    const cover = element('div', `cover ${entry.category.toLowerCase()}`);
    cover.append(element('span', 'cover-category', entry.category === 'Books' ? 'THE BOOKSHELF' : entry.category === 'Comics' ? 'ILLUSTRATED WORLDS' : '物語 · MANGA'), element('span', 'cover-art', entry.category === 'Books' ? '✳' : entry.category === 'Comics' ? '✦' : '◉'), element('h3', '', entry.title), element('span', 'cover-author', entry.creator || 'A story waiting for you'));
    const body = element('div', 'card-body'); const meta = element('div', 'card-meta'); meta.append(element('span', 'category-tag', entry.category), element('span', `status ${entry.status === 'Reading' ? 'reading' : entry.status === 'Completed' ? 'done' : ''}`, entry.status));
    body.append(meta, element('h3', 'entry-title', entry.title), element('p', 'creator', entry.creator || 'Unknown creator'));
    const progress = element('div', 'progress'); const bar = element('span', ''); bar.style.width = `${entry.status === 'Completed' ? 100 : entry.total ? entry.progress / entry.total * 100 : 0}%`; progress.append(bar);
    const unit = entry.unit || (entry.category === 'Books' ? 'pages' : entry.category === 'Comics' ? 'issues' : 'chapters');
    body.append(progress, element('p', 'progress-label', `${entry.progress}${entry.total ? ` / ${entry.total}` : ''} ${unit}${entry.progressKind === 'reread' ? ' reread' : ''}`));
    if (entry.category === 'Comics' && entry.comicGeeks) body.append(element('p', 'comic-collection', `${entry.owned ? 'Owned' : 'Not owned'}${entry.wishlisted ? ' · Wishlisted' : ''}${entry.rating !== null ? ` · ★ ${entry.rating}/5` : ''}`));
    if (entry.notes) body.append(element('p', 'notes', entry.notes));
    if (entry.volumes?.length) {
      const details = element('details', 'volume-details');
      details.append(element('summary', '', `Owned volumes (${entry.volumes.length})`));
      const list = element('ul', 'volume-list');
      for (const volume of entry.volumes) list.append(element('li', '', `Vol. ${volume.number} · ${volume.reread ? 'Reread' : 'To reread'}${volume.notes ? ' — ' + volume.notes : ''}`));
      details.append(list, element('p', 'volume-note', 'Volume details reflect the spreadsheet snapshot. Editing the story’s progress updates its overall counter.'));
      body.append(details);
    }
    const actions = element('div', 'card-actions'); const edit = element('button', '', 'Edit story ↗'); edit.addEventListener('click', () => openEditor(entry)); const del = element('button', 'delete', 'Delete'); del.addEventListener('click', () => { if (confirm(`Remove “${entry.title}” from your collection?`)) persist(entries.filter(e => e.id !== entry.id)); }); actions.append(edit, del); body.append(actions); card.append(cover, body); $('#cards').append(card);
  }
}
function openEditor(entry) { editing = entry?.id || null; $('#entry-form').reset(); $('#form-error').textContent = ''; $('#dialog-title').textContent = entry ? 'Edit your story' : 'Add to your collection'; if (entry) for (const name of ['title','creator','category','status','progress','total','notes']) $('#entry-form').elements[name].value = entry[name] ?? ''; else if (category !== 'all') $('#entry-form').elements.category.value = category; $('#entry-form').elements.progress.previousSibling.textContent = entry?.progressKind === 'reread' ? 'Volumes reread' : 'Progress'; $('#entry-form').elements.total.previousSibling.textContent = entry?.unit === 'volumes' ? 'Owned volumes' : 'Total pages / issues / chapters'; $('#editor').showModal(); }
$('#add').onclick = $('#empty-add').onclick = () => openEditor(); $('#close').onclick = $('#cancel').onclick = () => $('#editor').close();
$('#entry-form').onsubmit = event => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); try { const old = entries.find(e => e.id === editing); const entry = validateEntry({ ...old, ...values, id: editing || crypto.randomUUID(), createdAt: old?.createdAt || Date.now(), progress: Number(values.progress), total: values.total === '' ? null : Number(values.total) }); if (persist(editing ? entries.map(e => e.id === editing ? entry : e) : [...entries, entry])) { $('#editor').close(); notify('Your story is saved.'); } } catch (error) { $('#form-error').textContent = error.message; } };
document.querySelectorAll('[data-category]').forEach(button => button.onclick = () => { category = button.dataset.category; document.querySelectorAll('[data-category]').forEach(b => b.classList.toggle('active', b === button)); render(); });
document.querySelectorAll('[data-status]').forEach(button => button.onclick = () => { status = button.dataset.status; document.querySelectorAll('[data-status]').forEach(b => b.classList.toggle('selected', b === button)); render(); });
$('#search').oninput = render; $('#sort').onchange = render; render();
