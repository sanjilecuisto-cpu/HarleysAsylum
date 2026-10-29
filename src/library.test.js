import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEntry, filterEntries } from './library.js';
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
