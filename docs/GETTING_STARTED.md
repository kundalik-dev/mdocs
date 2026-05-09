---
title: Getting Started with mDocs
description: How to use the mDocs viewer to read your local Markdown library
date: 2026-05-06
tags: [docs, intro]
---

# Getting Started

mDocs is a **local-first markdown reader**. It opens `.md` files directly from your machine using the browser's File System Access API — no upload, no server, just a polished reading surface.

## Pick something to read

You have two ways in:

- **Open folder** — pick any folder; mDocs walks it recursively for `.md` files.
- **Open files** — pick one or more individual `.md` files.

You can mix and match: open multiple folders and individual files at the same time.

## Reading

- The **left sidebar** lists every file, grouped by source.
- The **right rail** shows a table of contents (when the file has headings).
- Frontmatter (the `---` block at the top of a file) is shown as a clean **metadata card** above the content.

## Shortcuts

- `s` — toggle the sidebar
- `w` — toggle the table of contents
- `a` — previous file
- `d` — next file

## Auto-refresh

When you edit a file in your editor, mDocs notices within ~2 seconds and re-renders. There's also a small refresh button next to the file title if you want to force a reload.

## Themes

Toggle light / dark from the top-right. mDocs defaults to light mode.

---

That's it. Pick a folder and start reading.
