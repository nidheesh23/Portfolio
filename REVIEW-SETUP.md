# Run the portfolio with Google reviews

This version adds real Google account profiles and shared reviews. It must run through the included Node server; opening index.html directly or using VS Code Live Server will not provide the review API.

## 1. Install Node.js

Use Node.js 22.13 or newer (Node 24 recommended). In a terminal opened in this folder, run:

```powershell
npm install
```

## 2. Create your public Google client ID

1. Open https://console.cloud.google.com/ and create/select a project.
2. Open Google Auth Platform. Configure Branding with your app name, support email and developer contact. Configure Audience for your intended users. If the app is in Testing, add the accounts that will test it.
3. Open Clients and create an OAuth client of type **Web application**.
4. Add **http://localhost:3000** to Authorized JavaScript origins. When deploying, also add your exact HTTPS website origin, such as **https://your-domain.com** (no page path).
5. Copy the client ID ending in `.apps.googleusercontent.com`. This integration does not require a client secret or Gmail API access.

Official instructions: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid

## 3. Configure and run

The included `.env` contains:

```text
PORT=3000
GOOGLE_CLIENT_ID=
```

Paste your client ID after `GOOGLE_CLIENT_ID=`, save, then run:

```powershell
npm start
```

Visit **http://localhost:3000**. Click Write a Review, sign in with Google, select stars, write your review and submit. Name and email are filled from the verified Google account. Email stays private; name, photo, rating and comment are public. Google accounts with non-Gmail email addresses also work.

One review per Google account is supported. Submitting again updates the previous review. Switching accounts allows a different reviewer to submit. After token expiry, sign in again.

## Storage and deployment

Reviews are stored in `data/reviews.sqlite` on the server and survive restarts. Keep this file backed up. The backend must run on a Node host with persistent disk. Static-only hosting such as GitHub Pages does not run this backend. Ephemeral/serverless hosts require replacing SQLite with a persistent database. Run a single server instance for this implementation.

The old browser-only `portfolio_reviews_v1` records are not imported as Google reviews because they have no verified account identity. They remain in the visitor's browser.

Never place `.env`, the SQLite database or server source into a public static directory. The supplied server exposes only the page, styles, browser scripts and assets. Keep HTTPS enabled in production. If your hosting uses a reverse proxy, configure its origin handling before accepting review POST requests.

## Validation

Run `npm test` to check persistence, identity validation, rating validation, account updates and private email handling. Tests use a simulated verifier; a live Google login requires your own client ID and account.

Server verification follows https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
