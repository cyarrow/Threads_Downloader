import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import { APK_MIME, apkFileName, checkDownload, downloadFailure, lacksSpace, staleApkNames } from './updateInstall';

// Android: download the update APK into the app's cache, check it, and hand it to
// the system installer. The web build (apkInstaller.web.js) opens the link instead.
export const installsInApp = true;

const FLAG_GRANT_READ_URI_PERMISSION = 1;
const PACKAGE = Constants.expoConfig?.android?.package || 'com.cyarrow.threadsdownloader';

class InstallError extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

function clearStale(keep) {
  try {
    for (const entry of Paths.cache.list()) {
      if (entry instanceof File && staleApkNames([entry.name], keep).length) entry.delete();
    }
  } catch {
    // Old copies only take space; never block an update on cleaning them.
  }
}

// Resolves to the checked File. Throws an InstallError whose `reason` is a key of
// updateInstall.FAILURE_TEXT. `onProgress(written, total)`.
export async function downloadApk(release, onProgress) {
  const name = apkFileName(release.build);
  clearStale(name);
  let space = 0;
  try {
    space = Paths.availableDiskSpace;
  } catch {
    // Unknown free space: let the download try.
  }
  if (lacksSpace(space, release.size)) throw new InstallError('space');
  const dest = new File(Paths.cache, name);
  // Always download afresh: a copy left from an earlier attempt may be partial.
  if (dest.exists) dest.delete();
  let total = -1;
  const task = File.createDownloadTask(release.apkUrl, dest, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      total = totalBytes;
      onProgress(bytesWritten, totalBytes);
    },
  });
  let file;
  try {
    file = await task.downloadAsync();
  } catch (error) {
    throw new InstallError(downloadFailure(error));
  }
  const result = file || dest;
  const problem = checkDownload({ size: result.exists ? result.size : 0, expected: release.size, total });
  if (problem) {
    if (result.exists) result.delete();
    throw new InstallError(problem);
  }
  return result;
}

// Opens Android's installer on the downloaded file. Resolves once the user is
// back in the app (a successful install replaces the app, so it never resolves
// then). Throws InstallError('installer') when no installer opened.
export async function openInstaller(file) {
  try {
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: file.contentUri,
      type: APK_MIME,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
  } catch {
    throw new InstallError('installer');
  }
}

// The system page where the user allows this app to install updates
// (「安裝不明應用程式」).
export async function openInstallPermission() {
  try {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
      data: `package:${PACKAGE}`,
    });
  } catch {
    // Some phones have no such page; the installer then asks by itself.
  }
}
