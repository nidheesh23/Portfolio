# GitHub Pages hosting steps

This package uses GitHub Pages for the webpage and a Render Node service for Google reviews and visitor counts. The page design is preserved. Render's persistent-disk option requires a paid service; free Render local SQLite storage does not survive restarts/redeployments.

## 1. Upload the project to GitHub

Create a public repository called `portfolio`, with default branch `main`. Upload the CONTENTS of the `Nid-Portfolio` folder to the repository root. `index.html`, `package.json`, and the hidden `.github` folder must be directly at the root, not inside another folder.

Use Git or GitHub Desktop to include `.github/workflows/pages.yml`. Do not commit `.env`, `data/`, or `node_modules/`. These are ignored and omitted from this deployment ZIP. The workflow publishes only public files and assets.

## 2. Enable GitHub Pages

Repository Settings > Pages > Build and deployment > Source: GitHub Actions.

In Actions, run `Deploy portfolio to GitHub Pages` if needed. After it finishes, copy the URL GitHub reports, normally `https://YOUR_USERNAME.github.io/portfolio/`. Your page will display, but reviews/counts require the backend below.

## 3. Create the Render backend

At https://render.com choose New > Web Service and connect the same repository and `main` branch.

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Root directory | Empty, when package.json is at repository root |
| Build command | `npm ci` |
| Start command | `npm start` |
| Instance | Paid instance supporting persistent disks |
| Health check | `/api/health` |
| Node version | Included `.node-version` selects Node 24 |

Add a persistent disk, mount path `/var/data`. Only files inside that path persist. Set these Render environment variables:

```text
GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com
ALLOWED_ORIGINS=https://YOUR_USERNAME.github.io
DATA_PATH=/var/data/reviews.sqlite
```

Use the origin only in ALLOWED_ORIGINS: no `/portfolio/` and no trailing slash. Multiple origins, such as a custom domain, can be comma-separated. Render supplies PORT automatically. Deploy, then copy the actual service URL, for example `https://YOUR-SERVICE.onrender.com`.

Open that URL with `/api/health` appended: it should return `{"ok":true}`. `/api/config` should return your public Google client ID.

## 4. Connect GitHub Pages to the API

Edit `config.js`:

```js
window.PORTFOLIO_CONFIG = { apiBase: 'https://YOUR-SERVICE.onrender.com' };
```

Do not append `/api`. Commit and push; the Pages workflow republishes the site. The webpage will now call Render instead of looking for API routes on GitHub Pages.

## 5. Configure Google sign-in

In Google Cloud Console > Google Auth Platform > Clients, select/create a Web application OAuth client. Put its client ID into Render's GOOGLE_CLIENT_ID variable.

Add these Authorized JavaScript origins:

```text
https://YOUR_USERNAME.github.io
http://localhost:3000
```

Add your custom domain origin too if used. No repository path goes into an origin. This integration uses the Google Identity Services popup callback, so it does not need an OAuth redirect route or client secret. Configure Branding and Audience. While the consent app is in Testing, add your test Google accounts; configure the intended public audience/publishing status before launch.

## 6. Test the live page

1. Open the GitHub Pages URL and hard-refresh.
2. Write a Review should open the form. Sign in; name/email should fill and submission should enable after server verification.
3. Submit a review. Ratings should show it; another browser should also see it. The same Google account updates its existing review. Public reviews do not include email addresses.
4. Check the footer count. Refreshing the same browser should not add a visitor; another browser/device should add one.
5. Redeploy the backend. Reviews and counts should remain. If they reset, check DATA_PATH and the persistent disk.

## What the counter measures

The counter starts at zero with a new database. The old 150/151 was decorative. A visit is recorded on page load, even before the visitor scrolls to the footer. A random ID in browser local storage prevents refreshes from adding visitors. The database stores the ID, not an email or IP address, for this counter.

This measures approximate unique browsers, not exact people. Different devices, cleared storage, private browsing, bots, or fabricated requests can add counts. If local storage is unavailable, the total is shown without adding a visitor. The animation no longer modifies the total. The displayed total refreshes on page load or reconnection, not continuously while a page remains open.

## Existing reviews and local development

The new Render disk starts empty. The deployment ZIP deliberately excludes local `.env` and `data/` files. Keep your original local database backed up. To migrate it, stop the local server, back up `data/reviews.sqlite`, and securely transfer it to `/var/data/reviews.sqlite` while the backend is stopped. Do not upload that database to GitHub: it contains private reviewer emails. Use one backend instance and regular SQLite database backups.

For local development, copy `.env.example` to `.env`, set GOOGLE_CLIENT_ID, and leave DATA_PATH unset. Temporarily set config.js apiBase to an empty string, run `npm ci`, then `npm start`, and open `http://localhost:3000`. Restore the Render URL before pushing the production configuration. Run `npm test` for the automated checks.

## Troubleshooting

- API returns HTML/reviews unavailable: config.js must point to the Render service, not the GitHub page URL.
- Origin rejected: ALLOWED_ORIGINS must match the page protocol and host exactly, with no path or trailing slash.
- Google origin/client error: check Authorized JavaScript origins and that the same web client ID is used in Render.
- Fields fill but submission remains disabled: read the message below Submit Review, then inspect Render logs, client ID, and network access to Google's verification service.
- Counter shows a dash: check `/api/health`, config.js, and the browser Network panel's `/api/visits` request.
- Data resets: check the paid persistent disk mount and DATA_PATH.
- Workflow missing: ensure `.github/workflows/pages.yml` is committed and Pages Source is GitHub Actions.
- External previews: a third-party site may block iframe embedding; use Open website in that case.
- The contact form retains the original behavior of opening an email application; it does not send email from the server.

## Official references

- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/disks
- https://render.com/docs/free
- https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
