import {
  Product,
  Purchase,
  Store,
  Recipe,
  RecipeIngredient,
  RecipePackaging,
  Production,
  Sale,
  StockMovement,
  Settings
} from '../../types';

export const DEMO_SETTINGS: Settings = {
  businessName: "L'Atelier Gourmand — Traiteur & Pâtisserie",
  currency: '€',
  defaultTargetMargin: 65,
  categories: [
    'Épicerie sèche',
    'Produits frais & Crémerie',
    'Viandes & Volailles',
    'Poissons & Crustacés',
    'Fruits & Légumes',
    'Emballages & Conditionnement'
  ],
  recipeCategories: [
    'Entrée fraîche',
    'Plat cuisiné',
    'Pâtisserie & Dessert',
    'Bocal & Conserve artisanale',
    'Sauce & Traiteur'
  ],
  units: ['kg', 'g', 'l', 'cl', 'ml', 'pièce', 'portion', 'bouteille', 'carton'],
  salesLocations: [
    'Boutique traiteur',
    'Marché du samedi',
    'Commandes entreprise',
    'Buffets & Événements'
  ],
  defaultMinStockAlert: 3,
  googleSheetId: '',
  googleSheetLink: '',
  googleWebAppUrl: ''
};

export const DEMO_STORES: Store[] = [
  {
    id: 'STR_METRO',
    name: 'Metro Grossiste Lyon Vaulx',
    type: 'Grossiste',
    address: '14 Avenue Franklin Roosevelt, 69120 Vaulx-en-Velin',
    phone: '04 72 37 80 00',
    notes: 'Fournisseur principal épicerie, viandes et conditionnement'
  },
  {
    id: 'STR_GRANDFRAIS',
    name: 'Grand Frais Mions',
    type: 'Supermarché frais',
    address: 'Route de Corbas, 69780 Mions',
    phone: '04 78 20 45 12',
    notes: 'Fruits et légumes de premier choix, arrivages quotidiens'
  },
  {
    id: 'STR_BIO_RUNGIS',
    name: 'Bio Distribution Rhône',
    type: 'Producteur local',
    address: 'Chemin du Moulin, 69480 Anse',
    phone: '04 74 67 11 20',
    notes: 'Farines bio locales, œufs plein air régionaux de la ferme'
  },
  {
    id: 'STR_VALRHONA',
    name: 'Comptoir Valrhona & Chocolaterie',
    type: 'Grossiste',
    address: '14 Avenue du Président Herriot, 26600 Tain-l’Hermitage',
    phone: '04 75 07 90 90',
    notes: 'Chocolats de couverture grands crus, pralines, vanille Bourbon'
  },
  {
    id: 'STR_ECOPACK',
    name: 'EcoPack France Conditionnement',
    type: 'Grossiste',
    address: 'Parc d’activités des Gaulois, 38200 Vienne',
    phone: '04 74 31 88 50',
    notes: 'Boîtes carton kraft, bocaux en verre Weck, étiquettes'
  }
];

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'PRD_01',
    barcode: '3151240010205',
    name: 'Farine de Blé T55 Bio',
    category: 'Épicerie sèche',
    unit: 'kg',
    brand: 'Moulins de la région',
    format: 'Sac 25 kg',
    stock: 45.0,
    minStockAlert: 15.0,
    avgPurchasePrice: 1.45,
    mainStoreId: 'STR_BIO_RUNGIS',
    notes: 'Base pour pâte brisée et pâte feuilletée',
    isActive: true
  },
  {
    id: 'PRD_02',
    barcode: '3228022010121',
    name: 'Beurre AOP Charentes-Poitou 84% MG',
    category: 'Produits frais & Crémerie',
    unit: 'kg',
    brand: 'Lescure',
    format: 'Plaque 2 kg',
    stock: 8.5,
    minStockAlert: 4.0,
    avgPurchasePrice: 9.20,
    mainStoreId: 'STR_METRO',
    notes: 'Beurre de tourage pour pâtes et viennoiseries',
    isActive: true
  },
  {
    id: 'PRD_03',
    barcode: '3174660006265',
    name: 'Sucre semoule extra-fin',
    category: 'Épicerie sèche',
    unit: 'kg',
    brand: 'Béghin Say',
    format: 'Sac 10 kg',
    stock: 22.0,
    minStockAlert: 8.0,
    avgPurchasePrice: 1.65,
    mainStoreId: 'STR_METRO',
    notes: 'Pâtisserie et coulis',
    isActive: true
  },
  {
    id: 'PRD_04',
    barcode: '3560070364964',
    name: 'Œufs frais bio de plein air',
    category: 'Produits frais & Crémerie',
    unit: 'pièce',
    brand: 'Ferme des Vallons',
    format: 'Carton de 90',
    stock: 120,
    minStockAlert: 30,
    avgPurchasePrice: 0.32,
    mainStoreId: 'STR_BIO_RUNGIS',
    notes: 'Calibre M/L - arrivage mardi et vendredi',
    isActive: true
  },
  {
    id: 'PRD_05',
    barcode: '3155250001009',
    name: 'Crème liquide entière 35% MG',
    category: 'Produits frais & Crémerie',
    unit: 'l',
    brand: 'Elle & Vire',
    format: 'Brique 1L',
    stock: 14.0,
    minStockAlert: 5.0,
    avgPurchasePrice: 4.80,
    mainStoreId: 'STR_METRO',
    notes: 'Tenue parfaite en chantilly et ganache',
    isActive: true
  },
  {
    id: 'PRD_06',
    barcode: '3760114002100',
    name: 'Chocolat Noir Guanaja 70%',
    category: 'Épicerie sèche',
    unit: 'kg',
    brand: 'Valrhona',
    format: 'Pochon fèves 3 kg',
    stock: 6.2,
    minStockAlert: 3.0,
    avgPurchasePrice: 24.50,
    mainStoreId: 'STR_VALRHONA',
    notes: 'Arôme puissant pour desserts haut de gamme',
    isActive: true
  },
  {
    id: 'PRD_07',
    barcode: '3760114002209',
    name: 'Gousses de Vanille Bourbon Madagascar',
    category: 'Épicerie sèche',
    unit: 'pièce',
    brand: 'Maison Vanille',
    format: 'Tube de 10',
    stock: 18,
    minStockAlert: 5,
    avgPurchasePrice: 2.80,
    mainStoreId: 'STR_VALRHONA',
    notes: 'Gousses grasses 16-18cm très aromatiques',
    isActive: true
  },
  {
    id: 'PRD_08',
    barcode: '4012000000012',
    name: 'Pommes Reine des Reinettes',
    category: 'Fruits & Légumes',
    unit: 'kg',
    brand: 'Vergers du Pilat',
    format: 'Cagette 10 kg',
    stock: 18.0,
    minStockAlert: 6.0,
    avgPurchasePrice: 2.40,
    mainStoreId: 'STR_GRANDFRAIS',
    notes: 'Idéales pour cuisson tarte et compote',
    isActive: true
  },
  {
    id: 'PRD_09',
    barcode: '3560070817000',
    name: 'Abricots Bergeron frais',
    category: 'Fruits & Légumes',
    unit: 'kg',
    brand: 'Vallée du Rhône',
    format: 'Plateau 6 kg',
    stock: 2.0, // Alerte stock bas !
    minStockAlert: 5.0,
    avgPurchasePrice: 3.90,
    mainStoreId: 'STR_GRANDFRAIS',
    notes: 'Alerte stock bas - saison estivale',
    isActive: true
  },
  {
    id: 'PRD_10',
    barcode: '3250390111223',
    name: 'Filet de Saumon frais Label Rouge',
    category: 'Poissons & Crustacés',
    unit: 'kg',
    brand: 'Écosse Bio',
    format: 'Pièce entière ~2.5 kg',
    stock: 4.8,
    minStockAlert: 3.0,
    avgPurchasePrice: 22.50,
    mainStoreId: 'STR_METRO',
    notes: 'Paré sans arêtes pour entrées et pavés',
    isActive: true
  },
  {
    id: 'PRD_11',
    barcode: '3250390222334',
    name: 'Paleron de Bœuf Charolais',
    category: 'Viandes & Volailles',
    unit: 'kg',
    brand: 'Éleveurs de Bourgogne',
    format: 'Sous-vide 3 kg',
    stock: 12.0,
    minStockAlert: 5.0,
    avgPurchasePrice: 13.80,
    mainStoreId: 'STR_METRO',
    notes: 'Pour plats mijotés et daubes longue cuisson',
    isActive: true
  },
  {
    id: 'PRD_12',
    barcode: '3250390333445',
    name: 'Suprême de Volaille Fermière Label Rouge',
    category: 'Viandes & Volailles',
    unit: 'kg',
    brand: 'Volailles de l’Ain',
    format: 'Barquette 1.5 kg',
    stock: 7.5,
    minStockAlert: 4.0,
    avgPurchasePrice: 15.20,
    mainStoreId: 'STR_METRO',
    notes: 'Avec manchon peau dorée',
    isActive: true
  },
  {
    id: 'PRD_13',
    barcode: '3250390444556',
    name: 'Pommes de terre Ratte du Touquet',
    category: 'Fruits & Légumes',
    unit: 'kg',
    brand: 'Terroirs de France',
    format: 'Sac 5 kg',
    stock: 15.0,
    minStockAlert: 5.0,
    avgPurchasePrice: 3.20,
    mainStoreId: 'STR_GRANDFRAIS',
    notes: 'Pour écrasé et garnitures fines',
    isActive: true
  },
  {
    id: 'PRD_14',
    barcode: '3250390555667',
    name: 'Carottes fanes fraîches',
    category: 'Fruits & Légumes',
    unit: 'kg',
    brand: 'Maraîcher Lyonnais',
    format: 'Botte 1 kg',
    stock: 8.0,
    minStockAlert: 3.0,
    avgPurchasePrice: 2.10,
    mainStoreId: 'STR_GRANDFRAIS',
    notes: 'Cuisson glacée au beurre',
    isActive: true
  },
  {
    id: 'PRD_15',
    barcode: '3250390666778',
    name: 'Oignons grelots frais',
    category: 'Fruits & Légumes',
    unit: 'kg',
    brand: 'Maraîcher Lyonnais',
    format: 'Filet 1 kg',
    stock: 4.5,
    minStockAlert: 2.0,
    avgPurchasePrice: 3.50,
    mainStoreId: 'STR_GRANDFRAIS',
    notes: 'Garniture bourguignonne',
    isActive: true
  },
  {
    id: 'PRD_16',
    barcode: '3250390777889',
    name: 'Champignons de Paris bruns',
    category: 'Fruits & Légumes',
    unit: 'kg',
    brand: 'Champignonnière d’Anjou',
    format: 'Cagette 3 kg',
    stock: 5.0,
    minStockAlert: 2.0,
    avgPurchasePrice: 4.20,
    mainStoreId: 'STR_GRANDFRAIS',
    notes: 'Fermes et très parfumés',
    isActive: true
  },
  {
    id: 'PRD_17',
    barcode: '3250390888990',
    name: 'Vin rouge Côtes-du-Rhône AOC cuisine',
    category: 'Épicerie sèche',
    unit: 'l',
    brand: 'Vignerons Rhodaniens',
    format: 'BIB 10L',
    stock: 16.0,
    minStockAlert: 5.0,
    avgPurchasePrice: 3.80,
    mainStoreId: 'STR_METRO',
    notes: 'Riche en tanins pour sauces miroitantes',
    isActive: true
  },
  {
    id: 'PRD_18',
    barcode: '3328170002500',
    name: 'Boîtes carton Kraft fenêtre 28cm',
    category: 'Emballages & Conditionnement',
    unit: 'pièce',
    brand: 'EcoPack',
    format: 'Paquet 50',
    stock: 65,
    minStockAlert: 20,
    avgPurchasePrice: 0.42,
    mainStoreId: 'STR_ECOPACK',
    notes: 'Emballage biodégradable pour tartes et quiches',
    isActive: true
  },
  {
    id: 'PRD_19',
    barcode: '3328170002128',
    name: 'Bocaux en verre Weck 370ml + joint',
    category: 'Emballages & Conditionnement',
    unit: 'pièce',
    brand: 'Weck Allemagne',
    format: 'Carton 24',
    stock: 48,
    minStockAlert: 20,
    avgPurchasePrice: 1.15,
    mainStoreId: 'STR_ECOPACK',
    notes: 'Pour terrines, confitures et mousses individuelles',
    isActive: true
  },
  {
    id: 'PRD_20',
    barcode: '3328170002883',
    name: 'Barquettes scellables traiteur 500g',
    category: 'Emballages & Conditionnement',
    unit: 'pièce',
    brand: 'EcoPack',
    format: 'Carton 100',
    stock: 85,
    minStockAlert: 30,
    avgPurchasePrice: 0.35,
    mainStoreId: 'STR_ECOPACK',
    notes: 'Portions plats chauds à réchauffer au four',
    isActive: true
  },
  {
    id: 'PRD_21',
    barcode: '3155250002228',
    name: 'Fleur de Sel de Guérande',
    category: 'Épicerie sèche',
    unit: 'kg',
    brand: 'Artisans du Sel',
    format: 'Sachet 1 kg',
    stock: 2.8,
    minStockAlert: 1.0,
    avgPurchasePrice: 8.90,
    mainStoreId: 'STR_BIO_RUNGIS',
    notes: 'Finition assaisonnement',
    isActive: true
  },
  {
    id: 'PRD_22',
    barcode: '3155250003335',
    name: 'Poivre Noir de Kampot IGP',
    category: 'Épicerie sèche',
    unit: 'kg',
    brand: 'Épices Rares',
    format: 'Boîte 500g',
    stock: 1.2,
    minStockAlert: 0.5,
    avgPurchasePrice: 38.00,
    mainStoreId: 'STR_VALRHONA',
    notes: 'Concassé au mortier pour viandes',
    isActive: true
  },
  {
    id: 'PRD_23',
    barcode: '3155250004442',
    name: 'Huile d’Olive Vierge Extra Bio AOP',
    category: 'Épicerie sèche',
    unit: 'l',
    brand: 'Moulin de Nyons',
    format: 'Bidon 5L',
    stock: 9.0,
    minStockAlert: 3.0,
    avgPurchasePrice: 14.50,
    mainStoreId: 'STR_BIO_RUNGIS',
    notes: 'Assaisonnement et cuisson douce',
    isActive: true
  },
  {
    id: 'PRD_24',
    barcode: '3155250005559',
    name: 'Estragon frais',
    category: 'Fruits & Légumes',
    unit: 'kg',
    brand: 'Herbes du Midi',
    format: 'Botte 250g',
    stock: 0.2, // Alerte stock bas !
    minStockAlert: 0.5,
    avgPurchasePrice: 28.00,
    mainStoreId: 'STR_GRANDFRAIS',
    notes: 'Alerte stock bas - sauces délicates',
    isActive: true
  },
  {
    id: 'PRD_25',
    barcode: '3155250006666',
    name: 'Pralines roses concassées du Lyonnais',
    category: 'Épicerie sèche',
    unit: 'kg',
    brand: 'Maison de la Praline',
    format: 'Seau 5 kg',
    stock: 4.5,
    minStockAlert: 2.0,
    avgPurchasePrice: 18.50,
    mainStoreId: 'STR_VALRHONA',
    notes: 'Spécialité régionale pour tartes et brioches',
    isActive: true
  }
];

