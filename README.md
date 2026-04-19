# Marketplace Saved Web App

This is a static iPhone-friendly web app for working through Facebook Marketplace-related exports. It now accepts the Facebook zip export directly, which is the normal format Facebook gives you.

## What changed after inspecting your export

Your uploaded Facebook export contains several different JSON files, and they are not equally useful.

Most important findings from your export:
- `your_saved_items.json` contains **33,115** save-history rows, but almost all are generic text like `Steve Segal saved a product from ...` with no item title, price, area, or listing URL.
- `collections.json` is much more useful. It contains some saved collection entries with product titles, prices, descriptions, and in some cases direct URLs.
- `your_marketplace_listing_history.json` is also useful. It contains titles and descriptions for viewed listings, and in a smaller number of cases a Marketplace item URL appears inside the description.

Because of that, version 2 of the parser is tuned for:
- `collections.json`
- `your_marketplace_listing_history.json`
- `your_saved_items.json` only as a fallback for saved external links

## Current limitations from the Facebook export itself

The export does **not** reliably include area or coordinates for most saved items.
That means:
- map mode is only approximate when a city can be inferred from text
- many items will show `Area unknown`
- sold / unavailable detection is still heuristic

## Features

- Selectable titles
- Copy Title
- Copy Cleaned Title for easier eBay sold searches
- Open Marketplace when a URL exists
- eBay sold search shortcut
- Active / sold / unavailable / unknown filter
- Notes, shortlist, and pass toggles stored locally in the browser
- CSV export of the filtered view
- Approximate map view when an area can be inferred

## How to use

1. Host the folder as a static site.
2. Open it in Safari on iPhone.
3. Tap **Use Current Location**.
4. Upload the Facebook zip export directly.
5. The app unpacks the zip in your browser and looks first for:
   - `collections.json`
   - `your_marketplace_listing_history.json`
   - optionally `your_saved_items.json`
6. Filter, copy titles, open listings, and run eBay sold searches.

## Best practice with your export

For your particular export, the most useful workflow is:
- use the list view first
- treat the map as secondary
- rely on copyable titles and eBay comp search heavily
- expect many rows to have incomplete location data

## File list

- `index.html`
- `style.css`
- `app.js`


## Zip import

The app can now read a `.zip` export directly in Safari. You do not need to extract the files first.

It uses JSZip in the browser to unpack the archive locally on your device, then parses the JSON files inside it.
