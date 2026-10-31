/** User-selected Commons sources, loaded remotely without bundled image assets. */
import { FEATURED_DIRECT_IMAGES, FEATURED_FILE_PAGES } from './featured-images.js';

export const PREHISTORIC_IMAGES: Readonly<Record<string, {
  url: string;
  source: string;
  credit: string;
  note: string;
}>> = {
  "Hall_of_the_Bulls": {
    url: FEATURED_DIRECT_IMAGES["Hall_of_the_Bulls"],
    source: FEATURED_FILE_PAGES["Hall_of_the_Bulls"],
    credit: "Prof saxx · CC BY-SA 3.0",
    note: "Hall of the Bulls detail",
  },
  "The_Shaft_Scene_(Bird-Headed_Man_and_Bison)": {
    url: FEATURED_DIRECT_IMAGES["The_Shaft_Scene_(Bird-Headed_Man_and_Bison)"],
    source: FEATURED_FILE_PAGES["The_Shaft_Scene_(Bird-Headed_Man_and_Bison)"],
    credit: "Peter80 · CC BY-SA 3.0",
    note: "Shaft scene",
  },
  "Panel_of_Horses": {
    url: FEATURED_DIRECT_IMAGES["Panel_of_Horses"],
    source: FEATURED_FILE_PAGES["Panel_of_Horses"],
    credit: "Thomas T. · CC BY-SA 2.0",
    note: "Museum replica",
  },
  "Panel_of_Lions": {
    url: FEATURED_DIRECT_IMAGES["Panel_of_Lions"],
    source: FEATURED_FILE_PAGES["Panel_of_Lions"],
    credit: "HTO · Public domain",
    note: "Museum replica",
  },
  "Cave_of_Altamira": {
    url: FEATURED_DIRECT_IMAGES["Cave_of_Altamira"],
    source: FEATURED_FILE_PAGES["Cave_of_Altamira"],
    credit: "Museo de Altamira y D. Rodríguez · CC BY-SA 3.0",
    note: "Polychrome bison",
  },
  "Spotted_Horses": {
    url: FEATURED_DIRECT_IMAGES["Spotted_Horses"],
    source: FEATURED_FILE_PAGES["Spotted_Horses"],
    credit: "Céréales Killer · CC BY-SA 4.0",
    note: "Spotted horses panel",
  },
  "Warty_Pig_Painting": {
    url: FEATURED_DIRECT_IMAGES["Warty_Pig_Painting"],
    source: FEATURED_FILE_PAGES["Warty_Pig_Painting"],
    credit: "Basran Burhan · CC BY-SA 4.0",
    note: "Natural-color photograph",
  },
  "Pig_and_Human-Like_Figures": {
    url: FEATURED_DIRECT_IMAGES["Pig_and_Human-Like_Figures"],
    source: FEATURED_FILE_PAGES["Pig_and_Human-Like_Figures"],
    credit: "Oktaviana et al. · CC BY 4.0",
    note: "User-selected Commons photograph",
  },
  "Cueva_de_las_Manos": {
    url: FEATURED_DIRECT_IMAGES["Cueva_de_las_Manos"],
    source: FEATURED_FILE_PAGES["Cueva_de_las_Manos"],
    credit: "Mariano · CC BY-SA 3.0",
    note: "Hand stencils",
  },
};
