// 個人筆記: a short plain-text note per post (「為什麼收藏」). Pure; tested in Node.
// The post model holds '' for "no note"; the database stores NULL.

export const NOTE_MAX = 500;

// What gets stored: trimmed, at most NOTE_MAX characters, '' when blank.
export function normalizeNote(text) {
  if (typeof text !== 'string') return '';
  return [...text.trim()].slice(0, NOTE_MAX).join('').trim();
}

// A note typed in the save sheet for a link that turned out to be saved already:
// keep the old note and add the new one on its own line.
export function mergeNote(existing, typed) {
  const a = normalizeNote(existing);
  const b = normalizeNote(typed);
  if (!b || a === b) return a;
  return a ? normalizeNote(`${a}\n${b}`) : b;
}

// First line, for the one-line marker on a wall card.
export function noteFirstLine(note) {
  return normalizeNote(note).split('\n')[0];
}
