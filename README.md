# Harley’s Asylum

A personal reading room for Books, Comics, and Manga. Add and edit stories, track reading status and progress, keep notes, and search your collection.

## Run

Requires Node.js 24. No dependencies or secrets are needed.

```sh
npm start
```

The server listens on port 3000 (override with `PORT`). Run `npm test` for collection validation and filtering tests.

Data is saved in this browser’s local storage. It does not sync between devices, browsers, or origins; clearing browser storage removes the collection. There is no account or backend database yet. Your spreadsheet snapshot is imported once per browser: 242 series/editions, 1,215 owned volumes, and 454 reread volumes. Three explicitly labeled novels are in Books; 239 other entries are in Manga. Reading status describes rereading owned volumes, not publication completion. Edition, publisher, ownership, prices, references, and individual volume statuses are preserved. This is not live Google Sheets sync. Existing stories are retained; matching titles/creators/categories are not duplicated. Deleted imported stories stay deleted after reload. Volume details retain the original spreadsheet snapshot; editing overall progress does not rewrite individual volume statuses.

The interface uses CSS cover designs. Google Fonts are optional; system fonts provide a fallback.

## Comics import

The supplied Comic Geeks export adds 419 individual issues/variants once per browser, preserving existing entries and edits. 396 are owned, 21 wishlisted, and 280 marked read. Reading status follows Marked Read, independently of ownership and wishlist membership. Ratings, series, publisher, format, release date, and all original row fields are retained; creators are left blank because the export does not supply them. This snapshot does not sync with Comic Geeks.
