// Feline coat-colour genetics (simplified Mendelian model).
//
// Loci modelled:
//   B  – black / chocolate / cinnamon   (B > b > bl)
//   D  – dense / dilute                 (D > d)
//   A  – agouti (tabby) / non-agouti    (A > a)
//   L  – short / long hair              (L > l)
//   O  – orange, X-linked               (males carry one allele, females two)
//   blood – AB blood group system       (A > b; type AB is rare and not modelled)
//
// Pure functions only – no DOM – so they run in the browser and in `node --test`.

export const LOCI = ['B', 'D', 'A', 'L'];

const DOMINANCE = {
  B: ['B', 'b', 'bl'],
  D: ['D', 'd'],
  A: ['A', 'a'],
  L: ['L', 'l'],
  O: ['O', 'o'],
  blood: ['A', 'b'],
};

const sortPair = (locus, pair) =>
  [...pair].sort((x, y) => DOMINANCE[locus].indexOf(x) - DOMINANCE[locus].indexOf(y));

const keyOf = (locus, pair) => sortPair(locus, pair).join('/');

/** Punnett square for one autosomal locus. Returns Map<'B/b', probability>. */
export function crossLocus(locus, parent1, parent2) {
  const out = new Map();
  for (const a of parent1) {
    for (const b of parent2) {
      const k = keyOf(locus, [a, b]);
      out.set(k, (out.get(k) || 0) + 1 / (parent1.length * parent2.length));
    }
  }
  return out;
}

/** X-linked orange: sons get one X from the dam, daughters one from each parent. */
export function crossOrange(damO, sireO) {
  const male = new Map();
  const female = new Map();
  for (const x of damO) {
    male.set(x, (male.get(x) || 0) + 1 / damO.length);
    const k = keyOf('O', [x, sireO[0]]);
    female.set(k, (female.get(k) || 0) + 1 / damO.length);
  }
  return { male, female };
}

const BASE = { B: 'black', b: 'chocolate', bl: 'cinnamon' };
const DILUTED = { black: 'blue', chocolate: 'lilac', cinnamon: 'fawn' };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const bloodType = (pair) => (pair.includes('A') ? 'A' : 'B');

/**
 * What a cat with these genes looks like.
 * @param {{B:string[],D:string[],A:string[],L:string[],O:string[]}} genes
 * @param {'M'|'F'} sex
 */
export function phenotype(genes, sex) {
  const dominantB = sortPair('B', genes.B)[0];
  const dilute = !genes.D.includes('D');
  const base = dilute ? DILUTED[BASE[dominantB]] : BASE[dominantB];
  const tabby = genes.A.includes('A');
  const longHair = !genes.L.includes('L');
  const oCount = genes.O.filter((x) => x === 'O').length;
  const orange = sex === 'M' ? (oCount ? 'full' : 'none') : oCount === 2 ? 'full' : oCount === 1 ? 'tortie' : 'none';
  const red = dilute ? 'cream' : 'red';

  let name;
  if (orange === 'full') {
    name = cap(red) + (tabby ? ' tabby' : '');
  } else if (orange === 'tortie') {
    const t = base === 'black' ? 'Tortie' : base === 'blue' ? 'Blue-cream' : `${cap(base)} tortie`;
    name = t + (tabby ? ' tabby' : '');
  } else if (base === 'black' && tabby) {
    name = 'Brown tabby'; // cat-fancy name for a black agouti cat
  } else {
    name = cap(base) + (tabby ? ' tabby' : '');
  }
  return { name, base, red, orange, tabby, longHair, dilute };
}

/** Kitten outcome probabilities for a dam (F) × sire (M) pairing. */
export function predictLitter(dam, sire) {
  if (dam.sex !== 'F' || sire.sex !== 'M') throw new Error('predictLitter expects (dam, sire)');

  const loci = LOCI.map((l) => [l, [...crossLocus(l, dam.genes[l], sire.genes[l])]]);
  const orange = crossOrange(dam.genes.O, sire.genes.O);
  const bySex = { male: new Map(), female: new Map() };
  let longHair = 0;

  const walk = (i, genes, p) => {
    if (i === loci.length) {
      for (const sex of ['male', 'female']) {
        for (const [oKey, op] of orange[sex]) {
          const ph = phenotype({ ...genes, O: oKey.split('/') }, sex === 'male' ? 'M' : 'F');
          const k = ph.name + (ph.longHair ? '|long' : '|short');
          const prev = bySex[sex].get(k);
          bySex[sex].set(k, { ...ph, p: (prev ? prev.p : 0) + p * op });
          if (ph.longHair) longHair += 0.5 * p * op;
        }
      }
      return;
    }
    const [locus, outcomes] = loci[i];
    for (const [k, lp] of outcomes) walk(i + 1, { ...genes, [locus]: k.split('/') }, p * lp);
  };
  walk(0, {}, 1);

  const all = new Map();
  for (const sex of ['male', 'female']) {
    for (const [k, v] of bySex[sex]) {
      const prev = all.get(k);
      all.set(k, { male: 0, female: 0, ...prev, ...v, p: (prev ? prev.p : 0) + v.p / 2, [sex]: v.p });
    }
  }
  const sortDesc = (m) => [...m.values()].sort((a, b) => b.p - a.p);

  const blood = { A: 0, B: 0 };
  for (const [k, p] of crossLocus('blood', dam.genes.blood, sire.genes.blood)) blood[bloodType(k.split('/'))] += p;
  const damType = bloodType(dam.genes.blood);

  return {
    male: sortDesc(bySex.male),
    female: sortDesc(bySex.female),
    all: sortDesc(all),
    longHair,
    blood,
    // Neonatal isoerythrolysis: type-A kittens nursing from a type-B queen.
    niRisk: damType === 'B' ? blood.A : 0,
  };
}

/** Compact genotype string for display, e.g. "B/b d/d a/a l/l O/o". */
export const genotypeString = (genes) =>
  [...LOCI, 'O'].map((l) => sortPair(l, genes[l]).join('/')).join('  ');
