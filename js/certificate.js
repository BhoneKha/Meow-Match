// Level-1 vaccination certificate checks: automated consistency and
// tamper heuristics. This cannot prove a certificate is genuine – it flags
// the ones a human (or a partner clinic) should look at.

export const KNOWN_VACCINES = {
  FVRCP: ['Purevax RCP', 'Purevax RCPCh', 'Nobivac Tricat Trio', 'Felocell 3', 'Feligen CRP', 'Fel-O-Vax PCT', 'Versifel FVRCP'],
  Rabies: ['Rabisin', 'Nobivac Rabies', 'Purevax Rabies', 'Defensor 3', 'Imrab 3'],
  FeLV: ['Purevax FeLV', 'Leucogen', 'Nobivac FeLV', 'Fel-O-Vax Lv-K'],
};

const MIN_AGE_WEEKS = { FVRCP: 6, Rabies: 12, FeLV: 8 };
const EDITING_SOFTWARE = /photoshop|gimp|canva|picsart|snapseed|lightroom|pixlr|affinity|facetune/i;
const DAY = 86_400_000;

const parseDate = (s) => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Minimal EXIF reader: returns {software, dateTime} from a JPEG's IFD0, or null.
 * @param {ArrayBuffer} buffer
 */
export function readExif(buffer) {
  const v = new DataView(buffer);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
  let off = 2;
  while (off + 4 <= v.byteLength) {
    const marker = v.getUint16(off);
    const len = v.getUint16(off + 2);
    if (marker === 0xffda) break; // start of image data – no more metadata
    if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) {
      const tiff = off + 10;
      const little = v.getUint16(tiff) === 0x4949;
      const u16 = (o) => v.getUint16(o, little);
      const u32 = (o) => v.getUint32(o, little);
      const ifd = tiff + u32(tiff + 4);
      const result = {};
      for (let i = 0, n = u16(ifd); i < n; i++) {
        const e = ifd + 2 + i * 12;
        const tag = u16(e);
        if ((tag !== 0x0131 && tag !== 0x0132) || u16(e + 2) !== 2) continue;
        const count = u32(e + 4);
        const start = count <= 4 ? e + 8 : tiff + u32(e + 8);
        let s = '';
        for (let j = 0; j < count && start + j < v.byteLength; j++) {
          const c = v.getUint8(start + j);
          if (c === 0) break;
          s += String.fromCharCode(c);
        }
        result[tag === 0x0131 ? 'software' : 'dateTime'] = s;
      }
      return result;
    }
    off += 2 + len;
  }
  return null;
}

/**
 * @param {object} form   certificate fields typed by the owner (or read by OCR)
 * @param {object} cat    the profile the certificate is attached to
 * @param {object|null} image  {type, size, exif} of the uploaded photo
 */
