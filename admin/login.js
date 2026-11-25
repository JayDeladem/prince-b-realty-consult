(async function () {
  // Fit the complete sign-in panel, including errors, inside the visible viewport.
  const panel = document.querySelector('.login-form-panel');
  const frame = document.querySelector('.login-form-frame');
  function fitLogin() {
    document.documentElement.style.setProperty('--login-viewport-height', `${window.visualViewport?.height || window.innerHeight}px`);
    const style = getComputedStyle(panel);
    const available = panel.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const scale = Math.min(1, available / Math.max(frame.scrollHeight, frame.offsetHeight, 1));
    frame.style.setProperty('--login-scale', String(Math.max(0, scale)));
  }
  if (typeof ResizeObserver === 'function') {
    const fitObserver = new ResizeObserver(fitLogin);
    fitObserver.observe(panel); fitObserver.observe(frame);
  }
  window.addEventListener('resize', fitLogin);
  window.visualViewport?.addEventListener('resize', fitLogin);
  fitLogin();
  const { api, notify } = WCMAdmin;
  const form = document.querySelector('#sign-in-form'), button = form.querySelector('[type=submit]');
  const password = document.querySelector('#password'), toggle = document.querySelector('#toggle-password');
  document.querySelectorAll('.website-link').forEach(link => { link.href = WCMAdmin.siteUrl || link.href; });
  toggle.addEventListener('click', () => {
    const visible = password.type === 'password'; password.type = visible ? 'text' : 'password';
    toggle.querySelector('.password-eye-slash').toggleAttribute('hidden', !visible);
    toggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password'); toggle.setAttribute('aria-pressed', String(visible));
  });
  function destination() {
    return WCMAdmin.logicalRoute(new URLSearchParams(location.search).get('next') || '/admin');
  }
  let pending = false;
  async function initialize() {
    try {
      const user = await api.session({verifyCookie:true}); if (user) { WCMAdmin.redirect(destination(), true); return; }
      button.disabled = false; button.textContent = 'Sign in';
      if (new URLSearchParams(location.search).has('expired')) notify('Your session has expired. Please sign in again.');
    } catch (error) { notify(error.message, true); button.textContent = 'Try connecting again'; button.disabled = false; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (pending) return;
    pending = true; button.disabled = true; button.textContent = 'Signing in…'; form.setAttribute('aria-busy', 'true'); notify('');
    try {
      if (!api.token) await api.session({verifyCookie:true});
      const data = await api.request('/auth/sign-in', { method: 'POST', body: JSON.stringify({ email: form.elements.email.value, password: password.value }) });
      api.token = data.csrfToken;
      const retained = await api.session();
      if (!retained) throw new Error('Sign-in completed, but your browser did not retain the session cookie. Allow cross-site cookies for this site and try again.');
      form.reset(); WCMAdmin.redirect(destination());
    } catch (error) {
      notify(error.message, true); if (error.status === 403) { try { await api.session({verifyCookie:true}); } catch (_) { api.token = ''; } }
    } finally { pending = false; button.disabled = false; button.textContent = 'Sign in'; form.setAttribute('aria-busy', 'false'); }
  });
  await initialize();
})();
