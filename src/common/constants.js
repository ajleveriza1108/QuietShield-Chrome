export const AD_DOMAINS = Object.freeze([
  '2mdn.net','33across.com','360yield.com','adcolony.com','adform.net','adform.com','adkernel.com','adnxs.com','adroll.com','adsafeprotected.com','adscale.de','adservice.google.com','adsrvr.org','adsterra.com','adtech.de','adtelligent.com','adzerk.net','advertising.com','amazon-adsystem.com','applovin.com','appnexus.com','bidswitch.net','casalemedia.com','chartboost.com','clickaine.com','clickadu.com','clickadilla.com','contextweb.com','conversantmedia.com','criteo.com','criteo.net','doubleclick.net','dotomi.com','exoclick.com','fyber.com','googleadservices.com','googlesyndication.com','googletagservices.com','gumgum.com','hilltopads.net','improvedigital.com','indexww.com','inmobi.com','ironsrc.com','juicyads.com','lijit.com','media.net','mgid.com','moatads.com','mopub.com','ogury.com','openx.net','outbrain.com','pubmatic.com','revcontent.com','richads.com','rubiconproject.com','sharethrough.com','smaato.net','smartadserver.com','spotxchange.com','startappservice.com','taboola.com','tapjoy.com','teads.tv','trafficjunky.com','undertone.com','unityads.unity3d.com','valueclickmedia.com','vungle.com','yieldlab.net','yieldmo.com','zedo.com'
]);

export const TRACKER_DOMAINS = Object.freeze([
  'adjust.com','adobedtm.com','analytics.google.com','amplitude.com','app-measurement.com','appsflyer.com','bat.bing.com','bluekai.com','branch.io','chartbeat.com','clarity.ms','comscore.com','connect.facebook.net','crazyegg.com','crwdcntrl.net','demdex.net','everesttech.net','facebook.net','flurry.com','fullstory.com','google-analytics.com','googletagmanager.com','heap.io','heapanalytics.com','hotjar.com','hotjar.io','kissmetrics.io','kochava.com','krxd.net','liveramp.com','luckyorange.com','matomo.cloud','mixpanel.com','mouseflow.com','newrelic.com','nr-data.net','omtrdc.net','optimizely.com','plausible.io','posthog.com','quantserve.com','rlcdn.com','rudderstack.com','scorecardresearch.com','segment.com','segment.io','sentry.io','snowplowanalytics.com','tapad.com','tealiumiq.com'
]);

export const THREAT_DOMAINS = Object.freeze([
  'authedmine.com','badware.test','coin-hive.com','coinhive.com','coinimp.com','command-control.test','crypto-loot.com','cryptoloot.pro','jsecoin.com','malware.test','malware.testcategory.com','minero.cc','phishing.test','webminepool.com'
]);

export const REDIRECT_DOMAINS = Object.freeze([
  'adsterra.com','clickadu.com','clickadilla.com','clickaine.com','clickgate07.biz','clickgate09.biz','exoclick.com','hilltopads.net','juicyads.com','maxonclick.com','megapopads.com','onclickalgo.com','onclickgenius.com','onclickmax.com','onclickprediction.com','offpageads.com','plsdrct1.me','plsdrct2.me','popads.net','popcash.net','popcashjs.b-cdn.net','poprush.net','popup-traffic.com','popvertising.com','poweradcash.net','propellerads.com','pushground.com','richads.com','smartclick.net','superfastcdn.com','trafficjunky.com'
]);

export const QS = Object.freeze({
  VERSION: '1.0.4',
  REVISION: 'R5',
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
  'vero_conv','vero_id','_hsenc','_hsmi','mkt_tok','ref_src','ref_url','s_cid','cmpid','campaignid','adgroupid','creative','keyword','device','gad_source'
]);
