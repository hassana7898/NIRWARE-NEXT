const {
  withAndroidManifest,
  withGradleProperties,
  withAppBuildGradle,
} = require('@expo/config-plugins');

/**
 * Expo Config Plugin for Maximum Android Device Compatibility & Installability:
 * 1. Enables both APK Signature Scheme v1 (JAR signing) and v2 (APK Signing Block).
 * 2. Forces android:extractNativeLibs="true" so native .so files are extracted to device storage.
 * 3. Sets expo.useLegacyPackaging=true (compatible with AGP 8.1+).
 */
const withAndroidCompatibility = (config) => {
  // 1. AndroidManifest: Force extractNativeLibs="true"
  config = withAndroidManifest(config, (modConfig) => {
    const mainApplication = modConfig.modResults.manifest.application?.[0];
    if (mainApplication) {
      mainApplication.$['android:extractNativeLibs'] = 'true';
    }
    return modConfig;
  });

  // 2. gradle.properties: Force legacy packaging (remove obsolete AGP 8.1 flags)
  config = withGradleProperties(config, (modConfig) => {
    modConfig.modResults = modConfig.modResults.filter(
      (item) =>
        item.type !== 'property' ||
        (item.key !== 'expo.useLegacyPackaging' &&
          item.key !== 'android.bundle.enableUncompressedNativeLibs')
    );
    modConfig.modResults.push({
      type: 'property',
      key: 'expo.useLegacyPackaging',
      value: 'true',
    });
    return modConfig;
  });

  // 3. android/app/build.gradle: Explicit v1 and v2 signing in all signing configs
  config = withAppBuildGradle(config, (modConfig) => {
    let buildGradle = modConfig.modResults.contents;

    // Inject v1SigningEnabled and v2SigningEnabled into debug signingConfig
    if (!buildGradle.includes('v1SigningEnabled true')) {
      buildGradle = buildGradle.replace(
        /debug\s*\{([\s\S]*?keyPassword[^\n]*\n)/,
        (m, p1) => `debug {${p1}            v1SigningEnabled true\n            v2SigningEnabled true\n`
      );
    }

    // Configure signingConfigs.all so all signing configs (debug, release, EAS cloud) enforce v1 and v2 signing
    if (!buildGradle.includes('signingConfigs.all')) {
      buildGradle = buildGradle.replace(
        /(signingConfigs\s*\{[\s\S]*?\n\s*\})\s*(?=buildTypes)/,
        (m, p1) => `${p1}\n    signingConfigs.all {\n        v1SigningEnabled true\n        v2SigningEnabled true\n    }\n    `
      );
    }

    // Ensure useLegacyPackaging in packagingOptions is true
    if (buildGradle.includes("useLegacyPackaging (findProperty('expo.useLegacyPackaging')")) {
      buildGradle = buildGradle.replace(
        "useLegacyPackaging (findProperty('expo.useLegacyPackaging')?.toBoolean() ?: false)",
        "useLegacyPackaging true"
      );
    }

    modConfig.modResults.contents = buildGradle;
    return modConfig;
  });

  return config;
};

module.exports = withAndroidCompatibility;
