/**
 * Editorial image manifest, verified against actual Wikimedia Commons FILE PAGES.
 * Each URL path is generated from the Commons filename + MediaWiki MD5 directory scheme.
 * This avoids the invented/wrong hash paths in v0.4, which caused every image to fail.
 * Loading an <img> does not depend on fetching API metadata. No image proxies.
 * Some 20th-century works lack a known openly reusable image and use a labeled fallback.
 * File provenance and reuse terms are at FEATURED_FILE_PAGES.
 */
export const FEATURED_IMAGE_FILENAMES: Readonly<Record<string, string>> = {
  Death_and_the_Maiden:
    'Egon Schiele - Tod und Mädchen - 3171 - Österreichische Galerie Belvedere.jpg',
  Grande_Odalisque:
    'Jean Auguste Dominique Ingres, La Grande Odalisque, 1814.jpg',
  Psyche_and_Cupid:
    'Image-François Pascal Simon Gérard 006.jpg',
  The_Garden_of_Earthly_Delights:
    "Hieronymus Bosch - The Garden of Earthly Delights - Garden of Earthly Delights (Ecclesia's Paradise).jpg",
  The_Third_of_May_1808: 'El tres de mayo de 1808 en Madrid.jpg',
  The_Ambassadors: 'Holbein-ambassadorsFXD.jpg',
  Hall_of_the_Bulls: 'Lascaux painting.jpg',
  'The_Shaft_Scene_(Bird-Headed_Man_and_Bison)': 'Lascaux 01.jpg',
  Panel_of_Horses: 'Chauvet´s cave horses.jpg',
  Panel_of_Lions: 'Lions painting, Chauvet Cave (museum replica).jpg',
  Cave_of_Altamira: '9 Bisonte Magdaleniense polícromo.jpg',
  Spotted_Horses: 'Chevaux ponctués de la grotte du Pech Merle.jpg',
  Warty_Pig_Painting: 'Leang Tedongnge rock art panel credit Basran Burhan.jpg',
  'Pig_and_Human-Like_Figures': 'Oldest painting in the world in Leang Karampuang.jpg',
  Cueva_de_las_Manos: 'SantaCruz-CuevaManos-P2210651b.jpg',
  A_Sunday_Afternoon_on_the_Island_of_La_Grande_Jatte:
    'A Sunday on La Grande Jatte, Georges Seurat, 1884.png',
  Woman_with_a_Hat: 'Matisse-Woman-with-a-Hat.jpg',
  'The_Joy_of_Life_(Le_Bonheur_de_Vivre)': 'La Joie de vivre, par Henri Matisse.jpg',
  'The_Green_Stripe_(Portrait_of_Madame_Matisse)': 'Matisse - Green Line.jpeg',
  'Big_Ben_(Derain)': 'Big Ben, par André Derain.webp',
  Dance_II: 'La Danse II, par Henri Matisse.jpg',
  The_Blue_Rider:
    'Wassily Kandinsky, 1903, The Blue Rider (Der Blaue Reiter), oil on canvas, 52.1 x 54.6 cm, Stiftung Sammlung E.G. Bührle, Zurich.jpg',
  'The_Dessert:_Harmony_in_Red': 'Matisse-The-Dessert-Harmony-in-Red-Henri-1908-fast.jpg',
  The_Bedroom: "Vincent van Gogh - Van Gogh's Bedroom in Arles - Google Art Project.jpg",
  Luncheon_of_the_Boating_Party: 'Luncheon of the Boating Party Renoir 1881.jpg',
  "The_Child's_Bath": "The Child's Bath by Mary Cassatt 1893.jpg",
  The_Gross_Clinic:
    'Thomas Eakins, American - Portrait of Dr. Samuel D. Gross (The Gross Clinic) - Google Art Project.jpg',
  The_Angelus: 'Jean-François Millet Angelus.jpg',
  The_Stone_Breakers: 'Gustave Courbet 018.jpg',
  The_Slave_Ship: 'Slave-ship.jpg',
  The_Hay_Wain: 'John Constable The Hay Wain.jpg',
  The_Death_of_Marat: 'Death of Marat by David.jpg',
  The_Milkmaid: 'Johannes Vermeer - Het melkmeisje - Google Art Project.jpg',
  Composition_VIII: 'Kandinsky - Composition 8, 1923.jpg',
  Broadway_Boogie_Woogie: 'Piet Mondrian, 1942 - Broadway Boogie Woogie.jpg',
  'Senecio_(painting)':
    'Paul Klee, 1922, Senecio, oil on gauze, 40.3 × 37.4 cm, Kunstmuseum Basel.jpg',
  Mona_Lisa: 'Mona Lisa, by Leonardo da Vinci, from C2RMF retouched.jpg',
  The_Birth_of_Venus: 'Sandro Botticelli - La nascita di Venere - Google Art Project.jpg',
  The_School_of_Athens: 'The School of Athens by Raffaello Sanzio da Urbino.jpg',
  The_Creation_of_Adam: 'Michelangelo - Creation of Adam (cropped).jpg',
  Venus_of_Urbino: 'Tiziano - Venere di Urbino - Google Art Project.jpg',
  The_Night_Watch: 'The Night Watch.jpg',
  The_Calling_of_Saint_Matthew: 'Caravaggio — The Calling of Saint Matthew.jpg',
  'The_Descent_from_the_Cross_(Rubens)':
    'Peter Paul Rubens - The Descent from the Cross (Antwerp Cathedral).jpg',
  Las_Meninas: 'Las Meninas by Diego Velázquez.jpg',
  Girl_with_a_Pearl_Earring: '1665 Girl with a Pearl Earring.jpg',
  'Impression,_Sunrise': 'Monet - Impression, Sunrise.jpg',
  Bal_du_moulin_de_la_Galette:
    'Auguste Renoir - Dance at Le Moulin de la Galette - Google Art Project.jpg',
  "The_Ballet_Class_(Degas,_Musée_d'Orsay)":
    'Edgar Degas - The Ballet Class - Google Art Project.jpg',
  The_Boulevard_Montmartre_at_Night:
    'Camille Pissarro, The Boulevard Montmartre at Night, 1897.jpg',
  'The_Cradle_(Morisot)': 'Berthe Morisot - Le berceau.jpg',
  The_Starry_Night: 'Van Gogh - Starry Night - Google Art Project.jpg',
  The_Card_Players: 'Card Players-Paul Cezanne.jpg',
  'Where_Do_We_Come_From?_What_Are_We?_Where_Are_We_Going?': "Paul Gauguin - D'ou venons-nous.jpg",
  At_the_Moulin_Rouge: 'Henri de Toulouse-Lautrec - At the Moulin Rouge - Google Art Project.jpg',
};

