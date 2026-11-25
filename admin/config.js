/* Static GitHub Pages routing. All frontend paths resolve beside this script. */
(function () {
  const base = new URL('./', document.currentScript?.src || location.href);
  const modules = ['properties', 'gallery', 'faqs', 'users', 'logs'];
  window.WCMAdmin = window.WCMAdmin || {};
  Object.assign(WCMAdmin, {
    baseUrl: base.href,
    siteUrl: new URL('../', base).href,
    apiBaseUrl: WCM.apiBaseUrl,
    logicalRoute(value = location.href) {
      let url;
      try { url = new URL(value, location.origin); } catch (_) { return '/admin'; }
      if (url.origin !== location.origin) return '/admin';
      const params = new URLSearchParams(url.search);
      let module;
      if (url.pathname === new URL('index.html', base).pathname || url.pathname === base.pathname) module = params.get('view');
      else if (url.pathname === '/admin' || url.pathname === '/admin/') module = null;
      else if (url.pathname.startsWith('/admin/')) module = url.pathname.slice(7).replace(/\/$/, '');
      else return '/admin';
      params.delete('view');
      if (module && !modules.includes(module)) return '/admin';
      return '/admin' + (module ? '/' + module : '') + (params.size ? '?' + params : '');
    },
    href(value = '/admin') {
      let url;
      try { url = new URL(value, location.origin); } catch (_) { return new URL('index.html', base).href; }
      if (url.origin !== location.origin) return new URL('index.html', base).href;
      if (url.pathname === '/admin/login' || url.pathname === '/admin/login/' || url.pathname === new URL('login.html', base).pathname) {
        const target = new URL('login.html', base); target.search = url.search; return target.href;
      }
      const logical = new URL(this.logicalRoute(url.href), location.origin);
      const target = new URL('index.html', base);
      const module = logical.pathname.slice('/admin/'.length);
      if (modules.includes(module)) target.searchParams.set('view', module);
      logical.searchParams.forEach((value, key) => target.searchParams.append(key, value));
      return target.href;
    },
  });
})();
