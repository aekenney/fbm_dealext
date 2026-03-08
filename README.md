# DealExt

A Chrome extension that analyzes Facebook Marketplace car listings — extract listing details, score the deal, and save comparables to identify good buys at a glance.

## Features

- **Extract** — automatically pulls price, year, make, model, and mileage from any FB Marketplace vehicle listing
- **Score** — rates each listing as Deal / Fair / Overpriced against your saved comparables
- **Comparables** — save listings locally and build a personal price history for any make/model

## Getting Started

```bash
cd extension
npm install
npm run dev
```

Load the unpacked extension from `extension/output/chrome-mv3` in `chrome://extensions`.

## Project Structure

```
extension/   # WXT browser extension
api/         # Backend service (scoring, comparables API)
shared/      # Types shared between extension and api
public/      # Static assets
```