export function checkCertificate(form, cat, image = null, today = new Date()) {
  const checks = [];
  const add = (id, status, label, detail = '') => checks.push({ id, status, label, detail });

  const required = ['catName', 'microchip', 'vetName', 'vetLicense', 'clinic', 'vaccineType', 'vaccineBrand', 'dateGiven', 'nextDue', 'batchNumber'];
  const missing = required.filter((k) => !String(form[k] || '').trim());
  if (missing.length) add('required', 'fail', 'All fields filled in', `Missing: ${missing.join(', ')}`);
  else add('required', 'pass', 'All fields filled in');

  // Identity
  const chip = String(form.microchip || '').replace(/\s/g, '');
  if (!/^\d{15}$/.test(chip)) add('chip-format', 'fail', 'Microchip is a 15-digit ISO number', `Got "${form.microchip || ''}"`);
  else if (cat.health?.microchip && chip !== cat.health.microchip) add('chip-match', 'fail', 'Microchip matches this cat', `Certificate ${chip} ≠ profile ${cat.health.microchip}`);
  else add('chip-match', 'pass', 'Microchip matches this cat');

  if (form.catName && norm(form.catName) !== norm(cat.name) && !norm(form.catName).includes(norm(cat.name))) {
    add('name', 'warn', 'Name matches this cat', `"${form.catName}" vs profile "${cat.name}"`);
  } else if (form.catName) add('name', 'pass', 'Name matches this cat');

  // Dates
  const given = parseDate(form.dateGiven);
  const due = parseDate(form.nextDue);
  const birth = parseDate(cat.birthDate);
  if (!given || !due) {
    add('dates', 'fail', 'Dates are valid', 'Use YYYY-MM-DD');
  } else {
    if (given > today) add('future', 'fail', 'Vaccination date is not in the future', form.dateGiven);
    else add('future', 'pass', 'Vaccination date is not in the future');

    const minWeeks = MIN_AGE_WEEKS[form.vaccineType] ?? 6;
    if (birth && given - birth < minWeeks * 7 * DAY) {
      add('age', 'fail', `Cat was at least ${minWeeks} weeks old`, `Given ${Math.floor((given - birth) / DAY)} days after birth`);
    } else add('age', 'pass', `Cat was at least ${minWeeks} weeks old`);

    const gapDays = (due - given) / DAY;
    if (gapDays <= 0) add('interval', 'fail', 'Next-due date comes after the vaccination', '');
    else if (gapDays < 14 || gapDays > 3 * 366) add('interval', 'warn', 'Booster interval is plausible', `${Math.round(gapDays)} days`);
    else add('interval', 'pass', 'Booster interval is plausible');

    if (due < today) add('current', 'warn', 'Vaccination is still current', `Expired ${form.nextDue}`);
    else add('current', 'pass', 'Vaccination is still current');
  }

  // Product
  const list = KNOWN_VACCINES[form.vaccineType] || [];
  if (list.some((b) => norm(b) === norm(form.vaccineBrand))) add('brand', 'pass', 'Vaccine product is recognised');
  else add('brand', 'warn', 'Vaccine product is recognised', `"${form.vaccineBrand || ''}" is not in our ${form.vaccineType || ''} list`);

  if (/^[A-Z0-9-]{4,14}$/i.test(String(form.batchNumber || '').trim())) add('batch', 'pass', 'Batch number looks valid');
  else add('batch', 'warn', 'Batch number looks valid', `"${form.batchNumber || ''}"`);

  if (form.hasBatchSticker) add('sticker', 'pass', 'Peel-off batch sticker is in the photo');
  else add('sticker', 'warn', 'Peel-off batch sticker is in the photo', 'Real certificates carry the sticker from the vial');

  if (/\d/.test(String(form.vetLicense || ''))) add('license', 'pass', 'Vet licence number given', 'Level 2 checks it against the Veterinary Council register');
  else add('license', 'warn', 'Vet licence number given');

  // Photo
  if (image) {
    if (!/^image\/(jpeg|png|webp|heic)$/.test(image.type)) add('img-type', 'fail', 'Photo is an image file', image.type);
    if (image.exif?.software && EDITING_SOFTWARE.test(image.exif.software)) {
      add('img-edit', 'fail', 'Photo was not edited', `Saved by "${image.exif.software}"`);
    } else if (image.type === 'image/jpeg' && !image.exif) {
      add('img-edit', 'warn', 'Photo has camera metadata', 'No EXIF – screenshot or re-saved image');
    } else add('img-edit', 'pass', 'Photo was not edited');

    const shot = image.exif?.dateTime && parseDate(image.exif.dateTime.slice(0, 10).replace(/:/g, '-'));
    if (shot && given && shot < given) add('img-date', 'warn', 'Photo taken after the vaccination', `Photo ${shot.toISOString().slice(0, 10)}`);
    if (image.size < 40_000) add('img-size', 'warn', 'Photo is high enough resolution', `${Math.round(image.size / 1000)} KB`);
  } else {
    add('img', 'warn', 'Photo of the certificate uploaded', 'Without a photo only the typed details are checked');
  }

  const fails = checks.filter((c) => c.status === 'fail').length;
  const warns = checks.filter((c) => c.status === 'warn').length;
  const verdict =
    fails > 0
      ? { level: 'rejected', label: 'Rejected', note: 'Fix the failed checks and upload again.' }
      : warns >= 2
        ? { level: 'review', label: 'Needs review', note: 'Sent to a person for a manual look.' }
        : { level: 'checked', label: 'Checked', note: 'Earns the yellow "Checked" badge.' };
  return { checks, verdict, fails, warns };
}
