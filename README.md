# andrewcojo.com

Static site for GitHub Pages. No build step: every page is a plain HTML file.

```
index.html                          Home / About
work/index.html                     My Work (built from data/playlist.json)
faqs/index.html                     FAQs (original wording)
contact/index.html                  Booking form
multitrack-export-guidelines/       Guidelines (original wording)
about/index.html                    Redirects the old /about link to the home page
404.html                            Shown for any address that doesn't exist
assets/style.css                    All styles
assets/site.js                      Menu, My Work page, contact form
assets/andrew-cojo.jpg              About photo
assets/og-image.jpg                 Preview image when the link is shared
data/playlist.json                  Releases and tracks from the Spotify playlist
scripts/update-playlist.mjs         Pulls the playlist from Spotify (runs in GitHub Actions)
.github/workflows/site.yml          Nightly update + publish to GitHub Pages
```

## Contact form (Formspree), one-time setup

1. Go to https://formspree.io and sign up with **andrewcojomusic@gmail.com** (that's where messages will be delivered). Confirm the email Formspree sends you.
2. Click **+ Add New → New Form**. Name it "Booking", and choose andrewcojomusic@gmail.com as the address to send submissions to.
3. Formspree shows the form's endpoint, like `https://formspree.io/f/abcdwxyz`. Copy the ID at the end (`abcdwxyz`).
4. Open `assets/site.js` and replace `YOUR_FORM_ID` on this line with your ID:
   ```js
   const FORMSPREE_ID = "YOUR_FORM_ID";
   ```
5. In the form's **Settings**, add `andrewcojo.com` under **Restrict to domain** once the site is live, so nobody else can use your form.
6. Send yourself a test message from the live site.

Done: the form ID is `xzeewnqz` and it's already set in `assets/site.js` and in the form's `action` in `contact/index.html` (the fallback for visitors without JavaScript).

Formspree's free plan covers 50 messages a month. Replies go straight to the sender, because the form sends their email address as the reply-to. A hidden field filters out most spam bots.

## Playlist data

`data/playlist.json` is rewritten automatically every night by the GitHub Action in `.github/workflows/site.yml`, using `scripts/update-playlist.mjs`. Don't edit it by hand. Setup steps are in `SETUP.md`.
