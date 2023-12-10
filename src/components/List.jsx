import {Box, Typography } from '@mui/material';

const List = ({books}) => {
    return (
        <Box display='flex' flexDirection='column' gap={2}>
            {
                books.map(book => {
                  return <Box 
                    display='flex'
                    flexDirection={{xs: 'column', sm: 'row'}}
                    justifyContent={{sm: 'space-between'}}
                    width={{xs:'90%', sm:'400px', md:'700px'}} 
                    height={'100%'} 
                    >
                        <Typography sx={{fontWeight:600}}>{book.title}</Typography>
                        <Typography>{book.author}</Typography>
                  </Box>  
                })
            }
        </Box>
    );
};

export default List;