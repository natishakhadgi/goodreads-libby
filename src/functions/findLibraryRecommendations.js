import {
  cacheCatalogResult,
  getCachedCatalogResult,
} from './recommendationCache.js';

const FORMATS = [
  'ebook-kindle',
  'ebook-overdrive',
  'ebook-epub-adobe',
  'ebook-pdf-adobe',
  'ebook-kobo',
  'audiobook-overdrive',
  'audiobook-mp3',
];
const FORMAT_QUERY = FORMATS.join(',');
const FORMAT_IDS = new Set(FORMATS);
const SEARCH_CONCURRENCY = 16;
const BULK_BATCH_SIZE = 100;

const normalizeTitle = (title) =>
  `${title || ''}`.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const toCatalogResult = (item, library) => ({
  titleId: String(item.id),
  library: library.name,
  libraryId: library.libraryId,
  format: item.type?.name ?? 'Unknown format',
  availableCopies: item.availableCopies ?? 0,
  ownedCopies: item.ownedCopies ?? 0,
  holdsCount: item.holdsCount ?? 0,
  estimatedWaitDays: item.estimatedWaitDays ?? 0,
  image: item.covers?.cover150Wide?.href ?? item.cover ?? '',
});

const searchLibrary = async ({ book, library, signal }) => {
  const title = book.book_title ?? book.title ?? '';
  const query = new URLSearchParams({
    query: title,
    format: FORMAT_QUERY,
    page: '1',
    perPage: '2',
  });
  const response = await fetch(
    `/api/overdrive/libraries/${encodeURIComponent(library.libraryId)}/media?${query}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error(
      `OverDrive search failed for ${library.name}: ${response.status}`
    );
  }

  const { items = [] } = await response.json();
  const requestedTitle = normalizeTitle(title);

  return items
    .filter((item) => {
      const resultTitle = normalizeTitle(item.title);
      return resultTitle && requestedTitle.includes(resultTitle);
    })
    .map((item) => toCatalogResult(item, library));
};

const searchLibraryBulk = async ({ library, titleIds, signal }) => {
  const query = new URLSearchParams({ libraryKey: library.libraryId });
  titleIds.forEach((titleId) => query.append('titleIds', titleId));

  const response = await fetch(
    `/api/overdrive/libraries/${encodeURIComponent(library.libraryId)}/media/bulk?${query}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error(
      `OverDrive bulk lookup failed for ${library.name}: ${response.status}`
    );
  }

  const { items = [] } = await response.json();
  return items.filter((item) => {
    if (!Array.isArray(item.formats) || item.formats.length === 0) {
      return item.type?.id === 'ebook' || item.type?.id === 'audiobook';
    }

    return item.formats.some((format) =>
      FORMAT_IDS.has(typeof format === 'string' ? format : format?.id)
    );
  });
};

const mapWithConcurrency = async (tasks, concurrency, callback) => {
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    async () => {
      while (true) {
        const index = nextIndex++;
        if (index >= tasks.length) return;
        await callback(tasks[index]);
      }
    }
  );

  await Promise.all(workers);
};

const makeListing = (book) => ({
  title: book.book_title ?? book.title ?? '',
  author: book.book_author ?? book.author ?? '',
  image:
    book.book_cover_medium ??
    book.book_cover_small ??
    book.book_cover_large ??
    '',
  books: [],
});

