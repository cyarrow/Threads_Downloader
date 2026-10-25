// Build-time values layered on top of app.json. CI sets BUILD_NUMBER (the workflow
// run number) so every APK gets a higher versionCode, and the app can compare its
// own build number against the latest GitHub release.
const build = Number(process.env.BUILD_NUMBER) || 1;

module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, versionCode: build },
  extra: { ...config.extra, buildNumber: build, releasesRepo: 'cyarrow/Threads_Downloader' },
});
