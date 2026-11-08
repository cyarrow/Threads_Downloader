// The store updates the screen first and writes SQLite after (optimistic), so a
// write that fails would leave the screen showing something the database never
// stored — until the next launch quietly brings the old data back. guardRepo wraps
// every write: a failure is reported once through `onFail(error, method)` (the
// store then reloads everything from the database and tells the user) and the call
// resolves to undefined instead of throwing into a button handler. Reads pass
// through untouched.
// Pure module (no React Native imports) so Node can test it.

export const WRITE_METHODS = [
  'insertPost',
  'updatePost',
  'deletePost',
  'setPostTags',
  'insertTag',
  'updateTag',
  'deleteTag',
  'mergeTag',
  'insertRule',
  'updateRule',
  'deleteRule',
  'setMeta',
];

export function guardRepo(repo, onFail) {
  const guarded = {};
  for (const name of WRITE_METHODS) {
    if (typeof repo[name] !== 'function') continue;
    guarded[name] = async (...args) => {
      try {
        return await repo[name](...args);
      } catch (error) {
        onFail(error, name);
        return undefined;
      }
    };
  }
  return new Proxy(repo, {
    get(target, prop) {
      if (Object.prototype.hasOwnProperty.call(guarded, prop)) return guarded[prop];
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
