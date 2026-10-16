# Free setup: GitHub Pages + Cloudflare Workers + D1

This replaces Render. Stay on Cloudflare's Free plan; no paid disk or purchased domain is needed. Free usage limits apply. The frontend design stays the same. The old server.js is retained only for local development, not deployed to Cloudflare. Follow this guide instead of HOSTING-STEPS.md and the Render instructions.

## 1. Create your account and database

Sign up at https://dash.cloudflare.com/sign-up and verify your email. You do not need to add/buy a domain for this setup.

In the dashboard, open Storage & databases > D1 SQL Database (or search for D1). Choose Create database and name it `nid-portfolio-db`.

Open the database's Console. Open the included `cloudflare/schema.sql` file, copy its complete contents into the console and run it. This creates the reviews and visitors tables without deleting data.

## 2. Create the Worker

Open Workers & Pages > Create application > Start with Hello World. Name it `nid-portfolio-api` and deploy the starter. Open Edit code.

Replace the entire starter code with the complete contents of `cloudflare/worker.mjs`. Save/deploy the Worker. The module is self-contained and does not need npm packages or a build command.

## 3. Connect the database

Open the Worker's Bindings tab > Add binding > D1 database. Set Variable name to exactly `DB` (uppercase), select `nid-portfolio-db`, then save/deploy if prompted.

## 4. Add environment variables

In Worker Settings > Variables and Secrets, add these Text variables:

| Variable | Value |
| --- | --- |
| GOOGLE_CLIENT_ID | Your Google OAuth Web application client ID, ending in .apps.googleusercontent.com |
| ALLOWED_ORIGINS | https://YOUR_USERNAME.github.io |

Use the GitHub Pages origin only, with no repository path and no trailing slash. If you also test locally, append `,http://localhost:3000`. Add a custom domain origin similarly if needed. Save and deploy. A Google client secret is not required.

## 5. Test the Worker

Copy its public workers.dev URL from the dashboard, for example `https://nid-portfolio-api.YOUR-SUBDOMAIN.workers.dev`.

Open these URLs directly in a browser:

- `/api/health` should return `{"ok":true}`.
- `/api/config` should show your Google client ID.
- `/api/reviews` should return `{"reviews":[]}` on a new database.
- `/api/visits` should return `{"total":0}` on a new database.

If reviews/visits fail, check the uppercase DB binding and that schema.sql was run. Health alone does not test the database.

## 6. Connect your GitHub website

Replace/update your GitHub repository using the contents of the included portfolio folder. Keep files at the repository root and include `.github/workflows/pages.yml`. Never upload .env or local data/. The workflow uploads only public HTML/CSS/JS and assets, not the backend, credentials or database.

Edit `config.js`:

```js
window.PORTFOLIO_CONFIG = {
  apiBase: 'https://nid-portfolio-api.YOUR-SUBDOMAIN.workers.dev'
};
```

Paste your ACTUAL Worker URL, without `/api`. Commit/push. In repository Settings > Pages, select GitHub Actions as the publishing source. Wait for the Deploy portfolio to GitHub Pages workflow to finish. Hard-refresh the live page.

## 7. Enable Google login for the live site

In Google Cloud Console > Google Auth Platform > Clients, open your Web application OAuth client. Add `https://YOUR_USERNAME.github.io` under Authorized JavaScript origins. Use the same client ID in your Worker. Add your custom domain too if you use one. The repository path is not part of an origin. The workers.dev API origin is not needed for Google login when the login button is on GitHub Pages.

Configure Branding and Audience. If your Google consent app is in Testing, add the Google accounts allowed to test. Configure its intended audience/publishing status before public launch. This implementation uses a popup credential callback; it does not need an OAuth redirect URL or client secret.

## 8. Verify reviews and visits

Sign in through Write a Review. Name/email should fill; submission enables only after verification. Submit a review, then open Ratings and check it from another browser. An account can update its own review; public review responses omit email addresses. These are reviews on your portfolio, not Google Maps/Google Business reviews.

The footer records unique browser IDs, shared in D1. Refreshing the same browser does not increase it. Another browser/device or cleared browser storage can count again. A page load counts even without scrolling to the footer. Storage-disabled browsers display the total without registering another visitor. Counts refresh on load/reconnection; the scroll animation does not add visitors. This is an approximate count, not bot-proof analytics. The total starts at zero with a fresh database, not the previous decorative 150.

Cloudflare persists D1 data separately from Worker deployments. Use D1's backup/export features for backups. Do not delete the database when updating Worker code. Local SQLite reviews are not migrated automatically; keep the original data file private and backed up. It contains reviewer emails.

## Limits and remaining behavior

Workers and D1 Free plans have request, database-operation and storage limits. API calls may fail when those limits are reached; the page will still load through GitHub Pages. Keep the account on the Free plan if you want to avoid paid-plan charges. No promise of unlimited traffic or permanent free terms is made.

The original contact form still opens an email application. External project sites may block iframe previews; their Open website link remains available.

## References

- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
