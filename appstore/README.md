# App Store automation

Everything here runs from GitHub Actions with the App Store Connect API key
already saved as repo secrets (`ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`).
Nothing in it builds the app or submits the app for review.

| What | Where it lives | How it ships |
|---|---|---|
| Main product page screenshots | `ios/App/fastlane/screenshots/en-US/` (`NN_iPhone69_NN.png`, `NN_iPadPro13_NN.png`) | Automatically on merge to `main`, or Actions → App Store → `screenshots` |
| Custom Product Pages | `product-pages.json` | Automatically on merge to `main` (as drafts), or Actions → App Store → `product-pages` |
| Page status and links | — | Actions → App Store → `status` |
| Header / search / universal creatives | `docs/appstore/product-page-images/` | By hand in App Store Connect (no API yet) |

## Custom Product Pages

Each page in `product-pages.json` has a name (max 30 characters, shown only to
you), promotional text (max 170), and the screenshot numbers 1–6 in the order
they should appear. The same numbers are used for iPhone and iPad.

- A new name creates a page. A changed page gets a new draft version if the
  current one is live or in review; live pages are never edited in place.
- Pages in App Store Connect that aren't in the file are left alone.
- Pages only go live after App Review. Tick **submit_pages** when running the
  workflow, or submit from App Store Connect. Apple allows one open review
  submission per app, so this fails while an app version is waiting for review.
- Once approved, each page has its own URL (`status` prints it). Use it in ads,
  or pick the page in Apple Search Ads.

Local check, no key needed: `node scripts/appstore/product-pages.mjs check`.
