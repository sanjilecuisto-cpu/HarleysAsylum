import { validateEntry, filterEntries, mergeImportedEntries, collectionStats, comicSeries, seriesSummary, collectionItems } from './library.js';
import { seedEntries } from './seed.js';
import { comicsEntries } from './comics-seed.js';
const $ = s => document.querySelector(s);
const key = 'harleys-asylum-library-v1';
let entries = [], category = 'all', status = 'all', editing = null;
let pageMode = 'collection', layout = 'grid';
try { layout = localStorage.getItem('harleys-layout') === 'list' ? 'list' : 'grid'; } catch {}
let selectedSeries = null;
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
  const items = collectionItems(entries);
  for (const c of ['Books', 'Comics', 'Manga']) $(`#count-${c}`).textContent = items.filter(e => e.category === c).length;
  const scoped = items.filter(e => category === 'all' || e.category === category);
  $('#total').textContent = scoped.length; $('#reading').textContent = scoped.filter(e => e.status === 'Reading').length; $('#completed').textContent = scoped.filter(e => e.status === 'Completed').length;
  $('.collection').hidden = pageMode !== 'collection';
  $('#series-page').hidden = pageMode !== 'series';
  $('.stats').hidden = pageMode === 'series';
  $('#add').hidden = pageMode === 'series';
  $('#stats-page').hidden = pageMode !== 'stats';
  $('#stats-nav').classList.toggle('active', pageMode === 'stats');
  document.querySelectorAll('[data-category]').forEach(b => b.classList.toggle('active', b.dataset.category === category));
  $('#stats-category').value = category;
  $('#cards').classList.toggle('list-view', layout === 'list');
  $('#grid-view').setAttribute('aria-pressed', String(layout === 'grid'));
  $('#list-view').setAttribute('aria-pressed', String(layout === 'list'));
  $('#breadcrumb').textContent = category === 'all' ? 'Overview' : category;
  $('#heading').textContent = category === 'all' ? 'Your stories, all together.' : `Your ${category.toLowerCase()} collection.`;
  if (pageMode === 'series') { renderSeriesPage(); return; }
  if (pageMode === 'stats') {
    $('#breadcrumb').textContent = `Statistics / ${category === 'all' ? 'All categories' : category}`;
    $('#heading').textContent = category === 'all' ? 'A little perspective on your stories.' : `${category} in numbers.`;
    renderStatistics();
    return;
  }
  const shown = filterEntries(items, category, status, $('#search').value, $('#sort').value);
  $('#result-count').textContent = shown.length;
  $('#cards').replaceChildren(); $('#empty').hidden = shown.length > 0;
  for (const entry of shown) {
    if (!entry.group) { $('#cards').append(renderCard(entry)); continue; }
    const group=entry.group, summary=seriesSummary(group);
    const link=element('a','series-group series-link');link.href=`#series=${encodeURIComponent(group.key)}`;
    const header=element('div','series-summary');const info=element('div','series-info');
    info.append(element('span','series-publisher',group.publisher || 'COMICS'),element('h3','',group.title),element('p','series-counts',`${summary.read} / ${summary.total} owned issues read · ${summary.percent}%`));
    info.append(element('span',`status ${summary.status === 'Completed' ? 'done' : summary.status === 'Reading' ? 'reading' : ''}`,summary.status));
    const progress=element('div','progress');const fill=element('span','');fill.style.width=`${summary.percent}%`;progress.append(fill);info.append(progress);
    header.append(element('span','series-art','✦'),info,element('span','series-chevron','↗'));link.append(header);$('#cards').append(link);
  }
}
function renderSeriesPage() {
  const container=$('#series-page');container.replaceChildren();
  const back=element('a','secondary series-back','← Back to Comics');back.href='#comics';container.append(back);
  const group=comicSeries(entries).find(g=>g.key===selectedSeries);
  if (!group) { $('#heading').textContent='Series not found.';container.append(element('p','stats-explainer','This series may have been renamed or removed. Return to Comics to browse your collection.'));return; }
  $('#heading').textContent=group.title;$('#breadcrumb').textContent=`Comics / ${group.title}`;
  const summary=seriesSummary(group);
  const addIssue=element('button','primary series-add-issue','＋ Add owned issue');addIssue.onclick=()=>{openEditor();const form=$('#entry-form');form.elements.category.value='Comics';form.elements.series.value=group.key;syncSeriesPublisher();form.elements.publisher.value=group.publisher;form.elements.owned.checked=true;form.elements.total.value=1;$('#comic-fields').hidden=false;};container.append(addIssue);
  const metadata=element('section','series-overview');metadata.append(element('h2','','About this series'));
  const formats=[...new Set(group.entries.map(e=>e.comicGeeks?.I).filter(Boolean))];
  const dates=group.entries.map(e=>e.releaseDate || e.comicGeeks?.D).filter(Boolean).sort();
  for(const [label,value] of [['Publisher',group.publisher || 'Not provided'],['Series / run',group.title],['Format',formats.join(', ') || 'Not provided'],['Release dates in your data',dates.length ? `${dates[0]} – ${dates.at(-1)}` : 'Not provided'],['Owned issues / variants',summary.total],['Wishlist entries',group.entries.filter(e=>e.wishlisted).length]]) {
    const row=element('div','stat-detail');row.append(element('span','',label),element('strong','',String(value)));metadata.append(row);
  }
  const completion=element('section','series-completion');completion.append(element('h2','','Series completion'),element('strong','completion-number',`${summary.read} / ${summary.total}`),element('p','stats-explainer',`${summary.percent}% · read issues / owned issues. Each owned variant is counted separately.`));
  const progress=element('div','progress');const fill=element('span','');fill.style.width=`${summary.percent}%`;progress.append(fill);completion.append(progress);
  const overview=element('div','series-page-overview');overview.append(metadata,completion);container.append(overview,element('h2','owned-issues-title',`Owned issues (${summary.total})`));
  const issues=element('div','owned-issue-list');
  if (!summary.total) issues.append(element('p','stats-explainer','No owned issues yet. Wishlist and unowned entries do not count toward completion.'));
  for(const entry of summary.owned) {
    const issue=element('article','owned-issue');issue.append(element('h3','',entry.title));
    const variant=entry.variant || entry.title.match(/#\d+(?:\.\d+)?\s+(.+)$/)?.[1] || 'Cover A';
    const date=entry.releaseDate || entry.comicGeeks?.D || 'Not provided';
    const data=element('dl','issue-data');
    for(const [label,value] of [['Variant / cover',variant],['Release date',date],['Reading status',entry.status === 'Completed' ? 'Read' : entry.status === 'Reading' ? 'Reading' : 'Not read'],['Rating',typeof entry.rating === 'number' ? `${entry.rating} / 5` : 'Not rated']]) { data.append(element('dt','',label),element('dd','',value)); }
    const actions=element('div','issue-actions');const toggle=element('button','secondary',entry.status==='Completed' ? 'Mark unread' : 'Mark read');
    toggle.onclick=()=>persist(entries.map(e=>e.id===entry.id ? {...e,status:entry.status==='Completed' ? 'Want to read' : 'Completed',progress:entry.status==='Completed' ? 0 : (entry.total || 1)} : e));
    const edit=element('button','secondary','Edit issue');edit.onclick=()=>openEditor(entry);actions.append(toggle,edit);issue.append(data,actions);issues.append(issue);
  }
  container.append(issues);
  const unowned=group.entries.filter(e=>e.owned!==true);
  if(unowned.length) {
    const other=element('details','unowned-issues');other.append(element('summary','',`Other tracked issues (${unowned.length}) · not counted toward completion`));
    const list=element('div','series-issues');for(const entry of unowned)list.append(renderCard(entry));other.append(list);container.append(other);
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
function openEditor(entry) {
  editing=entry?.id || null;const form=$('#entry-form');form.reset();$('#form-error').textContent='';$('#dialog-title').textContent=entry ? 'Edit your story' : 'Add to your collection';
  populateSeries(entry);
  $('#new-series-panel').hidden=true;$('#new-series').setAttribute('aria-expanded','false');$('#new-series-error').textContent='';
  if(entry) for(const name of ['title','creator','publisher','category','status','progress','total','notes']) form.elements[name].value=entry[name] ?? '';
  else if(category!=='all') form.elements.category.value=category;
  form.elements.releaseDate.value=entry?.releaseDate || entry?.comicGeeks?.D || '';
  form.elements.variant.value=entry?.variant || entry?.title.match(/#\d+(?:\.\d+)?\s+(.+)$/)?.[1] || 'Cover A';
  form.elements.owned.checked=entry?.owned === true;
  form.elements.progress.previousSibling.textContent=entry?.progressKind === 'reread' ? 'Volumes read' : 'Progress';
  form.elements.total.previousSibling.textContent=entry?.unit === 'volumes' ? 'Owned volumes' : 'Total pages / issues / chapters';
  syncSeriesPublisher();$('#comic-fields').hidden=form.elements.category.value!=='Comics';$('#editor').showModal();
}
$('#entry-form').elements.category.onchange=event=>{ $('#comic-fields').hidden=event.target.value!=='Comics'; };

$('#add').onclick = $('#empty-add').onclick = () => openEditor(); $('#close').onclick = $('#cancel').onclick = () => $('#editor').close();
$('#entry-form').onsubmit = event => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const selected=form.elements.series.selectedOptions[0];values.series=selected?.dataset.series || '';if(values.category==='Comics' && values.series)values.publisher=selected.dataset.publisher || '';try { const old = entries.find(e => e.id === editing); const entry = validateEntry({ ...old, ...values, ...(values.category === 'Comics' ? {owned:form.elements.owned.checked,unit:'issue'} : {owned:old?.owned}), id: editing || crypto.randomUUID(), createdAt: old?.createdAt || Date.now(), progress: Number(values.progress), total: values.total === '' ? null : Number(values.total) }); if (persist(editing ? entries.map(e => e.id === editing ? entry : e) : [...entries, entry])) { $('#editor').close(); notify('Your story is saved.'); } } catch (error) { $('#form-error').textContent = error.message; } };
document.querySelectorAll('[data-category]').forEach(button => button.onclick = () => { category = button.dataset.category; if(pageMode==='series')pageMode='collection';selectedSeries=null;history.replaceState(null,'',location.pathname+location.search);render(); });
document.querySelectorAll('[data-status]').forEach(button => button.onclick = () => { status = button.dataset.status; document.querySelectorAll('[data-status]').forEach(b => b.classList.toggle('selected', b === button)); render(); });
$('#search').oninput = render; $('#sort').onchange = render;

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
$('#stats-nav').onclick = () => { selectedSeries=null;history.replaceState(null,'',location.pathname+location.search);pageMode = pageMode === 'stats' ? 'collection' : 'stats'; render(); };
$('#stats-category').onchange = event => { category = event.target.value; render(); };
for (const [id,value] of [['grid-view','grid'],['list-view','list']]) $("#"+id).onclick = () => { layout=value;try { localStorage.setItem('harleys-layout',layout); } catch {} render(); };

$('#back-collection').onclick = () => { pageMode = 'collection'; render(); };

function readRoute() {
  const match=location.hash.match(/^#series=(.*)$/);
  if(match) { try { selectedSeries=decodeURIComponent(match[1]); } catch { selectedSeries=null; } category='Comics';pageMode='series'; }
  else { selectedSeries=null;pageMode='collection';if(location.hash==='#comics')category='Comics'; }
  render();
}
window.addEventListener('hashchange',readRoute);
readRoute();

function populateSeries(entry) {
  const select=$('#series-select');select.replaceChildren(new Option('Choose a series…',''));
  const groups=comicSeries(entries).filter(g=>!g.key.startsWith('standalone:')).sort((a,b)=>a.title.localeCompare(b.title));
  for(const group of groups) {
    const option=new Option(`${group.title}${group.publisher ? ' — '+group.publisher : ''}`,group.key);
    option.dataset.series=group.title;option.dataset.publisher=group.publisher;select.append(option);
    if(entry?.series?.trim()===group.title && (entry.publisher || '')===group.publisher)select.value=group.key;
  }
}
function syncSeriesPublisher() {
  const form=$('#entry-form'),option=form.elements.series.selectedOptions[0];
  if(option?.dataset.series)form.elements.publisher.value=option.dataset.publisher || '';
  form.elements.publisher.readOnly=Boolean(option?.dataset.series);
}
$('#series-select').onchange=syncSeriesPublisher;
function closeSeriesCreator() { $('#new-series-panel').hidden=true;$('#new-series').setAttribute('aria-expanded','false');$('#series-select').focus(); }
$('#new-series').onclick=()=>{
  const panel=$('#new-series-panel');panel.hidden=!panel.hidden;$('#new-series').setAttribute('aria-expanded',String(!panel.hidden));
  if(!panel.hidden){$('#new-series-name').value='';$('#new-series-publisher').value='';$('#new-series-error').textContent='';$('#new-series-name').focus();}
};
$('#cancel-series').onclick=closeSeriesCreator;
$('#create-series').onclick=()=>{
  const title=$('#new-series-name').value.trim(),publisher=$('#new-series-publisher').value.trim();
  if(!title){$('#new-series-error').textContent='Enter a series name.';$('#new-series-name').focus();return;}
  const select=$('#series-select');
  let option=[...select.options].find(o=>o.dataset.series?.toLocaleLowerCase()===title.toLocaleLowerCase() && (o.dataset.publisher || '').toLocaleLowerCase()===publisher.toLocaleLowerCase());
  if(!option){option=new Option(`${title}${publisher ? ' — '+publisher : ''}`,`${publisher}\u0000${title}`);option.dataset.series=title;option.dataset.publisher=publisher;select.append(option);}
  select.value=option.value;syncSeriesPublisher();closeSeriesCreator();
};
