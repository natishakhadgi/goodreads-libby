import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Chip,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
  Autocomplete,
} from '@mui/material';
import libraryLocator from '../functions/libraryLocator';

const UserInfo = ({
  userInfo,
  setUserInfo,
  onFormatSelectionChange,
  onGoodreadsUrlChange,
  onPrefetchShelf,
  onLibrariesChange,
  onAnalyze,
  loading,
  shelfStatus,
  shelfError,
  progress,
  cacheWarning,
  searchMessage,
  error,
}) => {
  const [libraryOptions, setLibraryOptions] = useState([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const requestIdRef = useRef(0);
  const prefetchShelfRef = useRef(onPrefetchShelf);

  useEffect(() => {
    prefetchShelfRef.current = onPrefetchShelf;
  }, [onPrefetchShelf]);

  useEffect(() => {
    const url = userInfo.url.trim();
    if (!url) return undefined;

    const timer = setTimeout(() => {
      prefetchShelfRef.current(url);
    }, 700);
    return () => clearTimeout(timer);
  }, [userInfo.url]);

  const handleUrlChange = (event) => {
    const url = event.target.value;
    setUserInfo((prev) => ({ ...prev, url }));
    onGoodreadsUrlChange(url);
  };

  useEffect(() => {
    const trimmedSearch = librarySearch.trim();

    if (!trimmedSearch || trimmedSearch.length < 2) {
      setLibraryOptions([]);
      return;
    }

    // Debounce the API call so each keystroke doesn't trigger a full library lookup.
    // This keeps the dropdown responsive without overwhelming the Libby autocomplete API.
    const timer = setTimeout(() => {
      handleLibrarySearch(trimmedSearch);
    }, 200);

    return () => clearTimeout(timer);
  }, [librarySearch]);

  const handleLibrarySearch = async (searchTerm) => {
    const trimmedSearch = searchTerm.trim();

    if (!trimmedSearch || trimmedSearch.length < 2) {
      setLibraryOptions([]);
      return;
    }

    // Track the latest request so older responses cannot overwrite newer search results.
    const currentRequestId = ++requestIdRef.current;

    try {
      const results = await libraryLocator(trimmedSearch);

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setLibraryOptions(Array.isArray(results) ? results : []);
    } catch (error) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      console.error('Error locating libraries:', error);
      setLibraryOptions([]);
    }
  };

  const handleLibrarySelection = (event, newValue) => {
    onLibrariesChange(newValue);
  };

  const getLibraryLabel = (library) => library?.name ?? '';
  const getLibraryKey = (library) =>
    library?.libraryId ?? library?.websiteId ?? library?.name;
  const options = Array.from(
    new Map(
      [...userInfo.libraries, ...libraryOptions].map((library) => [
        getLibraryKey(library),
        library,
      ])
    ).values()
  );

  return (
    <Box
      component="form"
      onSubmit={onAnalyze}
      sx={{ maxWidth: 560, mx: 'auto', p: 3 }}
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Goodreads URL
          </Typography>
          <TextField
            fullWidth
            label="Paste your Goodreads URL"
            value={userInfo.url}
            onChange={handleUrlChange}
            onPaste={(event) => {
              const pastedUrl = event.clipboardData.getData('text').trim();
              if (pastedUrl) {
                event.preventDefault();
                setUserInfo((prev) => ({ ...prev, url: pastedUrl }));
                onGoodreadsUrlChange(pastedUrl);
                prefetchShelfRef.current(pastedUrl);
              }
            }}
            required
            placeholder="https://www.goodreads.com/user/show/12345-abc-xyz"
          />
          {shelfStatus === 'loading' && (
            <Typography role="status" sx={{ mt: 1 }}>
              Loading your Goodreads Want to Read shelf…
            </Typography>
          )}
          {shelfStatus === 'ready' && (
            <Typography role="status" sx={{ mt: 1 }}>
              Goodreads shelf loaded. Select libraries to find recommendations.
            </Typography>
          )}
          {shelfError && (
            <Typography role="alert" color="error" sx={{ mt: 1 }}>
              {shelfError}
            </Typography>
          )}
          {shelfStatus === 'error' && (
            <Button
              type="button"
              size="small"
              onClick={() => prefetchShelfRef.current(userInfo.url)}
              sx={{ mt: 1 }}
            >
              Retry Goodreads shelf
            </Button>
          )}
        </Box>

        <FormControl>
          <FormLabel sx={{ mb: 1 }}>
            What would you like to borrow?
          </FormLabel>
          <RadioGroup
            row
            name="format-selection"
            value={userInfo.formatSelection}
            onChange={(event) => onFormatSelectionChange(event.target.value)}
          >
            <FormControlLabel value="ebook" control={<Radio />} label="E-book" />
            <FormControlLabel value="audio" control={<Radio />} label="Audio" />
            <FormControlLabel value="both" control={<Radio />} label="Both" />
          </RadioGroup>
        </FormControl>

        <TextField
          type="number"
          label="Maximum acceptable wait (days)"
          value={userInfo.maxWaitDays}
          onChange={(event) =>
            setUserInfo((prev) => ({
              ...prev,
              maxWaitDays: event.target.value,
            }))
          }
          inputProps={{ min: 0, step: 1 }}
          helperText="Longer waits appear in Wishlist Rec. Default: 90 days."
          required
        />

        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Libraries
          </Typography>

          <Autocomplete
            multiple
            options={options}
            value={userInfo.libraries}
            getOptionLabel={getLibraryLabel}
            isOptionEqualToValue={(option, value) =>
              String(getLibraryKey(option)) === String(getLibraryKey(value))
            }
            filterSelectedOptions
            onInputChange={(event, newInputValue) => {
              if (event?.type === 'change' || event?.type === 'input' || event?.type === 'clear') {
                setLibrarySearch(newInputValue);
              }
            }}
            onChange={handleLibrarySelection}
            filterOptions={(options) => options}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search and select libraries"
                placeholder="Start typing a library name"
              />
            )}
            renderTags={() => null}
            noOptionsText={
              librarySearch ? 'No libraries found' : 'Type to search for libraries'
            }
          />
          {userInfo.libraries.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
              {userInfo.libraries.map((library, index) => (
                <Chip
                  key={getLibraryLabel(library) + index}
                  label={getLibraryLabel(library)}
                  onDelete={() => {
                    onLibrariesChange(
                      userInfo.libraries.filter((_, i) => i !== index)
                    );
                  }}
                />
              ))}
            </Stack>
          )}
        </Box>
        {error && <Typography role="alert" color="error">{error}</Typography>}
        {cacheWarning && (
          <Typography role="status" color="warning.main">
            {cacheWarning}
          </Typography>
        )}
        {searchMessage && !loading && (
          <Typography role="status" color={error ? 'error' : 'success.main'}>
            {searchMessage}
          </Typography>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={
            loading ||
            shelfStatus !== 'ready' ||
            !userInfo.url.trim() ||
            userInfo.libraries.length === 0
          }
        >
          {loading
            ? 'Searching libraries…'
            : shelfStatus === 'loading'
              ? 'Loading Goodreads shelf…'
              : 'Find recommendations'}
        </Button>
        {(loading || shelfStatus === 'loading') && (
          <Box>
            <LinearProgress
              variant={loading && progress?.total ? 'determinate' : 'indeterminate'}
              value={
                loading && progress?.total
                  ? (progress.completed / progress.total) * 100
                  : undefined
              }
            />
            <Typography role="status" align="center" sx={{ mt: 1 }}>
              {loading && progress
                ? `${progress.completed} of ${progress.total} book/library searches complete`
                : 'Loading Goodreads shelf…'}
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default UserInfo;
