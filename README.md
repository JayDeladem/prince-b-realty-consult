# prince-b-realty-consult
Official website for Prince B Realty Consult

The static frontend reads published property and gallery content from the separate
Express/PostgreSQL WCM service in [backend-WCM](backend-WCM/README.md).
See that guide for local setup, staff administration, migrations, API endpoints,
deployment order and the separate chatbot handoff. Set the public API URL in
`js/config.js` before deploying this feature. Existing PrinBot configuration is preserved.

Staff frontend source lives in the root `admin/` folder. The Express service in
`backend-WCM/` serves it at `/admin`, including `/admin/login`, `/admin/properties`
and `/admin/gallery`. Deploy both folders together; the staff frontend is excluded
from GitHub Pages.
