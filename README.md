# Harley’s Asylum

A personal reading room for Books, Comics, and Manga. Add and edit stories, track reading status and progress, keep notes, and search your collection.

## Run

Requires Node.js 24. No dependencies or secrets are needed.

```sh
npm start
```

The server listens on port 3000 (override with `PORT`). Run `npm test` for collection validation and filtering tests.

Data is saved in this browser’s local storage. It does not sync between devices, browsers, or origins; clearing browser storage removes the collection. There is no account or backend database yet. No sample entries are inserted into your collection.

The interface uses CSS cover designs. Google Fonts are optional; system fonts provide a fallback.
