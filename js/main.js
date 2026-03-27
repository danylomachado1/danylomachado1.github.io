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
