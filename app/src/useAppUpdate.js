import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import { checkForUpdate } from './updates';
import { downloadApk, installsInApp, openInstallPermission, openInstaller } from './apkInstaller';
import { FAILURE_TEXT, progressChanged, progressLabel } from './updateInstall';

// The newer APK on GitHub Releases, if any: checked at launch (the wall's
// banner) and on demand from 設定 (`checkNow`, which reports in `status`).
// `start()` downloads it inside the app and opens Android's installer; `phase`:
//   idle | downloading { written, total } | ready (back from the installer
//   without updating: install again, or allow installs) | failed { reason, message }
export function useAppUpdate() {
  const { buildNumber, releasesRepo } = Constants.expoConfig?.extra ?? {};
  const version = `${Constants.expoConfig?.version ?? ''} (build ${buildNumber ?? '-'})`;
  const [update, setUpdate] = useState(null);
  const [status, setStatus] = useState(null);
  const [install, setInstall] = useState({ phase: 'idle' });
  const busy = useRef(false);
  const file = useRef(null);

  useEffect(() => {
    if (releasesRepo && buildNumber) checkForUpdate(releasesRepo, buildNumber).then(setUpdate);
  }, [releasesRepo, buildNumber]);

  const checkNow = async () => {
    if (!releasesRepo) return;
    setStatus('檢查中…');
    const found = await checkForUpdate(releasesRepo, buildNumber || 0);
    setUpdate(found);
    setStatus(found ? `build ${found.build} 可更新，點一下` : '已是最新版本');
  };

  const fail = (reason) => setInstall({ phase: 'failed', reason, message: FAILURE_TEXT[reason] || FAILURE_TEXT.network });

  const runInstaller = async () => {
    try {
      await openInstaller(file.current);
      // Back in the app: the user cancelled, or Android blocked the install.
      setInstall({ phase: 'ready' });
    } catch (e) {
      fail(e.reason || 'installer');
    }
  };

  const start = async () => {
    if (!update || busy.current) return;
    if (!installsInApp) {
      Linking.openURL(update.apkUrl);
      return;
    }
    if (install.phase === 'ready' && file.current?.exists) {
      runInstaller();
      return;
    }
    busy.current = true;
    let shown = null;
    setInstall({ phase: 'downloading', written: 0, total: update.size || -1 });
    try {
      file.current = await downloadApk(update, (written, total) => {
        if (!progressChanged(shown, written, total)) return;
        shown = { written, total };
        setInstall({ phase: 'downloading', written, total });
      });
    } catch (e) {
      busy.current = false;
      fail(e.reason || 'network');
      return;
    }
    busy.current = false;
    await runInstaller();
  };

  // 設定 › 檢查更新: checks, or once a newer build is known, installs it; its
  // value line follows the download.
  const settingsStatus =
    install.phase === 'downloading'
      ? `下載中 ${progressLabel(install.written, install.total)}`
      : install.phase === 'ready'
        ? '已下載，點一下安裝'
        : install.phase === 'failed'
          ? install.message
          : update
            ? `build ${update.build} 可更新，點一下`
            : status;
  const settingsPress = () => (update ? start() : checkNow());

  return {
    update,
    settingsStatus,
    settingsPress,
    dismiss: () => {
      setUpdate(null);
      if (!busy.current) setInstall({ phase: 'idle' });
    },
    status,
    checkNow,
    version,
    install,
    start,
    allowInstalls: openInstallPermission,
    openInBrowser: () => update && Linking.openURL(update.apkUrl),
  };
}