export const FEATURED_DIRECT_IMAGES: Readonly<Record<string, string>> = {
  Death_and_the_Maiden:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Egon_Schiele_-_Tod_und_M%C3%A4dchen_-_3171_-_%C3%96sterreichische_Galerie_Belvedere.jpg/960px-Egon_Schiele_-_Tod_und_M%C3%A4dchen_-_3171_-_%C3%96sterreichische_Galerie_Belvedere.jpg',
  Grande_Odalisque:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Jean_Auguste_Dominique_Ingres%2C_La_Grande_Odalisque%2C_1814.jpg/960px-Jean_Auguste_Dominique_Ingres%2C_La_Grande_Odalisque%2C_1814.jpg',
  Psyche_and_Cupid:
    'https://upload.wikimedia.org/wikipedia/commons/9/92/Image-Fran%C3%A7ois_Pascal_Simon_G%C3%A9rard_006.jpg',
  The_Garden_of_Earthly_Delights:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Hieronymus_Bosch_-_The_Garden_of_Earthly_Delights_-_Garden_of_Earthly_Delights_%28Ecclesia%27s_Paradise%29.jpg/960px-Hieronymus_Bosch_-_The_Garden_of_Earthly_Delights_-_Garden_of_Earthly_Delights_%28Ecclesia%27s_Paradise%29.jpg',
  The_Third_of_May_1808:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/El_tres_de_mayo_de_1808_en_Madrid.jpg/960px-El_tres_de_mayo_de_1808_en_Madrid.jpg',
  The_Ambassadors:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Holbein-ambassadorsFXD.jpg/960px-Holbein-ambassadorsFXD.jpg',
  Hall_of_the_Bulls:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1e/Lascaux_painting.jpg/960px-Lascaux_painting.jpg',
  'The_Shaft_Scene_(Bird-Headed_Man_and_Bison)':
    'https://upload.wikimedia.org/wikipedia/commons/6/65/Lascaux_01.jpg',
  Panel_of_Horses:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Chauvet%C2%B4s_cave_horses.jpg/960px-Chauvet%C2%B4s_cave_horses.jpg',
  Panel_of_Lions:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/Lions_painting%2C_Chauvet_Cave_%28museum_replica%29.jpg/960px-Lions_painting%2C_Chauvet_Cave_%28museum_replica%29.jpg',
  Cave_of_Altamira:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8b/9_Bisonte_Magdaleniense_pol%C3%ADcromo.jpg/960px-9_Bisonte_Magdaleniense_pol%C3%ADcromo.jpg',
  Spotted_Horses:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/Chevaux_ponctu%C3%A9s_de_la_grotte_du_Pech_Merle.jpg/960px-Chevaux_ponctu%C3%A9s_de_la_grotte_du_Pech_Merle.jpg',
  Warty_Pig_Painting:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Leang_Tedongnge_rock_art_panel_credit_Basran_Burhan.jpg/960px-Leang_Tedongnge_rock_art_panel_credit_Basran_Burhan.jpg',
  'Pig_and_Human-Like_Figures':
    'https://upload.wikimedia.org/wikipedia/commons/9/9c/Oldest_painting_in_the_world_in_Leang_Karampuang.jpg',
  Cueva_de_las_Manos:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/SantaCruz-CuevaManos-P2210651b.jpg/960px-SantaCruz-CuevaManos-P2210651b.jpg',
  A_Sunday_Afternoon_on_the_Island_of_La_Grande_Jatte:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/67/A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.png/960px-A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.png',
  Woman_with_a_Hat:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fb/Matisse-Woman-with-a-Hat.jpg/500px-Matisse-Woman-with-a-Hat.jpg',
  'The_Joy_of_Life_(Le_Bonheur_de_Vivre)':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/La_Joie_de_vivre%2C_par_Henri_Matisse.jpg/960px-La_Joie_de_vivre%2C_par_Henri_Matisse.jpg',
  'The_Green_Stripe_(Portrait_of_Madame_Matisse)':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/Matisse_-_Green_Line.jpeg/500px-Matisse_-_Green_Line.jpeg',
  'Big_Ben_(Derain)':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Big_Ben%2C_par_Andr%C3%A9_Derain.webp/960px-Big_Ben%2C_par_Andr%C3%A9_Derain.webp',
  Dance_II:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/La_Danse_II%2C_par_Henri_Matisse.jpg/960px-La_Danse_II%2C_par_Henri_Matisse.jpg',
  The_Blue_Rider:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Wassily_Kandinsky%2C_1903%2C_The_Blue_Rider_%28Der_Blaue_Reiter%29%2C_oil_on_canvas%2C_52.1_x_54.6_cm%2C_Stiftung_Sammlung_E.G._B%C3%BChrle%2C_Zurich.jpg/960px-Wassily_Kandinsky%2C_1903%2C_The_Blue_Rider_%28Der_Blaue_Reiter%29%2C_oil_on_canvas%2C_52.1_x_54.6_cm%2C_Stiftung_Sammlung_E.G._B%C3%BChrle%2C_Zurich.jpg',
  'The_Dessert:_Harmony_in_Red':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Matisse-The-Dessert-Harmony-in-Red-Henri-1908-fast.jpg/960px-Matisse-The-Dessert-Harmony-in-Red-Henri-1908-fast.jpg',
  The_Bedroom:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Vincent_van_Gogh_-_Van_Gogh%27s_Bedroom_in_Arles_-_Google_Art_Project.jpg/960px-Vincent_van_Gogh_-_Van_Gogh%27s_Bedroom_in_Arles_-_Google_Art_Project.jpg',
  Luncheon_of_the_Boating_Party:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/Luncheon_of_the_Boating_Party_Renoir_1881.jpg/960px-Luncheon_of_the_Boating_Party_Renoir_1881.jpg',
  "The_Child's_Bath":
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/The_Child%27s_Bath_by_Mary_Cassatt_1893.jpg/500px-The_Child%27s_Bath_by_Mary_Cassatt_1893.jpg',
  The_Gross_Clinic:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/Thomas_Eakins%2C_American_-_Portrait_of_Dr._Samuel_D._Gross_%28The_Gross_Clinic%29_-_Google_Art_Project.jpg/500px-Thomas_Eakins%2C_American_-_Portrait_of_Dr._Samuel_D._Gross_%28The_Gross_Clinic%29_-_Google_Art_Project.jpg',
  The_Angelus:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Jean-Fran%C3%A7ois_Millet_Angelus.jpg/960px-Jean-Fran%C3%A7ois_Millet_Angelus.jpg',
  The_Stone_Breakers:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/Gustave_Courbet_018.jpg/960px-Gustave_Courbet_018.jpg',
  The_Slave_Ship:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/26/Slave-ship.jpg/960px-Slave-ship.jpg',
  The_Hay_Wain:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/John_Constable_The_Hay_Wain.jpg/960px-John_Constable_The_Hay_Wain.jpg',
  The_Death_of_Marat:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/Death_of_Marat_by_David.jpg/500px-Death_of_Marat_by_David.jpg',
  The_Milkmaid:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.jpg/500px-Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.jpg',
  Composition_VIII:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Kandinsky_-_Composition_8%2C_1923.jpg/500px-Kandinsky_-_Composition_8%2C_1923.jpg',
  Broadway_Boogie_Woogie:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Piet_Mondrian%2C_1942_-_Broadway_Boogie_Woogie.jpg/500px-Piet_Mondrian%2C_1942_-_Broadway_Boogie_Woogie.jpg',
  'Senecio_(painting)':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Paul_Klee%2C_1922%2C_Senecio%2C_oil_on_gauze%2C_40.3_%C3%97_37.4_cm%2C_Kunstmuseum_Basel.jpg/500px-Paul_Klee%2C_1922%2C_Senecio%2C_oil_on_gauze%2C_40.3_%C3%97_37.4_cm%2C_Kunstmuseum_Basel.jpg',
  Mona_Lisa:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/500px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
  The_Birth_of_Venus:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project.jpg/500px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project.jpg',
  The_School_of_Athens:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/The_School_of_Athens_by_Raffaello_Sanzio_da_Urbino.jpg/500px-The_School_of_Athens_by_Raffaello_Sanzio_da_Urbino.jpg',
  The_Creation_of_Adam:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5b/Michelangelo_-_Creation_of_Adam_(cropped).jpg/500px-Michelangelo_-_Creation_of_Adam_(cropped).jpg',
  Venus_of_Urbino:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Tiziano_-_Venere_di_Urbino_-_Google_Art_Project.jpg/500px-Tiziano_-_Venere_di_Urbino_-_Google_Art_Project.jpg',
  The_Night_Watch:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/The_Night_Watch.jpg/500px-The_Night_Watch.jpg',
  The_Calling_of_Saint_Matthew:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Caravaggio_%E2%80%94_The_Calling_of_Saint_Matthew.jpg/500px-Caravaggio_%E2%80%94_The_Calling_of_Saint_Matthew.jpg',
  'The_Descent_from_the_Cross_(Rubens)':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/Peter_Paul_Rubens_-_The_Descent_from_the_Cross_(Antwerp_Cathedral).jpg/500px-Peter_Paul_Rubens_-_The_Descent_from_the_Cross_(Antwerp_Cathedral).jpg',
  Las_Meninas:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bc/Las_Meninas_by_Diego_Vel%C3%A1zquez.jpg/500px-Las_Meninas_by_Diego_Vel%C3%A1zquez.jpg',
  Girl_with_a_Pearl_Earring:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/500px-1665_Girl_with_a_Pearl_Earring.jpg',
  'Impression,_Sunrise':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Monet_-_Impression%2C_Sunrise.jpg/500px-Monet_-_Impression%2C_Sunrise.jpg',
  Bal_du_moulin_de_la_Galette:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Auguste_Renoir_-_Dance_at_Le_Moulin_de_la_Galette_-_Google_Art_Project.jpg/500px-Auguste_Renoir_-_Dance_at_Le_Moulin_de_la_Galette_-_Google_Art_Project.jpg',
  "The_Ballet_Class_(Degas,_Musée_d'Orsay)":
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Edgar_Degas_-_The_Ballet_Class_-_Google_Art_Project.jpg/500px-Edgar_Degas_-_The_Ballet_Class_-_Google_Art_Project.jpg',
  The_Boulevard_Montmartre_at_Night:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/Camille_Pissarro%2C_The_Boulevard_Montmartre_at_Night%2C_1897.jpg/500px-Camille_Pissarro%2C_The_Boulevard_Montmartre_at_Night%2C_1897.jpg',
  'The_Cradle_(Morisot)':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/Berthe_Morisot_-_Le_berceau.jpg/500px-Berthe_Morisot_-_Le_berceau.jpg',
  The_Starry_Night:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/500px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  The_Card_Players:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Card_Players-Paul_Cezanne.jpg/500px-Card_Players-Paul_Cezanne.jpg',
  'Where_Do_We_Come_From?_What_Are_We?_Where_Are_We_Going?':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/Paul_Gauguin_-_D%27ou_venons-nous.jpg/500px-Paul_Gauguin_-_D%27ou_venons-nous.jpg',
  At_the_Moulin_Rouge:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Henri_de_Toulouse-Lautrec_-_At_the_Moulin_Rouge_-_Google_Art_Project.jpg/500px-Henri_de_Toulouse-Lautrec_-_At_the_Moulin_Rouge_-_Google_Art_Project.jpg',
};

