window.WCMAdmin = window.WCMAdmin || {};
Object.assign(WCMAdmin, {
  redirect(path, replace = false) { location[replace ? 'replace' : 'assign'](WCMAdmin.href(path)); },
  el(tag, text, className) {
    const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node;
  },
  notify(text, error = false, href = null) {
    const box = document.querySelector('#feedback'); box.replaceChildren(document.createTextNode(text)); box.hidden = !text; box.classList.toggle('error', error);
    if (href) { const link = WCMAdmin.el('a', 'View on website'); link.href = href; link.target = '_blank'; link.rel = 'noopener'; box.append(' ', link); }
  },
  badge(status) { return WCMAdmin.el('span', status === 'published' ? 'Published' : 'Draft', 'badge ' + (status === 'published' ? 'published' : 'draft')); },
  date(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Not yet saved' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date); },
  media(value) { try { const url = new URL(value); return url.protocol === 'https:' || (url.origin===location.origin && /^\/api\/v1\/media\/[0-9a-f-]{36}$/.test(url.pathname)) ? url.href : ''; } catch (_) { return ''; } },
  async action(button, task) {
    if (button.disabled) return; button.disabled = true;
    try { await task(); } catch (error) { WCMAdmin.notify(error.message, true); } finally { button.disabled = false; }
  },
});