export const DEMO_RECIPES: Recipe[] = [
  {
    id: 'REC_01',
    name: "Tarte Fine aux Pommes d'Antan & Pralines",
    category: 'Pâtisserie & Dessert',
    description: 'Tarte croustillante sur pâte sablée au beurre AOP, compotée de Reinettes et éclats de pralines roses lyonnaises.',
    portions: 8,
    yieldQty: 1.0,
    yieldUnit: 'pièce',
    stock: 3,
    prepTimeMinutes: 50,
    utensilsNotes: 'Cercle à tarte perforé 28cm, rouleau à pâtisserie, pinceau',
    notes: 'Cuisson recommandée : 35 min à 175°C en chaleur tournante.',
    instructions: '1. Préparer la pâte sablée au beurre AOP.\n2. Émincer finement les pommes Reinettes.\n3. Disposer en rosace serrée, parsemer de pralines roses et cuire à 175°C.',
    isActive: true
  },
  {
    id: 'REC_02',
    name: 'Bœuf Bourguignon Traditionnel Mijoté',
    category: 'Plat cuisiné',
    description: 'Paleron de Charolais mijoté 3h au vin rouge Côtes-du-Rhône, carottes fanes glacées, oignons grelots et champignons bruns.',
    portions: 10,
    yieldQty: 10.0,
    yieldUnit: 'portion',
    stock: 14,
    prepTimeMinutes: 180,
    utensilsNotes: 'Grande cocotte en fonte 32cm, écumoire',
    notes: 'Meilleur réchauffé le lendemain. Idéal pour service traiteur.',
    instructions: '1. Rissoler les morceaux de paleron.\n2. Singer à la farine T55, mouiller au vin rouge et fond de bœuf.\n3. Ajouter oignons grelots, carottes et champignons. Laisser frémir 3h.',
    isActive: true
  },
  {
    id: 'REC_03',
    name: 'Pavé de Saumon Rôti, Écrasé de Ratte & Hollandaise',
    category: 'Plat cuisiné',
    description: 'Saumon Label Rouge juste poêlé unilatéral, écrasé de pommes de terre Ratte à l’huile d’olive et émulsion hollandaise au beurre.',
    portions: 6,
    yieldQty: 6.0,
    yieldUnit: 'portion',
    stock: 8,
    prepTimeMinutes: 45,
    utensilsNotes: 'Poêle inox fond épais, fouet à émulsion, presse-purée',
    notes: 'Cuisson du saumon minute pour un cœur nacré et fondant.',
    instructions: '1. Confectionner l’écrasé de Ratte à l’huile d’olive.\n2. Cuire les pavés de saumon côté peau 7 minutes.\n3. Monter l’émulsion hollandaise aux jaunes d’œufs et beurre fondu.',
    isActive: true
  },
  {
    id: 'REC_04',
    name: 'Mousse Croustillante au Chocolat Guanaja 70%',
    category: 'Pâtisserie & Dessert',
    description: 'Mousse aérienne au grand cru Valrhona, pointe de fleur de sel de Guérande, servie en bocal en verre Weck avec couvercle.',
    portions: 12,
    yieldQty: 12.0,
    yieldUnit: 'portion',
    stock: 18,
    prepTimeMinutes: 40,
    utensilsNotes: 'Batteur électrique, maryse souple, poches à douille',
    notes: 'Repos au froid positif 4h minimum avant dégustation.',
    instructions: '1. Fondre le chocolat Guanaja avec un filet de crème.\n2. Monter les blancs d’œufs en neige ferme avec le sucre.\n3. Incorporer délicatement à la maryse et dresser en bocaux Weck.',
    isActive: true
  },
  {
    id: 'REC_05',
    name: "Confiture Artisanale d'Abricots Bergeron au Chaudron",
    category: 'Bocal & Conserve artisanale',
    description: 'Abricots frais de la Vallée du Rhône cuits au chaudron en cuivre avec 65% de fruits et gousse de vanille Bourbon.',
    portions: 8,
    yieldQty: 8.0,
    yieldUnit: 'pot',
    stock: 6,
    prepTimeMinutes: 75,
    utensilsNotes: 'Bassine en cuivre, écumoire en inox, thermomètre à sucre',
    notes: 'Mise en pots bouillante à 104°C pour une conservation optimale.',
    instructions: '1. Faire macérer les abricots et le sucre 12h.\n2. Cuire au chaudron en cuivre à gros bouillons.\n3. Empoter immédiatement et retourner les bocaux Weck.',
    isActive: true
  }
];

