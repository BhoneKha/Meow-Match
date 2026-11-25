import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crossLocus, crossOrange, phenotype, predictLitter } from '../js/genetics.js';

const cat = (sex, B, D, A, L, O, blood = 'A/A') => ({
  sex,
  genes: { B: B.split('/'), D: D.split('/'), A: A.split('/'), L: L.split('/'), O: O.split('/'), blood: blood.split('/') },
});

test('Punnett square for Bb × Bb gives 1:2:1', () => {
  const r = crossLocus('B', ['B', 'b'], ['B', 'b']);
  assert.equal(r.get('B/B'), 0.25);
  assert.equal(r.get('B/b'), 0.5);
  assert.equal(r.get('b/b'), 0.25);
});

test('allele order is normalised (b/B is stored as B/b)', () => {
  const r = crossLocus('B', ['b'], ['B']);
  assert.deepEqual([...r.keys()], ['B/b']);
});

test('orange is X-linked: sons inherit only from the dam', () => {
  const { male, female } = crossOrange(['o', 'o'], ['O']);
  assert.equal(male.get('o'), 1);
  assert.equal(female.get('O/o'), 1);
});

test('phenotype names follow cat-fancy conventions', () => {
  assert.equal(phenotype(cat('M', 'B/B', 'D/D', 'A/a', 'L/L', 'o').genes, 'M').name, 'Brown tabby');
  assert.equal(phenotype(cat('F', 'B/b', 'd/d', 'a/a', 'L/L', 'O/o').genes, 'F').name, 'Blue-cream');
  assert.equal(phenotype(cat('M', 'b/bl', 'd/d', 'a/a', 'L/L', 'o').genes, 'M').name, 'Lilac');
  assert.equal(phenotype(cat('M', 'B/B', 'd/d', 'a/a', 'L/L', 'O').genes, 'M').name, 'Cream');
  assert.equal(phenotype(cat('F', 'bl/bl', 'D/D', 'a/a', 'l/l', 'o/o').genes, 'F').longHair, true);
});

test('blue × blue only produces dilute kittens', () => {
  const r = predictLitter(cat('F', 'B/B', 'd/d', 'a/a', 'L/L', 'o/o'), cat('M', 'B/b', 'd/d', 'a/a', 'L/L', 'o'));
  assert.ok(r.all.every((k) => k.dilute));
  assert.deepEqual(r.all.map((k) => k.name), ['Blue']);
});

test('non-orange queen × red tom: all daughters tortie, no red sons', () => {
  const r = predictLitter(cat('F', 'B/B', 'D/D', 'a/a', 'L/L', 'o/o'), cat('M', 'B/B', 'D/D', 'a/a', 'L/L', 'O'));
  assert.deepEqual(r.female.map((k) => k.name), ['Tortie']);
  assert.deepEqual(r.male.map((k) => k.name), ['Black']);
});

test('probabilities sum to 1 overall and per sex', () => {
  const r = predictLitter(cat('F', 'B/bl', 'D/d', 'A/a', 'L/l', 'O/o', 'A/b'), cat('M', 'b/bl', 'D/d', 'A/a', 'L/l', 'O', 'A/b'));
  const sum = (xs) => xs.reduce((s, k) => s + k.p, 0);
  assert.ok(Math.abs(sum(r.all) - 1) < 1e-9);
  assert.ok(Math.abs(sum(r.male) - 1) < 1e-9);
  assert.ok(Math.abs(sum(r.female) - 1) < 1e-9);
  assert.ok(Math.abs(r.longHair - 0.25) < 1e-9);
});

test('type-B queen × A/b tom: half the kittens at NI risk', () => {
  const r = predictLitter(cat('F', 'B/B', 'D/D', 'a/a', 'L/L', 'o/o', 'b/b'), cat('M', 'B/B', 'D/D', 'a/a', 'L/L', 'o', 'A/b'));
  assert.equal(r.niRisk, 0.5);
  assert.deepEqual(r.blood, { A: 0.5, B: 0.5 });
});

test('type-A queen never has NI risk', () => {
  const r = predictLitter(cat('F', 'B/B', 'D/D', 'a/a', 'L/L', 'o/o', 'A/b'), cat('M', 'B/B', 'D/D', 'a/a', 'L/L', 'o', 'A/A'));
  assert.equal(r.niRisk, 0);
});

test('predictLitter rejects the wrong parent order', () => {
  assert.throws(() => predictLitter(cat('M', 'B/B', 'D/D', 'a/a', 'L/L', 'o'), cat('F', 'B/B', 'D/D', 'a/a', 'L/L', 'o/o')));
});
