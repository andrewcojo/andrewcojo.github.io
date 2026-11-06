# Setup: GitHub Pages + nightly Spotify updates

About 20 minutes, one time. You'll create four things: a GitHub repository, a Spotify developer app, a one-time Spotify sign-in, and three secret values saved in GitHub.

**Keep your Client Secret and Refresh Token private.** They only go into GitHub's encrypted Secrets (Part E). Don't paste them into chat, email, or any file in the repository.

---

## A. Create the repository

1. Go to https://github.com/new
2. **Repository name:** `andrewcojo.github.io` (exactly this, so the site is served at the top level of that address)
3. **Public** (free GitHub Pages needs a public repository; the secrets stay private)
4. Leave every "Add a README / .gitignore / license" box **unchecked**, so the repository is empty.
5. Click **Create repository**.

Then either tell Claude it's created (Claude can push the files for you), or upload the contents of `andrewcojo-site.zip` yourself.

## B. Turn on GitHub Pages

1. In the repository, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.

## C. Create the Spotify app

1. Go to https://developer.spotify.com/dashboard and log in with the Spotify account that **owns the "Andrew Cojo's Mixes" playlist**.
2. Click **Create app** and fill in:
   - **App name:** `andrewcojo.com playlist sync`
   - **App description:** `Updates the My Work page on andrewcojo.com from my playlist`
   - **Redirect URI:** `http://127.0.0.1:8888/callback` (type it exactly, then click **Add**)
   - **Which API/SDKs:** check **Web API**
3. Agree to the terms and click **Save**.
4. Open the app's **Settings**. Copy the **Client ID**, then click **View client secret** and copy the **Client secret**. Keep both handy for the next steps.

## D. One-time Spotify sign-in (gets the Refresh Token)

You need to do steps 2 and 3 within about 10 minutes of each other.

1. In the address below, replace `YOUR_CLIENT_ID` with your Client ID, then open it in your browser:

   ```
   https://accounts.spotify.com/authorize?response_type=code&client_id=YOUR_CLIENT_ID&scope=playlist-read-private%20playlist-read-collaborative&redirect_uri=http%3A%2F%2F127.0.0.1%3A8888%2Fcallback
   ```

2. Click **Agree**. Your browser will then show an error like **"This site can't be reached."** That's expected. Look at the address bar, which will read:

   ```
   http://127.0.0.1:8888/callback?code=AQB...a long code...
   ```

   Copy everything after `code=`. That's your **authorization code**. It only works once.

3. Open **Terminal** (Mac) or **PowerShell** (Windows), and run the command below, filling in your three values (keep the quotes).

   The `redirect_uri` must match **exactly** what was in your address bar before `?code=`. If yours looked different (for example, a slash after `callback`), use what you saw.

   **Mac (Terminal):** paste all five lines at once.
   ```
   curl -s -X POST https://accounts.spotify.com/api/token \
     -u "CLIENT_ID:CLIENT_SECRET" \
     --data-urlencode "grant_type=authorization_code" \
     --data-urlencode "code=AUTH_CODE" \
     --data-urlencode "redirect_uri=http://127.0.0.1:8888/callback"
   ```

   **Windows (PowerShell):** one line, using `curl.exe`:
   ```
   curl.exe -s -X POST https://accounts.spotify.com/api/token -u "CLIENT_ID:CLIENT_SECRET" --data-urlencode "grant_type=authorization_code" --data-urlencode "code=AUTH_CODE" --data-urlencode "redirect_uri=http://127.0.0.1:8888/callback"
   ```

4. The reply looks like:

   ```
   {"access_token":"BQ...","token_type":"Bearer","expires_in":3600,"refresh_token":"AQD...","scope":"playlist-read-private playlist-read-collaborative"}
   ```

   Copy the value of **refresh_token** (between the quotes, without the quotes). That's your **Refresh Token**. It keeps working, so you only do this once.

   If you see `invalid_grant`:
   - **"Invalid redirect URI"**: the `redirect_uri` in the command doesn't exactly match the one in your address bar or in the app's Settings (watch for a trailing slash, `https` vs `http`, or `localhost` instead of `127.0.0.1`).
   - **"Invalid authorization code"**: the code was already used (even by a failed attempt) or expired.

   Either way, fix the cause, then go back to step 1 for a fresh code.

## E. Save the three secrets in GitHub

In the repository: **Settings → Secrets and variables → Actions → New repository secret**. Add these three, one at a time:

| Name | Value |
|---|---|
| `SPOTIFY_CLIENT_ID` | your Client ID |
| `SPOTIFY_CLIENT_SECRET` | your Client secret |
| `SPOTIFY_REFRESH_TOKEN` | your Refresh Token |

## F. Run it the first time

1. Go to the repository's **Actions** tab. If GitHub asks, click to enable workflows.
2. Click **Update playlist & publish site** on the left, then **Run workflow → Run workflow**.
3. After a minute, click the run. In the **build** job, the "Pull the Spotify playlist" step should say either `No changes: … tracks` or `Updated: …` with the songs that changed.
4. Visit **https://andrewcojo.github.io**. The site is live there, and covers should load.

From now on it runs by itself every night around 3 to 4 AM Eastern, and also whenever you change a file in the repository.

## Things to know

- **If a run fails, GitHub emails you.** The most common causes:
  - *"Spotify sign-in failed"*: the Refresh Token stopped working. Redo Part D and update `SPOTIFY_REFRESH_TOKEN`.
  - *"Couldn't read the playlist (403)"*: the token came from a different Spotify account than the one that owns the playlist.
  - *"Not updating, in case something went wrong"*: Spotify returned far fewer songs than the site has. If you really did remove that many, use **Run workflow** with **force** checked.
- **Spotify requires Premium** on the developer account for API access.
- **GitHub pauses nightly runs after 60 days without any repository activity.** Days when the playlist changes count as activity. If it pauses, GitHub emails you, and you click **Enable workflow** on the Actions tab.
- **Contact form:** when you set Formspree's "Restrict to domain," include `andrewcojo.github.io` too until your domain is moved, or messages sent from the github.io address will be blocked.