export const DEMO_RECIPE_INGREDIENTS: RecipeIngredient[] = [
  // Tarte aux Pommes (REC_01)
  { id: 'RING_01', recipeId: 'REC_01', productId: 'PRD_01', qtyUsed: 0.25, unit: 'kg' },
  { id: 'RING_02', recipeId: 'REC_01', productId: 'PRD_02', qtyUsed: 0.15, unit: 'kg' },
  { id: 'RING_03', recipeId: 'REC_01', productId: 'PRD_03', qtyUsed: 0.10, unit: 'kg' },
  { id: 'RING_04', recipeId: 'REC_01', productId: 'PRD_04', qtyUsed: 1, unit: 'pièce' },
  { id: 'RING_05', recipeId: 'REC_01', productId: 'PRD_08', qtyUsed: 1.2, unit: 'kg' },
  { id: 'RING_06', recipeId: 'REC_01', productId: 'PRD_25', qtyUsed: 0.08, unit: 'kg' },

  // Bœuf Bourguignon (REC_02)
  { id: 'RING_07', recipeId: 'REC_02', productId: 'PRD_11', qtyUsed: 2.5, unit: 'kg' },
  { id: 'RING_08', recipeId: 'REC_02', productId: 'PRD_14', qtyUsed: 0.6, unit: 'kg' },
  { id: 'RING_09', recipeId: 'REC_02', productId: 'PRD_15', qtyUsed: 0.4, unit: 'kg' },
  { id: 'RING_10', recipeId: 'REC_02', productId: 'PRD_16', qtyUsed: 0.5, unit: 'kg' },
  { id: 'RING_11', recipeId: 'REC_02', productId: 'PRD_17', qtyUsed: 1.5, unit: 'l' },
  { id: 'RING_12', recipeId: 'REC_02', productId: 'PRD_02', qtyUsed: 0.08, unit: 'kg' },

  // Pavé de Saumon (REC_03)
  { id: 'RING_13', recipeId: 'REC_03', productId: 'PRD_10', qtyUsed: 1.2, unit: 'kg' },
  { id: 'RING_14', recipeId: 'REC_03', productId: 'PRD_13', qtyUsed: 1.0, unit: 'kg' },
  { id: 'RING_15', recipeId: 'REC_03', productId: 'PRD_02', qtyUsed: 0.18, unit: 'kg' },
  { id: 'RING_16', recipeId: 'REC_03', productId: 'PRD_04', qtyUsed: 3, unit: 'pièce' },
  { id: 'RING_17', recipeId: 'REC_03', productId: 'PRD_23', qtyUsed: 0.05, unit: 'l' },

  // Mousse Chocolat Guanaja (REC_04)
  { id: 'RING_18', recipeId: 'REC_04', productId: 'PRD_06', qtyUsed: 0.40, unit: 'kg' },
  { id: 'RING_19', recipeId: 'REC_04', productId: 'PRD_04', qtyUsed: 6, unit: 'pièce' },
  { id: 'RING_20', recipeId: 'REC_04', productId: 'PRD_05', qtyUsed: 0.25, unit: 'l' },
  { id: 'RING_21', recipeId: 'REC_04', productId: 'PRD_03', qtyUsed: 0.06, unit: 'kg' },
  { id: 'RING_22', recipeId: 'REC_04', productId: 'PRD_21', qtyUsed: 0.005, unit: 'kg' }
];

