// Draws an original cartoon cat face as SVG from a phenotype, so every
// profile picture and kitten preview matches the cat's actual genetics.

export const COAT = {
  black: '#2f2a27',
  blue: '#8d99ab',
  chocolate: '#6e4532',
  lilac: '#c4b2b0',
  cinnamon: '#a3623b',
  fawn: '#dcc2aa',
  red: '#e57a30',
  cream: '#f2d09d',
};

const BROWN_TABBY_GROUND = '#9a7650';

function mix(hex, target, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex);
  const b = p(target);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

let uid = 0;

/**
 * @param {{base:string, red:string, orange:string, tabby:boolean, longHair:boolean}} ph
 * @param {{fold?:boolean, eye?:string, label?:string}} opts
 */
export function catFace(ph, { fold = false, eye = '#e8a33a', label = '' } = {}) {
  const id = `cf${++uid}`;
  const redHex = COAT[ph.red];
  let main = ph.orange === 'full' ? redHex : COAT[ph.base];
  if (ph.base === 'black' && ph.tabby && ph.orange === 'none') main = BROWN_TABBY_GROUND;
  const stripe = ph.base === 'black' && ph.orange !== 'full' ? '#2a2420' : mix(main, '#000000', 0.32);
  const light = mix(main, '#ffffff', 0.38);
  const inner = '#f0a7ad';
  const isDark = main === COAT.black || main === COAT.chocolate;
  const ink = isDark ? '#d9d2cc' : '#3a2f2b';

  // Long hair: a soft star-shaped ruff behind the head.
  let ruff = '';
  if (ph.longHair) {
    const pts = [];
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const r = i % 2 ? 70 : 84;
      pts.push(`${(100 + Math.cos(a) * r * 1.02).toFixed(1)},${(116 + Math.sin(a) * r * 0.9).toFixed(1)}`);
    }
    ruff = `<polygon points="${pts.join(' ')}" fill="${mix(main, '#ffffff', 0.12)}" stroke-linejoin="round"/>`;
  }

  const ears = fold
    ? `<path d="M46 66 Q52 38 84 46 Q72 60 46 66Z" fill="${main}"/><path d="M154 66 Q148 38 116 46 Q128 60 154 66Z" fill="${main}"/>`
    : `<path d="M40 76 L56 14 L92 50Z" fill="${main}"/><path d="M52 62 L60 30 L80 50Z" fill="${inner}"/>
       <path d="M160 76 L144 14 L108 50Z" fill="${main}"/><path d="M148 62 L140 30 L120 50Z" fill="${inner}"/>`;

  const tortie =
    ph.orange === 'tortie'
      ? `<g clip-path="url(#${id})"><ellipse cx="58" cy="78" rx="38" ry="30" fill="${redHex}"/>
         <ellipse cx="150" cy="140" rx="34" ry="26" fill="${redHex}"/><ellipse cx="118" cy="66" rx="12" ry="20" fill="${redHex}"/></g>`
      : '';

  const tabby = ph.tabby
    ? `<g stroke="${stripe}" stroke-width="5" stroke-linecap="round" fill="none" opacity=".85" clip-path="url(#${id})">
         <path d="M100 56 V80"/><path d="M86 60 L90 80"/><path d="M114 60 L110 80"/>
         <path d="M34 108 Q50 112 58 122"/><path d="M32 124 Q46 126 54 134"/>
         <path d="M166 108 Q150 112 142 122"/><path d="M168 124 Q154 126 146 134"/></g>`
    : '';

  return `<svg viewBox="0 0 200 200" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="${id}"><ellipse cx="100" cy="114" rx="70" ry="62"/></clipPath></defs>
  ${ruff}${ears}
  <ellipse cx="100" cy="114" rx="70" ry="62" fill="${main}"/>
  ${tortie}${tabby}
  <ellipse cx="100" cy="166" rx="66" ry="22" fill="#000" opacity=".08" clip-path="url(#${id})"/>
  <ellipse cx="86" cy="142" rx="19" ry="14" fill="${light}"/><ellipse cx="114" cy="142" rx="19" ry="14" fill="${light}"/>
  <g><ellipse cx="72" cy="106" rx="13" ry="15" fill="${eye}"/><ellipse cx="128" cy="106" rx="13" ry="15" fill="${eye}"/>
  <ellipse cx="72" cy="107" rx="4" ry="11" fill="#1c1917"/><ellipse cx="128" cy="107" rx="4" ry="11" fill="#1c1917"/>
  <circle cx="76" cy="100" r="3" fill="#fff"/><circle cx="132" cy="100" r="3" fill="#fff"/></g>
  <path d="M93 128 H107 L100 136Z" fill="${inner}"/>
  <path d="M100 136 V142 M100 142 Q94 148 88 145 M100 142 Q106 148 112 145" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <g stroke="${ink}" stroke-width="1.6" opacity=".55" stroke-linecap="round">
    <path d="M66 140 L28 134"/><path d="M66 146 L30 150"/><path d="M134 140 L172 134"/><path d="M134 146 L170 150"/></g>
</svg>`;
}
