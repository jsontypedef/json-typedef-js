/** @ignore *//** */

const pattern = /^(\d{4})-(\d{2})-(\d{2})[tT](\d{2}):(\d{2}):(\d{2})(\.\d+)?([zZ]|((\+|-)(\d{2}):(\d{2})))$/

export default function isRFC3339(s: string): boolean {
  const matches = s.match(pattern);
  if (matches === null) {
    return false;
  }

  const year = parseInt(matches[1], 10);
  const month = parseInt(matches[2], 10);
  const day = parseInt(matches[3], 10);
  const hour = parseInt(matches[4], 10);
  const minute = parseInt(matches[5], 10);
  const second = parseInt(matches[6], 10);

  if (month > 12) {
    return false;
  }

  if (day > maxDay(year, month)) {
    return false;
  }

  if (hour > 23) {
    return false;
  }

  if (minute > 59) {
    return false;
  }

  // A value of 60 is permissible as a leap second.
  if (second > 60) {
    return false;
  }

  return true;
}

function maxDay(year: number, month: number) {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return MONTH_LENGTHS[month];
}

function isLeapYear(n: number): boolean {
  return n % 4 === 0 && (n % 100 !== 0 || n % 400 === 0);
}

const MONTH_LENGTHS = [
  0, // months are 1-indexed, this is a dummy element
  31,
  0, // Feb is handled separately
  31,
  30,
  31,
  30,
  31,
  31,
  30,
  31,
  30,
  31,
];