export const DEMO_RECIPE_PACKAGING: RecipePackaging[] = [
  { id: 'RPKG_01', recipeId: 'REC_01', name: 'Boîtes carton Kraft fenêtre 28cm', qtyUsed: 1, costPerUnit: 0.42 },
  { id: 'RPKG_02', recipeId: 'REC_01', name: 'Dentelle papier pâtisserie', qtyUsed: 1, costPerUnit: 0.08 },
  { id: 'RPKG_03', recipeId: 'REC_02', name: 'Barquettes scellables traiteur 500g', qtyUsed: 10, costPerUnit: 0.35 },
  { id: 'RPKG_04', recipeId: 'REC_03', name: 'Barquettes scellables traiteur 500g', qtyUsed: 6, costPerUnit: 0.35 },
  { id: 'RPKG_05', recipeId: 'REC_04', name: 'Bocaux en verre Weck 370ml + joint', qtyUsed: 12, costPerUnit: 1.15 },
  { id: 'RPKG_06', recipeId: 'REC_05', name: 'Bocaux en verre Weck 370ml + joint', qtyUsed: 8, costPerUnit: 1.15 },
  { id: 'RPKG_07', recipeId: 'REC_05', name: 'Étiquettes personnalisées Atelier Gourmand', qtyUsed: 8, costPerUnit: 0.12 }
];