export const FEATURED_FILE_PAGES: Readonly<Record<string, string>> = {
  Death_and_the_Maiden:
    'https://commons.wikimedia.org/wiki/File:Egon_Schiele_-_Tod_und_M%C3%A4dchen_-_3171_-_%C3%96sterreichische_Galerie_Belvedere.jpg',
  Grande_Odalisque:
    'https://commons.wikimedia.org/wiki/File:Jean_Auguste_Dominique_Ingres%2C_La_Grande_Odalisque%2C_1814.jpg',
  Psyche_and_Cupid:
    'https://commons.wikimedia.org/wiki/File:Image-Fran%C3%A7ois_Pascal_Simon_G%C3%A9rard_006.jpg',
  The_Garden_of_Earthly_Delights:
    'https://commons.wikimedia.org/wiki/File:Hieronymus_Bosch_-_The_Garden_of_Earthly_Delights_-_Garden_of_Earthly_Delights_%28Ecclesia%27s_Paradise%29.jpg',
  The_Third_of_May_1808:
    'https://commons.wikimedia.org/wiki/File:El_tres_de_mayo_de_1808_en_Madrid.jpg',
  The_Ambassadors: 'https://commons.wikimedia.org/wiki/File:Holbein-ambassadorsFXD.jpg',
  Hall_of_the_Bulls: 'https://commons.wikimedia.org/wiki/File:Lascaux_painting.jpg',
  'The_Shaft_Scene_(Bird-Headed_Man_and_Bison)':
    'https://commons.wikimedia.org/wiki/File:Lascaux_01.jpg',
  Panel_of_Horses: 'https://commons.wikimedia.org/wiki/File:Chauvet%C2%B4s_cave_horses.jpg',
  Panel_of_Lions:
    'https://commons.wikimedia.org/wiki/File:Lions_painting%2C_Chauvet_Cave_%28museum_replica%29.jpg',
  Cave_of_Altamira:
    'https://commons.wikimedia.org/wiki/File:9_Bisonte_Magdaleniense_pol%C3%ADcromo.jpg',
  Spotted_Horses:
    'https://commons.wikimedia.org/wiki/File:Chevaux_ponctu%C3%A9s_de_la_grotte_du_Pech_Merle.jpg',
  Warty_Pig_Painting:
    'https://commons.wikimedia.org/wiki/File:Leang_Tedongnge_rock_art_panel_credit_Basran_Burhan.jpg',
  'Pig_and_Human-Like_Figures':
    'https://commons.wikimedia.org/wiki/File:Oldest_painting_in_the_world_in_Leang_Karampuang.jpg',
  Cueva_de_las_Manos: 'https://commons.wikimedia.org/wiki/File:SantaCruz-CuevaManos-P2210651b.jpg',
  A_Sunday_Afternoon_on_the_Island_of_La_Grande_Jatte:
    'https://commons.wikimedia.org/wiki/File:A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.png',
  Woman_with_a_Hat: 'https://commons.wikimedia.org/wiki/File:Matisse-Woman-with-a-Hat.jpg',
  'The_Joy_of_Life_(Le_Bonheur_de_Vivre)':
    'https://commons.wikimedia.org/wiki/File:La_Joie_de_vivre%2C_par_Henri_Matisse.jpg',
  'The_Green_Stripe_(Portrait_of_Madame_Matisse)':
    'https://commons.wikimedia.org/wiki/File:Matisse_-_Green_Line.jpeg',
  'Big_Ben_(Derain)':
    'https://commons.wikimedia.org/wiki/File:Big_Ben%2C_par_Andr%C3%A9_Derain.webp',
  Dance_II: 'https://commons.wikimedia.org/wiki/File:La_Danse_II%2C_par_Henri_Matisse.jpg',
  The_Blue_Rider:
    'https://commons.wikimedia.org/wiki/File:Wassily_Kandinsky%2C_1903%2C_The_Blue_Rider_%28Der_Blaue_Reiter%29%2C_oil_on_canvas%2C_52.1_x_54.6_cm%2C_Stiftung_Sammlung_E.G._B%C3%BChrle%2C_Zurich.jpg',
  'The_Dessert:_Harmony_in_Red':
    'https://commons.wikimedia.org/wiki/File:Matisse-The-Dessert-Harmony-in-Red-Henri-1908-fast.jpg',
  The_Bedroom:
    'https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_Van_Gogh%27s_Bedroom_in_Arles_-_Google_Art_Project.jpg',
  Luncheon_of_the_Boating_Party:
    'https://commons.wikimedia.org/wiki/File:Luncheon_of_the_Boating_Party_Renoir_1881.jpg',
  "The_Child's_Bath":
    'https://commons.wikimedia.org/wiki/File:The_Child%27s_Bath_by_Mary_Cassatt_1893.jpg',
  The_Gross_Clinic:
    'https://commons.wikimedia.org/wiki/File:Thomas_Eakins%2C_American_-_Portrait_of_Dr._Samuel_D._Gross_%28The_Gross_Clinic%29_-_Google_Art_Project.jpg',
  The_Angelus: 'https://commons.wikimedia.org/wiki/File:Jean-Fran%C3%A7ois_Millet_Angelus.jpg',
  The_Stone_Breakers: 'https://commons.wikimedia.org/wiki/File:Gustave_Courbet_018.jpg',
  The_Slave_Ship: 'https://commons.wikimedia.org/wiki/File:Slave-ship.jpg',
  The_Hay_Wain: 'https://commons.wikimedia.org/wiki/File:John_Constable_The_Hay_Wain.jpg',
  The_Death_of_Marat: 'https://commons.wikimedia.org/wiki/File:Death_of_Marat_by_David.jpg',
  The_Milkmaid:
    'https://commons.wikimedia.org/wiki/File:Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.jpg',
  Composition_VIII: 'https://commons.wikimedia.org/wiki/File:Kandinsky_-_Composition_8%2C_1923.jpg',
  Broadway_Boogie_Woogie:
    'https://commons.wikimedia.org/wiki/File:Piet_Mondrian%2C_1942_-_Broadway_Boogie_Woogie.jpg',
  'Senecio_(painting)':
    'https://commons.wikimedia.org/wiki/File:Paul_Klee%2C_1922%2C_Senecio%2C_oil_on_gauze%2C_40.3_%C3%97_37.4_cm%2C_Kunstmuseum_Basel.jpg',
  Mona_Lisa:
    'https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg',
  The_Birth_of_Venus:
    'https://commons.wikimedia.org/wiki/File:Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project.jpg',
  The_School_of_Athens:
    'https://commons.wikimedia.org/wiki/File:The_School_of_Athens_by_Raffaello_Sanzio_da_Urbino.jpg',
  The_Creation_of_Adam:
    'https://commons.wikimedia.org/wiki/File:Michelangelo_-_Creation_of_Adam_(cropped).jpg',
  Venus_of_Urbino:
    'https://commons.wikimedia.org/wiki/File:Tiziano_-_Venere_di_Urbino_-_Google_Art_Project.jpg',
  The_Night_Watch: 'https://commons.wikimedia.org/wiki/File:The_Night_Watch.jpg',
  The_Calling_of_Saint_Matthew:
    'https://commons.wikimedia.org/wiki/File:Caravaggio_%E2%80%94_The_Calling_of_Saint_Matthew.jpg',
  'The_Descent_from_the_Cross_(Rubens)':
    'https://commons.wikimedia.org/wiki/File:Peter_Paul_Rubens_-_The_Descent_from_the_Cross_(Antwerp_Cathedral).jpg',
  Las_Meninas: 'https://commons.wikimedia.org/wiki/File:Las_Meninas_by_Diego_Vel%C3%A1zquez.jpg',
  Girl_with_a_Pearl_Earring:
    'https://commons.wikimedia.org/wiki/File:1665_Girl_with_a_Pearl_Earring.jpg',
  'Impression,_Sunrise': 'https://commons.wikimedia.org/wiki/File:Monet_-_Impression,_Sunrise.jpg',
  Bal_du_moulin_de_la_Galette:
    'https://commons.wikimedia.org/wiki/File:Auguste_Renoir_-_Dance_at_Le_Moulin_de_la_Galette_-_Google_Art_Project.jpg',
  "The_Ballet_Class_(Degas,_Musée_d'Orsay)":
    'https://commons.wikimedia.org/wiki/File:Edgar_Degas_-_The_Ballet_Class_-_Google_Art_Project.jpg',
  The_Boulevard_Montmartre_at_Night:
    'https://commons.wikimedia.org/wiki/File:Camille_Pissarro,_The_Boulevard_Montmartre_at_Night,_1897.jpg',
  'The_Cradle_(Morisot)': 'https://commons.wikimedia.org/wiki/File:Berthe_Morisot_-_Le_berceau.jpg',
  The_Starry_Night:
    'https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  The_Card_Players: 'https://commons.wikimedia.org/wiki/File:Card_Players-Paul_Cezanne.jpg',
  'Where_Do_We_Come_From?_What_Are_We?_Where_Are_We_Going?':
    'https://commons.wikimedia.org/wiki/File:Paul_Gauguin_-_D%27ou_venons-nous.jpg',
  At_the_Moulin_Rouge:
    'https://commons.wikimedia.org/wiki/File:Henri_de_Toulouse-Lautrec_-_At_the_Moulin_Rouge_-_Google_Art_Project.jpg',
};

