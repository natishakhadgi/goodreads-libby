export const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const CACHE_PREFIX = 'goodreads-libby:v1:';
const SHELF_PREFIX = `${CACHE_PREFIX}shelf:`;
const CATALOG_PREFIX = `${CACHE_PREFIX}catalog:`;

const reportStorageError = (error, onError) => {
  console.error('Unable to access the local recommendation cache:', error);
  onError?.(error);
};

const makeShelfKey = (userId) => `${SHELF_PREFIX}${encodeURIComponent(userId)}`;

const normalize = (value) =>
  `${value ?? ''}`.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const makeCatalogPrefix = (libraryId) =>
  `${CATALOG_PREFIX}${encodeURIComponent(String(libraryId))}:`;

const makeCatalogKey = (libraryId, book, formatSelection = 'both') => {
  const title = normalize(book.book_title ?? book.title);
  const author = normalize(book.book_author ?? book.author);
  const suffix = formatSelection === 'both' ? '' : `::${formatSelection}`;
  return `${makeCatalogPrefix(libraryId)}${encodeURIComponent(`${title}::${author}${suffix}`)}`;
};

const readEntry = (key, onError) => {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    if (
      !entry ||
      typeof entry.cachedAt !== 'number' ||
      Date.now() - entry.cachedAt >= CACHE_TTL_MS
    ) {
      globalThis.localStorage.removeItem(key);
      return null;
    }

    return entry;
  } catch (error) {
    reportStorageError(error, onError);
    return null;
  }
};

const writeEntry = (key, value, onError) => {
  try {
    globalThis.localStorage?.setItem(
      key,
      JSON.stringify({ cachedAt: Date.now(), value })
    );
    return true;
  } catch (error) {
    reportStorageError(error, onError);
    return false;
  }
};

export const getCachedGoodreadsShelf = (userId, onError) =>
  (() => {
    const entry = readEntry(makeShelfKey(userId), onError);
    return entry ? { books: entry.value, cachedAt: entry.cachedAt } : null;
  })();

export const cacheGoodreadsShelf = (userId, books, onError) =>
  writeEntry(makeShelfKey(userId), books, onError);

export const getCachedCatalogResult = (
  libraryId,
  book,
  formatSelection = 'both',
  onError
) => {
  const key = makeCatalogKey(libraryId, book, formatSelection);

  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (!raw) return { hit: false };

    const entry = JSON.parse(raw);
    if (
      !entry ||
      typeof entry.cachedAt !== 'number' ||
      Date.now() - entry.cachedAt >= CACHE_TTL_MS
    ) {
      globalThis.localStorage.removeItem(key);
      return { hit: false };
    }

    return { hit: true, value: entry.value };
  } catch (error) {
    reportStorageError(error, onError);
    return { hit: false };
  }
};

export const cacheCatalogResult = (
  libraryId,
  book,
  results,
  formatSelection = 'both',
  onError
) =>
  writeEntry(
    makeCatalogKey(libraryId, book, formatSelection),
    results,
    onError
  );

export const removeLibraryCatalogCache = (libraryId, onError) => {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return;

    const prefix = makeCatalogPrefix(libraryId);
    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch (error) {
    reportStorageError(error, onError);
  }
};

export const cleanExpiredRecommendationCache = (onError) => {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return;

    const now = Date.now();
    const expiredKeys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key?.startsWith(CACHE_PREFIX)) continue;

      try {
        const entry = JSON.parse(storage.getItem(key));
        if (
          !entry ||
          typeof entry.cachedAt !== 'number' ||
          now - entry.cachedAt >= CACHE_TTL_MS
        ) {
          expiredKeys.push(key);
        }
      } catch {
        expiredKeys.push(key);
      }
    }
    expiredKeys.forEach((key) => storage.removeItem(key));
  } catch (error) {
    reportStorageError(error, onError);
  }
};