export const DEMO_PURCHASES: Purchase[] = [
  { id: 'ACH_01', date: '2026-10-10', productId: 'PRD_01', qty: 50, unit: 'kg', pricePaid: 72.50, unitPrice: 1.45, storeId: 'STR_BIO_RUNGIS', notes: '2 sacs de 25 kg' },
  { id: 'ACH_02', date: '2026-10-12', productId: 'PRD_02', qty: 10, unit: 'kg', pricePaid: 92.00, unitPrice: 9.20, storeId: 'STR_METRO', notes: 'Plaques de beurre pour feuilletage' },
  { id: 'ACH_03', date: '2026-10-14', productId: 'PRD_06', qty: 6, unit: 'kg', pricePaid: 147.00, unitPrice: 24.50, storeId: 'STR_VALRHONA', notes: 'Couverture chocolat 70%' },
  { id: 'ACH_04', date: '2026-10-16', productId: 'PRD_10', qty: 5, unit: 'kg', pricePaid: 112.50, unitPrice: 22.50, storeId: 'STR_METRO', notes: '2 beaux filets frais Label Rouge' },
  { id: 'ACH_05', date: '2026-10-18', productId: 'PRD_11', qty: 15, unit: 'kg', pricePaid: 207.00, unitPrice: 13.80, storeId: 'STR_METRO', notes: 'Palerons charolais sous-vide' },
  { id: 'ACH_06', date: '2026-10-19', productId: 'PRD_19', qty: 48, unit: 'pièce', pricePaid: 55.20, unitPrice: 1.15, storeId: 'STR_ECOPACK', notes: '2 cartons de bocaux Weck' },
  { id: 'ACH_07', date: '2026-10-21', productId: 'PRD_04', qty: 180, unit: 'pièce', pricePaid: 57.60, unitPrice: 0.32, storeId: 'STR_BIO_RUNGIS', notes: '2 cartons de 90 œufs' }
];

