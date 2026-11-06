// Pulls Andrew's Spotify playlist and writes data/playlist.json for the site.
// Runs nightly in GitHub Actions (see .github/workflows/site.yml). Node 20+, no dependencies.
//
// Needs three repository secrets:
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
// Optional:
//   FORCE=1  write the file even if the safety check below would block it

import { readFile, writeFile } from 'node:fs/promises';

const PLAYLIST_ID = '5nU3I9a7Kb8S5pNXCWQ0wQ';
const OUT = new URL('../data/playlist.json', import.meta.url);
const API = process.env.SPOTIFY_API_BASE || 'https://api.spotify.com/v1';
const ACCOUNTS = process.env.SPOTIFY_ACCOUNTS_BASE || 'https://accounts.spotify.com';

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refresh } = process.env;
if (!id || !secret || !refresh) {
  console.log('Spotify secrets are not set yet, so the playlist was not updated. The site will deploy with the existing data.');
  process.exit(0);
}

async function getAccessToken() {
  const res = await fetch(ACCOUNTS + '/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Spotify sign-in failed (${res.status} ${body.error || ''} ${body.error_description || ''}). ` +
      'If this keeps happening, redo the one-time Spotify sign-in in SETUP.md and update SPOTIFY_REFRESH_TOKEN.');
  }
  if (body.refresh_token && body.refresh_token !== refresh) {
    console.log('::warning::Spotify issued a new refresh token. The old one usually keeps working, but if a later run fails to sign in, redo the one-time Spotify sign-in in SETUP.md.');
  }
  return body.access_token;
}

async function getAll(token) {
  const fields = 'next,total,items(is_local,item(id,name,type,artists(name),album(id,name,artists(name),images)),track(id,name,type,artists(name),album(id,name,artists(name),images)))';
  let url = `${API}/playlists/${PLAYLIST_ID}/items?limit=50&additional_types=track&fields=${encodeURIComponent(fields)}`;
  const items = []; let total = null;
  while (url) {
    let res;
    for (let attempt = 0; attempt < 4; attempt++) {
      res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      if (res.status === 429 || res.status >= 500) {
        const wait = (Number(res.headers.get('retry-after')) || 2 ** attempt) * 1000;
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      break;
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Couldn't read the playlist (${res.status}). ${res.status === 403 ? 'Spotify only shares playlist contents with the playlist owner, so the refresh token must come from the account that owns the playlist. ' : ''}${t.slice(0, 300)}`);
    }
    const page = await res.json();
    total ??= page.total;
    items.push(...page.items);
    url = page.next;
  }
  return { items, total };
}

// Pick the image closest to a target width (Spotify lists widest first: 640, 300, 64)
function pick(images, w) {
  if (!images?.length) return '';
  return [...images].sort((a, b) => Math.abs((a.width || 0) - w) - Math.abs((b.width || 0) - w))[0].url;
}

function build(items) {
  const albums = [], index = new Map(), tracks = [];
  for (const it of items) {
    const tr = it.item || it.track;                       // `item` is current, `track` is the old name
    if (!tr || it.is_local || tr.type !== 'track' || !tr.id || !tr.album?.id) continue;
    const al = tr.album;
    if (!index.has(al.id)) {
      index.set(al.id, albums.length);
      albums.push({
        id: al.id,
        title: al.name,
        artist: al.artists?.[0]?.name || tr.artists?.[0]?.name || '',
        img: pick(al.images, 300),
        thumb: pick(al.images, 64),
        songs: 0,
      });
    }
    const ai = index.get(al.id);
    albums[ai].songs++;
    tracks.push({ title: tr.name, artists: tr.artists.map(a => a.name).join(', '), id: tr.id, album: ai });
  }
  return { albums, tracks };
}

const token = await getAccessToken();
const { items, total } = await getAll(token);
const data = { playlist: `https://open.spotify.com/playlist/${PLAYLIST_ID}`, ...build(items) };

let previous = null;
try { previous = JSON.parse(await readFile(OUT, 'utf8')); } catch {}

// Safety check: don't wipe the site if Spotify returns something odd
const before = previous?.tracks?.length || 0, after = data.tracks.length;
if (after === 0 || (before >= 20 && after < before * 0.5)) {
  const msg = `Spotify returned ${after} usable tracks (playlist reports ${total}); the site currently has ${before}.`;
  if (process.env.FORCE === '1') console.log('::warning::' + msg + ' Writing anyway because FORCE=1.');
  else { console.log('::error::' + msg + ' Not updating, in case something went wrong. If you really removed that many songs, run the workflow manually with "force" checked.'); process.exit(1); }
}

const json = JSON.stringify(data, null, 1) + '\n';
if (previous && JSON.stringify(previous) === JSON.stringify(data)) {
  console.log(`No changes: ${after} tracks across ${data.albums.length} releases.`);
} else {
  await writeFile(OUT, json);
  const oldIds = new Set((previous?.tracks || []).map(t => t.id)), newIds = new Set(data.tracks.map(t => t.id));
  const added = data.tracks.filter(t => !oldIds.has(t.id)), removed = (previous?.tracks || []).filter(t => !newIds.has(t.id));
  console.log(`Updated: ${after} tracks across ${data.albums.length} releases (was ${before}).`);
  for (const t of added) console.log(`  + ${t.title} — ${t.artists}`);
  for (const t of removed) console.log(`  - ${t.title} — ${t.artists}`);
}
