import { phenotype, predictLitter, bloodType } from './genetics.js';
import { checkPair, formatAge, BREEDS } from './rules.js';
import { checkCertificate, readExif, KNOWN_VACCINES } from './certificate.js';
import { catFace } from './catArt.js';
import { CATS, DEFAULT_MY_CAT, OWNER_REPLIES } from './data.js';

const TODAY = new Date();
const KEY = 'meowmatch.v2';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pct = (p) => (p > 0 && p < 0.01 ? '<1%' : `${Math.round(p * 100)}%`);

const ICON = {
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  paw: '<svg viewBox="0 0 24 24"><circle cx="7" cy="9" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="9" r="2"/><path d="M8 17c0-3 2-5 4-5s4 2 4 5-2 3-4 3-4 0-4-3Z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><path d="M12 11v6M12 7.5v.5"/></svg>',
  verified: '<svg class="verified" viewBox="0 0 24 24" aria-label="Verified"><path fill="#4dabf7" d="m12 2 2.4 1.8 3-.2 1 2.8 2.5 1.7-.9 2.9.9 2.9-2.5 1.7-1 2.8-3-.2L12 22l-2.4-1.8-3 .2-1-2.8-2.5-1.7.9-2.9-.9-2.9 2.5-1.7 1-2.8 3 .2Z"/><path d="m8.5 12 2.4 2.4 4.6-4.8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.4-9.3-9A5.4 5.4 0 0 1 12 6a5.4 5.4 0 0 1 9.3 6C19 16.6 12 21 12 21Z"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M3 20 21 12 3 4l2 8-2 8Zm2-8h8"/></svg>',
  check: '<path d="M5 12l5 5 9-10"/>',
  bang: '<path d="M12 6v8M12 18v.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  crown: '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5Z"/></svg>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
};

// ── State ───────────────────────────────────────────────────────────
const fresh = () => ({
  myCat: structuredClone(DEFAULT_MY_CAT),
  swipes: {},
  history: [],
  matches: [],
  chats: {},
  filters: { breed: 'any', maxKm: 40, verifiedOnly: false },
  litterPartner: null,
  activeChat: null,
  gold: null, // { plan, since } once the (demo) upgrade is taken
  likesToday: { day: '', n: 0 },
});
let state = fresh();
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (saved && saved.myCat) state = { ...state, ...saved };
} catch { /* storage unavailable – run in memory */ }
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota or blocked – keep going */ }
};

const me = () => state.myCat;
const byId = (id) => (id === 'me' ? me() : CATS.find((c) => c.id === id));
const phOf = (c) => phenotype(c.genes, c.sex);
const pairWith = (c) => checkPair(me(), c, TODAY);
const others = () => CATS.filter((c) => c.sex !== me().sex);
const isVerified = (c) => ['partner', 'checked'].includes(c.health.vaccines);

/** Photo if the cat has one, otherwise a portrait drawn from its genes. */
const portrait = (c) => catFace(phOf(c), { fold: c.fold, eye: c.eye, label: `${c.name}, ${phOf(c).name}` });
const avatar = (c, cls = 'md') =>
  `<span class="avatar ${cls}">${c.photo ? `<img src="${esc(c.photo)}" alt="${esc(c.name)}" loading="lazy">` : portrait(c)}</span>`;
const media = (c) => (c.photo ? `<div class="media"><img src="${esc(c.photo)}" alt="${esc(c.name)}, ${esc(c.breed)}" draggable="false"></div>` : `<div class="media art">${portrait(c)}</div>`);

const BADGE = { partner: 'Clinic verified', checked: 'Vaccines checked', uploaded: 'Vaccines uploaded', none: 'No vaccine record' };

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2400);
}

// ── Router ─────────────────────────────────────────────────────────
const VIEWS = ['discover', 'matches', 'litter', 'health', 'profile'];
const RENDER = { discover: renderDiscover, matches: renderMatches, litter: renderLitter, health: renderHealth, profile: renderProfile };
function route() {
  const view = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'discover';
  for (const v of VIEWS) $(`#view-${v}`).hidden = v !== view;
  for (const a of $$('[data-view]')) {
    if (a.dataset.view === view) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  RENDER[view]();
  renderSide();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

function renderChrome() {
  $('#me-avatar').innerHTML = avatar(me(), 'lg').replace(/^<span class="avatar lg">|<\/span>$/g, '');
  $('#me-avatar-top').innerHTML = avatar(me(), 'sm').replace(/^<span class="avatar sm">|<\/span>$/g, '');
  $('#me-name').innerHTML = esc(me().name) + (isGold() ? ` <span class="gold-badge" title="Gold member">${ICON.crown}</span>` : '');
  $('#me-sub').textContent = `${me().breed} · ${me().sex === 'F' ? 'Queen' : 'Stud'}`;
  document.documentElement.classList.toggle('is-gold', isGold());
  for (const el of $$('[data-gold-label]')) el.textContent = isGold() ? 'Gold active' : 'Get Gold';
  const unread = state.matches.length;
  for (const p of $$('[data-count]')) { p.hidden = !unread; p.textContent = unread; }
}

function likesTile() {
  const liked = likedYou();
  if (!liked.length) return '';
  const c = liked[0];
  return `<a href="#" data-likes-you class="likes-you"><span class="tile ${isGold() ? '' : 'blur'}">${c.photo ? `<img src="${esc(c.photo)}" alt="">` : portrait(c)}
    <b class="count">${liked.length}</b></span>Likes</a>`;
}

function stripHtml() {
  if (!state.matches.length) return likesTile() + `<p class="empty-tile">Your matches will show up here.</p>`;
  return likesTile() + state.matches
    .map((id) => { const c = byId(id); return `<a href="#matches" data-open-chat="${id}"><span class="tile">${c.photo ? `<img src="${esc(c.photo)}" alt="">` : portrait(c)}</span>${esc(c.name)}</a>`; })
    .join('');
}

function renderSide() {
  renderChrome();
  $('#side-strip').innerHTML = stripHtml();
  $('#side-convos').innerHTML = state.matches.length
    ? state.matches.map((id) => {
        const c = byId(id);
        const last = state.chats[id]?.at(-1);
        return `<li><a href="#matches" data-open-chat="${id}" aria-current="${location.hash === '#matches' && id === state.activeChat}">${avatar(c)}
          <span><b>${esc(c.name)}</b><small>${last ? (last.from === 'me' ? 'You: ' : '') + esc(last.text) : 'Say hello'}</small></span></a></li>`;
      }).join('')
    : `<li class="muted small">No messages yet.</li>`;
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-open-chat]');
  if (a) { state.activeChat = a.dataset.openChat; save(); if (location.hash === '#matches') route(); }
});

