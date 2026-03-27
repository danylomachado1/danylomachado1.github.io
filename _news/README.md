# News

Add a `.md` file here for each news item or update, then add the filename to `index.json`.

## Frontmatter fields

| Field | Required | Description |
|-------|----------|-------------|
| `date` | yes | ISO date `YYYY-MM-DD` (used for sorting) |
| `year` | yes | Year number (used for grouping) |
| `display_date` | no | Human-readable date shown in the UI (e.g. `Oct 2024`) |

The **body** is the news text. Markdown is supported (bold, links, etc.).

## Example

```markdown
---
date: 2024-09-01
year: 2024
display_date: Sep 2024
---
Started a new chapter as a PhD student at **Illinois Institute of Technology**. Excited to join Dr. Littlejohn's group!
```

## Adding a news item

1. Create `YYYY-MM-short-description.md` in this folder
2. Fill in frontmatter + body
3. Add the filename to `index.json` (items are displayed in the order listed)
