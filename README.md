# Goodreads Library Recommendations

The app loads a Goodreads user's Want to Read shelf, searches selected OverDrive
libraries for matching titles, and groups matches into Read, Hold, and Wishlist
recommendations.

## Run locally

```sh
npm install
npm run dev
```

Enter a Goodreads profile URL in the form `/user/show/<user-id>` and select one
or more libraries before choosing **Find recommendations**.

The Want to Read shelf starts loading immediately when a profile URL is pasted,
or after a 700 ms pause when it is typed manually. Library searches remain a
separate step so the user can choose libraries while the shelf is loading.

The Goodreads shelf and each book/library search result are cached in this
browser for six hours. Searches already in the cache are skipped on later
runs, including after a page reload. Removing a library removes its cached
search results. When adding a library, the app first checks cached OverDrive
title IDs in bulk and falls back to title searches when bulk results do not
include complete availability data. Catalog requests run with a maximum
concurrency of 16; the progress bar counts cached and newly completed
book/library searches.

The Read tab shows matches with available copies. Hold shows titles owned by a
selected library with no available copies. Wishlist shows Goodreads titles with
no owned copies in any selected library.

## OverDrive API proxy

OverDrive does not allow browser-origin requests from this app. The Vite
development server proxies `/api/overdrive` to the OverDrive Thunder API so
local development works without a browser CORS error. A production deployment
must provide an equivalent server-side proxy at that path, rewriting requests
to `https://thunder.api.overdrive.com/v2`; the built static app alone does not
include this proxy.