// ── Discover ───────────────────────────────────────────────────────
function deckCats() {
  const f = state.filters;
  return others()
    .map((cat) => ({ cat, pair: pairWith(cat) }))
    .filter(({ cat, pair }) => pair.ok && !state.swipes[cat.id])
    .filter(({ cat }) => cat.km <= f.maxKm && (f.breed === 'any' || cat.breed === f.breed))
    .filter(({ cat }) => !f.verifiedOnly || isVerified(cat))
    .sort((a, b) => Number(Boolean(b.cat.photo)) - Number(Boolean(a.cat.photo)));
}

function renderDiscover() {
  const f = state.filters;
  $('#f-for').textContent = me().name;
  const breeds = [...new Set(others().filter((c) => pairWith(c).ok).map((c) => c.breed))];
  if (f.breed !== 'any' && !breeds.includes(f.breed)) f.breed = 'any';
  $('#f-breed').innerHTML = `<option value="any">All compatible breeds</option>` + breeds.map((b) => `<option ${b === f.breed ? 'selected' : ''}>${esc(b)}</option>`).join('');
  $('#f-km').value = f.maxKm;
  $('#f-km-out').textContent = `${f.maxKm} km`;
  $('#f-verified').checked = f.verifiedOnly;

  const hidden = others().map((c) => ({ c, p: pairWith(c) })).filter((x) => !x.p.ok);
  $('#hidden-count').textContent = hidden.length;
  $('#hidden-items').innerHTML = hidden
    .map(({ c, p }) => `<li>${avatar(c)}<div><b>${esc(c.name)} · ${esc(c.breed)}</b><span>${esc(p.blocks[0])}</span></div></li>`)
    .join('');
  renderDeck();
}

function cardTags(cat, pair) {
  let h = isVerified(cat) ? `<span class="tag ok">${BADGE[cat.health.vaccines]}</span>` : `<span class="tag">${BADGE[cat.health.vaccines]}</span>`;
  for (const t of cat.titles || []) h += `<span class="tag gold">${esc(t)}</span>`;
  if (isGold() && cat.likesYou && !state.matches.includes(cat.id)) h = `<span class="tag likes">${ICON.heart}Likes ${esc(me().name)}</span>` + h;
  if (pair?.niRisk) h += `<span class="tag warn">Blood type risk</span>`;
  return h;
}

function renderDeck() {
  const list = deckCats().slice(0, 3);
  const deck = $('#deck');
  if (!list.length) {
    deck.innerHTML = `<div class="deck-empty"><div class="pulse">${avatar(me())}</div>
      <h2>You’ve seen everyone nearby</h2><p class="muted">Try a wider distance or a different breed.</p>
      <a class="btn ghost small" href="#matches">See your matches</a></div>`;
    return;
  }
  deck.innerHTML = list
    .map(({ cat, pair }, i) => {
      const ph = phOf(cat);
      return `<article class="swipe-card" data-id="${cat.id}" style="--i:${i}" aria-label="${esc(cat.name)}, ${esc(cat.breed)}">
        ${media(cat)}
        <div class="scrim">
          <h2>${esc(cat.name)} <small>${formatAge(cat.birthDate, TODAY)}</small>${cat.health.vaccines === 'partner' ? ICON.verified : ''}</h2>
          <p class="line">${ICON.paw}${esc(cat.breed)} · ${ph.name}${ph.longHair ? ', long coat' : ''}</p>
          <p class="line">${ICON.pin}${esc(cat.area)} · ${cat.km} km away</p>
          <div class="tags">${cardTags(cat, pair)}</div>
        </div>
        <span class="stamp yes">LIKE</span><span class="stamp no">NOPE</span>
      </article>`;
    })
    .reverse()
    .join('');
  bindDrag(deck.lastElementChild);
}

const topCard = () => { const el = $('#deck .swipe-card:last-child'); return el ? byId(el.dataset.id) : null; };

function bindDrag(card) {
  let x0 = 0, y0 = 0, dx = 0, dy = 0, down = false;
  const yes = $('.stamp.yes', card);
  const no = $('.stamp.no', card);
  card.addEventListener('pointerdown', (e) => {
    down = true; x0 = e.clientX; y0 = e.clientY; dx = dy = 0;
    card.setPointerCapture(e.pointerId);
    card.classList.add('dragging');
  });
  card.addEventListener('pointermove', (e) => {
    if (!down) return;
    dx = e.clientX - x0; dy = e.clientY - y0;
    card.style.transform = `translate(${dx}px, ${dy * 0.25}px) rotate(${dx / 16}deg)`;
    yes.style.opacity = Math.max(0, Math.min(1, dx / 90));
    no.style.opacity = Math.max(0, Math.min(1, -dx / 90));
  });
  const end = () => {
    if (!down) return;
    down = false;
    card.classList.remove('dragging');
    if (Math.abs(dx) > 110) swipe(dx > 0 ? 'like' : 'nope');
    else {
      card.style.transform = ''; yes.style.opacity = no.style.opacity = 0;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) openProfile(byId(card.dataset.id)); // a tap opens the profile
    }
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
}

