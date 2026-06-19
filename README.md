# Neelam Feeds Order Management

A web application for managing feed orders, built for Neelam Feeds. Track orders, record line items (brand, category, feed type, product, packaging, quantity, weight), and optionally sync data to Google Sheets.

## Features

- **Order Management** — Create and view feed orders with multiple line items
- **Authentication** — Email/password and Google sign-in via Firebase Auth
- **Print Support** — Print-friendly order summaries on success screen and order detail
- **Google Sheets Sync** — Optionally push new orders to a Google Sheet (enabled when credentials are configured)

## Tech Stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Cloudflare Pages Functions
- **Database:** Cloudflare D1 (SQLite)
- **Auth:** Firebase Authentication
- **ORM:** Drizzle
- **Hosting:** Cloudflare Pages

## Development

Prerequisites: Node.js

```bash
npm install
npm run dev
```

The dev server runs locally with Vite. Pages Functions are served via `wrangler pages dev`.

## Deploy

```bash
npm run pages:deploy
```

Environment variables and D1 database bindings are managed in the Cloudflare Dashboard — no local config files required.
