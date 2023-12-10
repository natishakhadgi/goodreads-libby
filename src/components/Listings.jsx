import {Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import List from './List';
import sixofcrowsimg from '../assets/sixofcrows.jpeg';


const Listings = ({tab, data}) => {

    const listingTab = {
        own: data.ownedListings,
        read: data.readListings,
        hold: data.holdListings,
        wishlist: data.wishListListings
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

    const listings = listingTab[tab];

    return (
        <Box display='flex' flexDirection='column' gap={2} alignItems='center' sx={{mt:5}}>
        {
            tab === 'own' ? <List books={listings}/>
            : listings.map(listing => {
                const books = [...listing.eBooks, ...listing.audioBooks];
                console.log('books::',books);
            return (
                <Box width={{xs:'90%', md:'700px'}} minHeight='125px' height='100%' 
                display={'flex'}
                alignItems={'start'}
                gap={'10px'}
                sx={{
                padding: '10px',
                border: '3px solid #42A5EE',
                borderRadius: '10px',
                }}
                >
                    <Box display={{xs:'none', sm: 'block'}} sx={{mt:'5px'}}>
                        <img src={listing.image} height='125px' alt={`cover`}/>
                    </Box>
                    
                    <Box sx={{ flexGrow: 1, maxWidth: '100%' }}>
                        <Box display={'flex'} sx={{flexWrap:'wrap', ml:'5px', mb:'5px'}} gap={'5px'} alignItems={'baseline'}>
                            <Typography sx={{fontSize: 18, fontWeight:600}}>{listing.title}</Typography>
                            <Typography>by</Typography>
                            <Typography>{listing.author}</Typography>
                        </Box>
                    
                    <Box sx={{border: '3px solid #E0E0E0', borderRadius: '10px'}}>
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
                                {books.map((book, idx) => (
                                <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    <TableCell align='left'>{libraryCodes[book.library]}</TableCell>
                                    <TableCell align='left'>{book.format}</TableCell>
                                    {
                                    tab === 'read' && <TableCell align='right'>{`${book.availableCopies} / ${book.ownedCopies}`}</TableCell>
                                    }
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
                    </Box>
                        
                    </Box>
                </Box>
            )})
        }
    </Box>
    );
};

export default Listings;