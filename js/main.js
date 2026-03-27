// Sticky header shadow on scroll
const header = document.getElementById('site-header');
window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

// Active nav link highlighting
const navLinks = document.querySelectorAll('nav ul li a');
const sections = document.querySelectorAll('main section, #hero');

const observerNav = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navLinks.forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
            });
        }
    });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => observerNav.observe(s));

// Scroll reveal
const reveals = document.querySelectorAll('.reveal');
const observerReveal = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observerReveal.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

reveals.forEach(el => observerReveal.observe(el));
