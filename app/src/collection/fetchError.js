// kind: 'login' (Threads showed no post data — usually logged out),
// 'invalid' (not a Threads post link), 'timeout', 'network'.
export class FetchError extends Error {
  constructor(kind) {
    super(kind);
    this.kind = kind;
  }
}
