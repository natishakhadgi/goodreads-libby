import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Container, LinearProgress, Typography } from '@mui/material';
import Header from './components/Header';
import Listings from './components/Listings';
import UserInfo from './components/UserInfo';
import findLibraryRecommendations from './functions/findLibraryRecommendations';
import isbn10To13 from './functions/isbn10To13.js';
import {
  CACHE_TTL_MS,
  cacheGoodreadsShelf,
  cleanExpiredRecommendationCache,
  getCachedGoodreadsShelf,
  removeLibraryCatalogCache,
} from './functions/recommendationCache';

const getGoodreadsUserId = (profileUrl) => {
  let url;

  try {
    url = new URL(profileUrl);
  } catch {
    throw new Error('Enter a valid Goodreads profile URL.');
  }

  if (!['goodreads.com', 'www.goodreads.com'].includes(url.hostname)) {
    throw new Error('Enter a URL from goodreads.com.');
  }

  const profileMatch = url.pathname.match(/^\/user\/show\/([^/]+)/);
  if (!profileMatch) {
    throw new Error('Use a Goodreads profile URL, such as /user/show/12345-name.');
  }

  return profileMatch[1];
};

const loadGoodreadsBooks = async (userId, signal) => {
  const books = [];
  const seenBooks = new Set();
  let result = {};

  for (let page = 1; ; page += 1) {
    const query = new URLSearchParams({
      page: `${page}`,
      per_page: '30',
    });
    const response = await fetch(
      `https://api.piratereads.com/${encodeURIComponent(userId)}/want-to-read?${query}`,
      { signal }
    );
    if (!response.ok) {
      throw new Error(`Could not load Goodreads books (${response.status}).`);
    }

    result = await response.json();
    const pageBooks = Array.isArray(result?.books) ? result.books : [];
    if (pageBooks.length === 0) {
      break;
    }

    let addedBooks = 0;
    pageBooks.forEach((book) => {
      const key =
        book?.book_link ??
        book?.isbn ??
        `${book?.book_title ?? ''}::${book?.book_author ?? ''}`;
      if (!seenBooks.has(key)) {
        seenBooks.add(key);
        books.push(book);
        addedBooks += 1;
      }
    });

    if (addedBooks === 0) {
      break;
    }
  }

  return { ...result, count: books.length, books };
};

const getLibraryKey = (library) => String(library.libraryId);

const buildRecommendationData = (
  books,
  libraryListings,
  libraries,
  maxWaitDays
) => {
  const allLibrariesSearched =
    libraries.length > 0 &&
    libraries.every((library) =>
      libraryListings[getLibraryKey(library)]?.complete
    );
  const listings = books.map((book, bookIndex) => ({
    title: book.book_title ?? book.title ?? '',
    author: book.book_author ?? book.author ?? '',
    image:
      book.book_cover_medium ??
      book.book_cover_small ??
      book.book_cover_large ??
      '',
    books: libraries.flatMap(
      (library) =>
        libraryListings[getLibraryKey(library)]?.listings?.[bookIndex]?.books ??
        []
    ),
  }));

  return {
    books,
    readListings: listings
      .map((listing) => ({
        ...listing,
        books: listing.books.filter(
          (book) =>
            book.availableCopies > 0 &&
            book.estimatedWaitDays <= maxWaitDays
        ),
      }))
      .filter((listing) => listing.books.length > 0),
    holdListings: listings
      .map((listing) => ({
        ...listing,
        books: listing.books.filter(
          (book) =>
            book.ownedCopies > 0 &&
            book.availableCopies === 0 &&
            book.estimatedWaitDays <= maxWaitDays
        ),
      }))
      .filter((listing) => listing.books.length > 0),
    wishListListings: allLibrariesSearched
      ? listings.flatMap((listing) => {
          const longWaitCopies = listing.books.filter(
            (book) => book.estimatedWaitDays > maxWaitDays
          );
          if (longWaitCopies.length > 0) {
            return [{ ...listing, books: longWaitCopies }];
          }
          return listing.books.some((book) => book.ownedCopies > 0)
            ? []
            : [{ ...listing, books: [] }];
        })
      : [],
  };
};

