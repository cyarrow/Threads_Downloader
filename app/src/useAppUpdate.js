import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { checkForUpdate } from './updates';

// The newer APK on GitHub Releases, if any: checked at launch (the wall's
// banner) and on demand from 設定 (`checkNow`, which reports in `status`).
export function useAppUpdate() {
  const { buildNumber, releasesRepo } = Constants.expoConfig?.extra ?? {};
  const version = `${Constants.expoConfig?.version ?? ''} (build ${buildNumber ?? '-'})`;
  const [update, setUpdate] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (releasesRepo && buildNumber) checkForUpdate(releasesRepo, buildNumber).then(setUpdate);
  }, [releasesRepo, buildNumber]);

  const checkNow = async () => {
    if (!releasesRepo) return;
    setStatus('檢查中…');
    const found = await checkForUpdate(releasesRepo, buildNumber || 0);
    setUpdate(found);
    setStatus(found ? `${found.name} 可以下載` : '已是最新版本');
  };

  return { update, dismiss: () => setUpdate(null), status, checkNow, version };
}
