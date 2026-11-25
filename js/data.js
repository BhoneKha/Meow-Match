// Sample data. Every cat, owner and cattery here is invented for the demo.

const G = (B, D, A, L, O, blood) => ({
  B: B.split('/'),
  D: D.split('/'),
  A: A.split('/'),
  L: L.split('/'),
  O: O.split('/'),
  blood: blood.split('/'),
});

const COPPER = '#d98a2b';
const GREEN = '#9fb24a';
const GOLD = '#d7b23a';

const health = (vaccines, extra = {}) => ({
  vaccines, // 'partner' | 'checked' | 'uploaded' | 'none'
  felvFiv: 'negative',
  tests: { PKD: 'negative', HCM: 'negative' },
  microchip: '',
  ...extra,
});

export const DEFAULT_MY_CAT = {
  id: 'me',
  name: 'Mochi',
  photo: 'photos/mochi.jpg',
  credit: 'Thomas Haas',
  sex: 'F',
  breed: 'British Shorthair',
  birthDate: '2024-03-12',
  genes: G('B/b', 'd/d', 'a/a', 'L/L', 'o/o', 'b/b'),
  eye: COPPER,
  littersLast12mo: 0,
  health: health('checked', { microchip: '764098100123456' }),
  bio: 'Calm, cuddly blue girl from a champion line.',
};