export const FEATURED_UPLOAD_IMAGES: Readonly<Record<string, string>> = {
  Death_and_the_Maiden:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Egon_Schiele_-_Tod_und_M%C3%A4dchen_-_3171_-_%C3%96sterreichische_Galerie_Belvedere.jpg/960px-Egon_Schiele_-_Tod_und_M%C3%A4dchen_-_3171_-_%C3%96sterreichische_Galerie_Belvedere.jpg',
  Grande_Odalisque:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Jean_Auguste_Dominique_Ingres%2C_La_Grande_Odalisque%2C_1814.jpg/960px-Jean_Auguste_Dominique_Ingres%2C_La_Grande_Odalisque%2C_1814.jpg',
  Psyche_and_Cupid:
    'https://upload.wikimedia.org/wikipedia/commons/9/92/Image-Fran%C3%A7ois_Pascal_Simon_G%C3%A9rard_006.jpg',
  The_Garden_of_Earthly_Delights:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Hieronymus_Bosch_-_The_Garden_of_Earthly_Delights_-_Garden_of_Earthly_Delights_%28Ecclesia%27s_Paradise%29.jpg/960px-Hieronymus_Bosch_-_The_Garden_of_Earthly_Delights_-_Garden_of_Earthly_Delights_%28Ecclesia%27s_Paradise%29.jpg',
  The_Third_of_May_1808:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/El_tres_de_mayo_de_1808_en_Madrid.jpg/960px-El_tres_de_mayo_de_1808_en_Madrid.jpg',
  The_Ambassadors:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Holbein-ambassadorsFXD.jpg/960px-Holbein-ambassadorsFXD.jpg',
  Hall_of_the_Bulls:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Lascaux_painting.jpg/960px-Lascaux_painting.jpg',
  'The_Shaft_Scene_(Bird-Headed_Man_and_Bison)':
    'https://upload.wikimedia.org/wikipedia/commons/6/65/Lascaux_01.jpg',
  Panel_of_Horses:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Chauvet%C2%B4s_cave_horses.jpg/960px-Chauvet%C2%B4s_cave_horses.jpg',
  Panel_of_Lions:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Lions_painting%2C_Chauvet_Cave_%28museum_replica%29.jpg/960px-Lions_painting%2C_Chauvet_Cave_%28museum_replica%29.jpg',
  Cave_of_Altamira:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/9_Bisonte_Magdaleniense_pol%C3%ADcromo.jpg/960px-9_Bisonte_Magdaleniense_pol%C3%ADcromo.jpg',
  Spotted_Horses:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Chevaux_ponctu%C3%A9s_de_la_grotte_du_Pech_Merle.jpg/960px-Chevaux_ponctu%C3%A9s_de_la_grotte_du_Pech_Merle.jpg',
  Warty_Pig_Painting:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Leang_Tedongnge_rock_art_panel_credit_Basran_Burhan.jpg/960px-Leang_Tedongnge_rock_art_panel_credit_Basran_Burhan.jpg',
  'Pig_and_Human-Like_Figures':
    'https://upload.wikimedia.org/wikipedia/commons/9/9c/Oldest_painting_in_the_world_in_Leang_Karampuang.jpg',
  Cueva_de_las_Manos:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/SantaCruz-CuevaManos-P2210651b.jpg/960px-SantaCruz-CuevaManos-P2210651b.jpg',
  A_Sunday_Afternoon_on_the_Island_of_La_Grande_Jatte:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.png/960px-A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.png',
  Woman_with_a_Hat:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Matisse-Woman-with-a-Hat.jpg/500px-Matisse-Woman-with-a-Hat.jpg',
  'The_Joy_of_Life_(Le_Bonheur_de_Vivre)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/La_Joie_de_vivre%2C_par_Henri_Matisse.jpg/960px-La_Joie_de_vivre%2C_par_Henri_Matisse.jpg',
  'The_Green_Stripe_(Portrait_of_Madame_Matisse)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Matisse_-_Green_Line.jpeg/500px-Matisse_-_Green_Line.jpeg',
  'Big_Ben_(Derain)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Big_Ben%2C_par_Andr%C3%A9_Derain.webp/960px-Big_Ben%2C_par_Andr%C3%A9_Derain.webp',
  Dance_II:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/La_Danse_II%2C_par_Henri_Matisse.jpg/960px-La_Danse_II%2C_par_Henri_Matisse.jpg',
  The_Blue_Rider:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Wassily_Kandinsky%2C_1903%2C_The_Blue_Rider_%28Der_Blaue_Reiter%29%2C_oil_on_canvas%2C_52.1_x_54.6_cm%2C_Stiftung_Sammlung_E.G._B%C3%BChrle%2C_Zurich.jpg/960px-Wassily_Kandinsky%2C_1903%2C_The_Blue_Rider_%28Der_Blaue_Reiter%29%2C_oil_on_canvas%2C_52.1_x_54.6_cm%2C_Stiftung_Sammlung_E.G._B%C3%BChrle%2C_Zurich.jpg',
  'The_Dessert:_Harmony_in_Red':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Matisse-The-Dessert-Harmony-in-Red-Henri-1908-fast.jpg/960px-Matisse-The-Dessert-Harmony-in-Red-Henri-1908-fast.jpg',
  The_Bedroom:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Vincent_van_Gogh_-_Van_Gogh%27s_Bedroom_in_Arles_-_Google_Art_Project.jpg/960px-Vincent_van_Gogh_-_Van_Gogh%27s_Bedroom_in_Arles_-_Google_Art_Project.jpg',
  Luncheon_of_the_Boating_Party:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Luncheon_of_the_Boating_Party_Renoir_1881.jpg/960px-Luncheon_of_the_Boating_Party_Renoir_1881.jpg',
  "The_Child's_Bath":
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/The_Child%27s_Bath_by_Mary_Cassatt_1893.jpg/500px-The_Child%27s_Bath_by_Mary_Cassatt_1893.jpg',
  The_Gross_Clinic:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Thomas_Eakins%2C_American_-_Portrait_of_Dr._Samuel_D._Gross_%28The_Gross_Clinic%29_-_Google_Art_Project.jpg/500px-Thomas_Eakins%2C_American_-_Portrait_of_Dr._Samuel_D._Gross_%28The_Gross_Clinic%29_-_Google_Art_Project.jpg',
  The_Angelus:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Jean-Fran%C3%A7ois_Millet_Angelus.jpg/960px-Jean-Fran%C3%A7ois_Millet_Angelus.jpg',
  The_Stone_Breakers:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Gustave_Courbet_018.jpg/960px-Gustave_Courbet_018.jpg',
  The_Slave_Ship:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Slave-ship.jpg/960px-Slave-ship.jpg',
  The_Hay_Wain:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/John_Constable_The_Hay_Wain.jpg/960px-John_Constable_The_Hay_Wain.jpg',
  The_Death_of_Marat:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Death_of_Marat_by_David.jpg/500px-Death_of_Marat_by_David.jpg',
  The_Milkmaid:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.jpg/500px-Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.jpg',
  Composition_VIII:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Kandinsky_-_Composition_8%2C_1923.jpg/500px-Kandinsky_-_Composition_8%2C_1923.jpg',
  Broadway_Boogie_Woogie:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Piet_Mondrian%2C_1942_-_Broadway_Boogie_Woogie.jpg/500px-Piet_Mondrian%2C_1942_-_Broadway_Boogie_Woogie.jpg',
  'Senecio_(painting)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Paul_Klee%2C_1922%2C_Senecio%2C_oil_on_gauze%2C_40.3_%C3%97_37.4_cm%2C_Kunstmuseum_Basel.jpg/500px-Paul_Klee%2C_1922%2C_Senecio%2C_oil_on_gauze%2C_40.3_%C3%97_37.4_cm%2C_Kunstmuseum_Basel.jpg',
  Mona_Lisa:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/500px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
  The_Birth_of_Venus:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project.jpg/500px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project.jpg',
  The_School_of_Athens:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/The_School_of_Athens_by_Raffaello_Sanzio_da_Urbino.jpg/500px-The_School_of_Athens_by_Raffaello_Sanzio_da_Urbino.jpg',
  The_Creation_of_Adam:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Michelangelo_-_Creation_of_Adam_(cropped).jpg/500px-Michelangelo_-_Creation_of_Adam_(cropped).jpg',
  Venus_of_Urbino:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Tiziano_-_Venere_di_Urbino_-_Google_Art_Project.jpg/500px-Tiziano_-_Venere_di_Urbino_-_Google_Art_Project.jpg',
  The_Night_Watch:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/The_Night_Watch.jpg/500px-The_Night_Watch.jpg',
  The_Calling_of_Saint_Matthew:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Caravaggio_%E2%80%94_The_Calling_of_Saint_Matthew.jpg/500px-Caravaggio_%E2%80%94_The_Calling_of_Saint_Matthew.jpg',
  'The_Descent_from_the_Cross_(Rubens)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Peter_Paul_Rubens_-_The_Descent_from_the_Cross_(Antwerp_Cathedral).jpg/500px-Peter_Paul_Rubens_-_The_Descent_from_the_Cross_(Antwerp_Cathedral).jpg',
  Las_Meninas:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Las_Meninas_by_Diego_Vel%C3%A1zquez.jpg/500px-Las_Meninas_by_Diego_Vel%C3%A1zquez.jpg',
  Girl_with_a_Pearl_Earring:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/500px-1665_Girl_with_a_Pearl_Earring.jpg',
  'Impression,_Sunrise':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Monet_-_Impression%2C_Sunrise.jpg/500px-Monet_-_Impression%2C_Sunrise.jpg',
  Bal_du_moulin_de_la_Galette:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Auguste_Renoir_-_Dance_at_Le_Moulin_de_la_Galette_-_Google_Art_Project.jpg/500px-Auguste_Renoir_-_Dance_at_Le_Moulin_de_la_Galette_-_Google_Art_Project.jpg',
  "The_Ballet_Class_(Degas,_Musée_d'Orsay)":
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Edgar_Degas_-_The_Ballet_Class_-_Google_Art_Project.jpg/500px-Edgar_Degas_-_The_Ballet_Class_-_Google_Art_Project.jpg',
  The_Boulevard_Montmartre_at_Night:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Camille_Pissarro%2C_The_Boulevard_Montmartre_at_Night%2C_1897.jpg/500px-Camille_Pissarro%2C_The_Boulevard_Montmartre_at_Night%2C_1897.jpg',
  'The_Cradle_(Morisot)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Berthe_Morisot_-_Le_berceau.jpg/500px-Berthe_Morisot_-_Le_berceau.jpg',
  The_Starry_Night:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/500px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  The_Card_Players:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Card_Players-Paul_Cezanne.jpg/500px-Card_Players-Paul_Cezanne.jpg',
  'Where_Do_We_Come_From?_What_Are_We?_Where_Are_We_Going?':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Paul_Gauguin_-_D%27ou_venons-nous.jpg/500px-Paul_Gauguin_-_D%27ou_venons-nous.jpg',
  At_the_Moulin_Rouge:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Henri_de_Toulouse-Lautrec_-_At_the_Moulin_Rouge_-_Google_Art_Project.jpg/500px-Henri_de_Toulouse-Lautrec_-_At_the_Moulin_Rouge_-_Google_Art_Project.jpg',
};
