/* Public configuration only. Set apiBaseUrl to the separately hosted WCM HTTPS URL
   (including /api/v1) before deploying. No keys or staff credentials belong here. */
window.WCM = {
    apiBaseUrl: ['localhost', '127.0.0.1'].includes(location.hostname)
        ? 'http://127.0.0.1:3000/api/v1'
        : '', // e.g. https://YOUR-WCM-SERVICE.onrender.com/api/v1
    async get(path) {
        if (!this.apiBaseUrl) throw new Error('The content API has not been configured.');
        const base = new URL(this.apiBaseUrl);
        if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(base.hostname))) throw new Error('The content API must use HTTPS.');
        const response = await fetch(this.apiBaseUrl.replace(/\/$/, '') + path, { cache:'no-store', credentials:'omit', signal:AbortSignal.timeout(15000) });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('The content service is temporarily unavailable.');
        return response.json();
    },
};
