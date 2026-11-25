// Cross-origin cookie session API. CSRF tokens stay in memory, never localStorage.
window.WCMAdmin = window.WCMAdmin || {};
WCMAdmin.api = {
  token: '', expired: null,
  async request(path, options = {}) {
    let response;
    try {
      response = await fetch(WCMAdmin.apiBaseUrl.replace(/\/$/, '') + path, {
        ...options, credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(15000),
        headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), 'X-CSRF-Token': this.token, ...options.headers },
      });
    } catch (_) { throw new Error('We couldn’t connect. Check your connection and try again.'); }
    let data;
    try { data = response.status === 204 ? null : await response.json(); }
    catch (_) { throw new Error('The server returned an unreadable reply. Please try again.'); }
    if (!response.ok) {
      if ((response.status === 401 || (response.status === 403 && data?.code !== 'FORBIDDEN_ROLE')) && path.startsWith('/admin/')) this.expired?.();
      throw Object.assign(new Error(data?.error || 'The request failed. Please try again.'), { status: response.status, code:data?.code, fields: data?.fields || [] });
    }
    return data;
  },
  async session({ verifyCookie = false } = {}) {
    const data = await this.request('/auth/session'); this.token = data.csrfToken;
    if (verifyCookie && !data.user) {
      const repeated = await this.request('/auth/session');
      if (repeated.csrfToken !== data.csrfToken) {
        this.token = '';
        throw Object.assign(new Error('Your browser is blocking the sign-in session cookie. Allow cross-site cookies for this site or use a browser that supports partitioned cookies, then try again.'), { code: 'COOKIE_BLOCKED' });
      }
      this.token = repeated.csrfToken;
    }
    return data.user;
  },
};
