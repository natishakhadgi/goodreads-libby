import { useState } from 'react'
import {Box, Tab, Tabs, Typography } from '@mui/material';
 
export const TAB_TEXT = {
    own: 'These are books you own that you should get a read on!',
    read: 'These are books you can get right now without waiting!',
    hold: 'These are books you should place on hold right now! Get it fast before someone else does!',
    wishlist: 'These are books you might want to consider adding to your wishlist. It’s the quickest way to get a hold of these books!'
};

const Header = ({tab, setTab}) => {
    const [tabText, setTabText] = useState(TAB_TEXT.own)
    const handleClickTab = (event, newTab) => {
        setTab(newTab);
        setTabText(TAB_TEXT[newTab])
    };

    return (
        <Box>
            <Box 
            display='flex' 
            flexDirection={{ xs: 'column', md: 'row' }} 
            justifyContent={'space-between'} 
            alignItems={'center'} 
            sx={{mx: {xs: 0, md: 5}, my: 2}}
        >
            <Typography textTransform='uppercase' color='#42A5EE' sx={{fontWeight:600}}>Nicole's Reading List</Typography>
            <Tabs value={tab} onChange={handleClickTab} variant='scrollable' allowScrollButtonsMobile sx={{maxWidth:'100%'}}>
            <Tab value='own' label='Own'/>
            <Tab value='read' label='Read Rec' />
            <Tab value='hold' label='Hold Rec' />
            <Tab value='wishlist' label='Wishlist Rec' />
            </Tabs>
            </Box>
        <Box height='100px' backgroundColor='#EEEEEE' sx={{px: 5}} display='flex' justifyContent={'center'} alignItems={'center'}>
            <Typography>{tabText}</Typography>
        </Box>
      </Box>
    );
};

export default Header;