export const CATS = [
  // ── Males ────────────────────────────────────────────────
  { id: 'earl', photo: 'photos/earl.jpg', credit: 'Oscar Fickel', name: 'Earl Grey', sex: 'M', breed: 'British Shorthair', birthDate: '2022-05-02', genes: G('B/B', 'd/d', 'a/a', 'L/L', 'o', 'A/b'), eye: COPPER,
    owner: 'Ploy', cattery: 'Silverpaw Cattery', area: 'Sukhumvit', km: 6, registry: 'TICA', titles: ['Grand Champion'], likesYou: true,
    health: health('partner'), bio: 'Proven stud with a dense plush coat. Easy-going with new queens.' },
  { id: 'butter', name: 'Butterbean', sex: 'M', breed: 'British Shorthair', birthDate: '2023-01-19', genes: G('B/b', 'd/d', 'a/a', 'L/L', 'O', 'b/b'), eye: COPPER,
    owner: 'Nok', cattery: 'Cream Tea Cats', area: 'Thonglor', km: 12, registry: 'FIFe', titles: ['Champion'], likesYou: true,
    health: health('checked'), bio: 'Cream boy, type B blood, gentle temperament.' },
  { id: 'pounce', photo: 'photos/pounce.jpg', credit: 'Andreea Popa', name: 'Sir Pounce', sex: 'M', breed: 'British Shorthair', birthDate: '2021-11-03', genes: G('B/B', 'D/d', 'a/a', 'L/L', 'o', 'A/A'), eye: COPPER,
    owner: 'Ton', cattery: 'Royal Velvet', area: 'Nonthaburi', km: 18, registry: 'TICA', titles: ['Supreme Champion'], likesYou: false,
    health: health('partner'), bio: 'Jet black with deep copper eyes. Carries blue.' },
  { id: 'cocoa', name: 'Cocoa', sex: 'M', breed: 'British Shorthair', birthDate: '2023-06-25', genes: G('b/b', 'D/D', 'a/a', 'L/L', 'o', 'A/b'), eye: COPPER,
    owner: 'Beam', cattery: 'Choc Box Cattery', area: 'Bang Na', km: 25, registry: 'TICA', titles: [], likesYou: true,
    health: health('uploaded'), bio: 'Rich chocolate, playful and confident.' },
  { id: 'pepper', name: 'Pepper', sex: 'M', breed: 'British Shorthair', birthDate: '2026-04-10', genes: G('B/b', 'D/d', 'a/a', 'L/L', 'o', 'b/b'), eye: COPPER,
    owner: 'Fern', cattery: 'Little Pepper', area: 'Ari', km: 8, registry: 'TICA', titles: [], likesYou: true,
    health: health('checked'), bio: 'Young and promising.' },
  { id: 'bruno', photo: 'photos/bruno.jpg', credit: 'Olga Bi', name: 'Bruno', sex: 'M', breed: 'Scottish Fold', birthDate: '2022-09-14', genes: G('B/b', 'd/d', 'A/a', 'L/L', 'o', 'b/b'), eye: GOLD, fold: true,
    owner: 'Arm', cattery: 'Owlface Folds', area: 'Ratchada', km: 9, registry: 'TICA', titles: ['Champion'], likesYou: true,
    health: health('checked'), bio: 'Blue tabby fold. Only paired with straight-eared cats.' },
  { id: 'thor', photo: 'photos/thor.jpg', credit: 'Magali Merzougui', name: 'Thor', sex: 'M', breed: 'Maine Coon', birthDate: '2021-07-30', genes: G('B/B', 'D/d', 'A/A', 'l/l', 'o', 'A/A'), eye: GREEN,
    owner: 'Mint', cattery: 'Northwind Coons', area: 'Lat Phrao', km: 15, registry: 'CFA', titles: ['Grand Champion'], likesYou: true,
    health: health('partner'), bio: '9 kg of brown tabby fluff.' },
  { id: 'simba', photo: 'photos/simba.jpg', credit: 'Mohammad Karami', name: 'Simba', sex: 'M', breed: 'Persian', birthDate: '2022-02-11', genes: G('B/b', 'D/D', 'A/a', 'l/l', 'O', 'A/b'), eye: COPPER,
    owner: 'Bank', cattery: 'Sunset Persians', area: 'Sathorn', km: 7, registry: 'CFA', titles: ['Champion'], likesYou: false,
    health: health('checked'), bio: 'Red tabby Persian with a sweet face.' },
  { id: 'ghost', name: 'Ghost', sex: 'M', breed: 'British Shorthair', birthDate: '2022-12-01', genes: G('B/B', 'd/d', 'a/a', 'L/L', 'o', 'b/b'), eye: COPPER,
    owner: 'Joy', cattery: '', area: 'Min Buri', km: 30, registry: '', titles: [], likesYou: true,
    health: health('none', { felvFiv: 'untested', tests: { PKD: 'untested', HCM: 'untested' } }), bio: 'Lovely boy, no papers.' },
  { id: 'oliver', name: 'Oliver', sex: 'M', breed: 'British Shorthair', birthDate: '2023-03-08', genes: G('b/bl', 'd/d', 'a/a', 'L/L', 'o', 'A/b'), eye: COPPER,
    owner: 'Pim', cattery: 'Lavender Lane', area: 'Bang Kapi', km: 32, registry: 'FIFe', titles: [], likesYou: false,
    health: health('checked'), bio: 'Rare lilac, carries cinnamon.' },
  { id: 'kai', photo: 'photos/kai.jpg', credit: 'Paul Hanaoka', name: 'Kai', sex: 'M', breed: 'Bengal', birthDate: '2022-08-22', genes: G('B/B', 'D/D', 'A/A', 'L/L', 'o', 'A/A'), eye: GREEN,
    owner: 'Golf', cattery: 'Jungle Gold', area: 'Bang Sue', km: 11, registry: 'TICA', titles: ['Champion'], likesYou: true,
    health: health('partner'), bio: 'Glittered brown spotted Bengal.' },
  { id: 'mango', photo: 'photos/mango.jpg', credit: 'Mariia Paktovskaia', name: 'Mango', sex: 'M', breed: 'British Shorthair', birthDate: '2023-10-05', genes: G('B/b', 'D/d', 'A/a', 'L/l', 'O', 'b/b'), eye: COPPER,
    owner: 'May', cattery: 'Tropical Brits', area: 'Phra Khanong', km: 14, registry: 'TICA', titles: [], likesYou: true,
    health: health('checked'), bio: 'Red tabby, carries blue and longhair.' },
  { id: 'biscuit', name: 'Biscuit', sex: 'M', breed: 'Exotic Shorthair', birthDate: '2022-04-17', genes: G('B/B', 'd/d', 'a/a', 'L/l', 'O', 'A/b'), eye: COPPER,
    owner: 'Nok', cattery: 'Cream Tea Cats', area: 'Thonglor', km: 12, registry: 'CFA', titles: [], likesYou: true,
    health: health('checked'), bio: 'Cream exotic, very flat face, very good boy.' },
  { id: 'smokey', photo: 'photos/smokey.jpg', credit: 'Max Ogden', name: 'Smokey', sex: 'M', breed: 'Norwegian Forest Cat', birthDate: '2021-12-12', genes: G('B/B', 'D/d', 'A/a', 'l/l', 'o', 'A/A'), eye: GREEN,
    owner: 'Ton', cattery: 'Fjord Cats', area: 'Don Mueang', km: 28, registry: 'FIFe', titles: [], likesYou: false,
    health: health('partner'), bio: 'Brown tabby forest cat with a huge ruff. Loves the garden.' },

  { id: 'sunny', photo: 'photos/sunny.jpg', credit: 'Sotirios T. Kokkinos', name: 'Sunny', sex: 'M', breed: 'British Shorthair', birthDate: '2023-08-19', genes: G('B/B', 'D/D', 'A/A', 'L/L', 'o', 'A/b'), eye: GREEN,
    owner: 'Ice', cattery: 'Golden Hour Brits', area: 'Bang Rak', km: 10, registry: 'WCF', titles: [], likesYou: true,
    health: health('partner'), bio: 'Golden boy with green eyes. Very chatty, loves people.' },
  { id: 'bear', photo: 'photos/bear.jpg', credit: 'Carol Gauthier', name: 'Bear', sex: 'M', breed: 'Scottish Fold', birthDate: '2022-01-27', genes: G('B/b', 'D/d', 'A/a', 'L/l', 'o', 'b/b'), eye: COPPER, fold: true,
    owner: 'Nan', cattery: 'Teddy Folds', area: 'Huai Khwang', km: 13, registry: 'TICA', titles: ['Champion'], likesYou: false,
    health: health('checked'), bio: 'Brown tabby fold, type B blood. Only bred to straight-eared girls.' },

  // ── Females (shown when your cat is a stud) ─────────────
  { id: 'luna', photo: 'photos/luna.jpg', credit: 'Grant Durr', name: 'Luna', sex: 'F', breed: 'British Shorthair', birthDate: '2023-02-14', genes: G('B/b', 'D/d', 'a/a', 'L/L', 'O/o', 'A/b'), eye: COPPER,
    owner: 'Fern', cattery: 'Moonlit Brits', area: 'Ari', km: 8, registry: 'TICA', titles: ['Champion'], likesYou: true, littersLast12mo: 1,
    health: health('partner'), bio: 'Tortie queen with a big personality. Excellent mother.' },
  { id: 'kiki', name: 'Kiki', sex: 'F', breed: 'British Shorthair', birthDate: '2022-06-30', genes: G('B/B', 'D/d', 'a/a', 'L/L', 'o/o', 'b/b'), eye: COPPER,
    owner: 'Joy', cattery: 'Royal Velvet', area: 'Nonthaburi', km: 18, registry: 'TICA', titles: [], likesYou: true, littersLast12mo: 0,
    health: health('checked'), bio: 'Black queen, type B blood.' },
  { id: 'nala', name: 'Nala', sex: 'F', breed: 'Maine Coon', birthDate: '2022-10-10', genes: G('B/B', 'D/D', 'A/a', 'l/l', 'O/o', 'A/A'), eye: GREEN,
    owner: 'Mint', cattery: 'Northwind Coons', area: 'Lat Phrao', km: 15, registry: 'CFA', titles: [], likesYou: true, littersLast12mo: 0,
    health: health('partner'), bio: 'Tortie tabby with lynx tips.' },
  { id: 'mali', photo: 'photos/mali.jpg', credit: 'Sergey Semin', name: 'Mali', sex: 'F', breed: 'Scottish Fold', birthDate: '2023-04-04', genes: G('B/b', 'd/d', 'a/a', 'L/L', 'o/o', 'A/b'), eye: GOLD, fold: true,
    owner: 'Arm', cattery: 'Owlface Folds', area: 'Ratchada', km: 9, registry: 'TICA', titles: [], likesYou: true, littersLast12mo: 0,
    health: health('checked'), bio: 'Pale blue fold girl, very calm.' },
  { id: 'pearl', name: 'Pearl', sex: 'F', breed: 'British Shorthair', birthDate: '2021-05-20', genes: G('b/b', 'd/d', 'a/a', 'L/L', 'o/o', 'A/b'), eye: COPPER,
    owner: 'Pim', cattery: 'Lavender Lane', area: 'Bang Kapi', km: 32, registry: 'FIFe', titles: [], likesYou: false, littersLast12mo: 2,
    health: health('uploaded'), bio: 'Lilac queen.' },
  { id: 'hazel', photo: 'photos/hazel.jpg', credit: 'Frederic Christian', name: 'Hazel', sex: 'F', breed: 'British Shorthair', birthDate: '2022-09-03', genes: G('B/B', 'd/d', 'a/a', 'L/L', 'o/o', 'A/A'), eye: COPPER,
    owner: 'Ice', cattery: 'Golden Hour Brits', area: 'Bang Rak', km: 10, registry: 'WCF', titles: ['Grand Champion'], likesYou: true, littersLast12mo: 1,
    health: health('partner'), bio: 'Classic blue with copper eyes. Relaxed, easy to handle.' },
];

export const OWNER_REPLIES = [
  { match: /kitten|litter|colou?r|look/i, text: 'Try the Litter preview tab – it shows what kittens from our two could look like.' },
  { match: /vaccin|health|test|pkd|hcm|vet/i, text: 'All his tests are on his profile. Happy to send the vet’s contact too.' },
  { match: /visit|meet|come|when|date|weekend/i, text: 'Weekends work for me. Would you like to bring her over for a meet first?' },
  { match: /blood|type/i, text: 'Good catch on blood type – our vet can help plan feeding for the first day.' },
  { match: /.*/, text: 'Thanks for the message! Tell me a little about your girl’s temperament?' },
];
