(() => {
  const originalOpen = window.open.bind(window);
  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  const originalNotificationRequest = typeof Notification !== 'undefined' && Notification.requestPermission ? Notification.requestPermission.bind(Notification) : null;
  const redirectHosts = new Set([
    'popads.net','popcash.net','popcashjs.b-cdn.net','propellerads.com','onclickalgo.com','onclickgenius.com','onclickmax.com','onclickprediction.com',
    'clickadu.com','clickadilla.com','clickaine.com','adsterra.com','exoclick.com','trafficjunky.com','juicyads.com','hilltopads.net','richads.com','pushground.com',
    'megapopads.com','popup-traffic.com','popvertising.com','poprush.net','maxonclick.com','smartclick.net','superfastcdn.com','offpageads.com','plsdrct1.me','plsdrct2.me'
  ]);

  function flag(name) {
    return document.documentElement?.getAttribute(`data-qs-${name}`) === '1';
  }

  function hostFrom(value) {
    try { return new URL(String(value || ''), location.href).hostname.toLowerCase().replace(/^www\./, ''); }
    catch { return ''; }
  }

  function isKnownRedirector(url) {
    const host = hostFrom(url);
    for (const domain of redirectHosts) if (host === domain || host.endsWith(`.${domain}`)) return true;
    return false;
  }

  function isAdblockTestPage() {
    const host = location.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'canyoublockit.com') return false;
    return /\/(testing|extreme-test|advanced-adblocker-test)\/?/i.test(location.pathname);
  }

  function signal(type) {
    try { window.postMessage({ source: 'quietshield-page-guard', type }, '*'); } catch {}
  }

  window.open = function quietShieldOpen(url, target, features) {
    const popupLock = flag('popup-lock');
    const redirectLock = flag('redirect-lock');
    const suspicious = isKnownRedirector(url);
    const testPopunder = isAdblockTestPage();
    if ((redirectLock && suspicious) || (popupLock && (!navigator.userActivation?.isActive || testPopunder))) {
      signal('popup-blocked');
      return null;
    }
    return originalOpen(url, target, features);
  };

  try {
    HTMLAnchorElement.prototype.click = function quietShieldAnchorClick() {
      if (flag('redirect-lock')) {
        const url = this.href;
        const crossOriginBlank = isAdblockTestPage() && this.target === '_blank' && hostFrom(url) && hostFrom(url) !== hostFrom(location.href);
        if (isKnownRedirector(url) || crossOriginBlank) {
          signal('popup-blocked');
          return;
        }
      }
      return originalAnchorClick.call(this);
    };
  } catch {}

  document.addEventListener('click', event => {
    if (!flag('redirect-lock')) return;
    const link = event.target?.closest?.('a[href]');
    if (!link) return;
    const url = link.href;
    if (isKnownRedirector(url) || (isAdblockTestPage() && link.target === '_blank' && hostFrom(url) && hostFrom(url) !== hostFrom(location.href))) {
      event.preventDefault();
      event.stopImmediatePropagation();
      signal('popup-blocked');
    }
  }, true);

  if (originalNotificationRequest) {
    try {
      Notification.requestPermission = function quietShieldNotificationPermission(callback) {
        if (flag('annoyance-lock')) {
          signal('notification-blocked');
          const result = Promise.resolve('denied');
          if (typeof callback === 'function') result.then(callback);
          return result;
        }
        return originalNotificationRequest(callback);
      };
    } catch {}
  }
})();
