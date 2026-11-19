import sixofcrowsimg from './sixofcrows.jpeg';
import bornacrimeimg from './bornacrime.jpg';
import thisiswaterimg from './thisiswater.jpg';

export const mockReadData = [
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