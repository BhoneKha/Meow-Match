// Test-mode payment logic. Nothing here talks to a real payment provider.
// The outcome of a card payment depends only on which test card is used,
// the same way Stripe's test mode works, so every result can be shown on purpose.

export const TEST_CARDS = [
  { number: '4242424242424242', label: 'Succeeds', brand: 'Visa', outcome: 'success' },
  { number: '4000000000000002', label: 'Declined', brand: 'Visa', outcome: 'declined' },
  { number: '4000000000009995', label: 'Not enough funds', brand: 'Visa', outcome: 'insufficient_funds' },
];

export const DECLINE_MESSAGES = {
  declined: 'Your card was declined. Try another card or payment method.',
  insufficient_funds: 'Your card doesn’t have enough funds. Try another card or payment method.',
  unknown_card: 'This isn’t one of the test cards. Pick one from the list.',
};

/** How long a PromptPay QR code stays valid, in seconds. */
export const QR_LIFETIME = 10 * 60;

/** "4242424242424242" → "4242 4242 4242 4242" */
export const formatCardNumber = (n) => n.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');

/** Decides what happens when a test card is charged. */
export function chargeCard(number) {
  const digits = String(number).replace(/\D/g, '');
  const card = TEST_CARDS.find((c) => c.number === digits);
  if (!card) return { ok: false, code: 'unknown_card', message: DECLINE_MESSAGES.unknown_card };
  if (card.outcome === 'success') return { ok: true, last4: digits.slice(-4) };
  return { ok: false, code: card.outcome, message: DECLINE_MESSAGES[card.outcome] };
}

/** 600 → "10:00", 65 → "1:05", negative → "0:00" */
export function formatCountdown(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** State of a PromptPay QR code, given when it was created and whether money arrived. */
export function qrStatus(createdAt, now, paid = false) {
  if (paid) return 'paid';
  return (now - createdAt) / 1000 >= QR_LIFETIME ? 'expired' : 'waiting';
}
