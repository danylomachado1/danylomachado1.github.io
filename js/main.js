// ── Theme toggle ──────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
const themeIcon   = document.getElementById('theme-icon');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

// On load: restore saved preference, or follow system and set correct icon
const saved = localStorage.getItem('theme');
if (saved) {
  applyTheme(saved);
} else {
  // No saved preference — just sync the icon to the current system state
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (themeIcon) themeIcon.className = sysDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

themeToggle?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme')
    ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ── Active nav link on scroll ─────────────────────────────────
const navLinks = document.querySelectorAll('nav ul li a');
const sections = document.querySelectorAll('main .card[id]');

const observerNav = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link =>
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`)
      );
    }
  });
}, { rootMargin: '-30% 0px -60% 0px' });

sections.forEach(s => observerNav.observe(s));

// ── Hamburger nav toggle ──────────────────────────────────────
const navToggle = document.getElementById('nav-toggle');
const navEl     = document.getElementById('site-nav');

if (navToggle && navEl) {
  navToggle.addEventListener('click', () => {
    const open = navEl.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  // Close when a link is tapped (single-page scroll nav)
  navEl.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      navEl.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    })
  );

  // Close when clicking anywhere outside the nav
  document.addEventListener('click', e => {
    if (!navToggle.contains(e.target) && !navEl.contains(e.target)) {
      navEl.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
}