function swipe(dir) {
  const card = $('#deck .swipe-card:last-child');
  if (!card || card.dataset.gone) return;
  const cat = byId(card.dataset.id);
  if (dir === 'like' && !useLike()) {
    card.style.transform = '';
    $$('.stamp', card).forEach((s) => (s.style.opacity = 0));
    return openGold('likes');
  }
  card.dataset.gone = '1';
  $(`.stamp.${dir === 'like' ? 'yes' : 'no'}`, card).style.opacity = 1;
  card.style.transition = 'transform .4s ease-in';
  card.style.transform = `translate(${dir === 'like' ? 150 : -150}%, 30px) rotate(${dir === 'like' ? 22 : -22}deg)`;
  state.swipes[cat.id] = dir;
  state.history.push(cat.id);
  if (dir === 'like' && cat.likesYou && !state.matches.includes(cat.id)) {
    state.matches.unshift(cat.id);
    state.chats[cat.id] = [{ from: 'them', text: `Hi! I’m ${cat.owner}, ${cat.name}’s human. ${me().name} looks lovely!` }];
    state.activeChat = cat.id;
    setTimeout(() => showMatch(cat), 420);
  } else if (dir === 'like') {
    toast(`You liked ${cat.name}. If ${cat.owner} likes ${me().name} too, it’s a match.`);
  }
  save();
  renderSide();
  setTimeout(renderDeck, 380);
}

function undo() {
  if (!isGold()) return openGold('rewind');
  const id = state.history.pop();
  if (!id) return toast('Nothing to undo');
  delete state.swipes[id];
  state.matches = state.matches.filter((m) => m !== id);
  delete state.chats[id];
  save(); renderSide(); renderDeck();
  toast(`${byId(id).name} is back`);
}

// ── Meow Match Gold (demo upgrade – no real payment) ───────────────
const FREE_LIKES_PER_DAY = 5;
const PLANS = [
  { id: '1m', months: 1, monthly: 299 },
  { id: '6m', months: 6, monthly: 179, tag: 'Most popular' },
  { id: '12m', months: 12, monthly: 129, tag: 'Best value' },
];
const thb = (n) => `฿${n.toLocaleString('en-US')}`;
const isGold = () => Boolean(state.gold);
const dayKey = () => TODAY.toISOString().slice(0, 10);
function likesLeft() {
  if (state.likesToday?.day !== dayKey()) state.likesToday = { day: dayKey(), n: 0 };
  return Math.max(0, FREE_LIKES_PER_DAY - state.likesToday.n);
}
/** Spends one like. Returns false when a free account is out of likes for today. */
function useLike() {
  if (isGold()) return true;
  if (!likesLeft()) return false;
  state.likesToday.n += 1;
  const left = likesLeft();
  if (left === 2) setTimeout(() => toast('2 likes left today'), 900);
  return true;
}
/** Owners who already liked your cat and are waiting for you to swipe. */
const likeLine = (n) => `${n} ${n === 1 ? 'cat likes' : 'cats like'} ${esc(me().name)}`;
const likedYou = () => others().filter((c) => c.likesYou && pairWith(c).ok && !state.swipes[c.id]);

const GOLD_REASON = {
  likes: ['You’re out of likes for today', `Free accounts get ${FREE_LIKES_PER_DAY} likes a day. Go Gold to keep swiping.`],
  rewind: ['Rewind is a Gold feature', 'Swiped left by accident? Gold lets you bring any cat back.'],
  'likes-you': ['See who likes you', 'Match instantly with owners who already liked your cat.'],
  upsell: ['Get Meow Match Gold', 'Find the right partner for your cat faster.'],
};
const PERKS = [
  ['heart', 'See who likes you', 'Browse every owner who already liked your cat and match in one tap.'],
  ['infinite', 'Unlimited likes', `No daily cap. Free accounts get ${FREE_LIKES_PER_DAY} a day.`],
  ['rewind', 'Unlimited rewinds', 'Undo a swipe you didn’t mean.'],
  ['crown', 'Gold badge', 'Stand out to breeders with a Gold badge on your profile.'],
];
const PERK_ICON = {
  heart: '<path d="M12 21s-7-4.4-9.3-9A5.4 5.4 0 0 1 12 6a5.4 5.4 0 0 1 9.3 6C19 16.6 12 21 12 21Z"/>',
  infinite: '<path d="M8 8a4 4 0 1 0 0 8c3 0 5-8 8-8a4 4 0 1 1 0 8c-3 0-5-8-8-8Z"/>',
  rewind: '<path d="M9 7H4V2M4 7a9 9 0 1 1-1 7"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5Z"/>',
};

function openGold(reason = 'upsell') {
  if (isGold()) return openGoldManage();
  const [title, sub] = GOLD_REASON[reason];
  const liked = likedYou();
  const faces = liked.slice(0, 3).map((c) => avatar(c, 'md blur')).join('');
  openSheet(`<div class="gold-hero">
      <span class="gold-mark">${ICON.crown}<b>Meow Match</b><i>GOLD</i></span>
      ${liked.length ? `<div class="faces">${faces}<span>${likeLine(liked.length)}</span></div>` : ''}
      <h2>${title}</h2><p>${sub}</p></div>
    <form class="sheet-body gold-body" id="gold-form">
      <ul class="perks">${PERKS.map(([i, t, d]) => `<li><span><svg viewBox="0 0 24 24">${PERK_ICON[i]}</svg></span><div><b>${t}</b><small>${d}</small></div></li>`).join('')}</ul>
      <fieldset class="plans"><legend class="sr-only">Choose a plan</legend>
        ${PLANS.map((p) => `<label class="plan"><input type="radio" name="plan" value="${p.id}" ${p.id === '6m' ? 'checked' : ''}>
          <span>${p.tag ? `<em>${p.tag}</em>` : ''}<b>${p.months}</b><small>month${p.months > 1 ? 's' : ''}</small>
          <strong>${thb(p.monthly)}/mo</strong>${p.months > 1 ? `<small class="save">Save ${Math.round((1 - p.monthly / PLANS[0].monthly) * 100)}%</small>` : '<small class="save">&nbsp;</small>'}</span></label>`).join('')}
      </fieldset>
      <div class="pay-preview"><span>Pay with</span>${PAY_METHODS.map((m) => `<i class="pm pm-${m.id}" title="${m.name}"><svg viewBox="0 0 24 24">${m.icon}</svg></i>`).join('')}</div>
      <button class="btn gold" type="submit">Continue to payment</button>
      <p class="fine">Demo app: checkout runs in test mode.</p>
    </form>`);
  $('#gold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    openCheckout(PLANS.find((p) => p.id === e.target.elements.plan.value));
  });
}

