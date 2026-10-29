import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEntry, filterEntries, mergeImportedEntries, collectionStats, groupComics, comicSeries, seriesSummary, collectionItems } from './library.js';
import { seedEntries } from './seed.js';
import { comicsEntries } from './comics-seed.js';
const entry = { title:' Dune ', creator:'Frank Herbert', category:'Books', status:'Reading', progress:20, total:100, createdAt:1 };
test('validates progress and normalizes completed stories', () => {
  assert.equal(validateEntry(entry).title, 'Dune');
  assert.equal(validateEntry({...entry,status:'Completed'}).progress,100);
  assert.throws(() => validateEntry({...entry,progress:101}), /exceed/);
  assert.throws(() => validateEntry({...entry,title:' '}), /title/);
  assert.throws(() => validateEntry({...entry,progress:-1}), /progress/);
  assert.equal(validateEntry({...entry,total:null}).total,null);
});
test('combines category, status and creator search without mutating collection', () => {
  const entries = [entry,{...entry,title:'Akira',creator:'Katsuhiro Otomo',category:'Manga',createdAt:2}];
  assert.equal(filterEntries(entries,'Manga','Reading','otomo','newest')[0].title,'Akira');
  assert.equal(filterEntries(entries,'Comics','all','','newest').length,0);
  assert.equal(filterEntries(entries,'all','Completed','','newest').length,0);
  assert.equal(filterEntries(entries,'all','all','','newest')[0].title,'Akira');
  assert.equal(entries[0].title,' Dune ');
});

test('spreadsheet import preserves editions, owned volumes and read counts', () => {
  assert.equal(seedEntries.length, 242);
  assert.equal(new Set(seedEntries.map(e => e.id)).size, 242);
  assert.equal(seedEntries.reduce((sum,e) => sum + e.total, 0), 1215);
  assert.equal(seedEntries.reduce((sum,e) => sum + e.progress, 0), 454);
  assert.equal(seedEntries.filter(e => e.category === 'Books').length, 3);
  assert.equal(seedEntries.filter(e => e.category === 'Manga').length, 239);
  for (const e of seedEntries) {
    assert.deepEqual(validateEntry(e), e);
    assert.equal(e.volumes.length, e.total);
    assert.equal(e.volumes.filter(v => v.reread).length, e.progress);
    assert.equal(e.unit, 'volumes');
  }
  assert.equal(new Set(seedEntries.map(e => e.title)).size, 242);
});

test('import is repeatable and preserves existing edits and matching stories', () => {
  const edited = {...seedEntries[0], notes:'My own notes', progress:0, status:'Want to read'};
  const custom = {...entry,id:'custom',title:'My own book'};
  const result = mergeImportedEntries([edited,custom],seedEntries);
  assert.equal(result.length,243);
  assert.equal(result[0],edited);
  assert.equal(result[1],custom);
  assert.deepEqual(mergeImportedEntries(result,seedEntries),result);
  const sameStory = {...seedEntries[0], id:'previously-added'};
  assert.equal(mergeImportedEntries([sameStory],seedEntries).length,242);
});

test('Comic Geeks import preserves issue variants and independent collection flags', () => {
  assert.equal(comicsEntries.length,419);
  assert.equal(new Set(comicsEntries.map(e => e.id)).size,419);
  assert.equal(comicsEntries.filter(e => e.owned).length,396);
  assert.equal(comicsEntries.filter(e => e.wishlisted).length,21);
  assert.equal(comicsEntries.filter(e => e.status === 'Completed').length,280);
  for (const e of comicsEntries) {
    assert.deepEqual(validateEntry(e),e);
    assert.equal(e.category,'Comics');
    assert.equal(e.title,e.comicGeeks.C);
    assert.equal(e.progress,Number(e.comicGeeks.G));
    assert.equal(e.creator,'');
  }
  const combined=mergeImportedEntries(seedEntries,comicsEntries);
  assert.equal(combined.length,661);
  assert.deepEqual(mergeImportedEntries(combined,comicsEntries),combined);
  assert.equal(filterEntries(comicsEntries,'Comics','all','DC Comics','title').every(e => e.publisher === 'DC Comics'),true);
});

test('statistics separate units, reading, known ownership, ratings and category scopes', () => {
  const all=[...seedEntries,...comicsEntries];
  const stats=collectionStats(all);
  assert.equal(stats.total,351);
  assert.equal(stats.owned,1611);
  assert.equal(stats.wishlisted,21);
  assert.equal(stats.progress['volumes read'].current,454);
  assert.equal(stats.progress['volumes read'].total,1215);
  assert.equal(stats.progress['issues read'].current,277);
  const comics=collectionStats(all,'Comics');
  assert.equal(comics.total,109);assert.equal(comics.owned,396);
  assert.equal(comics.statuses.Completed,64);
  assert.equal(comics.categories.Manga,0);
  assert.ok(comics.averageRating>0 && comics.averageRating<=5);
  const empty=collectionStats([]);
  assert.equal(empty.completion,0);assert.equal(empty.averageRating,null);
  const custom=collectionStats([{...entry,total:null}]);
  assert.equal(custom.ownershipUnknown,1);assert.equal(custom.progress['pages read'].unknownTotals,1);
});

test('comic grouping preserves issues and variants, separates publishers and runs, and keeps standalone entries', () => {
  const groups=groupComics(comicsEntries);
  assert.ok(groups.length<419);
  assert.equal(groups.flatMap(g=>g.entries || [g.entry]).length,419);
  const batman=groups.find(g=>g.title==='Absolute Batman (2024 - Present)');
  assert.ok(batman.entries.length>1);
  assert.ok(batman.entries.some(e=>e.title.includes('Variant')));
  const custom=[{...comicsEntries[0],title:'Issue #10',series:'Run'},{...comicsEntries[0],title:'Issue #2',series:'Run'},{...comicsEntries[0],publisher:'Other',series:'Run'},{...comicsEntries[0],series:'Run (2020)'},{...comicsEntries[0],series:''},entry];
  const grouped=groupComics(custom);
  assert.equal(grouped.length,5);
  assert.equal(grouped[0].entries[0].title,'Issue #2');
  assert.equal(grouped[3].type,'entry');
  assert.equal(grouped[4].entry,entry);
  assert.equal(custom[0].title,'Issue #10');
});

test('series completion counts only owned issues, including owned variants', () => {
  const base={...comicsEntries[0],series:'Test series',publisher:'Test'};
  const issues=[{...base,id:'a',owned:true,status:'Completed'},{...base,id:'b',owned:true,status:'Want to read'},{...base,id:'c',owned:false,status:'Completed'},{...base,id:'d',owned:false,wishlisted:true,status:'Want to read'}];
  const groups=comicSeries(issues);assert.equal(groups.length,1);
  const summary=seriesSummary(groups[0]);assert.equal(summary.read,1);assert.equal(summary.total,2);assert.equal(summary.percent,50);assert.equal(summary.status,'Reading');
  assert.equal(collectionItems(issues).length,1);
  const none=seriesSummary({...groups[0],entries:issues.filter(e=>!e.owned)});assert.equal(none.percent,0);assert.equal(none.status,'Want to read');
  assert.equal(seriesSummary({...groups[0],entries:[issues[0]]}).status,'Completed');
});
