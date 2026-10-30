// Standard ID formats used across the system.
//
//   Employee      EMP-0001        Ingredient   ING-0001
//   Material      MAT-0001        Menu item    MNT-0001
//   Promotion     PRM-0001        Batch        BTH-103026-01
//   Transaction   SLS-103026-001  Document     D<type>-103026-001
//
// Older records used the format without hyphens (EMP001, B10302601). They keep their
// IDs; the helpers below read both formats so new numbers continue the sequence.

export const ID_PREFIX = Object.freeze({
  employee:   'EMP',
  ingredient: 'ING',
  material:   'MAT',
  menuItem:   'MNT',
  promotion:  'PRM',
  batch:      'BTH',
});

const pad = (value, width) => String(value).padStart(width, '0');

export const datePart = (date = new Date()) =>
  `${pad(date.getMonth() + 1, 2)}${pad(date.getDate(), 2)}${String(date.getFullYear()).slice(-2)}`;

export const formatId = (prefix, number, width = 4) => `${prefix}-${pad(number, width)}`;

// Number inside an ID such as 'EMP-0007' or the legacy 'EMP007'; 0 when it does not match.
export const parseIdNumber = (id, ...prefixes) => {
  const text = String(id || '');
  for (const prefix of prefixes) {
    const match = text.match(new RegExp(`^${prefix}-?(\\d+)$`));
    if (match) return parseInt(match[1], 10);
  }
  return 0;
};

// Next ID for a prefix given the IDs that already exist. `legacyPrefixes` are older
// spellings of the same prefix (for example 'PROMO' for 'PRM').
export const nextId = (prefix, existingIds, legacyPrefixes = []) => {
  const highest = existingIds.reduce(
    (max, id) => Math.max(max, parseIdNumber(id, prefix, ...legacyPrefixes)),
    0,
  );
  return formatId(prefix, highest + 1);
};

export const formatBatchId = (dateStr, count) => {
  const d = new Date(dateStr);
  return `${ID_PREFIX.batch}-${datePart(d)}-${pad(count + 1, 2)}`;
};

// Prefix shared by every ID of one day, e.g. 'SLS-103026-'.
export const dailyPrefix = (code, date = new Date()) => `${code}-${datePart(date)}-`;
