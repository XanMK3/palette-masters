/**
 * Static, editorial discovery data for the gallery's curated art groups.
 * Intentionally kept separate from the WikimediaArtService and its live data.
 * Not a ranked list or comprehensive art-history taxonomy.
 * Wikipedia titles are hints, not canonical Wikidata identifiers.
 */
export interface FeaturedArtist {
  name: string;
  wikipediaTitle: string;
}

export interface FeaturedWork {
  title: string;
  artist: string;
  wikipediaTitle: string;
  date: string;
}

export interface FeaturedMovement {
  id: string;
  name: string;
  dates: string;
  description: string;
  artists: readonly FeaturedArtist[];
  paintings: readonly FeaturedWork[];
}

// Curated from 135_iconic_paintings_by_movement.md; preserve its order and dates.
export const FEATURED_MOVEMENTS: readonly FeaturedMovement[] = [
  {
    id: 'prehistoric-cave-painting',
    name: 'Prehistoric Cave Painting',
    dates: 'c. 50,000–7,000 BCE',
    description: '',
    artists: [],
    paintings: [
      {
        title: 'Hall of the Bulls',
        artist: 'Unknown artists · Lascaux Cave, France',
        wikipediaTitle: 'Hall_of_the_Bulls',
        date: 'c. 17,000 BCE',
      },
      {
        title: 'The Shaft Scene (Bird-Headed Man and Bison)',
        artist: 'Unknown artists · Lascaux Cave, France',
        wikipediaTitle: 'The_Shaft_Scene_(Bird-Headed_Man_and_Bison)',
        date: 'c. 17,000 BCE',
      },
      {
        title: 'Panel of Horses',
        artist: 'Unknown artists · Chauvet Cave, France',
        wikipediaTitle: 'Panel_of_Horses',
        date: 'c. 30,000–32,000 BCE',
      },
      {
        title: 'Panel of Lions',
        artist: 'Unknown artists · Chauvet Cave, France',
        wikipediaTitle: 'Panel_of_Lions',
        date: 'c. 30,000–32,000 BCE',
      },
      {
        title: 'Polychrome Bison',
        artist: 'Unknown artists · Altamira Cave, Spain, prehistoric',
        wikipediaTitle: 'Cave_of_Altamira',
        date: 'broadly c. 15,000 BCE',
      },
      {
        title: 'Spotted Horses',
        artist: 'Unknown artists · Pech Merle Cave, France',
        wikipediaTitle: 'Spotted_Horses',
        date: 'c. 23,000 BCE',
      },
      {
        title: 'Warty Pig Painting',
        artist: 'Unknown artists · Leang Tedongnge, Indonesia',
        wikipediaTitle: 'Warty_Pig_Painting',
        date: 'at least 45,500 years old',
      },
      {
        title: 'Pig and Human-Like Figures',
        artist: 'Unknown artists · Leang Karampuang, Indonesia',
        wikipediaTitle: 'Pig_and_Human-Like_Figures',
        date: 'at least 51,200 years old',
      },
      {
        title: 'Hand Stencils',
        artist: 'Unknown artists · Cueva de las Manos, Argentina, prehistoric',
        wikipediaTitle: 'Cueva_de_las_Manos',
        date: 'produced over several millennia',
      },
    ],
  },
  {
    id: 'renaissance',
    name: 'Renaissance',
    dates: 'c. 1400–1600',
    description: '',
    artists: [],
    paintings: [
      {
        title: 'Mona Lisa',
        artist: 'Leonardo da Vinci',
        wikipediaTitle: 'Mona_Lisa',
        date: 'c. 1503–1519',
      },
      {
        title: 'The Last Supper',
        artist: 'Leonardo da Vinci',
        wikipediaTitle: 'The_Last_Supper_(Leonardo)',
        date: 'c. 1495–1498',
      },
      {
        title: 'The Birth of Venus',
        artist: 'Sandro Botticelli',
        wikipediaTitle: 'The_Birth_of_Venus',
        date: 'c. 1485',
      },
      {
        title: 'The Creation of Adam',
        artist: 'Michelangelo',
        wikipediaTitle: 'The_Creation_of_Adam',
        date: 'c. 1511–1512',
      },
      {
        title: 'The School of Athens',
        artist: 'Raphael',
        wikipediaTitle: 'The_School_of_Athens',
        date: 'c. 1509–1511',
      },
      {
        title: 'The Arnolfini Portrait',
        artist: 'Jan van Eyck',
        wikipediaTitle: 'The_Arnolfini_Portrait',
        date: '1434',
      },
      {
        title: 'The Garden of Earthly Delights',
        artist: 'Hieronymus Bosch',
        wikipediaTitle: 'The_Garden_of_Earthly_Delights',
        date: 'c. 1490–1510',
      },
      {
        title: 'Venus of Urbino',
        artist: 'Titian',
        wikipediaTitle: 'Venus_of_Urbino',
        date: '1538',
      },
      {
        title: 'The Ambassadors',
        artist: 'Hans Holbein the Younger',
        wikipediaTitle: 'The_Ambassadors',
        date: '1533',
      },
    ],
  },
  {
    id: 'baroque',
    name: 'Baroque',
    dates: 'c. 1600–1750',
    description: '',
    artists: [],
    paintings: [
      {
        title: 'The Calling of Saint Matthew',
        artist: 'Caravaggio',
        wikipediaTitle: 'The_Calling_of_Saint_Matthew',
        date: '1599–1600',
      },
      {
        title: 'Judith Beheading Holofernes',
        artist: 'Artemisia Gentileschi',
        wikipediaTitle: 'Judith_Beheading_Holofernes',
        date: 'c. 1612–1613',
      },
      {
        title: 'The Night Watch',
        artist: 'Rembrandt',
        wikipediaTitle: 'The_Night_Watch',
        date: '1642',
      },
      {
        title: 'Las Meninas',
        artist: 'Diego Velázquez',
        wikipediaTitle: 'Las_Meninas',
        date: '1656',
      },
      {
        title: 'Girl with a Pearl Earring',
        artist: 'Johannes Vermeer',
        wikipediaTitle: 'Girl_with_a_Pearl_Earring',
        date: 'c. 1665',
      },
      {
        title: 'The Descent from the Cross',
        artist: 'Peter Paul Rubens',
        wikipediaTitle: 'The_Descent_from_the_Cross_(Rubens)',
        date: '1612–1614',
      },
      {
        title: 'The Return of the Prodigal Son',
        artist: 'Rembrandt',
        wikipediaTitle: 'The_Return_of_the_Prodigal_Son',
        date: 'c. 1668–1669',
      },
      {
        title: 'The Milkmaid',
        artist: 'Johannes Vermeer',
        wikipediaTitle: 'The_Milkmaid',
        date: 'c. 1657–1658',
      },
      {
        title: 'Landscape with the Marriage of Isaac and Rebecca (The Mill)',
        artist: 'Claude Lorrain',
        wikipediaTitle: 'Landscape_with_the_Marriage_of_Isaac_and_Rebecca_(The_Mill)',
        date: '1648',
      },
    ],
  },
  {
    id: 'neoclassicism',
    name: 'Neoclassicism',
    dates: 'c. 1750–1830',
    description: '',
    artists: [],
    paintings: [
      {
        title: 'Oath of the Horatii',
        artist: 'Jacques-Louis David',
        wikipediaTitle: 'Oath_of_the_Horatii',
        date: '1784',
      },
      {
        title: 'The Death of Socrates',
        artist: 'Jacques-Louis David',
        wikipediaTitle: 'The_Death_of_Socrates',
        date: '1787',
      },
      {
        title: 'The Death of Marat',
        artist: 'Jacques-Louis David',
        wikipediaTitle: 'The_Death_of_Marat',
        date: '1793',
      },
      {
        title: 'The Coronation of Napoleon',
        artist: 'Jacques-Louis David',
        wikipediaTitle: 'The_Coronation_of_Napoleon',
        date: '1805–1807',
      },
      {
        title: 'Cornelia Pointing to Her Children as Her Treasures',
        artist: 'Angelica Kauffman',
        wikipediaTitle: 'Cornelia_Pointing_to_Her_Children_as_Her_Treasures',
        date: 'c. 1785',
      },
      {
        title: 'Grande Odalisque',
        artist: 'Jean-Auguste-Dominique Ingres',
        wikipediaTitle: 'Grande_Odalisque',
        date: '1814',
      },
      {
        title: 'The Apotheosis of Homer',
        artist: 'Jean-Auguste-Dominique Ingres',
        wikipediaTitle: 'The_Apotheosis_of_Homer',
        date: '1827',
      },
      {
        title: 'Napoleon I on His Imperial Throne',
        artist: 'Jean-Auguste-Dominique Ingres',
        wikipediaTitle: 'Napoleon_I_on_His_Imperial_Throne',
        date: '1806',
      },
      {
        title: 'Psyche and Cupid',
        artist: 'François Gérard',
        wikipediaTitle: 'Psyche_and_Cupid',
        date: '1798',
      },
    ],
  },
  {
    id: 'romanticism',
    name: 'Romanticism',
    dates: 'c. 1790–1850',
    description: '',
    artists: [],
    paintings: [
      {
        title: 'Wanderer Above the Sea of Fog',
        artist: 'Caspar David Friedrich',
        wikipediaTitle: 'Wanderer_Above_the_Sea_of_Fog',
        date: 'c. 1818',
      },
      {
        title: 'Liberty Leading the People',
        artist: 'Eugène Delacroix',
        wikipediaTitle: 'Liberty_Leading_the_People',
        date: '1830',
      },
      {
        title: 'The Raft of the Medusa',
        artist: 'Théodore Géricault',
        wikipediaTitle: 'The_Raft_of_the_Medusa',
        date: '1818–1819',
      },
      {
        title: 'The Third of May 1808',
        artist: 'Francisco Goya',
        wikipediaTitle: 'The_Third_of_May_1808',
        date: '1814',
      },
      {
        title: 'Saturn Devouring His Son',
        artist: 'Francisco Goya',
        wikipediaTitle: 'Saturn_Devouring_His_Son',
        date: 'c. 1820–1823',
      },
      {
        title: 'The Slave Ship',
        artist: 'J. M. W. Turner',
        wikipediaTitle: 'The_Slave_Ship',
        date: '1840',
      },
      {
        title: 'The Fighting Temeraire',
        artist: 'J. M. W. Turner',
        wikipediaTitle: 'The_Fighting_Temeraire',
        date: '1839',
      },
      {
        title: 'The Hay Wain',
        artist: 'John Constable',
        wikipediaTitle: 'The_Hay_Wain',
        date: '1821',
      },
      {
        title: 'The Nightmare',
        artist: 'Henry Fuseli',
        wikipediaTitle: 'The_Nightmare',
        date: '1781',
      },
    ],
  },
  {
    id: 'realism',
    name: 'Realism',
    dates: 'c. 1840–1880',
    description: '',
    artists: [],
    paintings: [
      {
        title: 'The Stone Breakers',
        artist: 'Gustave Courbet',
        wikipediaTitle: 'The_Stone_Breakers',
        date: '1849',
      },
      {
        title: 'A Burial at Ornans',
        artist: 'Gustave Courbet',
        wikipediaTitle: 'A_Burial_at_Ornans',
        date: '1849–1850',
      },
      {
        title: 'The Gleaners',
        artist: 'Jean-François Millet',
        wikipediaTitle: 'The_Gleaners',
        date: '1857',
      },
      {
        title: 'The Angelus',
        artist: 'Jean-François Millet',
        wikipediaTitle: 'The_Angelus',
        date: '1857–1859',
      },
      {
        title: 'The Third-Class Carriage',
        artist: 'Honoré Daumier',
        wikipediaTitle: 'The_Third-Class_Carriage',
        date: 'c. 1862–1864',
      },
      {
        title: 'Olympia',
        artist: 'Édouard Manet',
        wikipediaTitle: 'Olympia',
        date: '1863',
      },
      {
        title: 'The Gross Clinic',
        artist: 'Thomas Eakins',
        wikipediaTitle: 'The_Gross_Clinic',
        date: '1875',
      },
      {
        title: 'The Horse Fair',
        artist: 'Rosa Bonheur',
        wikipediaTitle: 'The_Horse_Fair',
        date: '1852–1855',
      },
      {
        title: 'The Veteran in a New Field',
        artist: 'Winslow Homer',
        wikipediaTitle: 'The_Veteran_in_a_New_Field',
        date: '1865',
      },
    ],
  },
  {
    id: 'impressionism',
    name: 'Impressionism',
    dates: 'c. 1870–1900',
    description: '',
    artists: [],
    paintings: [
      {
        title: 'Impression, Sunrise',
        artist: 'Claude Monet',
        wikipediaTitle: 'Impression,_Sunrise',
        date: '1872',
      },
      {
        title: 'Water Lilies',
        artist: 'Claude Monet',
        wikipediaTitle: 'Water_Lilies',
        date: '1906 (one painting from the famous series)',
      },
      {
        title: 'Dance at Le Moulin de la Galette',
        artist: 'Pierre-Auguste Renoir',
        wikipediaTitle: 'Bal_du_moulin_de_la_Galette',
        date: '1876',
      },
      {
        title: 'Luncheon of the Boating Party',
        artist: 'Pierre-Auguste Renoir',
        wikipediaTitle: 'Luncheon_of_the_Boating_Party',
        date: '1880–1881',
      },
      {
        title: 'The Dance Class',
        artist: 'Edgar Degas',
        wikipediaTitle: "The_Ballet_Class_(Degas,_Musée_d'Orsay)",
        date: '1874',
      },
      {
        title: 'Paris Street; Rainy Day',
        artist: 'Gustave Caillebotte',
        wikipediaTitle: 'Paris_Street;_Rainy_Day',
        date: '1877',
      },
      {
        title: 'The Cradle',
        artist: 'Berthe Morisot',
        wikipediaTitle: 'The_Cradle_(Morisot)',
        date: '1872',
      },
      {
        title: "The Child's Bath",
        artist: 'Mary Cassatt',
        wikipediaTitle: "The_Child's_Bath",
        date: '1893',
      },
      {
        title: 'The Boulevard Montmartre at Night',
        artist: 'Camille Pissarro',
        wikipediaTitle: 'The_Boulevard_Montmartre_at_Night',
        date: '1897',
      },
    ],
  },
  {
    id: 'post-impressionism',
    name: 'Post-Impressionism',
    dates: 'c. 1886–1905',
    description: '',
    artists: [],
    paintings: [
      {
        title: 'The Starry Night',
        artist: 'Vincent van Gogh',
        wikipediaTitle: 'The_Starry_Night',
        date: '1889',
      },
      {
        title: 'Sunflowers',
        artist: 'Vincent van Gogh',
        wikipediaTitle: 'Sunflowers',
        date: '1888 (National Gallery, London version)',
      },
      {
        title: 'The Bedroom',
        artist: 'Vincent van Gogh',
        wikipediaTitle: 'The_Bedroom',
        date: '1889 (third version)',
      },
      {
        title: 'Mont Sainte-Victoire Seen from Les Lauves',
        artist: 'Paul Cézanne',
        wikipediaTitle: 'Mont_Sainte-Victoire_Seen_from_Les_Lauves',
        date: 'c. 1902–1906',
      },
      {
        title: 'The Basket of Apples',
        artist: 'Paul Cézanne',
        wikipediaTitle: 'The_Basket_of_Apples',
        date: 'c. 1893',
      },
      {
        title: 'Where Do We Come From? What Are We? Where Are We Going?',
        artist: 'Paul Gauguin',
        wikipediaTitle: 'Where_Do_We_Come_From?_What_Are_We?_Where_Are_We_Going?',
        date: '1897–1898',
      },
      {
        title: 'The Yellow Christ',
        artist: 'Paul Gauguin',
        wikipediaTitle: 'The_Yellow_Christ',
        date: '1889',
      },
      {
        title: 'A Sunday Afternoon on the Island of La Grande Jatte',
        artist: 'Georges Seurat',
        wikipediaTitle: 'A_Sunday_Afternoon_on_the_Island_of_La_Grande_Jatte',
        date: '1884–1886',
      },
      {
        title: 'At the Moulin Rouge',
        artist: 'Henri de Toulouse-Lautrec',
        wikipediaTitle: 'At_the_Moulin_Rouge',
        date: '1892–1895',
      },
    ],
  },
  {
    id: 'fauvism',
    name: 'Fauvism',
    dates: 'c. 1905–1908',
    description: '',
    artists: [],
    paintings: [
      {
        title: 'Woman with a Hat',
        artist: 'Henri Matisse',
        wikipediaTitle: 'Woman_with_a_Hat',
        date: '1905',
      },
      {
        title: 'The Joy of Life (Le Bonheur de Vivre)',
        artist: 'Henri Matisse',
        wikipediaTitle: 'The_Joy_of_Life_(Le_Bonheur_de_Vivre)',
        date: '1905–1906',
      },
      {
        title: 'Open Window, Collioure',
        artist: 'Henri Matisse',
        wikipediaTitle: 'Open_Window,_Collioure',
        date: '1905',
      },
      {
        title: 'The Green Stripe (Portrait of Madame Matisse)',
        artist: 'Henri Matisse',
        wikipediaTitle: 'The_Green_Stripe_(Portrait_of_Madame_Matisse)',
        date: '1905',
      },
      {
        title: 'Charing Cross Bridge',
        artist: 'André Derain',
        wikipediaTitle: 'Charing_Cross_Bridge',
        date: '1906',
      },
      {
        title: "The Turning Road, L'Estaque",
        artist: 'André Derain',
        wikipediaTitle: "The_Turning_Road,_L'Estaque",
        date: 'c. 1906',
      },
      {
        title: 'The River Seine at Chatou',
        artist: 'Maurice de Vlaminck',
        wikipediaTitle: 'The_River_Seine_at_Chatou',
        date: '1906',
      },
      {
        title: 'Big Ben',
        artist: 'André Derain',
        wikipediaTitle: 'Big_Ben_(Derain)',
        date: '1906',
      },
      {
        title: 'Dance II (La Danse)',
        artist: 'Henri Matisse',
        wikipediaTitle: 'Dance_II',
        date: '1910',
      },
    ],
  },
  {
    id: 'expressionism',
    name: 'Expressionism',
    dates: 'c. 1905–1930s, with earlier precursors',
    description: '',
    artists: [],
    paintings: [
      {
        title: 'The Scream',
        artist: 'Edvard Munch',
        wikipediaTitle: 'The_Scream',
        date: '1893',
      },
      {
        title: 'Street, Berlin',
        artist: 'Ernst Ludwig Kirchner',
        wikipediaTitle: 'Street,_Berlin',
        date: '1913',
      },
      {
        title: 'Self-Portrait as a Soldier',
        artist: 'Ernst Ludwig Kirchner',
        wikipediaTitle: 'Self-Portrait_as_a_Soldier',
        date: '1915',
      },
      {
        title: 'Blue Horse I',
        artist: 'Franz Marc',
        wikipediaTitle: 'Blue_Horse_I',
        date: '1911',
      },
      {
        title: 'The Blue Rider',
        artist: 'Wassily Kandinsky',
        wikipediaTitle: 'The_Blue_Rider',
        date: '1903',
      },
      {
        title: 'Death and the Maiden',
        artist: 'Egon Schiele',
        wikipediaTitle: 'Death_and_the_Maiden',
        date: '1915',
      },
      {
        title: 'The Last Supper',
        artist: 'Emil Nolde',
        wikipediaTitle: 'The_Last_Supper_(Nolde)',
        date: '1909',
      },
      {
        title: 'Improvisation 28 (Second Version)',
        artist: 'Wassily Kandinsky',
        wikipediaTitle: 'Improvisation_28_(Second_Version)',
        date: '1912',
      },
      {
        title: 'The Dessert: Harmony in Red',
        artist: 'Henri Matisse',
        wikipediaTitle: 'The_Dessert:_Harmony_in_Red',
        date: '1908',
      },
    ],
  },
];

/** The default, cross-period selection in editorial display order. */
export const DEFAULT_PAINTINGS = [
  'Panel of Horses',
  'The Garden of Earthly Delights',
  'Mona Lisa',
  'Venus of Urbino',
  'The Night Watch',
  'Girl with a Pearl Earring',
  'Grande Odalisque',
  'Saturn Devouring His Son',
  'Olympia',
  'Impression, Sunrise',
  'The Boulevard Montmartre at Night',
  'The Starry Night',
  'Open Window, Collioure',
  'The Scream',
  'Improvisation 28 (Second Version)',
  'The Dessert: Harmony in Red',
].map((title) => {
  const movement = FEATURED_MOVEMENTS.find((entry) =>
    entry.paintings.some((work) => work.title === title),
  );
  const work = movement?.paintings.find((entry) => entry.title === title);
  if (!movement || !work) throw new Error(`Missing default painting: ${title}`);
  return { ...work, movement: movement.name };
});
