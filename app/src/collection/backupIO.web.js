// Web build (E2E tests): keep the last export in memory so import can read it back.
let last = null;

export async function shareBackup(json) {
  last = json;
}

export async function pickBackup() {
  return last;
}
