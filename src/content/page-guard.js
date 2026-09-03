(() => {
  const originalOpen = window.open.bind(window);
  const redirectHosts = new Set([
    'popads.net','popcash.net','propellerads.com','onclickalgo.com','onclickgenius.com','onclickmax.com','clickadu.com','adsterra.com',
    'exoclick.com','trafficjunky.com','juicyads.com','hilltopads.net','richads.com','pushground.com'
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

  window.open = function quietShieldOpen(url, target, features) {
    if (flag('redirect-lock') && isKnownRedirector(url)) return null;
    if (flag('popup-lock') && !navigator.userActivation?.isActive) return null;
    return originalOpen(url, target, features);
  };
})();
