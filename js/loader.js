/**
 * loader.js — Data-driven page renderer
 *
 * Data sources:
 *   _data/profile.json       → profile card, JSON-LD
 *   _data/education.json     → education list
 *   _data/awards.json        → honors & awards
 *   _data/teaching.json      → teaching & experience
 *   _research/index.json     → _research/*.md
 *   _news/index.json         → _news/*.md
 *   _talks/index.json        → _talks/*.md
 *   _publications/index.json → _publications/*.md  (manual, highest priority)
 *   ORCID public API         → works by orcid field in profile.json
 *   arXiv API                → works by arxiv_author_query field in profile.json
 *
 * Priority for deduplication: manual > ORCID > arXiv (matched by DOI/arXiv ID)
 */

// ── Utilities ─────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Minimal markdown → HTML
function md(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
    const key = kv[1], raw = kv[2].trim();

    if (raw === '') {
      const items = [];
      i++;
      while (i < lines.length && /^\s*-\s/.test(lines[i]))
        items.push(scalar(lines[i].replace(/^\s*-\s*/, '').trim())), i++;
      fm[key] = items.length ? items : null;
      continue;
    }
    if (raw[0] === '[' && raw[raw.length - 1] === ']') {
      fm[key] = raw.slice(1, -1).split(',').map(s => scalar(s.trim())).filter(v => v != null);
      i++; continue;
    }
    fm[key] = scalar(raw); i++;
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

async function getJson(path, options) {
  const r = await fetch(path, options);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}

async function getText(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.text();
}

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

// Group items by year, return sorted array of { year, items }
function groupByYear(items, yearKey = 'year') {
  const map = {};
  for (const item of items) {
    const y = String(item[yearKey] || 'Other');
    (map[y] = map[y] || []).push(item);
  }
  return Object.keys(map)
    .sort((a, b) => b - a)
    .map(year => ({ year, items: map[year] }));
}

// ── Profile (cached for publications) ─────────────────────────

let _profile = null;

async function loadProfile() {
  try { _profile = await getJson('_data/profile.json'); }
  catch (e) { console.warn('loader: profile.json failed:', e.message); return; }

  const textEl  = document.getElementById('profile-text');
  const photoEl = document.getElementById('profile-photo');

  if (textEl) {
    const bioHtml    = (_profile.bio || []).map(p => `<p>${p}</p>`).join('');
    const socialHtml = buildSocial(_profile.social || {}, _profile.orcid, _profile.resume);

    textEl.innerHTML = `
      <h1>${esc(_profile.name)}</h1>
      <p class="profile-title">${esc(_profile.title)}</p>
      <p class="profile-affil">
        <span class="affil-dot" style="background:${esc(_profile.affiliation_color || '#555')};"></span>
        ${esc(_profile.affiliation)}
      </p>
      ${bioHtml}
      <div class="social-links">${socialHtml}</div>
    `;
  }

  if (photoEl && _profile.photo) {
    photoEl.src = _profile.photo;
    photoEl.alt = _profile.name || 'Profile photo';
  }

  injectJsonLd(_profile);
}

function buildSocial(s, orcid, resume) {
  const links = [];
  if (s.email)        links.push(`<a href="mailto:${esc(s.email)}"><i class="fa fa-envelope"></i> ${esc(s.email)}</a>`);
  if (s.linkedin)     links.push(`<a href="${esc(s.linkedin)}" target="_blank" rel="noopener"><i class="fa-brands fa-linkedin"></i> LinkedIn</a>`);
  if (s.github)       links.push(`<a href="${esc(s.github)}" target="_blank" rel="noopener"><i class="fa-brands fa-github"></i> GitHub</a>`);
  if (s.researchgate) links.push(`<a href="${esc(s.researchgate)}" target="_blank" rel="noopener"><i class="fa-brands fa-researchgate"></i> ResearchGate</a>`);
  if (s.scholar)      links.push(`<a href="${esc(s.scholar)}" target="_blank" rel="noopener"><i class="fa-brands fa-google-scholar"></i> Google Scholar</a>`);
  if (orcid)          links.push(`<a href="https://orcid.org/${esc(orcid)}" target="_blank" rel="noopener"><i class="fa-brands fa-orcid"></i> ORCID</a>`);
  if (s.twitter)      links.push(`<a href="${esc(s.twitter)}" target="_blank" rel="noopener"><i class="fa-brands fa-x-twitter"></i> Twitter / X</a>`);
  if (resume)         links.push(`<a href="${esc(resume)}"><i class="fa fa-file-pdf"></i> Resume</a>`);
  return links.join('\n');
}

// ── JSON-LD structured data ────────────────────────────────────

function injectJsonLd(data) {
  const sameAs = [
    data.orcid && `https://orcid.org/${data.orcid}`,
    data.social?.linkedin,
    data.social?.github,
    data.social?.researchgate,
    data.social?.scholar,
  ].filter(Boolean);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: data.name,
    jobTitle: data.title,
    affiliation: { '@type': 'Organization', name: data.affiliation },
    url: 'https://danylomachado1.github.io/',
    email: data.social?.email,
    image: data.photo ? `https://danylomachado1.github.io/${data.photo}` : undefined,
    identifier: data.orcid ? `https://orcid.org/${data.orcid}` : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };

  // Remove undefined fields
  Object.keys(schema).forEach(k => schema[k] === undefined && delete schema[k]);

  const el = document.getElementById('json-ld-person') || (() => {
    const s = document.createElement('script');
    s.type = 'application/ld+json'; s.id = 'json-ld-person';
    document.head.appendChild(s); return s;
  })();
  el.textContent = JSON.stringify(schema, null, 2);
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

// ── Teaching & Experience ──────────────────────────────────────

async function loadTeaching() {
  const section = document.getElementById('teaching-section');
  const el = document.getElementById('teaching-list');
  if (!el) return;

  let items;
  try { items = await getJson('_data/teaching.json'); }
  catch { return; }

  if (!items.length) return;
  if (section) section.hidden = false;

  el.innerHTML = items.map(t => `
    <div class="teaching-item">
      <div class="news-content">
        <span class="teaching-role">${esc(t.role)}</span>
        <span class="teaching-course">${esc(t.course)}</span>
        <span class="news-meta">${esc(t.institution)}</span>
      </div>
      <div class="teaching-date">${esc(t.start)}${t.end && t.end !== t.start ? ' – ' + esc(t.end) : ''}</div>
    </div>
  `).join('');
}

// ── Research ───────────────────────────────────────────────────

async function loadResearch() {
  const el = document.getElementById('research-list');
  if (!el) return;

  let items;
  try { items = await loadCollection('_research'); }
  catch (e) { console.warn('loader: research error:', e.message); return; }

  if (!items.length) { el.innerHTML = '<p class="muted">No research items yet.</p>'; return; }

  el.innerHTML = groupByYear(items).map(({ year, items: group }) => `
    <div class="news-group">
      <div class="news-year">${esc(year)}</div>
      <div class="news-items">
        ${group.map(item => `
          <div class="news-item">
            <div class="news-content">
              <strong>${esc(item.title || '')}</strong>
              ${item.body ? ` — ${md(item.body)}` : ''}
              <span class="news-meta">Advisor: ${esc(item.advisor || '')} &middot; ${esc(item.institution || '')}${item.location ? ', ' + esc(item.location) : ''}</span>
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
  const el      = document.getElementById('news-list');
  if (!el) return;

  let items;
  try { items = await loadCollection('_news'); }
  catch { if (section) section.hidden = true; return; }

  if (!items.length) { if (section) section.hidden = true; return; }
  if (section) section.hidden = false;

  el.innerHTML = groupByYear(items).map(({ year, items: group }) => `
    <div class="news-group">
      <div class="news-year">${esc(year)}</div>
      <div class="news-items">
        ${group.map(item => `
          <div class="news-item">
            <div class="news-content"><p>${md(item.body)}</p></div>
            <div class="news-date">${esc(item.display_date || item.date || '')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// ── Talks ──────────────────────────────────────────────────────

async function loadTalks() {
  const section = document.getElementById('talks-section');
  const el      = document.getElementById('talks-list');
  if (!el) return;

  let items;
  try { items = await loadCollection('_talks'); }
  catch { if (section) section.hidden = true; return; }

  if (!items.length) { if (section) section.hidden = true; return; }
  if (section) section.hidden = false;

  el.innerHTML = groupByYear(items).map(({ year, items: group }) => `
    <div class="news-group">
      <div class="news-year">${esc(year)}</div>
      <div class="news-items">
        ${group.map(item => {
          const typeClass = item.type === 'poster' ? 'talk-type-poster' : 'talk-type-presentation';
          const typeLabel = item.type || 'talk';
          const links = [
            item.slides && `<a href="${esc(item.slides)}" target="_blank" rel="noopener">[Slides]</a>`,
            item.video  && `<a href="${esc(item.video)}"  target="_blank" rel="noopener">[Video]</a>`,
            item.poster && `<a href="${esc(item.poster)}" target="_blank" rel="noopener">[Poster]</a>`,
          ].filter(Boolean).join(' ');

          return `
            <div class="news-item">
              <div class="news-content">
                <strong>${esc(item.title || '')}</strong>
                <span class="talk-type ${typeClass}">${esc(typeLabel)}</span>
                <span class="news-meta">${esc(item.venue || '')}${item.location ? ' &middot; ' + esc(item.location) : ''}</span>
                ${links ? `<span class="news-meta" style="font-style:normal;">${links}</span>` : ''}
              </div>
              <div class="news-date">${esc(item.display_date || item.date || '')}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');
}

// ── Publications: ORCID ────────────────────────────────────────

async function fetchOrcidWorks(orcid) {
  const data = await getJson(
    `https://pub.orcid.org/v3.0/${orcid}/works`,
    { headers: { Accept: 'application/json' } }
  );
  return (data.group || []).map(group => {
    const s = group['work-summary']?.[0];
    if (!s) return null;
    const extIds = s['external-ids']?.['external-id'] || [];
    const doi    = extIds.find(e => e['external-id-type'] === 'doi')?.['external-id-value'] || '';
    return {
      title:  s.title?.title?.value || '',
      year:   Number(s['publication-date']?.year?.value) || null,
      venue:  s['journal-title']?.value || '',
      doi,
      pdf:    doi ? `https://doi.org/${doi}` : (s.url?.value || ''),
      _source: 'orcid',
    };
  }).filter(Boolean);
}

// ── Publications: arXiv ────────────────────────────────────────

async function fetchArxivWorks(authorQuery) {
  const url = `https://export.arxiv.org/api/query?search_query=au:${authorQuery}&max_results=20&sortBy=submittedDate&sortOrder=descending`;
  const xml  = await getText(url);
  const doc  = new DOMParser().parseFromString(xml, 'application/xml');

  return Array.from(doc.querySelectorAll('entry')).map(e => {
    const title    = e.querySelector('title')?.textContent?.trim() ?? '';
    const year     = Number((e.querySelector('published')?.textContent ?? '').slice(0, 4)) || null;
    const authors  = Array.from(e.querySelectorAll('author name')).map(n => n.textContent.trim()).join(', ');
    const arxivUrl = Array.from(e.querySelectorAll('link'))
                       .find(l => l.getAttribute('rel') === 'alternate')?.getAttribute('href') ?? '';
    const doi      = (e.querySelector('arxiv\\:doi, doi')?.textContent ?? '').trim();
    const arxivId  = arxivUrl.split('/abs/').pop() ?? '';
    const summary  = e.querySelector('summary')?.textContent?.trim() ?? '';

    return { title, year, authors, venue: 'arXiv preprint', doi, pdf: arxivUrl, body: summary, _source: 'arxiv', _arxivId: arxivId };
  }).filter(e => e.title);
}

// ── Publications: render ───────────────────────────────────────

function renderPubCard(item) {
  const sourceTag = {
    orcid: `<span class="pub-source-tag"><i class="fa-brands fa-orcid"></i> ORCID</span>`,
    arxiv: `<span class="pub-source-tag pub-source-arxiv"><i class="fa-solid fa-atom"></i> arXiv</span>`,
  }[item._source] ?? '';

  const links = [
    item.pdf    && `<a href="${esc(item.pdf)}"    target="_blank" rel="noopener">[PDF]</a>`,
    item.code   && `<a href="${esc(item.code)}"   target="_blank" rel="noopener">[Code]</a>`,
    item.slides && `<a href="${esc(item.slides)}" target="_blank" rel="noopener">[Slides]</a>`,
    item.doi    && `<a href="https://doi.org/${esc(item.doi)}" target="_blank" rel="noopener">[DOI]</a>`,
  ].filter(Boolean).join(' ');

  const venueHtml = item.venue
    ? `<p class="pub-venue"><em>${esc(item.venue)}</em>${item.year ? ' ' + item.year : ''} ${item.featured ? '<span class="pub-badge">Featured</span>' : ''} ${sourceTag}</p>`
    : (item.year || sourceTag ? `<p class="pub-venue">${item.year || ''} ${sourceTag}</p>` : '');

  return `
    <div class="pub-card">
      ${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.title)}" class="pub-thumb">` : ''}
      <div class="pub-body">
        <h3 class="pub-title">${esc(item.title || '')}</h3>
        ${item.authors ? `<p class="pub-authors">${md(item.authors)}</p>` : ''}
        ${venueHtml}
        ${item.body    ? `<p class="pub-abstract">${md(item.body)}</p>` : ''}
        ${links        ? `<div class="pub-links">${links}</div>` : ''}
      </div>
    </div>
  `;
}

async function loadPublications() {
  const el = document.getElementById('publications-list');
  if (!el) return;

  // Wait for profile to be cached so we have orcid + arxiv_author_query
  if (!_profile) {
    try { _profile = await getJson('_data/profile.json'); } catch { /* continue without */ }
  }

  const orcid       = _profile?.orcid;
  const arxivQuery  = _profile?.arxiv_author_query;

  const [manualItems, orcidItems, arxivItems] = await Promise.all([
    loadCollection('_publications').catch(() => []),
    orcid      ? fetchOrcidWorks(orcid).catch(e => { console.warn('loader: ORCID failed:', e.message); return []; }) : Promise.resolve([]),
    arxivQuery ? fetchArxivWorks(arxivQuery).catch(e => { console.warn('loader: arXiv failed:', e.message); return []; }) : Promise.resolve([]),
  ]);

  // Manual entries take highest priority — deduplicate by DOI / arXiv ID
  const manualDois    = new Set(manualItems.map(i => i.doi).filter(Boolean));
  const manualArxivIds = new Set(manualItems.map(i => i._arxivId).filter(Boolean));
  const orcidDois     = new Set(orcidItems.map(i => i.doi).filter(Boolean));

  const uniqueOrcid = orcidItems.filter(i => !i.doi || !manualDois.has(i.doi));
  const uniqueArxiv = arxivItems.filter(i => {
    if (i._arxivId && manualArxivIds.has(i._arxivId)) return false;
    if (i.doi && (manualDois.has(i.doi) || orcidDois.has(i.doi))) return false;
    return true;
  });

  const items = [...manualItems, ...uniqueOrcid, ...uniqueArxiv];

  if (!items.length) {
    el.innerHTML = '<p class="muted">No publications yet — check back soon.</p>';
    return;
  }

  items.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return  1;
    return (b.year || 0) - (a.year || 0);
  });

  el.innerHTML = items.map(renderPubCard).join('');
}

// ── Boot ───────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (location.protocol === 'file:')
    console.warn('loader: file:// detected — serve via HTTP for data loading to work.');

  // Profile first (caches _profile for publications)
  loadProfile().then(() => loadPublications());

  // Independent loaders run in parallel
  loadEducationAwards();
  loadTeaching();
  loadNews();
  loadResearch();
  loadTalks();
});
