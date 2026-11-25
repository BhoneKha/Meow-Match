// Breeding guardrails. A pairing is either blocked (never shown in the deck)
// or allowed with warnings the owners must read before they match.

import { bloodType, predictLitter } from './genetics.js';

export const BREEDS = [
  'British Shorthair',
  'Scottish Fold',
  'Persian',
  'Exotic Shorthair',
  'Maine Coon',
  'Norwegian Forest Cat',
  'Bengal',
  'American Shorthair',
];

// Accepted outcrosses (registries allow these breeds to be paired).
const OUTCROSSES = {
  'Scottish Fold': ['British Shorthair'],
  'British Shorthair': ['Scottish Fold'],
  Persian: ['Exotic Shorthair'],
  'Exotic Shorthair': ['Persian'],
};

export const MIN_AGE_MONTHS = 12;
export const MAX_DAM_AGE_MONTHS = 96;
export const MAX_LITTERS_PER_YEAR = 2;

export function ageInMonths(birthDate, today = new Date()) {
  const b = new Date(birthDate);
  let m = (today.getFullYear() - b.getFullYear()) * 12 + (today.getMonth() - b.getMonth());
  if (today.getDate() < b.getDate()) m -= 1;
  return m;
}

export function formatAge(birthDate, today = new Date()) {
  const m = ageInMonths(birthDate, today);
  if (m < 12) return `${m} mo`;
  const y = Math.floor(m / 12);
  return `${y} yr${y > 1 ? 's' : ''}`;
}

export const breedsCompatible = (a, b) => a === b || (OUTCROSSES[a] || []).includes(b);

/**
 * @returns {{ok:boolean, blocks:string[], warnings:string[], dam?:object, sire?:object, niRisk:number}}
 */
export function checkPair(a, b, today = new Date()) {
  const blocks = [];
  const warnings = [];

  if (a.sex === b.sex) {
    return { ok: false, blocks: ['Both cats are the same sex.'], warnings, niRisk: 0 };
  }
  const dam = a.sex === 'F' ? a : b;
  const sire = dam === a ? b : a;

  for (const cat of [dam, sire]) {
    const age = ageInMonths(cat.birthDate, today);
    if (age < MIN_AGE_MONTHS) blocks.push(`${cat.name} is only ${age} months old (minimum ${MIN_AGE_MONTHS}).`);
    if (cat.health.felvFiv !== 'negative') blocks.push(`${cat.name} needs a negative FeLV/FIV test.`);
    if (cat.health.vaccines === 'none') warnings.push(`${cat.name} has no vaccination record uploaded.`);
  }

  if (ageInMonths(dam.birthDate, today) > MAX_DAM_AGE_MONTHS) {
    warnings.push(`${dam.name} is over 8 years old; ask a vet before breeding.`);
  }

  if (!breedsCompatible(dam.breed, sire.breed)) {
    blocks.push(`${dam.breed} × ${sire.breed} is not an accepted pairing.`);
  }

  if (dam.breed === 'Scottish Fold' && sire.breed === 'Scottish Fold') {
    blocks.push('Fold × Fold is blocked: two copies of the fold gene cause severe, painful bone disease.');
  }

  if ((dam.littersLast12mo || 0) >= MAX_LITTERS_PER_YEAR) {
    blocks.push(`${dam.name} has already had ${dam.littersLast12mo} litters in the past 12 months.`);
  }

  let niRisk = 0;
  if (bloodType(dam.genes.blood) === 'B' && bloodType(sire.genes.blood) === 'A') {
    niRisk = predictLitter(dam, sire).niRisk;
    warnings.push(
      `Blood type risk: ${dam.name} is type B and ${sire.name} is type A. ` +
        `About ${Math.round(niRisk * 100)}% of kittens would be type A and could die from ` +
        `neonatal isoerythrolysis if they nurse in the first 24 hours. Plan supervised feeding with a vet.`,
    );
  }

  return { ok: blocks.length === 0, blocks, warnings, dam, sire, niRisk };
}
