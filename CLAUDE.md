# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hugo static site for **gameai.one** — a bilingual (English + Chinese) blog on AI and gaming. Uses Hugo v0.152.2 (extended) with the hugo-book theme. The local Hugo binary lives in `bin/`.

## Essential Commands

```bash
# Dev server (drafts enabled)
./bin/hugo server -D --bind 0.0.0.0

# Production build (always clean first)
rm -rf public/ && ./bin/hugo --gc --minify

# Create new content
./bin/hugo new content/thoughts/<slug>.md      # English thought
./bin/hugo new content/thoughts/<slug>.zh.md   # Chinese thought
./bin/hugo new content/works/<slug>.md         # English work

# Template performance check
./bin/hugo --templateMetrics --templateMetricsHints
```

## Architecture

### Multilingual Setup
The site is **bilingual** with English as default language (`defaultContentLanguage: "en"` in `config.yaml`). Content files use Hugo's filename-based i18n:
- `<slug>.md` → English
- `<slug>.zh.md` → Chinese

Both languages share the same directory structure under `content/`. Language switching is handled by a custom `layouts/partials/docs/languages.html` partial, and `layouts/partials/docs/inject/head.html` injects `js/lang-detect.js` for auto-detection on multilingual builds.

### Content Sections
- `content/thoughts/` — Long-form thinking pieces (思考)
- `content/works/` — Projects and creations (作品)
- `content/about/` — About page (关于)

Each section has `_index.md` (English) and `_index.zh.md` (Chinese).

### Frontmatter Fields
```yaml
title: "Article Title"
subtitle: "Deep Thinking · Episode 1"   # Optional, shown in list pages
date: 2025-12-18
tags: ["AI", "indie-creator"]
draft: false
disclosure: "Optional disclosure text"   # Rendered by content-before partial
showPublishMeta: true                    # Default true; controls footer meta block
zhihuFirst: false                        # Zhihu cross-posting metadata
zhihuAuthor: ""
zhihuUrl: ""
```

### Custom Layouts (overriding hugo-book theme)
- `layouts/section/thoughts.html` / `layouts/section/思考.html` — Paginated list with subtitle, summary (truncated 240 chars), and post meta. Language-aware empty state.
- `layouts/section/works.html` — Works listing
- `layouts/partials/docs/inject/content-before.html` — Per-page disclosure block (front matter `disclosure` field)
- `layouts/partials/docs/inject/content-after.html` — Publishing meta footer: canonical link, license (CC BY 4.0), citation block, optional Zhihu cross-post footnote. Bilingual (zh/en).
- `layouts/shortcodes/site-link.html` — Resolves links from `data/site_links.yaml` by key

### Theme
hugo-book via Git submodule (`themes/hugo-book/`, `ignore = dirty`). Customizations override theme templates via Hugo's lookup order. Keep overrides minimal.

## Content Philosophy
- Depth over speed ("慢下来")
- Authenticity over perfection ("真实 > 完美")
- Completion over perfection ("完成 > 完美")

## Git Workflow
- Main branch: `main`
- `public/` is git-tracked (generated site output)
- Hugo binary in `bin/` is committed
- Theme updates: `git submodule update --remote themes/hugo-book`
- Commit messages: imperative mood, English or Chinese as appropriate
