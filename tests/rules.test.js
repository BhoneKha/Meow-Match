import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPair, ageInMonths } from '../js/rules.js';

const TODAY = new Date('2026-11-24T12:00:00');
const base = (over) => ({
  name: 'Cat',
  breed: 'British Shorthair',
  birthDate: '2023-01-01',
  littersLast12mo: 0,
  genes: { B: ['B', 'B'], D: ['D', 'D'], A: ['a', 'a'], L: ['L', 'L'], O: ['o', 'o'], blood: ['A', 'A'] },
  health: { vaccines: 'checked', felvFiv: 'negative', tests: {} },
  ...over,
});
const queen = (o = {}) => base({ name: 'Queen', sex: 'F', ...o });
const tom = (o = {}) => base({ name: 'Tom', sex: 'M', genes: { ...base().genes, O: ['o'] }, ...o });

test('a healthy same-breed pair is allowed with no warnings', () => {
  const r = checkPair(queen(), tom(), TODAY);
  assert.equal(r.ok, true);
  assert.deepEqual(r.warnings, []);
});

test('argument order does not matter', () => {
  assert.equal(checkPair(tom(), queen(), TODAY).dam.name, 'Queen');
});

test('same sex is blocked', () => {
  assert.equal(checkPair(queen(), queen(), TODAY).ok, false);
});

test('cats under 12 months are blocked', () => {
  const r = checkPair(queen(), tom({ birthDate: '2026-04-10' }), TODAY);
  assert.equal(r.ok, false);
  assert.match(r.blocks[0], /7 months/);
});

test('Fold × Fold is blocked, Fold × British Shorthair is allowed', () => {
  assert.equal(checkPair(queen({ breed: 'Scottish Fold' }), tom({ breed: 'Scottish Fold' }), TODAY).ok, false);
  assert.equal(checkPair(queen({ breed: 'Scottish Fold' }), tom(), TODAY).ok, true);
});

test('unaccepted outcross is blocked', () => {
  const r = checkPair(queen(), tom({ breed: 'Maine Coon' }), TODAY);
  assert.match(r.blocks.join(), /not an accepted pairing/);
});

test('missing FeLV/FIV test blocks the match', () => {
  const r = checkPair(queen(), tom({ health: { vaccines: 'none', felvFiv: 'untested', tests: {} } }), TODAY);
  assert.equal(r.ok, false);
  assert.equal(r.warnings.length, 1); // no vaccine record
});

test('queen with 2 litters this year is blocked', () => {
  assert.equal(checkPair(queen({ littersLast12mo: 2 }), tom(), TODAY).ok, false);
});

test('type-B queen with type-A tom warns with the at-risk share', () => {
  const q = queen({ genes: { ...base().genes, blood: ['b', 'b'] } });
  const r = checkPair(q, tom(), TODAY);
  assert.equal(r.ok, true);
  assert.equal(r.niRisk, 1);
  assert.match(r.warnings[0], /100%/);
});

test('ageInMonths counts whole months', () => {
  assert.equal(ageInMonths('2025-11-25', new Date('2026-11-24')), 11);
  assert.equal(ageInMonths('2025-11-24', new Date('2026-11-24')), 12);
});