// Payment methods offered at checkout. Everything runs in test mode: nothing is sent anywhere.
const PAY_METHODS = [
  { id: 'card', name: 'Credit or debit card', sub: 'Visa, Mastercard, JCB',
    icon: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>' },
  { id: 'promptpay', name: 'PromptPay QR', sub: 'Scan with any Thai banking app',
    icon: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>' },
  { id: 'truemoney', name: 'TrueMoney Wallet', sub: 'Pay with your wallet balance',
    icon: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v4"/><rect x="3.5" y="8" width="17" height="11" rx="2.5"/><path d="M16 13.5h1.5"/>' },
  { id: 'bank', name: 'Mobile banking', sub: 'Pay in your bank’s app',
    icon: '<path d="M3 9.5 12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>' },
];
const METHOD_LABEL = { card: 'Card ending 4242', promptpay: 'PromptPay', truemoney: 'TrueMoney Wallet', bank: 'Mobile banking' };

/** A QR-looking pattern for the demo. It is not a real PromptPay code and can't be paid. */
function demoQr(seed) {
  let x = seed;
  const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  const n = 25, cells = [];
  const finder = (r, c) => [[0, 0], [0, n - 7], [n - 7, 0]].some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!finder(r, c) && rnd() > 0.52) cells.push(`M${c} ${r}h1v1h-1z`);
  const eye = (r, c) => `<path d="M${c} ${r}h7v7h-7zM${c + 1} ${r + 1}v5h5v-5z" fill-rule="evenodd"/><path d="M${c + 2} ${r + 2}h3v3h-3z"/>`;
  return `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" class="qr" aria-label="Demo QR code"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/>
    <g fill="#111">${eye(0, 0)}${eye(0, n - 7)}${eye(n - 7, 0)}<path d="${cells.join('')}"/></g></svg>`;
}

function methodPanel(id, total) {
  if (id === 'card') return `<div class="pay-panel">
      <div class="card-visual"><span class="chip"></span><b>4242 4242 4242 4242</b><div><small>Test Cardholder</small><small>12/34</small></div></div>
      <label class="field"><span>Card number</span><input value="4242 4242 4242 4242" readonly></label>
      <div class="two"><label class="field"><span>Expiry</span><input value="12 / 34" readonly></label>
        <label class="field"><span>CVC</span><input value="123" readonly></label></div>
      <label class="field"><span>Name on card</span><input value="Test Cardholder" readonly></label>
      <p class="fine left">Test card filled in for the demo. Real card numbers can’t be typed here.</p></div>`;
  if (id === 'promptpay') return `<div class="pay-panel qr-panel">${demoQr(total)}
      <div><b>${thb(total)}</b><p class="muted small">Open your banking app, scan the code and confirm. The code expires in 10 minutes.</p>
      <p class="fine left">Demo code. It can’t be scanned or paid.</p></div></div>`;
  if (id === 'truemoney') return `<div class="pay-panel"><p class="muted small">You’ll confirm the payment in the TrueMoney app, then come back here.</p>
      <p class="fine left">In this demo, Pay skips the app and goes straight to the result.</p></div>`;
  return `<div class="pay-panel"><div class="banks">${['K PLUS', 'SCB Easy', 'Krungthai NEXT', 'Bualuang mBanking'].map((b, i) =>
      `<label class="bank"><input type="radio" name="bank" value="${b}" ${i ? '' : 'checked'}><span>${b}</span></label>`).join('')}</div>
      <p class="fine left">In a real build this opens your banking app. Here, Pay goes straight to the result.</p></div>`;
}

function openCheckout(plan, method = 'card') {
  const total = plan.monthly * plan.months;
  openSheet(`<form class="sheet-body checkout" id="pay-form">
      <button type="button" class="back" id="pay-back" aria-label="Back to plans"><svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg>Plans</button>
      <div class="order">
        <span class="gold-dot">${ICON.crown}</span>
        <div><b>Meow Match Gold</b><small>${plan.months} month${plan.months > 1 ? 's' : ''} · ${thb(plan.monthly)}/mo</small></div>
        <strong>${thb(total)}</strong>
      </div>
      <div class="test-banner">Test mode · no real money moves</div>
      <fieldset class="methods"><legend>Pay with</legend>
        ${PAY_METHODS.map((m) => `<label class="method"><input type="radio" name="method" value="${m.id}" ${m.id === method ? 'checked' : ''}>
          <span><i class="pm pm-${m.id}"><svg viewBox="0 0 24 24">${m.icon}</svg></i><span><b>${m.name}</b><small>${m.sub}</small></span><i class="radio"></i></span></label>`).join('')}
      </fieldset>
      <div id="pay-detail">${methodPanel(method, total)}</div>
      <div class="totals"><span>Total today</span><b>${thb(total)}</b></div>
      <p class="fine left">Renews every ${plan.months > 1 ? `${plan.months} months` : 'month'} at ${thb(total)}. Cancel any time.</p>
      <button class="btn gold" type="submit" id="pay-btn">Pay ${thb(total)}</button>
    </form>`);
  const form = $('#pay-form');
  $('#pay-back').addEventListener('click', () => openGold('upsell'));
  form.addEventListener('change', (e) => {
    if (e.target.name === 'method') $('#pay-detail').innerHTML = methodPanel(e.target.value, total);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const m = form.elements.method.value;
    const btn = $('#pay-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span>Processing';
    setTimeout(() => {
      const liked = likedYou();
      state.gold = { plan: plan.id, since: new Date().toISOString(), method: m, ref: `MM-${Date.now().toString(36).toUpperCase().slice(-6)}` };
      save(); renderSide();
      if (!$('#view-discover').hidden) renderDeck();
      openSheet(`<div class="gold-hero done"><span class="gold-mark">${ICON.crown}<b>Meow Match</b><i>GOLD</i></span>
          <h2>You’re on Gold</h2><p>Unlimited likes, rewinds, and you can see who likes ${esc(me().name)}.</p></div>
        <div class="sheet-body">
          <dl class="facts receipt">
            <div><dt>Plan</dt><dd>${plan.months} month${plan.months > 1 ? 's' : ''}</dd></div>
            <div><dt>Paid</dt><dd>${thb(total)} (test)</dd></div>
            <div><dt>Method</dt><dd>${METHOD_LABEL[m]}</dd></div>
            <div><dt>Reference</dt><dd>${state.gold.ref}</dd></div>
          </dl>
          ${liked.length ? `<button class="btn gold" data-likes-you>See who likes ${esc(me().name)} (${liked.length})</button>` : ''}
          <button class="btn ghost" data-close>Keep swiping</button></div>`);
    }, 1300);
  });
}

function openGoldManage() {
  const plan = PLANS.find((p) => p.id === state.gold.plan) || PLANS[0];
  openSheet(`<div class="gold-hero done"><span class="gold-mark">${ICON.crown}<b>Meow Match</b><i>GOLD</i></span>
      <h2>You’re on Gold</h2><p>${plan.months}-month plan · ${thb(plan.monthly)}/mo · ${METHOD_LABEL[state.gold.method] || 'Test payment'}</p></div>
    <div class="sheet-body">
      <ul class="perks">${PERKS.map(([i, t]) => `<li><span><svg viewBox="0 0 24 24">${PERK_ICON[i]}</svg></span><div><b>${t}</b></div></li>`).join('')}</ul>
      <button class="btn gold" data-likes-you>See who likes ${esc(me().name)}</button>
      <button class="btn ghost" id="gold-cancel">Cancel Gold</button>
    </div>`);
  $('#gold-cancel').addEventListener('click', () => {
    state.gold = null; save(); renderSide(); sheet.close();
    if (!$('#view-discover').hidden) renderDeck();
    toast('Gold turned off');
  });
}

function openLikesYou() {
  if (!isGold()) return openGold('likes-you');
  const liked = likedYou();
  openSheet(`<div class="sheet-body">
      <h2 style="margin:6px 0 0">${likeLine(liked.length)}</h2>
      <p class="muted small">Like one back and it’s a match.</p>
      ${liked.length ? `<div class="likes-grid">${liked.map((c) => `<div class="like-tile">${c.photo ? `<img src="${esc(c.photo)}" alt="">` : portrait(c)}
          <div class="scrim"><b>${esc(c.name)}</b><small>${esc(c.breed)}</small></div>
          <div class="mini"><button class="act small nope" data-lynope="${c.id}" aria-label="Pass on ${esc(c.name)}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
          <button class="act small like" data-lylike="${c.id}" aria-label="Like ${esc(c.name)} back">${ICON.heart}</button></div></div>`).join('')}</div>`
        : `<div class="alert ok">You’ve answered everyone. New likes will show up here.</div>`}
    </div>`);
}

function answerLike(id, dir) {
  const cat = byId(id);
  state.swipes[id] = dir;
  state.history.push(id);
  if (dir === 'like' && !state.matches.includes(id)) {
    state.matches.unshift(id);
    state.chats[id] = [{ from: 'them', text: `Hi! I’m ${cat.owner}, ${cat.name}’s human. ${me().name} looks lovely!` }];
    state.activeChat = id;
  }
  save(); renderSide();
  if (!$('#view-discover').hidden) renderDeck();
  if (dir === 'like') { sheet.close(); setTimeout(() => showMatch(cat), 150); }
  else openLikesYou();
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-gold]')) { e.preventDefault(); openGold('upsell'); }
  else if (e.target.closest('[data-likes-you]')) { e.preventDefault(); openLikesYou(); }
  else if (e.target.closest('[data-lylike]')) answerLike(e.target.closest('[data-lylike]').dataset.lylike, 'like');
  else if (e.target.closest('[data-lynope]')) answerLike(e.target.closest('[data-lynope]').dataset.lynope, 'nope');
});

// ── Dialogs ────────────────────────────────────────────────────────
const sheet = $('#sheet');
function openSheet(html) {
  $('#sheet-body').innerHTML = `<button class="close" aria-label="Close" data-close>×</button>${html}`;
  if (!sheet.open) sheet.showModal();
  sheet.scrollTop = 0;
}
let lastInputPointer = false;
addEventListener('pointerdown', () => (lastInputPointer = true), true);
addEventListener('keydown', () => (lastInputPointer = false), true);
sheet.addEventListener('close', () => { if (lastInputPointer) setTimeout(() => document.activeElement?.blur(), 0); });
sheet.addEventListener('click', (e) => {
  if (e.target === sheet || e.target.closest('[data-close]')) { sheet.close(); return; }
  const go = e.target.closest('[data-go]');
  if (go) {
    sheet.close();
    if (go.dataset.partner) { state.litterPartner = go.dataset.partner; state.activeChat = go.dataset.partner; }
    save();
    location.hash = go.dataset.go;
  }
});

function openProfile(cat) {
  if (!cat) return;
  const pair = pairWith(cat);
  const ph = phOf(cat);
  const fact = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  openSheet(`<div class="sheet-hero">${media(cat)}
      <div class="scrim"><h2>${esc(cat.name)} <small>${formatAge(cat.birthDate, TODAY)}</small>${cat.health.vaccines === 'partner' ? ICON.verified : ''}</h2>
      <p class="line">${ICON.pin}${esc(cat.area)} · ${cat.km} km away</p></div></div>
    <div class="sheet-body">
      <p>${esc(cat.bio)}</p>
      <div class="tags" style="margin:0">${cardTags(cat, pair)}</div>
      <section><h3>Breeding profile</h3><dl class="facts">
        ${fact('Breed', esc(cat.breed))}${fact('Coat', `${ph.name}${ph.longHair ? ', long' : ''}`)}
        ${fact('Blood type', bloodType(cat.genes.blood))}${fact('FeLV / FIV', esc(cat.health.felvFiv))}
        ${fact('DNA tests', Object.entries(cat.health.tests).map(([k, v]) => `${k} ${v === 'negative' ? '✓' : '–'}`).join(' · '))}
        ${fact('Cattery', esc(cat.cattery || '–'))}
      </dl></section>
      <section><h3>Compatibility with ${esc(me().name)}</h3><div style="display:grid;gap:8px">
        ${pair.blocks.map((b) => `<div class="alert block">${esc(b)}</div>`).join('')}
        ${pair.warnings.map((w) => `<div class="alert warn">${esc(w)}</div>`).join('')}
        ${pair.ok && !pair.warnings.length ? `<div class="alert ok">No health or breeding conflicts.</div>` : ''}</div></section>
      <button class="btn primary" data-go="litter" data-partner="${cat.id}">Preview kittens with ${esc(me().name)}</button>
      ${cat.credit ? `<p class="credit">Photo: ${esc(cat.credit)} on Unsplash</p>` : ''}
    </div>`);
}

function showMatch(cat) {
  openSheet(`<div class="match-pop">
      <div class="duo">${avatar(me())}${avatar(cat)}</div>
      <h2>It’s a Meow Match!</h2>
      <p>${esc(me().name)} and ${esc(cat.name)} liked each other.</p>
      <div class="btns"><button class="btn white" data-go="matches" data-partner="${cat.id}">Send a message</button>
      <button class="btn outline-white" data-close>Keep swiping</button></div>
    </div>`);
}

// ── Messages ───────────────────────────────────────────────────────
function renderMatches() {
  const ids = state.matches;
  if (!ids.includes(state.activeChat)) state.activeChat = ids[0] || null;
  $('#m-strip').innerHTML = stripHtml();
  renderChat();
}

function renderChat() {
  const box = $('#chat');
  const cat = byId(state.activeChat);
  if (!cat) {
    box.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-5 4Z"/></svg><h2>No chats yet</h2>
      <p>When you and another owner like each other, you can chat here.</p><a class="btn primary" href="#discover">Start swiping</a></div>`;
    return;
  }
  const pair = pairWith(cat);
  box.innerHTML = `<div class="chat-head">${avatar(cat)}
      <div class="grow"><h2>${esc(cat.name)}</h2><small class="muted">${esc(cat.owner)} · ${esc(cat.cattery || cat.area)}</small></div>
      <button class="chip" data-profile="${cat.id}">Profile</button>
      <button class="chip" data-go-litter="${cat.id}">Litter preview</button></div>
    ${pair.warnings.length ? `<div class="alert warn">${esc(pair.warnings[0])}</div>` : ''}
    <div class="msgs" id="msgs"><span class="day">You matched with ${esc(cat.name)}</span>
      ${(state.chats[cat.id] || []).map((m) => `<div class="msg ${m.from === 'me' ? 'me' : ''}">${esc(m.text)}</div>`).join('')}</div>
    <form class="composer" id="composer"><input id="msg-in" placeholder="Ask about health tests, visits, kittens…" aria-label="Message" autocomplete="off" maxlength="300">
      <button class="send" aria-label="Send">${ICON.send}</button></form>`;
  const msgs = $('#msgs');
  msgs.scrollTop = msgs.scrollHeight;
}

$('#view-matches').addEventListener('click', (e) => {
  const p = e.target.closest('[data-profile]');
  if (p) openProfile(byId(p.dataset.profile));
  const l = e.target.closest('[data-go-litter]');
  if (l) { state.litterPartner = l.dataset.goLitter; save(); location.hash = 'litter'; }
});
$('#view-matches').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#msg-in');
  const text = input.value.trim();
  if (!text) return;
  const id = state.activeChat;
  state.chats[id].push({ from: 'me', text });
  save(); renderChat(); renderSide();
  const msgs = $('#msgs');
  msgs.insertAdjacentHTML('beforeend', `<div class="msg typing">${esc(byId(id).owner)} is typing…</div>`);
  msgs.scrollTop = msgs.scrollHeight;
  setTimeout(() => {
    state.chats[id].push({ from: 'them', text: OWNER_REPLIES.find((r) => r.match.test(text)).text });
    save();
    if (location.hash === '#matches') { renderChat(); renderSide(); $('#msg-in')?.focus(); }
  }, 1100);
  $('#msg-in').focus();
});

// ── Litter preview ─────────────────────────────────────────────────
const damSire = (c) => (me().sex === 'F' ? [me(), c] : [c, me()]);
function renderLitter() {
  const list = others();
  if (!list.some((c) => c.id === state.litterPartner)) {
    const looks = (c) => (pairWith(c).ok ? predictLitter(...damSire(c)).all.length : 0);
    state.litterPartner = [...list].sort((a, b) => looks(b) - looks(a))[0].id;
  }
  $('#l-partner').innerHTML = list
    .map((c) => `<option value="${c.id}" ${c.id === state.litterPartner ? 'selected' : ''}>${esc(c.name)} · ${esc(c.breed)}${pairWith(c).ok ? '' : ' (blocked)'}</option>`)
    .join('');
  const partner = byId(state.litterPartner);
  const pair = pairWith(partner);
  const [dam, sire] = damSire(partner);
  const r = predictLitter(dam, sire);

  const parent = (c, side = '') => `<div class="parent ${side}">${avatar(c)}<div><b>${esc(c.name)}</b><small>${phOf(c).name} · type ${bloodType(c.genes.blood)}</small></div></div>`;
  $('#l-pair').innerHTML = `${parent(me())}<span class="times" aria-hidden="true">${ICON.heart}</span>${parent(partner, 'right')}
    <div class="alerts">${pair.blocks.map((b) => `<div class="alert block">Blocked: ${esc(b)}</div>`).join('')}
    ${pair.warnings.map((w) => `<div class="alert warn">${esc(w)}</div>`).join('')}
    ${pair.ok && !pair.warnings.length ? `<div class="alert ok">No conflicts found for this pairing.</div>` : ''}</div>`;

  const max = r.all[0].p;
  $('#l-rows').innerHTML = r.all
    .map((k) => `<div class="krow"><span class="k-art">${catFace(k, { eye: sire.eye, label: k.name })}</span>
      <span class="name">${k.name}${k.longHair ? ', long' : ''}<small>${k.male && k.female ? `♂ ${pct(k.male)} · ♀ ${pct(k.female)}` : k.male ? 'Boys only' : 'Girls only'}</small></span>
      <span class="bar"><i style="width:${(k.p / max) * 100}%"></i></span><span class="pct">${pct(k.p)}</span></div>`)
    .join('');

  $('#l-stats').innerHTML = `
    <div class="card-ui stat"><h2>Blood types</h2>
      <div class="split">${r.blood.A ? `<span style="flex:${r.blood.A};background:#1c7ed6">A ${pct(r.blood.A)}</span>` : ''}${r.blood.B ? `<span style="flex:${r.blood.B};background:#7048e8">B ${pct(r.blood.B)}</span>` : ''}</div>
      <p class="muted small">${r.niRisk ? `${pct(r.niRisk)} of kittens could react to ${esc(dam.name)}’s first milk, because she is type B. Plan the first day with your vet.` : 'No blood type problems for this pair.'}</p></div>
    <div class="card-ui stat"><h2>Long coat</h2><div class="big">${pct(r.longHair)}</div><p class="muted small">Both parents need to carry long hair.</p></div>
    <div class="card-ui stat"><h2>Possible looks</h2><div class="big">${r.all.length}</div><p class="muted small">Different coats this pair could have.</p></div>
    <p class="muted small">White, pointed, silver and golden coats aren’t included yet.</p>`;
}
$('#l-partner').addEventListener('change', (e) => { state.litterPartner = e.target.value; save(); renderLitter(); });

// ── Health check ───────────────────────────────────────────────────
const SAMPLES = {
  good: () => ({ catName: me().name, microchip: me().health.microchip || '764098100123456', vaccineType: 'FVRCP', vaccineBrand: 'Purevax RCP',
    dateGiven: '2026-06-15', nextDue: '2027-06-15', batchNumber: 'L452871', vetLicense: 'VC 10482', vetName: 'Dr. Siriporn K. (sample)', clinic: 'Sample Animal Clinic, Sukhumvit', hasBatchSticker: true }),
  bad: () => ({ catName: 'Moji', microchip: '76409810099', vaccineType: 'Rabies', vaccineBrand: 'SuperVax 5',
    dateGiven: '2026-12-20', nextDue: '2031-01-01', batchNumber: '#?', vetLicense: 'n/a', vetName: 'Dr. Vet', clinic: 'Clinic', hasBatchSticker: false }),
};
let certImage = null;

function renderHealth() {
  const type = $('#cert-form [name=vaccineType]').value;
  $('#brands').innerHTML = KNOWN_VACCINES[type].map((b) => `<option value="${b}">`).join('');
}
$('#cert-form [name=vaccineType]').addEventListener('change', renderHealth);
$('#cert-form').addEventListener('click', (e) => {
  const s = e.target.closest('[data-sample]');
  if (!s) return;
  const data = SAMPLES[s.dataset.sample]();
  const form = $('#cert-form');
  for (const [k, v] of Object.entries(data)) {
    const el = form.elements[k];
    if (el.type === 'checkbox') el.checked = v; else el.value = v;
  }
  renderHealth();
  runChecks();
});
$('#cert-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) { certImage = null; return; }
  let exif = null;
  try { if (file.type === 'image/jpeg') exif = readExif(await file.arrayBuffer()); } catch { exif = null; }
  if (certImage?.url) URL.revokeObjectURL(certImage.url);
  certImage = { type: file.type, size: file.size, exif, url: URL.createObjectURL(file) };
  $('#drop-text').innerHTML = `<b>${esc(file.name)}</b><small>${Math.round(file.size / 1000)} KB${exif?.software ? ` · saved by ${esc(exif.software)}` : ''}</small>`;
});
$('#cert-form').addEventListener('submit', (e) => { e.preventDefault(); runChecks(); });

function runChecks() {
  const f = $('#cert-form').elements;
  const form = Object.fromEntries(['catName', 'microchip', 'vaccineType', 'vaccineBrand', 'dateGiven', 'nextDue', 'batchNumber', 'vetLicense', 'vetName', 'clinic'].map((k) => [k, f[k].value]));
  form.hasBatchSticker = f.hasBatchSticker.checked;
  const res = checkCertificate(form, me(), certImage, TODAY);
  const order = { fail: 0, warn: 1, pass: 2 };
  const vIcon = { checked: ICON.check, review: ICON.bang, rejected: ICON.x }[res.verdict.level];
  const sIcon = { pass: ICON.check, warn: ICON.bang, fail: ICON.x };
  $('#cert-result').innerHTML = `
    ${certImage ? `<img class="cert-img" src="${certImage.url}" alt="Uploaded certificate">` : ''}
    <div class="verdict ${res.verdict.level}"><span class="badge-ico"><svg viewBox="0 0 24 24">${vIcon}</svg></span>
      <span><b>${res.verdict.label}</b><small>${res.fails} failed · ${res.warns} warnings. ${res.verdict.note}</small></span></div>
    <ul class="checks">${[...res.checks].sort((a, b) => order[a.status] - order[b.status])
      .map((c) => `<li><span class="ico ${c.status}"><svg viewBox="0 0 24 24">${sIcon[c.status]}</svg></span>
        <span><b>${esc(c.label)}</b>${c.detail ? `<small>${esc(c.detail)}</small>` : ''}</span></li>`).join('')}</ul>`;
  if (res.verdict.level === 'checked' && ['none', 'uploaded'].includes(me().health.vaccines)) {
    me().health.vaccines = 'checked';
    save();
    toast(`${me().name} earned the Checked badge`);
  }
  if (matchMedia('(max-width: 1000px)').matches) $('#cert-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Profile ────────────────────────────────────────────────────────
// Each gene as a plain-language choice. `v` is the genotype stored on the cat.
const GENES = {
  B: { title: 'Base colour', hint: 'The colour a plain coat would be.',
    opts: [['B/B', 'Black'], ['B/b', 'Black', 'carries chocolate'], ['B/bl', 'Black', 'carries cinnamon'],
      ['b/b', 'Chocolate'], ['b/bl', 'Chocolate', 'carries cinnamon'], ['bl/bl', 'Cinnamon']] },
  D: { title: 'Colour strength', hint: 'Dilute turns black into blue and red into cream.',
    opts: [['D/D', 'Full colour'], ['D/d', 'Full colour', 'carries dilute'], ['d/d', 'Dilute']] },
  A: { title: 'Pattern', hint: 'Stripes and spots, or one plain colour.',
    opts: [['A/A', 'Tabby'], ['A/a', 'Tabby', 'carries solid'], ['a/a', 'Solid']] },
  L: { title: 'Coat length', hint: '',
    opts: [['L/L', 'Short'], ['L/l', 'Short', 'carries long'], ['l/l', 'Long']] },
  O_F: { title: 'Red / orange', hint: 'Girls can be tortie.',
    opts: [['o/o', 'No red'], ['O/o', 'Tortie', 'red patches'], ['O/O', 'Red or cream']] },
  O_M: { title: 'Red / orange', hint: 'Boys are either red or not. Never tortie.',
    opts: [['o', 'No red'], ['O', 'Red or cream']] },
  blood: { title: 'Blood type', hint: 'Type B girls are safest with type B boys.',
    opts: [['A/A', 'Type A'], ['A/b', 'Type A', 'carries B'], ['b/b', 'Type B']] },
};
let pendingPhoto;

function renderProfile() {
  const c = me();
  const form = $('#profile-form');
  pendingPhoto = c.photo;
  $('#p-breed').innerHTML = BREEDS.map((b) => `<option ${b === c.breed ? 'selected' : ''}>${b}</option>`).join('');
  form.elements.name.value = c.name;
  form.elements.sex.value = c.sex;
  form.elements.birthDate.value = c.birthDate;
  form.elements.microchip.value = c.health.microchip || '';
  form.elements.littersLast12mo.value = c.littersLast12mo || 0;
  drawGeneSelects(c.genes, c.sex);
  updatePreview();
}

function drawGeneSelects(genes, sex) {
  $('#p-genes').innerHTML = ['B', 'D', 'A', 'L', 'O', 'blood']
    .map((l) => {
      const g = GENES[l === 'O' ? (sex === 'M' ? 'O_M' : 'O_F') : l];
      const cur = genes[l].join('/');
      const known = g.opts.some(([v]) => v === cur);
      return `<fieldset class="gene"><legend>${g.title}</legend>${g.hint ? `<p class="hint">${g.hint}</p>` : ''}<div class="choices">
        ${g.opts.map(([v, main, sub], i) => `<label class="choice"><input type="radio" name="g-${l}" value="${v}" ${v === cur || (!known && i === 0) ? 'checked' : ''}>
          <span><b>${main}</b>${sub ? `<small>${sub}</small>` : ''}</span></label>`).join('')}
      </div></fieldset>`;
    })
    .join('');
}

function readProfileForm() {
  const f = $('#profile-form').elements;
  const genes = {};
  for (const l of ['B', 'D', 'A', 'L', 'O', 'blood']) genes[l] = f[`g-${l}`].value.split('/');
  return {
    ...me(),
    name: f.name.value.trim() || 'My cat',
    sex: f.sex.value,
    breed: f.breed.value,
    fold: f.breed.value === 'Scottish Fold',
    birthDate: f.birthDate.value || me().birthDate,
    littersLast12mo: Number(f.littersLast12mo.value) || 0,
    photo: pendingPhoto,
    credit: pendingPhoto === me().photo ? me().credit : '',
    genes,
    health: { ...me().health, microchip: f.microchip.value.replace(/\D/g, '') },
  };
}

function updatePreview() {
  const c = readProfileForm();
  const ph = phOf(c);
  $('#p-photo').innerHTML = c.photo ? `<img src="${esc(c.photo)}" alt="${esc(c.name)}">` : `<div class="media art">${portrait(c)}</div>`;
  $('#p-coat').textContent = `${ph.name}${ph.longHair ? ', long coat' : ''} · blood type ${bloodType(c.genes.blood)}`;
}

/** Shrinks an uploaded photo to a 600×750 JPEG data URL so it fits in localStorage. */
function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const W = 600, H = 750;
      const s = Math.max(W / img.width, H / img.height);
      const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H });
      canvas.getContext('2d').drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
$('#p-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try { pendingPhoto = await resizePhoto(file); updatePreview(); toast('Looks good. Save to keep it.'); }
  catch { toast('Could not read that image'); }
});

$('#profile-form').addEventListener('input', (e) => {
  if (e.target.name === 'sex') {
    const genes = readProfileForm().genes;
    genes.O = e.target.value === 'M' ? [genes.O[0]] : [genes.O[0], 'o'];
    drawGeneSelects(genes, e.target.value);
  }
  updatePreview();
});
$('#profile-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const before = me().sex;
  state.myCat = readProfileForm();
  if (before !== state.myCat.sex) Object.assign(state, { swipes: {}, history: [], matches: [], chats: {}, litterPartner: null, activeChat: null });
  save(); renderSide();
  toast('Profile saved');
});
$('#btn-reset').addEventListener('click', () => { state = fresh(); save(); renderSide(); renderProfile(); toast('Demo reset'); });

// ── Discover controls ──────────────────────────────────────────────
$('#btn-like').addEventListener('click', () => swipe('like'));
$('#btn-nope').addEventListener('click', () => swipe('nope'));
$('#btn-undo').addEventListener('click', undo);
$('#btn-info').addEventListener('click', () => openProfile(topCard()));
$('#f-breed').addEventListener('change', (e) => { state.filters.breed = e.target.value; save(); renderDeck(); });
$('#f-km').addEventListener('input', (e) => { state.filters.maxKm = Number(e.target.value); $('#f-km-out').textContent = `${e.target.value} km`; save(); renderDeck(); });
$('#f-verified').addEventListener('change', (e) => { state.filters.verifiedOnly = e.target.checked; save(); renderDeck(); });
document.addEventListener('keydown', (e) => {
  if ($('#view-discover').hidden || sheet.open || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.key === 'ArrowRight') swipe('like');
  else if (e.key === 'ArrowLeft') swipe('nope');
  else if (e.key === 'ArrowUp') { e.preventDefault(); openProfile(topCard()); }
});

route();
