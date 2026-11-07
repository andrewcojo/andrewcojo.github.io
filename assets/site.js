/* Andrew Cojo · site script
   - Mobile menu
   - Home "Recent mixes" row and the My Work page, both built from data/playlist.json
   - Contact form, sent through Formspree
*/

// ---- Contact form setting -------------------------------------------------
// Paste your Formspree form ID here (the part after formspree.io/f/).
// Until it's set, the form falls back to opening the visitor's email app.
const FORMSPREE_ID = "xzeewnqz";
const CONTACT_EMAIL = "andrewcojomusic@gmail.com";
// ---------------------------------------------------------------------------

const ROOT = document.body.dataset.root || "";
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const playSvg = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
function shade(s){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%997;return h%14}
function tile(s){return `hsl(0 0% calc(var(--tile-l) + ${shade(s)-7}%))`}

// Mobile menu
const menuBtn = document.querySelector('.menu-btn');
if (menuBtn) menuBtn.addEventListener('click', () => {
  const nav = document.getElementById('nav');
  nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', nav.classList.contains('open'));
});

function coverCard(al, extra = '') {
  return `<div class="rel" ${extra}>
    <a href="https://open.spotify.com/album/${al.id}" target="_blank" rel="noopener" aria-label="Listen to ${esc(al.title)} by ${esc(al.artist)} on Spotify">
      <div class="cover" style="background:${tile(al.title + al.artist)}">
        <div class="tile">${esc(al.title)}<small>${esc(al.artist)}</small></div>
        <img loading="lazy" alt="${esc(al.title)} cover art" src="${esc(al.img)}" onerror="this.remove()">
        <span class="play">${playSvg}</span>
      </div>
      <div class="meta"><div class="t">${esc(al.title)}</div><div class="a">${esc(al.artist)}</div></div>
    </a></div>`;
}

