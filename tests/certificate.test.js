import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCertificate, readExif } from '../js/certificate.js';

const TODAY = new Date('2026-11-24T00:00:00Z');
const cat = { name: 'Mochi', birthDate: '2024-03-12', health: { microchip: '764098100123456' } };
const good = {
  catName: 'Mochi', microchip: '764098100123456', vaccineType: 'FVRCP', vaccineBrand: 'Purevax RCP',
  dateGiven: '2026-06-15', nextDue: '2027-06-15', batchNumber: 'L452871', vetLicense: 'VC 10482',
  vetName: 'Dr. Test', clinic: 'Test Clinic', hasBatchSticker: true,
};
const status = (res, id) => res.checks.find((c) => c.id === id)?.status;

/** Builds a tiny JPEG containing only an EXIF block with Software and DateTime tags. */
function jpegWithExif(software, dateTime) {
  const strings = [software + '\0', dateTime + '\0'];
  const ifdSize = 2 + 2 * 12 + 4;
  const dataStart = 8 + ifdSize;
  const tiffLen = dataStart + strings.reduce((s, x) => s + x.length, 0);
  const tiff = new DataView(new ArrayBuffer(tiffLen));
  tiff.setUint16(0, 0x4949); // "II" little-endian
  tiff.setUint16(2, 42, true);
  tiff.setUint32(4, 8, true);
  tiff.setUint16(8, 2, true);
  let dataOff = dataStart;
  [0x0131, 0x0132].forEach((tag, i) => {
    const e = 10 + i * 12;
    tiff.setUint16(e, tag, true);
    tiff.setUint16(e + 2, 2, true);
    tiff.setUint32(e + 4, strings[i].length, true);
    tiff.setUint32(e + 8, dataOff, true);
    for (const ch of strings[i]) tiff.setUint8(dataOff++, ch.charCodeAt(0));
  });
  const app1Len = 2 + 6 + tiffLen;
  const out = new Uint8Array(4 + app1Len + 2);
  out.set([0xff, 0xd8, 0xff, 0xe1, app1Len >> 8, app1Len & 0xff, 0x45, 0x78, 0x69, 0x66, 0, 0]);
  out.set(new Uint8Array(tiff.buffer), 12);
  out.set([0xff, 0xda], 4 + app1Len);
  return out.buffer;
}

test('a consistent certificate earns "Checked"', () => {
  const r = checkCertificate(good, cat, { type: 'image/jpeg', size: 900_000, exif: { software: 'iOS 18.1', dateTime: '2026:06:16 10:00:00' } }, TODAY);
  assert.equal(r.fails, 0);
  assert.equal(r.verdict.level, 'checked');
});

test('wrong microchip is a failure', () => {
  const r = checkCertificate({ ...good, microchip: '764098100999999' }, cat, null, TODAY);
  assert.equal(status(r, 'chip-match'), 'fail');
  assert.equal(r.verdict.level, 'rejected');
});

test('future vaccination date is a failure', () => {
  const r = checkCertificate({ ...good, dateGiven: '2026-12-20', nextDue: '2027-12-20' }, cat, null, TODAY);
  assert.equal(status(r, 'future'), 'fail');
});

test('vaccine given before the minimum age fails', () => {
  const r = checkCertificate({ ...good, dateGiven: '2024-03-20' }, cat, null, TODAY);
  assert.equal(status(r, 'age'), 'fail');
});

test('unknown product and missing sticker are warnings', () => {
  const r = checkCertificate({ ...good, vaccineBrand: 'SuperVax 5', hasBatchSticker: false }, cat, null, TODAY);
  assert.equal(status(r, 'brand'), 'warn');
  assert.equal(status(r, 'sticker'), 'warn');
  assert.equal(r.verdict.level, 'review');
});

test('expired vaccination is flagged', () => {
  const r = checkCertificate({ ...good, dateGiven: '2025-01-10', nextDue: '2026-01-10' }, cat, null, TODAY);
  assert.equal(status(r, 'current'), 'warn');
});

test('readExif reads Software and DateTime from a JPEG', () => {
  const exif = readExif(jpegWithExif('Adobe Photoshop 25.0', '2026:06:16 09:30:00'));
  assert.deepEqual(exif, { software: 'Adobe Photoshop 25.0', dateTime: '2026:06:16 09:30:00' });
});

test('readExif returns null for non-JPEG data', () => {
  assert.equal(readExif(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer), null);
});

test('a photo saved by editing software is rejected', () => {
  const exif = readExif(jpegWithExif('Adobe Photoshop 25.0', '2026:06:16 09:30:00'));
  const r = checkCertificate(good, cat, { type: 'image/jpeg', size: 500_000, exif }, TODAY);
  assert.equal(status(r, 'img-edit'), 'fail');
  assert.equal(r.verdict.level, 'rejected');
});

test('a JPEG with no metadata is a warning (likely a screenshot)', () => {
  const r = checkCertificate(good, cat, { type: 'image/jpeg', size: 500_000, exif: null }, TODAY);
  assert.equal(status(r, 'img-edit'), 'warn');
});
