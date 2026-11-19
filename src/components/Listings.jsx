import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import List from './List';

const Listings = ({tab, data}) => {
    const listingTab = {
        toRead: Array.isArray(data?.books) ? data.books : [],
        read: data?.readListings ?? [],
        hold: data?.holdListings ?? [],
        wishlist: data?.wishListListings ?? []
    };

    // Consider doing this in backend.
    const libraryCodes = {
        ocpl: 'OCPL',
        scdl: 'SCDL',
        solano: 'Solano',
        yolocounty: 'Yolo',
        broward: 'Broward',
        anytime: 'Anytime'
    };

    const listings = Array.isArray(listingTab[tab]) ? listingTab[tab] : [];

    const getVisibleRowKey = (book) =>
        JSON.stringify(
          tab === 'read'
            ? [
                book.libraryId ?? book.library,
                book.format,
                book.availableCopies,
                book.ownedCopies,
              ]
            : [
                book.libraryId ?? book.library,
                book.format,
                book.holdsCount,
                book.ownedCopies,
                book.estimatedWaitDays,
              ]
        );

    return (
        <Box display='flex' flexDirection='column' gap={2} alignItems='center' sx={{mt:5}}>
        {
          tab === 'toRead' ? (
            <List books={listings.map((book) => ({
              ...book,
              title: book.book_title ?? book.title,
              author: book.book_author ?? book.author
            }))} />
          ) : listings.length === 0 ? (
            <Typography role="status">No recommendations are available yet.</Typography>
          ) : listings.map((listing, listingIndex) => {
              const books = listing?.books ?? [
                ...(listing?.eBooks ?? []),
                ...(listing?.audioBooks ?? [])
              ];
              const seenRows = new Set();
              const visibleBooks = books.filter((book) => {
                const key = getVisibleRowKey(book);
                if (seenRows.has(key)) return false;
                seenRows.add(key);
                return true;
              });
          return (
              <Box key={`${listing.title}-${listingIndex}`} width={{xs:'90%', md:'700px'}} minHeight='125px' height='100%'
              display={'flex'}
              alignItems={'start'}
              gap={'10px'}
              sx={{
              padding: '10px',
              border: '3px solid #42A5EE',
              borderRadius: '10px',
              }}
              >
                {listing.image && (
                  <Box display={{xs:'none', sm: 'block'}} sx={{mt:'5px'}}>
                      <img src={listing.image} height='125px' alt={`${listing.title} cover`}/>
                  </Box>
                )}

                <Box sx={{ flexGrow: 1, maxWidth: '100%' }}>
                  <Box display={'flex'} sx={{flexWrap:'wrap', ml:'5px', mb:'5px'}} gap={'5px'} alignItems={'baseline'}>
                    <Typography sx={{fontSize: 18, fontWeight:600}}>{listing.title}</Typography>
                    <Typography>by</Typography>
                    <Typography>{listing.author}</Typography>
                  </Box>

                {tab === 'wishlist' && visibleBooks.length === 0 ? (
                  <Typography sx={{ ml: '5px' }}>
                    No copies found in the selected libraries.
                  </Typography>
                ) : <Box sx={{border: '3px solid #E0E0E0', borderRadius: '10px'}}>
                    <Table size='small' >
                      <TableHead>
                        <TableRow >
                          <TableCell>Library</TableCell>
                          <TableCell align='left'>Format</TableCell>
                          {
                            tab === 'read' && <TableCell align='right'>Available Copies</TableCell>
                          }
                          {
                            (tab === 'hold' || tab === 'wishlist') &&
                            <>
                              <TableCell align='center'>Holds</TableCell>
                              <TableCell align='right'>Wait Time</TableCell>
                            </>
                          }
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {visibleBooks.map((book, idx) => (
                        <TableRow key={`${book.library}-${book.format}-${idx}`} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell align='left'>{libraryCodes[book.library] ?? book.library}</TableCell>
                          <TableCell align='left'>{book.format}</TableCell>
                          { tab === 'read' && <TableCell align='right'>{`${book.availableCopies} / ${book.ownedCopies}`}</TableCell> }
                          {
                            (tab === 'hold' || tab === 'wishlist') &&
                            <>
                                <TableCell align='center'>{`${book.holdsCount} / ${book.ownedCopies}`}</TableCell>
                                <TableCell align='right'>{`${book.estimatedWaitDays} days`}</TableCell>
                            </>
                          }
                        </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                </Box>}
                </Box>
              </Box>
          )})
        }
    </Box>
    );
};

export default Listings;