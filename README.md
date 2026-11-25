# Prince B Realty Consult website and staff dashboard

This repository contains **static frontend files only**. GitHub Pages publishes the
public site and root `admin/` folder under `/prince-b-realty-consult/`.

- Public website: https://jaydeladem.github.io/prince-b-realty-consult/
- Staff sign in: https://jaydeladem.github.io/prince-b-realty-consult/admin/login.html
- Staff dashboard: https://jaydeladem.github.io/prince-b-realty-consult/admin/index.html
- WCM API: https://prince-b-wcm-backend.onrender.com/api/v1
- Backend source: https://github.com/Sir-Ob-00/prince-b-wcm-backend

## API and frontend configuration

`js/config.js` is the single API base configuration, shared by public pages and
the dashboard. The base includes `/api/v1` once; callers append `/properties`,
`/gallery`, `/faqs`, `/auth/...` or `/admin/...`. Never add database URLs, passwords,
API keys or backend secrets to this repository.

Property cards, details, gallery and FAQs read published content from Render.
Images retain their existing HTTPS/project-relative paths. PrinBot still posts to
https://property-chatbot-89ed.onrender.com/chat and is deployed separately.

## Static admin routing

`admin/config.js` derives the project path from its own script URL. Assets are
relative, so login CSS, scripts, logo and images load under the GitHub Pages project
path. The dashboard uses query routing that works without Express rewrites:

| Screen | URL suffix |
| --- | --- |
| Overview | `admin/index.html` |
| Properties | `admin/index.html?view=properties` |
| Gallery | `admin/index.html?view=gallery` |
| FAQs | `admin/index.html?view=faqs` |
| Users (super admin) | `admin/index.html?view=users` |
| System logs (super admin) | `admin/index.html?view=logs` |

Editor links add `&new=1` or `&edit=<id>`. Refreshing stays on the same static file.
Staff credentials and role checks are validated by the separate backend; public
HTML or a hidden navigation item never grants access.

## Credentialed authentication: backend deployment prerequisite

The API requests use `credentials: include` and retain the existing session + CSRF
flow. The backend must deploy the accompanying cross-site-auth change before this
frontend is merged to main. Required server behavior:

- Allow exact origin `https://jaydeladem.github.io` (no repository path).
- Set `Access-Control-Allow-Credentials: true`; allow GET, POST, PATCH, DELETE and
  OPTIONS, plus Content-Type and X-CSRF-Token headers.
- Use persistent server-side sessions with HttpOnly, Secure, SameSite=None,
  Partitioned cookies in production, behind Render's trusted HTTPS proxy.
- Keep CSRF checks on every write. Cookie attributes on sign-out must match.

The login page checks that an anonymous CSRF session survives a second request,
then checks that the authenticated session survives sign-in. If the browser refuses
the cross-site cookie, it displays a clear error rather than pretending sign-in
succeeded. Some browser privacy policies block even partitioned cross-site sessions;
those browsers need a permitted site exception or a same-site/custom-domain setup.
No bearer token is written to localStorage and no CSRF protection is removed.

Render settings remain in the backend service: `NODE_ENV=production`, its existing
`DATABASE_URL` and `SESSION_SECRET`, `PUBLIC_API_URL=https://prince-b-wcm-backend.onrender.com`,
`PUBLIC_SITE_URL=https://jaydeladem.github.io/prince-b-realty-consult/`, and
`CORS_ORIGINS=https://jaydeladem.github.io` (optionally explicitly allowed local origins).
The already-seeded Aiven database needs no new migration for this integration.

## Development and verification

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run preview
```

Open http://127.0.0.1:8765/prince-b-realty-consult/ or its `admin/login.html` page.
The preview runs no database/API; it calls the deployed WCM service. To use a local
API from the separate repository, change only `js/config.js` and allow the exact
preview origin in that backend's CORS configuration. No Python server is required.

Tests cover project-subpath assets/navigation, API prefixes, safe public content,
filters, details/gallery, static dashboard routes, mocked login/refresh/sign-out,
CSRF headers, cookie-block detection and unchanged PrinBot configuration. Real
browser cookie enforcement and real staff CRUD must also be checked with staff
credentials after the backend PR is deployed.

`_config.yml` keeps admin public assets included and excludes development tools/tests.
Any custom publishing workflow must upload HTML, `admin/`, `css/`, `js/` and `images/`;
it must not upload local secrets, certificates or node_modules. The old tracked
backend was removed; ignored local files from it can remain on developer machines.
