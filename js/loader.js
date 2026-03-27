/**
 * loader.js — Data-driven page renderer
 *
 * Reads from:
 *   _data/profile.json       → profile card
 *   _data/education.json     → education list
 *   _data/awards.json        → honors & awards list
 *   _research/index.json     → list of _research/*.md files
 *   _news/index.json         → list of _news/*.md files
 *   _publications/index.json → list of _publications/*.md files
 *
 * To add new research/news/publications:
 *   1. Create a .md file in the appropriate folder
 *   2. Add its filename to that folder's index.json
 */

// ── Helpers ────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Minimal markdown → HTML (bold, italic, code, links, paragraphs)
function md(text) {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

// Parse YAML frontmatter + markdown body
function parseMd(text) {
  const fm = {};
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { fm, body: text.trim() };

  const body = match[2].trim();
  const lines = match[1].split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const kv = lines[i].match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)/);
    if (!kv) { i++; continue; }

    const key = kv[1];
    const raw = kv[2].trim();

    if (raw === '') {
      // Block list
      const items = [];
      i++;
      while (i < lines.length && /^\s*-\s/.test(lines[i])) {
        items.push(scalar(lines[i].replace(/^\s*-\s*/, '').trim()));
        i++;
      }
      fm[key] = items.length ? items : null;
      continue;
    }

    // Inline list [a, b]
    if (raw[0] === '[' && raw[raw.length - 1] === ']') {
      fm[key] = raw.slice(1, -1).split(',').map(s => scalar(s.trim())).filter(v => v != null);
      i++; continue;
    }

    fm[key] = scalar(raw);
    i++;
  }

  return { fm, body };
}

function scalar(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~' || v === '') return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if ((v[0] === '"' && v[v.length-1] === '"') ||
      (v[0] === "'" && v[v.length-1] === "'")) return v.slice(1, -1);
  return v;
}

async function getJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}

async function getText(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.text();
}

// Load all .md files listed in folder/index.json
async function loadCollection(folder) {
  const files = await getJson(`${folder}/index.json`);
  const items = [];
  for (const file of files) {
    try {
      const text = await getText(`${folder}/${file}`);
      const { fm, body } = parseMd(text);
      items.push({ ...fm, body, _file: file });
    } catch (e) {
      console.warn(`loader: could not load ${folder}/${file}:`, e.message);
    }
  }
  return items;
}

// ── Profile ────────────────────────────────────────────────────

async function loadProfile() {
  let data;
  try { data = await getJson('_data/profile.json'); }
  catch (e) { console.warn('loader: profile.json not loaded:', e.message); return; }

  const textEl = document.getElementById('profile-text');
  const photoEl = document.getElementById('profile-photo');

  if (textEl) {
    const bioHtml = (data.bio || []).map(p => `<p>${p}</p>`).join('');
    const socialHtml = buildSocial(data.social || {}, data.resume);
    const dotStyle = `background:${esc(data.affiliation_color || '#555')};`;

    textEl.innerHTML = `
      <h1>${esc(data.name)}</h1>
      <p class="profile-title">${esc(data.title)}</p>
      <p class="profile-affil">
        <span class="affil-dot" style="${dotStyle}"></span>
        ${esc(data.affiliation)}
      </p>
      ${bioHtml}
      <div class="social-links">${socialHtml}</div>
    `;
  }

  if (photoEl && data.photo) {
    photoEl.src = data.photo;
    photoEl.alt = data.name || 'Profile photo';
  }
}

function buildSocial(s, resume) {
  const links = [];
  if (s.email)       links.push(`<a href="mailto:${esc(s.email)}"><i class="fa fa-envelope"></i> ${esc(s.email)}</a>`);
  if (s.linkedin)    links.push(`<a href="${esc(s.linkedin)}" target="_blank" rel="noopener"><i class="fa-brands fa-linkedin"></i> LinkedIn</a>`);
  if (s.github)      links.push(`<a href="${esc(s.github)}" target="_blank" rel="noopener"><i class="fa-brands fa-github"></i> GitHub</a>`);
  if (s.researchgate) links.push(`<a href="${esc(s.researchgate)}" target="_blank" rel="noopener"><i class="fa-brands fa-researchgate"></i> ResearchGate</a>`);
  if (s.scholar)     links.push(`<a href="${esc(s.scholar)}" target="_blank" rel="noopener"><i class="fa-brands fa-google-scholar"></i> Google Scholar</a>`);
  if (s.twitter)     links.push(`<a href="${esc(s.twitter)}" target="_blank" rel="noopener"><i class="fa-brands fa-x-twitter"></i> Twitter / X</a>`);
  if (resume)        links.push(`<a href="${esc(resume)}"><i class="fa fa-file-pdf"></i> Resume</a>`);
  return links.join('\n');
}

// ── Education + Awards ─────────────────────────────────────────

