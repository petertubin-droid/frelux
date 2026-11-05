export interface TvConsoleTemplate {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  material: string;
  feature: string;
  imageUrl: string;
  imagePage: string;
  imageCredit: string;
}

// Reference-room photographs are for visual inspiration, not product photos of
// the exact configurable templates. Free Unsplash images, attributed to source.
const image = (photoId: string) => ({
  imageUrl: `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=900&q=80`,
  imagePage: "https://unsplash.com/license",
  imageCredit: "Unsplash reference image",
});

const images = {
  image1: image("1616486338812-3dadae4b4ace"),
  image2: image("1600585154340-be6161a56a0c"),
  image3: image("1618221195710-dd6b41faaea6"),
  image4: image("1598928506311-c55ded91a20c"),
  image5: image("1600210492486-724fe5c67fb0"),
  image6: image("1600607687939-ce8a6c25118c"),
  image7: image("1586023492125-27b2c045efd7"),
  image8: image("1615873968403-89e068629265"),
  image9: image("1616046229478-9901c5536a45"),
  image10: image("1538688525198-9b88f6f53126"),
} as const;

export const TV_CONSOLE_TEMPLATES: TvConsoleTemplate[] = [
  { id: "japandi-slats", name: "Minimalist Japandi Slats", widthMm: 1800, heightMm: 400, depthMm: 350, material: "White oak veneer board", feature: "Fluted side panels", ...images.image1 },
  { id: "charcoal-floating", name: "Executive Charcoal Floating", widthMm: 2400, heightMm: 350, depthMm: 400, material: "Matte charcoal HDF-faced board", feature: "Concealed cable channel", ...images.image2 },
  { id: "fluted-column", name: "Contemporary Fluted Column", widthMm: 2100, heightMm: 450, depthMm: 380, material: "Charcoal WPC accents + cabinet board", feature: "Recessed drawer layout", ...images.image3 },
  { id: "scandi-floating", name: "Scandi Floating Unit", widthMm: 1600, heightMm: 300, depthMm: 300, material: "Light ash veneer board", feature: "Clean, mitered-edge look", ...images.image4 },
  { id: "industrial-concrete", name: "Industrial Concrete Block", widthMm: 2000, heightMm: 500, depthMm: 420, material: "Microcement-finish cabinet board", feature: "Optional black steel support frame", ...images.image5 },
  { id: "marble-walnut", name: "Luxury Marble & Walnut", widthMm: 2600, heightMm: 400, depthMm: 400, material: "Walnut veneer + stone-look top", feature: "Optional LED recess", ...images.image6 },
  { id: "ultra-slim-lowboy", name: "Ultra-Slim Lowboy", widthMm: 2200, heightMm: 250, depthMm: 320, material: "High-gloss cabinet board", feature: "Push-to-open hardware option", ...images.image7 },
  { id: "framed-traditional", name: "Classic Framed Traditional", widthMm: 1800, heightMm: 600, depthMm: 450, material: "Hardwood or hardwood veneer", feature: "Optional glazed cabinet doors", ...images.image8 },
  { id: "asymmetric-tier", name: "Asymmetrical Floating Tier", widthMm: 2400, heightMm: 600, depthMm: 350, material: "Textured melamine-faced board", feature: "Offset open display shelves", ...images.image9 },
  { id: "compact-studio", name: "Compact Studio Console", widthMm: 1200, heightMm: 350, depthMm: 300, material: "Paint-grade cabinet board", feature: "Cable-grommet option", ...images.image10 },
];
