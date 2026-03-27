# Publications

Add a `.md` file here for each publication or presentation, then add the filename to `index.json`.

## Frontmatter fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | yes | Full title of the paper/talk |
| `authors` | yes | Author list (your name in **bold**: `**Franz Machado**`) |
| `venue` | yes | Journal, conference, or workshop name |
| `year` | yes | Publication year (number) |
| `featured` | no | `true` to pin to top of list |
| `image` | no | Path to thumbnail image (e.g. `images/paper1-thumb.jpg`) |
| `pdf` | no | URL to PDF (arXiv, journal, or local `assets/papers/`) |
| `code` | no | URL to code repository |
| `slides` | no | URL or path to slides |
| `doi` | no | DOI string (e.g. `10.1103/PhysRevD.100.012001`) |

The **body** (below the second `---`) is shown as the abstract/description. Markdown is supported.

## Example

```markdown
---
title: "Neutrino Flux Predictions for Nuclear Monitoring Applications"
authors: "**Franz Machado**, Bryce Littlejohn"
venue: "Physical Review D"
year: 2025
featured: true
pdf: "https://arxiv.org/abs/2501.XXXXX"
doi: "10.1103/PhysRevD.XXX"
image: "images/pub-neutrino-2025.jpg"
---
We present flux predictions for antineutrino detectors positioned near nuclear test sites,
using the PROSPECT-CNP toolkit to optimize detector configurations for yield measurements.
```

## Adding a new publication

1. Create `my-paper-2025.md` (or any descriptive name) in this folder
2. Fill in the frontmatter
3. Add `"my-paper-2025.md"` to `index.json`
