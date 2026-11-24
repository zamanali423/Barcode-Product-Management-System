# Vantage Inventory

A professional, offline-first barcode product management system built with React, TypeScript, Dexie.js, and Tailwind CSS. Every product, category, scan and preference lives in the browser's IndexedDB — there is no backend, account, or external API.

## Features

- **Product management** — create, search, filter, sort, paginate, view, edit, and delete products.
- **Automatic barcodes** — every new product receives a unique 12-digit CODE128 value with a database-level uniqueness constraint. Editing never changes a barcode unless you explicitly replace it.
- **Scanning** — camera scanning via ZXing for CODE128, CODE39/93, Codabar, EAN-8/13, UPC-A/E, ITF, QR, Data Matrix, Aztec, PDF417 and GS1 DataBar; keyboard-wedge support for USB scanners; and manual entry. Unknown codes are still read, shown with their detected format, and can be registered. Duplicate reads are suppressed until the next scan.
- **Price-first result panel** — matched products are shown with a prominent unit price, category, SKU, description, and barcode. Unknown codes can be registered immediately with the scanned value prefilled.
- **Labels** — select products, set quantities, preview 54 × 32 mm or 86 × 50 mm labels, print batches, or download individual high-resolution PNG labels.
- **Backup and restore** — validated JSON exports; merge or replace restore modes.
- **PWA** — installable app shell with precached assets for offline use.
- **Settings** — workspace identity, currency, scanner sound, duplicate window, label size, install status, and danger-zone reset.

## Running locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Camera access requires `localhost` or HTTPS. USB scanners work as keyboard-wedge devices: scan while the scanner page is open.

Production build and preview:

```bash
npm run build
npm run preview
```

`npm run build` type-checks the full project before bundling. The generated service worker and manifest enable offline use in the production build.

## Architecture

```
src/
  components/        UI primitives, layout shell, product, scanner and label modules
  db/                Dexie schema, transactional services, backup/restore
  hooks/             Live-query hooks, camera scanning, USB wedge capture, PWA helpers
  lib/               Formatting, validation, search, barcode generation, label canvas
  pages/             Route-level screens
  types/             Domain models and shared form types
```

- The schema is versioned in [`src/db/database.ts`](src/db/database.ts): products, categories, activity, scans, and settings. Barcodes use a unique index; SKU and category are indexed for queries.
- Writes go through dedicated service functions in `src/db`; product, category and activity updates run inside Dexie transactions.
- The UI uses `dexie-react-hooks` live queries so all views react instantly to local changes, including across browser tabs.
- The scanner is lazy-loaded so the ZXing camera reader is only downloaded when needed.

## Data and privacy

No product data leaves the device. Camera frames are processed locally by ZXing. Clearing browser site data deletes the workspace, so download a JSON backup from Settings regularly.

## Browser support

Modern Chromium, Firefox and Safari. Camera scanning requires a secure context; USB keyboard-wedge scanners and manual entry work without camera support.
