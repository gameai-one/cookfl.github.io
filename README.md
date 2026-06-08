# gameai.one

Personal bilingual Hugo site for GameAI.one.

The site collects long-form thinking, engineering retrospectives, and small
interactive experiments around AI, games, and independent creation. It has two
main sections:

- `content/thoughts/`: essays and engineering narratives.
- `content/works/`: interactive works and project notes.

English is the default language, and Chinese pages use Hugo's filename-based
translation convention:

```text
content/thoughts/example.md
content/thoughts/example.zh.md
```

## Local Development

Install Hugo Extended, then run:

```bash
hugo server -D --bind 0.0.0.0
```

If a local Hugo binary exists at `bin/hugo`, `./serve.sh` can also start the
draft-enabled development server:

```bash
./serve.sh
```

Build the production site with:

```bash
rm -rf public/
hugo --gc --minify
```

## Project Layout

```text
config.yaml      Hugo site configuration
content/         Authored pages and posts
data/            Structured data used by templates
layouts/         Local theme overrides and shortcodes
static/          Static assets copied into the built site
themes/          Hugo theme submodule
```

## Content Notes

Posts use YAML front matter. Common fields include:

```yaml
title: ""
subtitle: ""
date: 2026-06-07
draft: true
tags: []
series: []
translationKey: ""
version: "v1.0"
disclosure: ""
```

Use the same `translationKey` for paired English and Chinese pages.

## License

Repository code is licensed under the MIT License. Original written content is
shared under CC BY 4.0 unless otherwise noted in the page metadata or footer.