export const DEMO_PRODUCTIONS: Production[] = [
  { id: 'PRD_ACT_01', date: '2026-10-17', recipeId: 'REC_02', portionsProduced: 20, calculatedCost: 96.40, notes: 'Grande cocotte pour service du week-end' },
  { id: 'PRD_ACT_02', date: '2026-10-18', recipeId: 'REC_01', portionsProduced: 4, calculatedCost: 21.80, notes: 'Tartes fines pour le stand marché' },
  { id: 'PRD_ACT_03', date: '2026-10-20', recipeId: 'REC_04', portionsProduced: 24, calculatedCost: 48.60, notes: 'Mousses chocolat individuelles en bocaux' },
  { id: 'PRD_ACT_04', date: '2026-10-22', recipeId: 'REC_03', portionsProduced: 12, calculatedCost: 68.20, notes: 'Commande traiteur société Médical Pro' }
];

export const DEMO_SALES: Sale[] = [
  { id: 'VNT_01', date: '2026-10-18', itemId: 'REC_01', itemType: 'RECIPE', qtySold: 2, unitPrice: 22.00, location: 'Marché du samedi', notes: 'Tartes entières vendues le matin' },
  { id: 'VNT_02', date: '2026-10-19', itemId: 'REC_02', itemType: 'RECIPE', qtySold: 8, unitPrice: 14.50, location: 'Boutique traiteur', notes: 'Portions bœuf bourguignon à emporter' },
  { id: 'VNT_03', date: '2026-10-20', itemId: 'REC_04', itemType: 'RECIPE', qtySold: 14, unitPrice: 4.90, location: 'Boutique traiteur', notes: 'Ventes desserts individuels' },
  { id: 'VNT_04', date: '2026-10-21', itemId: 'REC_03', itemType: 'RECIPE', qtySold: 10, unitPrice: 16.50, location: 'Commandes entreprise', notes: 'Plateaux repas direction' },
  { id: 'VNT_05', date: '2026-10-22', itemId: 'REC_02', itemType: 'RECIPE', qtySold: 6, unitPrice: 14.50, location: 'Boutique traiteur', notes: 'Portions bœuf bourguignon' }
];

export const DEMO_STOCK_MOVEMENTS: StockMovement[] = [
  { id: 'STK_01', date: '2026-10-10', productId: 'PRD_01', qty: 50, type: 'ACHAT', refId: 'ACH_01', notes: 'Réception sacs farine' },
  { id: 'STK_02', date: '2026-10-12', productId: 'PRD_02', qty: 10, type: 'ACHAT', refId: 'ACH_02', notes: 'Réception plaques beurre AOP' },
  { id: 'STK_03', date: '2026-10-17', productId: 'PRD_11', qty: -5, type: 'PRODUCTION_CONSOMMATION', refId: 'PRD_ACT_01', notes: 'Sortie viande pour bœuf bourguignon' },
  { id: 'STK_04', date: '2026-10-20', productId: 'PRD_06', qty: -0.8, type: 'PRODUCTION_CONSOMMATION', refId: 'PRD_ACT_03', notes: 'Sortie chocolat pour 24 mousses' },
  { id: 'STK_05', date: '2026-10-22', productId: 'PRD_10', qty: -2.4, type: 'PRODUCTION_CONSOMMATION', refId: 'PRD_ACT_04', notes: 'Sortie saumon traiteur' }
];