function App() {
  const [tab, setTab] = useState('home');
  const [userInfo, setUserInfo] = useState({
    url: '',
    libraries: [],
    formatSelection: 'both',
    maxWaitDays: '90',
  });
  const [shelfCache, setShelfCache] = useState(null);
  const [libraryListings, setLibraryListings] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [shelfStatus, setShelfStatus] = useState('idle');
  const [shelfError, setShelfError] = useState('');
  const [cacheWarning, setCacheWarning] = useState('');
  const [progress, setProgress] = useState(null);
  const requestRef = useRef(null);
  const shelfRequestRef = useRef(null);
  const shelfCacheRef = useRef(null);
  const activeProfileRef = useRef(null);
  const selectedLibrariesRef = useRef(userInfo.libraries);

  useEffect(
    () => {
      cleanExpiredRecommendationCache(() => {
        setCacheWarning('Local caching is unavailable; results may not survive a reload.');
      });

      return () => {
        requestRef.current?.abort();
        requestRef.current = null;
        shelfRequestRef.current?.controller.abort();
        shelfRequestRef.current = null;
      };
    },
    []
  );

  const ensureGoodreadsShelf = useCallback(async (profileUrl) => {
    let userId;
    try {
      userId = getGoodreadsUserId(profileUrl.trim());
    } catch {
      return null;
    }

    if (activeProfileRef.current !== userId) {
      return null;
    }

    const currentShelf = shelfCacheRef.current;
    if (
      currentShelf?.userId === userId &&
      Date.now() - currentShelf.cachedAt < CACHE_TTL_MS
    ) {
      setShelfStatus('ready');
      setShelfError('');
      return currentShelf.books;
    }

    if (shelfRequestRef.current?.userId === userId) {
      return shelfRequestRef.current.promise;
    }

    const cachedShelf = getCachedGoodreadsShelf(userId, () => {
      setCacheWarning(
        'Local caching is unavailable; results may not survive a reload.'
      );
    });
    if (cachedShelf) {
      const shelf = { ...cachedShelf, userId };
      shelfCacheRef.current = shelf;
      setShelfCache(shelf);
      setShelfStatus('ready');
      setShelfError('');
      return shelf.books;
    }

    shelfRequestRef.current?.controller.abort();
    const controller = new AbortController();
    const shelfRequest = { userId, controller, promise: null };
    shelfRequestRef.current = shelfRequest;
    setShelfStatus('loading');
    setShelfError('');

    shelfRequest.promise = loadGoodreadsBooks(userId, controller.signal)
      .then((result) =>
        result.books
          .filter((book) => `${book?.book_title ?? book?.title ?? ''}`.trim())
          .map((book) => {
            const normalizedIsbn = `${book?.isbn ?? ''}`
              .trim()
              .replace(/[-\s]/g, '');
            let isbn13 = '';

            if (/^\d{13}$/.test(normalizedIsbn)) {
              isbn13 = normalizedIsbn;
            } else if (/^\d{9}[\dX]$/i.test(normalizedIsbn)) {
              isbn13 = isbn10To13(normalizedIsbn);
            }

            return { ...book, isbn13 };
          })
      )
      .then((books) => {
        if (
          shelfRequestRef.current !== shelfRequest ||
          activeProfileRef.current !== userId
        ) {
          return null;
        }

        const shelf = { userId, books, cachedAt: Date.now() };
        shelfCacheRef.current = shelf;
        setShelfCache(shelf);
        setShelfStatus('ready');
        cacheGoodreadsShelf(userId, books, () => {
          setCacheWarning(
            'Local caching is unavailable; results may not survive a reload.'
          );
        });
        return books;
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          return null;
        }
        if (shelfRequestRef.current === shelfRequest) {
          console.error('Error loading Goodreads shelf:', error);
          setShelfStatus('error');
          setShelfError(error.message || 'Unable to load Goodreads books.');
        }
        return null;
      })
      .finally(() => {
        if (shelfRequestRef.current === shelfRequest) {
          shelfRequestRef.current = null;
        }
      });

    return shelfRequest.promise;
  }, []);

  const handleGoodreadsUrlChange = (url) => {
    let userId = null;
    try {
      userId = getGoodreadsUserId(url.trim());
    } catch {
      // Partial URLs are expected while the user is typing.
    }

    activeProfileRef.current = userId;
    if (shelfRequestRef.current?.userId !== userId) {
      shelfRequestRef.current?.controller.abort();
      shelfRequestRef.current = null;
    }

    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setProgress(null);
    setLoadError('');
    setSearchMessage('');
    setShelfError('');
    if (shelfCacheRef.current?.userId !== userId) {
      shelfCacheRef.current = null;
      setShelfCache(null);
      setLibraryListings({});
    }

    const cachedShelf = shelfCacheRef.current;
    if (
      userId &&
      cachedShelf?.userId === userId &&
      Date.now() - cachedShelf.cachedAt < CACHE_TTL_MS
    ) {
      setShelfStatus('ready');
    } else if (shelfRequestRef.current?.userId === userId) {
      setShelfStatus('loading');
    } else {
      setShelfStatus('idle');
    }
  };

  const handleLibrariesChange = (libraries) => {
    const selectedKeys = new Set(libraries.map(getLibraryKey));
    const removedLibraries = selectedLibrariesRef.current.filter(
      (library) => !selectedKeys.has(getLibraryKey(library))
    );
    if (removedLibraries.length > 0 && requestRef.current) {
      requestRef.current.abort();
      requestRef.current = null;
      setLoading(false);
      setProgress(null);
    }

    selectedLibrariesRef.current = libraries;
    setUserInfo((prev) => ({ ...prev, libraries }));

    removedLibraries.forEach((library) =>
      removeLibraryCatalogCache(library.libraryId, () => {
        setCacheWarning('Local caching is unavailable; results may not survive a reload.');
      })
    );
    setLibraryListings((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([libraryKey]) =>
          selectedKeys.has(libraryKey)
        )
      )
    );
  };

  const handleFormatSelectionChange = (formatSelection) => {
    if (formatSelection === userInfo.formatSelection) return;
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setProgress(null);
    setLibraryListings({});
    setLoadError('');
    setSearchMessage('');
    setUserInfo((prev) => ({ ...prev, formatSelection }));
  };

  const handleAnalyze = async (event) => {
    event.preventDefault();
    setLoadError('');
    setSearchMessage('');
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const userId = getGoodreadsUserId(userInfo.url.trim());
      activeProfileRef.current = userId;
      const maxWaitDays = Number(userInfo.maxWaitDays);
      if (
        !`${userInfo.maxWaitDays}`.trim() ||
        !Number.isInteger(maxWaitDays) ||
        maxWaitDays < 0
      ) {
        throw new Error('Enter a whole-number wait limit of 0 days or more.');
      }
      if (userInfo.libraries.length === 0) {
        throw new Error('Select at least one library to search.');
      }

      setLoading(true);
      setProgress(null);
      if (shelfCacheRef.current?.userId !== userId) {
        shelfCacheRef.current = null;
        setShelfCache(null);
        setLibraryListings({});
      }
      const books = await ensureGoodreadsShelf(userInfo.url);
      if (requestRef.current !== controller) return;
      if (!books) throw new Error(shelfError || 'Goodreads shelf is not ready.');

      const { listingsByLibrary, failedSearches } =
        await findLibraryRecommendations(
          books,
          userInfo.libraries,
          controller.signal,
          {
            formatSelection: userInfo.formatSelection,
            onProgress: setProgress,
            onCacheError: () => {
              setCacheWarning(
                'Local caching is unavailable; results may not survive a reload.'
              );
            },
          }
        );

      if (requestRef.current !== controller) {
        return;
      }

      setLibraryListings((prev) => {
        const selectedKeys = new Set(
          selectedLibrariesRef.current.map(getLibraryKey)
        );
        const next = Object.fromEntries(
          Object.entries(prev).filter(([libraryKey]) =>
            selectedKeys.has(libraryKey)
          )
        );

        Object.entries(listingsByLibrary).forEach(([libraryKey, listings]) => {
          if (selectedKeys.has(libraryKey)) {
            next[libraryKey] = {
              listings,
              complete: !failedSearches.some(
                (failure) => failure.libraryId === libraryKey
              ),
            };
          }
        });

        return next;
      });

      if (failedSearches.length > 0) {
        const failedLibraries = [
          ...new Set(
            failedSearches.map(
              ({ libraryId }) =>
                userInfo.libraries.find(
                  (library) => getLibraryKey(library) === libraryId
                )?.name ?? libraryId
            )
          ),
        ].join(', ');
        const message = `Could not finish searching: ${failedLibraries}. Try again.`;
        setLoadError(message);
        setSearchMessage(message);
      } else {
        setSearchMessage(
          'Library searches are complete. Open Read Rec, Hold Rec, or Wishlist Rec above.'
        );
      }
    } catch (error) {
      if (
        error.name !== 'AbortError' &&
        requestRef.current === controller
      ) {
        console.error('Error finding library recommendations:', error);
        setLoadError(error.message || 'Unable to load recommendations.');
      }
    } finally {
      if (requestRef.current === controller) {
        setLoading(false);
      }
    }
  };

  const data = useMemo(
    () =>
      shelfCache
        ? buildRecommendationData(
            shelfCache.books,
            libraryListings,
            userInfo.libraries,
            /^\d+$/.test(userInfo.maxWaitDays)
              ? Number(userInfo.maxWaitDays)
              : 90
          )
        : null,
    [
      shelfCache,
      libraryListings,
      userInfo.libraries,
      userInfo.maxWaitDays,
    ]
  );
  const searchProgressText = progress
    ? `${progress.completed} of ${progress.total} book/library searches complete`
    : 'Loading Goodreads shelf…';

  return (
    <Container disableGutters maxWidth={false} sx={{ mb: 5 }}>
      <Header tab={tab} setTab={setTab} />
      {tab === 'home' ? (
        <UserInfo
          userInfo={userInfo}
          setUserInfo={setUserInfo}
          onFormatSelectionChange={handleFormatSelectionChange}
          onGoodreadsUrlChange={handleGoodreadsUrlChange}
          onPrefetchShelf={ensureGoodreadsShelf}
          onLibrariesChange={handleLibrariesChange}
          onAnalyze={handleAnalyze}
          loading={loading}
          shelfStatus={shelfStatus}
          shelfError={shelfError}
          progress={progress}
          cacheWarning={cacheWarning}
          searchMessage={searchMessage}
          error={loadError}
        />
      ) : tab === 'toRead' && data ? (
        <Listings tab={tab} data={data} />
      ) : loading || shelfStatus === 'loading' ? (
        <Box sx={{ maxWidth: 560, mx: 'auto', mt: 8, px: 3 }}>
          <LinearProgress
            variant={progress?.total ? 'determinate' : 'indeterminate'}
            value={
              progress?.total
                ? (progress.completed / progress.total) * 100
                : undefined
            }
          />
          <Typography role="status" align="center" sx={{ mt: 2 }}>
            {searchProgressText}
          </Typography>
        </Box>
      ) : data ? (
        <Listings tab={tab} data={data} />
      ) : (
        <Typography
          role={loadError ? 'alert' : 'status'}
          align="center"
          sx={{ mt: 5 }}
        >
          {loadError || 'Enter your Goodreads URL and select libraries on Home to get recommendations.'}
        </Typography>
      )}
    </Container>
  );
}

export default App;
