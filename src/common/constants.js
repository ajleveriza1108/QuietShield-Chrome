export const AD_DOMAINS = Object.freeze([
  'doubleclick.net','googlesyndication.com','googleadservices.com','adservice.google.com','adnxs.com','adsrvr.org',
  'advertising.com','amazon-adsystem.com','criteo.com','criteo.net','media.net','moatads.com','openx.net','pubmatic.com',
  'rubiconproject.com','smartadserver.com','taboola.com','teads.tv','yieldmo.com','adform.net','adroll.com','bidswitch.net',
  'casalemedia.com','contextweb.com','indexww.com','lijit.com','outbrain.com','revcontent.com','sharethrough.com','smaato.net',
  'spotxchange.com','undertone.com','yieldlab.net','zedo.com','adzerk.net','adscale.de','adtech.de','adcolony.com','unityads.unity3d.com',
  'vungle.com','inmobi.com','mopub.com','ironsrc.com','chartboost.com','applovin.com'
]);

export const TRACKER_DOMAINS = Object.freeze([
  'google-analytics.com','analytics.google.com','googletagmanager.com','connect.facebook.net','facebook.net','bat.bing.com','clarity.ms',
  'hotjar.com','hotjar.io','segment.com','segment.io','mixpanel.com','amplitude.com','scorecardresearch.com','quantserve.com',
  'comscore.com','chartbeat.com','branch.io','appsflyer.com','adjust.com','app-measurement.com','flurry.com','kochava.com','matomo.cloud',
  'newrelic.com','nr-data.net','fullstory.com','mouseflow.com','crazyegg.com','luckyorange.com','heap.io','heapanalytics.com',
  'optimizely.com','kissmetrics.io','plausible.io','posthog.com','sentry.io'
]);

export const THREAT_DOMAINS = Object.freeze([
  'coinhive.com','coin-hive.com','authedmine.com','crypto-loot.com','cryptoloot.pro','coinimp.com','jsecoin.com','webminepool.com','minero.cc',
  'malware.testcategory.com','malware.test','phishing.test','badware.test','command-control.test'
]);

export const REDIRECT_DOMAINS = Object.freeze([
  'popads.net','popcash.net','propellerads.com','onclickalgo.com','onclickgenius.com','onclickmax.com','clickadu.com','adsterra.com',
  'exoclick.com','trafficjunky.com','juicyads.com','hilltopads.net','richads.com','pushground.com'
]);

export const QS = Object.freeze({
  VERSION: '1.0.3',
  REVISION: 'R4',
  PLATFORM: 'Chrome',
  PACKAGE_NAME: 'quietshield.chrome',
  RULESETS: Object.freeze(['qs_ads','qs_trackers','qs_security','qs_redirects','qs_upgrade']),
  STORAGE_KEYS: Object.freeze({
    SETTINGS: 'qs.settings',
    SITE_MODES: 'qs.siteModes',
    COUNTERS: 'qs.counters',
    DAILY_STATS: 'qs.dailyStats',
    INSTALL_ID: 'qs.installId',
    LICENSE: 'qs.license',
    LICENSE_KEY: 'qs.licenseKey',
    ADMIN_DEVICE_KEY: 'qs.adminDeviceKey'
  }),
  DEFAULT_SETTINGS: Object.freeze({
    enabled: true,
    adLock: true,
    trackerLock: true,
    threatLock: true,
    popupLock: true,
    redirectLock: true,
    cosmeticFiltering: true,
    trackingParamCleanup: true,
    annoyanceLock: true,
    networkInspector: true,
    httpsUpgrade: false,
    detailedHistory: false
  })
});

export const TRACKING_PARAMS = Object.freeze([
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id','utm_name','utm_reader','utm_viz_id',
  'fbclid','gclid','dclid','gbraid','wbraid','msclkid','mc_cid','mc_eid','igshid','twclid','ttclid','yclid',
  'vero_conv','vero_id','_hsenc','_hsmi','mkt_tok','ref_src','ref_url'
]);