async function loadPlaylist() {
  const res = await fetch(ROOT + 'data/playlist.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('playlist ' + res.status);
  return res.json();
}

// Home: six most recent releases
const recent = document.getElementById('recent');
if (recent) loadPlaylist().then(d => {
  recent.innerHTML = d.albums.slice(0, 6).map(al => coverCard(al)).join('');
}).catch(() => { recent.closest('.recent').style.display = 'none'; });

// My Work page
const grid = document.getElementById('grid');
if (grid) loadPlaylist().then(d => {
  const { albums, tracks } = d;
  const albumText = albums.map(() => []);
  tracks.forEach(t => albumText[t.album].push(t.title + ' ' + t.artists));
  grid.innerHTML = albums.map((al, i) =>
    coverCard(al, `data-s="${esc((al.title + ' ' + al.artist + ' ' + albumText[i].join(' ')).toLowerCase())}"`)).join('');

  const tl = document.getElementById('tl'), more = document.getElementById('tlMore');
  let showAll = false;
  tl.innerHTML = tracks.map((t, i) => {
    const al = albums[t.album];
    return `<li data-s="${esc((t.artists + ' ' + t.title + ' ' + al.title).toLowerCase())}"><a href="https://open.spotify.com/track/${t.id}" target="_blank" rel="noopener"><span class="n">${i + 1}</span><span class="th" style="background:${tile(al.title + al.artist)}"><img loading="lazy" alt="" src="${esc(al.thumb)}" onerror="this.remove()"></span><span><span class="tt">${esc(t.title)}</span><span class="ta">${esc(t.artists)}</span></span><span class="go">${playSvg}</span></a></li>`;
  }).join('');
  document.querySelectorAll('.trackCount').forEach(e => e.textContent = tracks.length);
  more.addEventListener('click', () => { showAll = !showAll; apply(); });

  const q = document.getElementById('q');
  function apply() {
    const term = q.value.trim().toLowerCase(); let n = 0, matched = 0;
    grid.querySelectorAll('.rel').forEach(el => {
      const ok = !term || el.dataset.s.includes(term);
      el.style.display = ok ? '' : 'none'; if (ok) n++;
    });
    tl.querySelectorAll('li').forEach(li => {
      const m = !term || li.dataset.s.includes(term); if (m) matched++;
      li.classList.toggle('hide', !(m && (term || showAll || matched <= 30)));
    });
    more.style.display = (term || matched <= 30) ? 'none' : '';
    more.textContent = showAll ? 'Show fewer' : 'Show all ' + tracks.length + ' tracks';
    document.getElementById('count').textContent = term ? n + ' releases · ' + matched + ' tracks' : n + ' releases · ' + tracks.length + ' tracks';
    document.getElementById('empty').style.display = n ? 'none' : 'block';
  }
  q.addEventListener('input', apply);
  apply();
}).catch(() => {
  grid.innerHTML = '<p class="empty" style="display:block">The release list didn\'t load. You can hear everything in the <a href="https://open.spotify.com/playlist/5nU3I9a7Kb8S5pNXCWQ0wQ" target="_blank" rel="noopener">Spotify playlist</a>.</p>';
});

// Contact form
const form = document.getElementById('contactForm');
if (form) form.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = document.getElementById('formMsg'), btn = form.querySelector('button[type="submit"]');
  const say = (text, cls) => { msg.className = 'form-msg ' + (cls || ''); msg.innerHTML = text; };
  if (!form.name.value.trim() || !form.email.value.trim() || !form.message.value.trim()) {
    return say('Please add your name, email, and a message.', 'err');
  }
  if (!form.email.checkValidity()) return say('That email address doesn\'t look right.', 'err');

  if (!FORMSPREE_ID || FORMSPREE_ID === 'YOUR_FORM_ID') {
    const body = `Name: ${form.name.value}\nEmail: ${form.email.value}\nProject: ${form.project.value}\nSongs: ${form.songs.value}\n\n${form.message.value}`;
    say(`Opening your email app. If nothing opens, email <b>${CONTACT_EMAIL}</b> directly.`);
    location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Music Inquiry' + (form.project.value ? ' · ' + form.project.value : ''))}&body=${encodeURIComponent(body)}`;
    return;
  }

  btn.disabled = true; say('Sending…');
  try {
    const data = new FormData(form);
    data.set('_subject', 'Music Inquiry' + (form.project.value ? ' · ' + form.project.value : '') + ' (from ' + form.name.value + ')');
    const res = await fetch('https://formspree.io/f/' + FORMSPREE_ID, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
    if (res.ok) {
      form.reset();
      say('Thanks! Your message is on its way, and I\'ll get back to you as soon as I can.', 'ok');
    } else {
      const j = await res.json().catch(() => ({}));
      const detail = j.errors ? j.errors.map(x => x.message).join(' ') : '';
      say(`Something went wrong sending that${detail ? ' (' + esc(detail) + ')' : ''}. Please email <b>${CONTACT_EMAIL}</b> instead.`, 'err');
    }
  } catch {
    say(`Couldn't reach the server. Please email <b>${CONTACT_EMAIL}</b> instead.`, 'err');
  } finally {
    btn.disabled = false;
  }
});

// Desktop: open Spotify links in the Spotify app instead of the web player.
// Phones already hand open.spotify.com links to the app, so this only runs on computers.
// If the app doesn't take over within ~2 seconds, offer the web player instead.
(function () {
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  const isFirefox = /Firefox\//.test(ua);            // Firefox shows an error page for unknown app links
  if (isMobile || isFirefox) return;

  let bar;
  function offerWeb(url) {
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'app-bar';
      bar.setAttribute('role', 'status');
      document.body.appendChild(bar);
    }
    bar.innerHTML = `<span>Spotify app didn't open?</span><a href="${url}" target="_blank" rel="noopener">Listen in your browser</a><button type="button" aria-label="Close">×</button>`;
    bar.querySelector('button').onclick = () => bar.classList.remove('show');
    bar.querySelector('a').onclick = () => bar.classList.remove('show');
    requestAnimationFrame(() => bar.classList.add('show'));
    clearTimeout(bar._t); bar._t = setTimeout(() => bar.classList.remove('show'), 9000);
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="https://open.spotify.com/"]');
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const m = new URL(a.href).pathname.match(/^\/(track|album|playlist|artist)\/([A-Za-z0-9]+)/);
    if (!m) return;
    e.preventDefault();
    let left = false;
    const mark = () => { left = true; };
    window.addEventListener('blur', mark, { once: true });
    document.addEventListener('visibilitychange', mark, { once: true });
    location.href = `spotify:${m[1]}:${m[2]}`;
    setTimeout(() => {
      window.removeEventListener('blur', mark);
      document.removeEventListener('visibilitychange', mark);
      if (!left && document.hasFocus()) offerWeb(a.href);
    }, 2000);
  });
})();
