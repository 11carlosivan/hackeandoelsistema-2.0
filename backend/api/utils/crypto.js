import crypto from 'node:crypto';

export function sha256Hex(value, pepper = '') {
  return crypto.createHash('sha256').update(`${pepper}${value ?? ''}`).digest('hex');
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000);
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}
