// Pure rules for telling apart why posts fail to load, and for the wall's
// failure banner. No React / native imports (tested in Node).
//
// The hidden WebView reports one of these outcomes per fetch:
//   { type: 'ok' }                       post data found
//   { type: 'loggedOut' }                Threads sent the page to /login
//   { type: 'miss', url, structural }    page loaded, but no post data was found.
//       structural: the page DID contain JSON mentioning the post (with media
//       keys), yet the post object couldn't be picked out of it.
//   { type: 'error', kind }              timeout / network; says nothing either way
//
// A single miss is usually a deleted or private post ('invalid'), or — when we
// have no sign the session works — a logged-out page ('login'). But if the
// session demonstrably works and several *different* posts by *different*
// authors miss in a row, the likelier story is that Threads changed its page
// and our reader no longer finds posts ('parse').
import { FetchError } from './fetchError.js';

// Consecutive misses (distinct posts) needed before blaming the parser...
export const PARSE_MIN_POSTS = 3;
// ...spread over at least this many authors (one person deleting posts isn't breakage).
export const PARSE_MIN_AUTHORS = 2;
// Structural misses are stronger evidence: the data was there and we failed to read it.
export const STRUCTURAL_MIN_POSTS = 2;

export function initialHealth() {
  // loggedIn: a fetch succeeded, or the login sheet completed, since the last
  // time Threads bounced us to /login. streak: misses since the last success.
  return { loggedIn: false, streak: [] };
}

// The author in /@user/post/CODE links; null for /t/ and /share/ links.
export function authorOf(url) {
  const m = typeof url === 'string' && url.match(/threads\.(?:net|com)\/@([\w.]+)\/post\//i);
  return m ? m[1].toLowerCase() : null;
}

function distinct(list) {
  return new Set(list).size;
}

// Whether the current streak of misses looks like the reader is broken.
export function looksBroken({ loggedIn, streak }) {
  const structural = streak.filter((m) => m.structural).map((m) => m.url);
  if (distinct(structural) >= STRUCTURAL_MIN_POSTS) return true;
  if (!loggedIn) return false;
  const posts = distinct(streak.map((m) => m.url));
  // A link without an author (/t/, /share/) counts as its own author.
  const authors = distinct(streak.map((m) => m.author || `?${m.url}`));
  return posts >= PARSE_MIN_POSTS && authors >= PARSE_MIN_AUTHORS;
}

// Folds one fetch outcome into the state. Returns { state, kind, reclassify }:
// kind is null for 'ok', else the FetchError kind for this fetch; reclassify
// lists earlier failed links of the same streak that should now read 'parse'.
export function recordOutcome(state, outcome) {
  switch (outcome.type) {
    case 'ok':
      return { state: { loggedIn: true, streak: [] }, kind: null, reclassify: [] };
    case 'loggedOut':
      return { state: { loggedIn: false, streak: [] }, kind: 'login', reclassify: [] };
    case 'miss': {
      const entry = { url: outcome.url, author: authorOf(outcome.url), structural: !!outcome.structural };
      const next = { loggedIn: state.loggedIn, streak: [...state.streak, entry] };
      if (looksBroken(next)) {
        const reclassify = [...new Set(state.streak.map((m) => m.url))].filter((u) => u !== entry.url);
        return { state: next, kind: 'parse', reclassify };
      }
      // Data that was there but unreadable isn't a deleted post; keep it retryable.
      const kind = entry.structural ? 'network' : state.loggedIn ? 'invalid' : 'login';
      return { state: next, kind, reclassify: [] };
    }
    default:
      return { state, kind: outcome.kind || 'network', reclassify: [] };
  }
}

// The login sheet reported a working session. Misses from before don't say
// anything about the reader any more (they were probably the logged-out page).
export function noteLogin() {
  return { loggedIn: true, streak: [] };
}

// Mutable wrapper the fetchers keep for the app's lifetime. record() returns
// null for a success, else the FetchError to reject that fetch with.
export function createHealthTracker() {
  let state = initialHealth();
  return {
    record(outcome) {
      const r = recordOutcome(state, outcome);
      state = r.state;
      return r.kind ? new FetchError(r.kind, { reclassify: r.reclassify }) : null;
    },
    noteLogin() {
      state = noteLogin();
    },
  };
}

// Short label on a failed card.
export function failureLabel(error) {
  switch (error) {
    case 'login':
      return '需要登入 Threads';
    case 'parse':
      return '暫時讀不到內容';
    case 'invalid':
      return '可能已刪除或不公開';
    default:
      return '讀取失敗';
  }
}

// What the wall's health banner should say, or null for no banner.
// Login problems come first (they're fixable right now), then suspected
// breakage, then a pile of ordinary failures (two or more).
// Returns { kind: 'login' | 'parse' | 'failed', count }.
export function failureSummary(posts) {
  let login = 0;
  let parse = 0;
  let other = 0;
  for (const p of posts) {
    if (p.status !== 'failed') continue;
    if (p.error === 'login') login++;
    else if (p.error === 'parse') parse++;
    else other++;
  }
  if (login) return { kind: 'login', count: login };
  if (parse) return { kind: 'parse', count: parse + other };
  if (other >= 2) return { kind: 'failed', count: other };
  return null;
}
