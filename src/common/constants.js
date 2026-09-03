export const QS = Object.freeze({
  VERSION: '1.0.1',
  REVISION: 'R2',
  PLATFORM: 'Chrome',
  PACKAGE_NAME: 'quietshield.chrome',
  DEFAULT_LICENSE_ENDPOINT: 'https://script.google.com/macros/s/AKfycbxFHqV37iPQLQBzG1hq9X3gXUGu3NzV69GqT9l5nncEOGLPx8oZlXopoO5SFZHhdr958w/exec',
  STORAGE_KEYS: Object.freeze({
    SETTINGS: 'qs.settings',
    SITE_MODES: 'qs.siteModes',
    COUNTERS: 'qs.counters',
    INSTALL_ID: 'qs.installId',
    LICENSE: 'qs.license',
    LICENSE_KEY: 'qs.licenseKey',
    APPS_SCRIPT_ENDPOINT: 'qs.appsScriptEndpoint'
  }),
  DEFAULT_SETTINGS: Object.freeze({
    enabled: true,
    profile: 'balanced',
    cosmeticFiltering: true,
    trackingParamCleanup: true,
    networkInspector: true,
    detailedHistory: false
  })
});

export const TRACKING_PARAMS = Object.freeze([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'dclid', 'msclkid', 'mc_cid', 'mc_eid', 'igshid',
  'vero_conv', 'vero_id', '_hsenc', '_hsmi', 'mkt_tok'
]);
