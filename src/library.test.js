import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEntry, filterEntries, mergeImportedEntries } from './library.js';
import { seedEntries } from './seed.js';
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

test('spreadsheet import preserves editions, owned volumes and reread counts', () => {
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