const findLibraryRecommendations = async (
  books,
  libraries,
  signal,
  { onProgress, onCacheError } = {}
) => {
  const listingsByLibrary = Object.fromEntries(
    libraries.map((library) => [
      String(library.libraryId),
      books.map(makeListing),
    ])
  );
  const missingByLibrary = new Map(
    libraries.map((library) => [String(library.libraryId), []])
  );
  const knownIdsByBook = books.map(() => new Set());
  const failedSearches = [];

  books.forEach((book, bookIndex) => {
    libraries.forEach((library) => {
      const libraryId = String(library.libraryId);
      const cached = getCachedCatalogResult(libraryId, book, onCacheError);

      if (cached.hit) {
        listingsByLibrary[libraryId][bookIndex].books = cached.value;
        cached.value.forEach((item) => {
          if (item.titleId) knownIdsByBook[bookIndex].add(String(item.titleId));
        });
      } else {
        missingByLibrary.get(libraryId).push({ book, bookIndex, library });
      }
    });
  });

  const jobs = [];
  for (const [libraryId, missing] of missingByLibrary) {
    const library = missing[0]?.library;
    if (!library || missing.length === 0) continue;

    const titleIdToBooks = new Map();
    const titleSearches = [];

    missing.forEach((entry) => {
      const titleIds = knownIdsByBook[entry.bookIndex];
      if (titleIds.size === 0) {
        titleSearches.push(entry);
        return;
      }

      titleIds.forEach((titleId) => {
        if (!titleIdToBooks.has(titleId)) titleIdToBooks.set(titleId, []);
        titleIdToBooks.get(titleId).push(entry);
      });
    });

    const titleIds = Array.from(titleIdToBooks.keys());
    for (let offset = 0; offset < titleIds.length; offset += BULK_BATCH_SIZE) {
      const batchIds = titleIds.slice(offset, offset + BULK_BATCH_SIZE);
      const entries = Array.from(
        new Map(
          batchIds.flatMap((titleId) =>
            titleIdToBooks.get(titleId).map((entry) => [
              entry.bookIndex,
              entry,
            ])
          )
        ).values()
      );
      jobs.push({
        type: 'bulk',
        library,
        libraryId,
        titleIds: batchIds,
        titleIdToBooks,
        entries,
      });
    }

    titleSearches.forEach((entry) =>
      jobs.push({ type: 'search', libraryId, ...entry })
    );
  }

  const total = books.length * libraries.length;
  let completed = total - jobs.reduce(
    (count, job) => count + (job.type === 'bulk' ? job.entries.length : 1),
    0
  );
  const fallbackSearches = [];
  onProgress?.({ completed, total });

  await mapWithConcurrency(jobs, SEARCH_CONCURRENCY, async (job) => {
    let deferredCount = 0;
    try {
      if (signal.aborted) {
        throw new DOMException('Search was cancelled.', 'AbortError');
      }

      if (job.type === 'bulk') {
        const items = await searchLibraryBulk({
          library: job.library,
          titleIds: job.titleIds,
          signal,
        });
        const itemsById = new Map(
          items.map((item) => [String(item.id), item])
        );

        job.entries.forEach((entry) => {
          const results = [];
          let needsTitleSearch = false;
          job.titleIds.forEach((titleId) => {
            if (!job.titleIdToBooks.get(titleId).some(
              (candidate) => candidate.bookIndex === entry.bookIndex
            )) {
              return;
            }

            const item = itemsById.get(titleId);
            if (
              !item ||
              item.availableCopies == null ||
              item.ownedCopies == null
            ) {
              needsTitleSearch = true;
            } else {
              results.push(toCatalogResult(item, job.library));
            }
          });

          if (needsTitleSearch) {
            fallbackSearches.push({
              ...entry,
              libraryId: job.libraryId,
              library: job.library,
              bulkResults: results,
            });
            deferredCount += 1;
            return;
          }

          listingsByLibrary[job.libraryId][entry.bookIndex].books = results;
          cacheCatalogResult(
            job.libraryId,
            entry.book,
            results,
            onCacheError
          );
        });
      } else {
        const results = await searchLibrary({ ...job, signal });
        listingsByLibrary[job.libraryId][job.bookIndex].books = results;
        cacheCatalogResult(job.libraryId, job.book, results, onCacheError);
      }
    } catch (error) {
      if (error.name === 'AbortError') throw error;

      if (job.type === 'bulk') {
        fallbackSearches.push(
          ...job.entries.map((entry) => ({
            ...entry,
            libraryId: job.libraryId,
            library: job.library,
            bulkResults: [],
          }))
        );
        deferredCount = job.entries.length;
      } else {
        failedSearches.push({
          libraryId: job.libraryId,
          title: job.book.book_title ?? job.book.title ?? '',
          error,
        });
      }
    } finally {
      completed +=
        job.type === 'bulk'
          ? job.entries.length - deferredCount
          : 1;
      onProgress?.({ completed, total });
    }
  });

  await mapWithConcurrency(
    fallbackSearches,
    SEARCH_CONCURRENCY,
    async (job) => {
      try {
        if (signal.aborted) {
          throw new DOMException('Search was cancelled.', 'AbortError');
        }

        const titleResults = await searchLibrary({ ...job, signal });
        const resultsById = new Map(
          [...job.bulkResults, ...titleResults].map((item) => [
            item.titleId,
            item,
          ])
        );
        const results = Array.from(resultsById.values());
        listingsByLibrary[job.libraryId][job.bookIndex].books = results;
        cacheCatalogResult(job.libraryId, job.book, results, onCacheError);
      } catch (error) {
        if (error.name === 'AbortError') throw error;

        failedSearches.push({
          libraryId: job.libraryId,
          title: job.book.book_title ?? job.book.title ?? '',
          error,
        });
      } finally {
        completed += 1;
        onProgress?.({ completed, total });
      }
    }
  );

  return { listingsByLibrary, failedSearches };
};

export default findLibraryRecommendations;
