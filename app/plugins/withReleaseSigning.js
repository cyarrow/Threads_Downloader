// Signs release builds with a private keystore when CI provides one through
// ANDROID_KEYSTORE_PATH / ANDROID_KEYSTORE_PASSWORD / ANDROID_KEY_ALIAS /
// ANDROID_KEY_PASSWORD; otherwise keeps the template's debug signing so builds
// stay installable over earlier APKs.
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_SIGNING = `
        release {
            if (System.getenv('ANDROID_KEYSTORE_PATH')) {
                storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD')
            }
        }`;

function patch(gradle) {
  if (gradle.includes("System.getenv('ANDROID_KEYSTORE_PATH')")) return gradle;

  const configs = gradle.indexOf('signingConfigs {');
  const types = gradle.indexOf('buildTypes {');
  const release = gradle.indexOf('release {', types);
  const use = gradle.indexOf('signingConfig signingConfigs.debug', release);
  if (configs < 0 || types < 0 || release < 0 || use < 0) {
    throw new Error('withReleaseSigning: unexpected android/app/build.gradle layout');
  }

  const insertAt = configs + 'signingConfigs {'.length;
  const useEnd = use + 'signingConfig signingConfigs.debug'.length;
  return (
    gradle.slice(0, insertAt) +
    RELEASE_SIGNING +
    gradle.slice(insertAt, use) +
    "signingConfig System.getenv('ANDROID_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug" +
    gradle.slice(useEnd)
  );
}

module.exports = (config) =>
  withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = patch(cfg.modResults.contents);
    return cfg;
  });
