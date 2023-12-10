import {Box } from '@mui/material';
import loader from '../assets/loader.gif';

const Loader = () => {
    return (
        <Box display='flex' justifyContent='center' sx={{mt:20}}>
            <img src={loader} width='50px'/>
        </Box>
    );
};

export default Loader;