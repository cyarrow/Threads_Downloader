// kind: 'login' (logged out, or no sign yet that the session works),
// 'invalid' (not a Threads post link, or a post that's gone: deleted / private),
// 'parse' (several different posts in a row came back empty while logged in —
// Threads probably changed its page; see fetchHealth.js), 'timeout', 'network'.
// `reclassify`: links of earlier failures that turned out to be 'parse' too.
export class FetchError extends Error {
  constructor(kind, { reclassify = [] } = {}) {
    super(kind);
    this.kind = kind;
    this.reclassify = reclassify;
  }
}
