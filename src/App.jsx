import { useEffect, useState } from 'react'
import axios from 'axios';
import { Container } from '@mui/material';

import Header from './components/Header';
import Listings from './components/Listings';
import Loader from './components/Loader';

import sixofcrowsimg from './assets/sixofcrows.jpeg';
import bornacrimeimg from './assets/bornacrime.jpg';
import thisiswaterimg from './assets/thisiswater.jpg';

function App() {
  const mockReadData = [
    {
      title: 'Six of Crows',
      author: 'Leigh Bardugo',
      image: sixofcrowsimg,
      books: [
        {
          library: 'ccc',
          availableCopies: 5,
          format: 'eBook',
          ownedCopies: 10,
          holdsCount: 20,
          estimatedWaitDays: 100
        },
        {
          library: 'ccc',
          availableCopies: 0,
          format: 'audio book',
          ownedCopies: 3,
          holdsCount: 6,
          estimatedWaitDays: 7
        }
      ]
    },
    {
      title: 'Born a Crime',
      author: 'Trevor Noah',
      image: bornacrimeimg,
      books: [
        {
          library: 'ccc',
          availableCopies: 5,
          format: 'eBook',
          ownedCopies: 10,
          holdsCount: 20,
          estimatedWaitDays: 100
        },
        {
          library: 'ocpl',
          availableCopies: 15,
          format: 'eBook',
          ownedCopies: 15,
          holdsCount: 0,
          estimatedWaitDays: 0
        },
        {
          library: 'ccc',
          availableCopies: 0,
          format: 'audio book',
          ownedCopies: 3,
          holdsCount: 6,
          estimatedWaitDays: 7
        }
      ]
    },
    {
      title: 'This Is Water: Some Thoughts, Delivered on a Significant Occasion, about Living a Compassionate Life',
      author: 'Wallace, David Foster',
      image: thisiswaterimg,
      books: [
        {
          library: 'ccc',
          availableCopies: 5,
          format: 'eBook',
          ownedCopies: 10,
          holdsCount: 20,
          estimatedWaitDays: 100
        },
        {
          library: 'ocpl',
          availableCopies: 15,
          format: 'eBook',
          ownedCopies: 15,
          holdsCount: 0,
          estimatedWaitDays: 0
        },
        {
          library: 'ccc',
          availableCopies: 0,
          format: 'audio book',
          ownedCopies: 3,
          holdsCount: 6,
          estimatedWaitDays: 7
        }
      ]
    }
  ];
  const [tab, setTab] = useState('own');
  const [data, setData] = useState(null);

  useEffect(() => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',  
    };

    axios.get(`${process.env.BASE_URL}${process.env.NICOLE_PROFILE}`).then((response) => {
      setData(response.data);
    });
  }, []);

  console.log('data::',data);

  // consider making theme bc font weights are ugly.
  // adjust xs vs sm breakpoints.

  return (
    <Container disableGutters maxWidth={false} sx={{mb:5}}>
      {/* TABS */}
      <Header tab={tab} setTab={setTab}/>

      {/* LISTINGS */}
      {
        data ? <Listings tab={tab} data={data}/> : <Loader />
      }
    </Container>
  );
};

export default App
