# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio/resume website for Franz Machado (Physics PhD student at IIT), deployed via GitHub Pages at `danylomachado1.github.io`. It is a pure static site with no build process, package manager, or framework.

## Deployment

Changes pushed to `main` are automatically deployed via GitHub Pages. There is no CI/CD pipeline or build step.

## File Structure

- `index.html` — Single-page site with all content sections (About, Education, Research, Awards, Skills, Publications, Contact)
- `css/styles.css` — All styling; uses CSS custom properties, Inter/Fira Code from Google Fonts
- `js/main.js` — Scroll-based behaviors: sticky header shadow, active nav highlighting, scroll-reveal animations
- `js/tabs.js` — Legacy file containing misplaced CSS; no longer referenced, safe to delete

## Architecture Notes

- Single-page design; all `<section>` elements use `#id` anchors for nav
- Color scheme defined via CSS variables in `:root` (primary: `#0a7c8c`, accent: `#14b8a6`)
- Scroll-reveal uses `IntersectionObserver` on `.reveal` elements; active nav link set by a second observer
- Hero section uses animated CSS rings (`@keyframes spin`) around the profile photo placeholder
- No build step; edit HTML/CSS/JS directly and push to `main` to deploy
