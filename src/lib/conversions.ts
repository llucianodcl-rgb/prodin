export const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  xicara: 240,
  colher_sopa: 15,
  colher_cha: 5,
  copo_americano: 200,
};

export const WEIGHT_TO_G: Record<string, number> = {
  g: 1,
  kg: 1000,
};

export const STANDARD_UNITS = [
  { id: 'g', name: 'Grama (g)', type: 'weight' },
  { id: 'kg', name: 'Quilograma (kg)', type: 'weight' },
  { id: 'ml', name: 'Mililitro (ml)', type: 'volume' },
  { id: 'l', name: 'Litro (l)', type: 'volume' },
  { id: 'xicara', name: 'Xícara (240ml)', type: 'volume' },
  { id: 'colher_sopa', name: 'Colher de Sopa (15ml)', type: 'volume' },
  { id: 'colher_cha', name: 'Colher de Chá (5ml)', type: 'volume' },
  { id: 'copo_americano', name: 'Copo Americano (200ml)', type: 'volume' },
  { id: 'unidade', name: 'Unidade (conforme cadastro)', type: 'unit' },
];

export const DENSITIES: Record<string, number> = {
  'açúcar de confeiteiro': 0.5,
  'açucar de confeiteiro': 0.5,
  'açúcar mascavo': 0.625,
  'açucar mascavo': 0.625,
  'açúcar refinado': 0.833, // 200g / 240ml
  'açucar refinado': 0.833,
  'açúcar cristal': 0.833,
  'açucar cristal': 0.833,
  'açúcar': 0.833,
  'açucar': 0.833,
  'farinha de trigo': 0.5,
  'farinha': 0.5,
  'cacau': 0.375,
  'chocolate em pó': 0.375,
  'manteiga': 0.833,
  'margarina': 0.833,
  'óleo': 0.875,
  'oleo': 0.875,
  'amido': 0.458,
  'maizena': 0.458,
  'leite condensado': 1.3,
  'creme de leite': 1.0,
  'leite': 1.0,
  'água': 1.0,
  'agua': 1.0,
  'ovo': 1.0, // standard assumption if liquid
};

export function getIngredientDensity(name: string): number {
  if (!name) return 1.0;
  const lower = name.toLowerCase();
  
  // Try longest match first
  const keys = Object.keys(DENSITIES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.includes(key)) {
      return DENSITIES[key];
    }
  }
  
  return 1.0; // default 1g/ml
}
