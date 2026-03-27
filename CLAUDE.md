# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Franz Machado (Physics PhD student at IIT), deployed via GitHub Pages at `danylomachado1.github.io`. Pure static site — no build process, package manager, or framework. Content is data-driven via JSON/Markdown files fetched at runtime by `js/loader.js`.

## Deployment

Push to `main` → GitHub Pages auto-deploys. No build step.

> **Note:** `js/loader.js` uses `fetch()` to load data files. This requires HTTP (works on GitHub Pages and any local server). Opening `index.html` directly from the filesystem (`file://`) will not load dynamic content.

## Data Folders — How to Add Content

| Folder | What it holds | How to add |
|--------|--------------|------------|
| `_data/profile.json` | Name, title, bio, photo, social links | Edit the JSON directly |
| `_data/education.json` | Degree entries | Add an object to the array |
| `_data/awards.json` | Honor/award entries | Add an object to the array |
| `_research/` | Research project `.md` files | Create `.md` + add filename to `_research/index.json` |
| `_news/` | News/update `.md` files | Create `.md` + add filename to `_news/index.json` |
| `_publications/` | Publication/talk `.md` files | Create `.md` + add filename to `_publications/index.json`; see `_publications/README.md` |

Each collection folder has a `README.md` documenting the frontmatter fields for that collection type.

## Key Files

- `index.html` — Skeleton HTML; dynamic sections are empty `<div id="...">` containers
- `css/styles.css` — All styles; uses Inter from Google Fonts, no CSS framework
- `js/loader.js` — Fetches all data files, parses YAML frontmatter + markdown, renders HTML
- `js/main.js` — Nav active-link highlighting via `IntersectionObserver`

## Architecture Notes

- `loader.js` contains a minimal YAML frontmatter parser (`parseMd`) and a simple markdown renderer (`md`). No external parsing libraries.
- Collections (`_research`, `_news`, `_publications`) each have an `index.json` listing filenames in display order. Files not listed in `index.json` are ignored.
- The news section card (`id="news-section"`) starts `hidden`; `loader.js` reveals it only when `_news/index.json` contains entries.
- Color scheme: dark header `#1f1f1f`, page background `#efefef`, white cards with `#e0e0e0` border.
- Skills section is static HTML (edit `index.html` directly to update skills).