async function loadEducationAwards() {
  let edu = [], awards = [];
  try { edu    = await getJson('_data/education.json'); } catch { return; }
  try { awards = await getJson('_data/awards.json');    } catch { /* optional */ }

  const eduEl = document.getElementById('education-list');
  if (eduEl && edu.length) {
    eduEl.innerHTML = edu.map(e => `
      <div class="edu-item">
        <div class="edu-logo" style="background:${esc(e.color || '#555')};">${esc(e.abbr || '?')}</div>
        <div class="edu-details">
          <strong>${esc(e.institution)}</strong>
          <span>${esc(e.department)}</span>
          <span>${esc(e.degree)}</span>
        </div>
        <div class="edu-date">${esc(e.start)} – ${esc(e.end)}</div>
      </div>
    `).join('');
  }

  const awEl = document.getElementById('awards-list');
  if (awEl && awards.length) {
    awEl.innerHTML = awards.map(a => `
      <li>
        <span class="award-name">${esc(a.name)}</span>
        <span class="award-year">${esc(String(a.year))}</span>
      </li>
    `).join('');
  }
}

// ── Research ───────────────────────────────────────────────────

async function loadResearch() {
  const el = document.getElementById('research-list');
  if (!el) return;

  let items;
  try { items = await loadCollection('_research'); }
  catch (e) { console.warn('loader: research collection error:', e.message); return; }

  if (!items.length) {
    el.innerHTML = '<p class="muted">No research items yet.</p>';
    return;
  }

  // Group by year descending
  const byYear = {};
  for (const item of items) {
    const y = String(item.year || 'Other');
    (byYear[y] = byYear[y] || []).push(item);
  }
  const years = Object.keys(byYear).sort((a, b) => b - a);

  el.innerHTML = years.map(year => `
    <div class="news-group">
      <div class="news-year">${esc(year)}</div>
      <div class="news-items">
        ${byYear[year].map(item => `
          <div class="news-item">
            <div class="news-content">
              <strong>${esc(item.title || '')}</strong>
              ${item.body ? ` — ${md(item.body)}` : ''}
              <span class="news-meta">
                Advisor: ${esc(item.advisor || '')} &middot;
                ${esc(item.institution || '')}${item.location ? ', ' + esc(item.location) : ''}
              </span>
            </div>
            <div class="news-date">${esc(item.period || '')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// ── News ───────────────────────────────────────────────────────

async function loadNews() {
  const section = document.getElementById('news-section');
  const el = document.getElementById('news-list');
  if (!el) return;

  let items;
  try { items = await loadCollection('_news'); }
  catch { if (section) section.hidden = true; return; }

  if (!items.length) {
    if (section) section.hidden = true;
    return;
  }

  if (section) section.hidden = false;

  const byYear = {};
  for (const item of items) {
    const y = String(item.year || new Date(item.date || '').getFullYear() || 'Other');
    (byYear[y] = byYear[y] || []).push(item);
  }
  const years = Object.keys(byYear).sort((a, b) => b - a);

  el.innerHTML = years.map(year => `
    <div class="news-group">
      <div class="news-year">${esc(year)}</div>
      <div class="news-items">
        ${byYear[year].map(item => `
          <div class="news-item">
            <div class="news-content"><p>${md(item.body)}</p></div>
            <div class="news-date">${esc(item.display_date || item.date || '')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// ── Publications ───────────────────────────────────────────────

async function loadPublications() {
  const el = document.getElementById('publications-list');
  if (!el) return;

  let items;
  try { items = await loadCollection('_publications'); }
  catch (e) { console.warn('loader: publications error:', e.message); return; }

  if (!items.length) {
    el.innerHTML = '<p class="muted">No publications yet — check back soon.</p>';
    return;
  }

  // Featured first, then by year descending
  items.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return  1;
    return (b.year || 0) - (a.year || 0);
  });

  el.innerHTML = items.map(item => {
    const linkButtons = [
      item.pdf    && `<a href="${esc(item.pdf)}"    target="_blank" rel="noopener">[PDF]</a>`,
      item.code   && `<a href="${esc(item.code)}"   target="_blank" rel="noopener">[Code]</a>`,
      item.slides && `<a href="${esc(item.slides)}" target="_blank" rel="noopener">[Slides]</a>`,
      item.doi    && `<a href="https://doi.org/${esc(item.doi)}" target="_blank" rel="noopener">[DOI]</a>`,
    ].filter(Boolean).join(' ');

    return `
      <div class="pub-card">
        ${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.title)}" class="pub-thumb">` : ''}
        <div class="pub-body">
          <h3 class="pub-title">${esc(item.title || '')}</h3>
          ${item.authors ? `<p class="pub-authors">${md(item.authors)}</p>` : ''}
          ${item.venue   ? `<p class="pub-venue">
            <em>${esc(item.venue)}</em>${item.year ? ' ' + item.year : ''}
            ${item.featured ? '<span class="pub-badge">Featured</span>' : ''}
          </p>` : ''}
          ${item.body    ? `<p class="pub-abstract">${md(item.body)}</p>` : ''}
          ${linkButtons  ? `<div class="pub-links">${linkButtons}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ── Boot ───────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (location.protocol === 'file:') {
    console.warn('loader: running from file:// — serve via HTTP for data loading to work.');
  }
  loadProfile();
  loadEducationAwards();
  loadNews();
  loadResearch();
  loadPublications();
});
