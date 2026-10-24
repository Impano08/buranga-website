// The four live categories. The image is a representative local photo that is
// served by the API at /local-assets/... (see server/src/index.js).
export const CATEGORY_META = {
  "Men's Haircut": {
    image: '/local-assets/men.png',
    blurb: 'Sharp fades, crops, classic cuts and modern men’s finishes.',
  },
  "Women's Haircut": {
    image: '/local-assets/women.png',
    blurb: 'Braids, locs, curls, waves and elegant everyday looks.',
  },
  "Children's Haircut": {
    image: '/local-assets/children1.png',
    blurb: 'Playful, comfortable styles made for little ones.',
  },
  'Trending Haircut': {
    image: '/local-assets/trending1.png',
    blurb: 'The looks everyone is saving and asking for right now.',
  },
};

export const CATEGORY_NAMES = Object.keys(CATEGORY_META);

export function categoryMeta(name) {
  return CATEGORY_META[name] || { image: '', blurb: 'Browse hairstyles in this category.' };
}
