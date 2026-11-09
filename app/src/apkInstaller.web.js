// Web build (browser tests): no installer to hand an APK to, so updates open the
// download link like before. Same exports as apkInstaller.js.
export const installsInApp = false;

export async function downloadApk() {
  throw new Error('downloadApk is Android only');
}

export async function openInstaller() {}

export async function openInstallPermission() {}
