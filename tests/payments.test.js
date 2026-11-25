import test from 'node:test';
import assert from 'node:assert/strict';
import { TEST_CARDS, chargeCard, formatCardNumber, formatCountdown, qrStatus, QR_LIFETIME } from '../js/payments.js';

test('the success test card goes through', () => {
  assert.deepEqual(chargeCard('4242 4242 4242 4242'), { ok: true, last4: '4242' });
});

test('the decline test card is declined', () => {
  const r = chargeCard('4000000000000002');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'declined');
  assert.match(r.message, /declined/);
});

test('the insufficient funds card fails with its own reason', () => {
  const r = chargeCard('4000 0000 0000 9995');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'insufficient_funds');
});

test('a card that is not a test card is refused', () => {
  assert.equal(chargeCard('5555 5555 5555 4444').code, 'unknown_card');
});

test('every test card has a known outcome', () => {
  for (const c of TEST_CARDS) assert.equal(chargeCard(c.number).ok, c.outcome === 'success');
});

test('card numbers are grouped in fours', () => {
  assert.equal(formatCardNumber('4000000000009995'), '4000 0000 0000 9995');
});

test('countdown formats minutes and seconds', () => {
  assert.equal(formatCountdown(600), '10:00');
  assert.equal(formatCountdown(65), '1:05');
  assert.equal(formatCountdown(0.4), '0:01');
  assert.equal(formatCountdown(-3), '0:00');
});

test('a QR code waits, then expires, unless it was paid', () => {
  const t0 = Date.UTC(2026, 0, 1);
  assert.equal(qrStatus(t0, t0 + 1000), 'waiting');
  assert.equal(qrStatus(t0, t0 + QR_LIFETIME * 1000), 'expired');
  assert.equal(qrStatus(t0, t0 + QR_LIFETIME * 1000, true), 'paid');
});
