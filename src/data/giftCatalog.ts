import { GiftItem } from '../types';

export const GIFT_CATEGORIES = [
  'All',
  'Flowers',
  'Love',
  'Hearts',
  'Cute',
  'Animals',
  'Food',
  'Luxury',
  'Cars',
  'Bikes',
  'Royal',
  'Special',
  'Animated'
] as const;

export type GiftCategoryType = typeof GIFT_CATEGORIES[number];

// Base curated iconic gifts with custom artwork, icons and colors
const BASE_GIFTS: GiftItem[] = [
  // Flowers
  { id: 'g_rose', name: 'Rose', category: 'Special', coins: 1, icon: '🌹', imageColor: 'from-rose-500 to-red-600', animationType: 'pop' },
  { id: 'g_tulip', name: 'Tulip', category: 'Popular', coins: 5, icon: '🌷', imageColor: 'from-pink-500 to-rose-400', animationType: 'pop' },
  { id: 'g_bouquet', name: 'Flower Bouquet', category: 'Popular', coins: 20, icon: '💐', imageColor: 'from-purple-500 to-pink-500', animationType: 'float' },
  { id: 'g_sunflower', name: 'Sunflower', category: 'Popular', coins: 10, icon: '🌻', imageColor: 'from-amber-400 to-orange-500', animationType: 'pop' },
  { id: 'g_cherry_blossom', name: 'Sakura Blossom', category: 'Popular', coins: 15, icon: '🌸', imageColor: 'from-pink-400 to-pink-600', animationType: 'glow' },
  { id: 'g_hibiscus', name: 'Hibiscus', category: 'Popular', coins: 12, icon: '🌺', imageColor: 'from-red-500 to-pink-500', animationType: 'pop' },
  
  // Love & Hearts
  { id: 'g_love_heart', name: 'Love Heart', category: 'Love', coins: 10, icon: '💖', imageColor: 'from-pink-500 to-rose-600', animationType: 'pop' },
  { id: 'g_red_heart', name: 'True Love', category: 'Love', coins: 50, icon: '❤️', imageColor: 'from-red-600 to-rose-700', animationType: 'glow' },
  { id: 'g_heart_arrow', name: 'Cupid Arrow', category: 'Love', coins: 199, icon: '💘', imageColor: 'from-pink-500 to-red-500', animationType: 'blast' },
  { id: 'g_sparkle_heart', name: 'Crystal Heart', category: 'Love', coins: 399, icon: '💝', imageColor: 'from-fuchsia-500 to-pink-500', animationType: 'glow' },
  { id: 'g_love_letter', name: 'Love Letter', category: 'Love', coins: 88, icon: '💌', imageColor: 'from-rose-400 to-red-500', animationType: 'float' },
  { id: 'g_wedding_ring', name: 'Diamond Ring', category: 'Luxury', coins: 1299, icon: '💍', imageColor: 'from-cyan-400 to-blue-500', animationType: 'glow' },
  
  // Cute & Animals
  { id: 'g_teddy', name: 'Teddy Bear', category: 'Popular', coins: 99, icon: '🧸', imageColor: 'from-amber-600 to-amber-800', animationType: 'pop' },
  { id: 'g_cute_cat', name: 'Cute Kitty', category: 'Popular', coins: 66, icon: '🐱', imageColor: 'from-orange-400 to-amber-500', animationType: 'pop' },
  { id: 'g_puppy', name: 'Puppy Love', category: 'Popular', coins: 77, icon: '🐶', imageColor: 'from-amber-500 to-orange-600', animationType: 'pop' },
  { id: 'g_panda', name: 'Royal Panda', category: 'Popular', coins: 150, icon: '🐼', imageColor: 'from-slate-700 to-slate-900', animationType: 'float' },
  { id: 'g_lion', name: 'Gold Lion King', category: 'Luxury', coins: 5999, icon: '🦁', imageColor: 'from-amber-500 to-yellow-600', animationType: 'blast' },
  { id: 'g_unicorn', name: 'Magic Unicorn', category: 'Special', coins: 2500, icon: '🦄', imageColor: 'from-fuchsia-400 to-indigo-500', animationType: 'glow' },

  // Luxury & Vehicles
  { id: 'g_sports_car', name: 'Super Sports Car', category: 'Luxury', coins: 2999, icon: '🏎️', imageColor: 'from-red-600 to-rose-700', animationType: 'blast' },
  { id: 'g_superbike', name: 'Neon Superbike', category: 'Luxury', coins: 1888, icon: '🏍️', imageColor: 'from-purple-600 to-indigo-600', animationType: 'blast' },
  { id: 'g_luxury_yacht', name: 'Ocean Yacht', category: 'Luxury', coins: 8888, icon: '🛥️', imageColor: 'from-cyan-500 to-blue-600', animationType: 'glow' },
  { id: 'g_private_jet', name: 'Golden Private Jet', category: 'Exclusive', coins: 15000, icon: '✈️', imageColor: 'from-amber-400 to-yellow-600', animationType: 'blast' },
  { id: 'g_space_rocket', name: 'Cosmic Rocket', category: 'Exclusive', coins: 25000, icon: '🚀', imageColor: 'from-indigo-600 to-purple-800', animationType: 'blast' },
  
  // Royal & Special
  { id: 'g_golden_crown', name: 'Imperial Crown', category: 'Luxury', coins: 999, icon: '👑', imageColor: 'from-amber-400 to-yellow-500', animationType: 'glow' },
  { id: 'g_diamond', name: 'Royal Diamond', category: 'Luxury', coins: 499, icon: '💎', imageColor: 'from-cyan-300 to-blue-500', animationType: 'glow' },
  { id: 'g_castle', name: 'Fairytale Castle', category: 'Exclusive', coins: 19999, icon: '🏰', imageColor: 'from-purple-600 to-pink-600', animationType: 'blast' },
  { id: 'g_fireworks', name: 'Grand Fireworks', category: 'Special', coins: 500, icon: '🎆', imageColor: 'from-pink-500 to-amber-400', animationType: 'blast' },
  { id: 'g_dragon', name: 'Golden Dragon', category: 'Exclusive', coins: 30000, icon: '🐉', imageColor: 'from-amber-500 to-red-600', animationType: 'blast' },
  { id: 'g_trophy', name: 'PK Champion Cup', category: 'Special', coins: 777, icon: '🏆', imageColor: 'from-yellow-400 to-amber-500', animationType: 'glow' }
];

// Generates the scalable 500-gift catalog using structured procedural templates
export function generate500GiftCatalog(): GiftItem[] {
  const catalog: GiftItem[] = [...BASE_GIFTS];
  
  const categoryTemplates = [
    { cat: 'Flowers', icons: ['🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '💐', '🥀', '🌾', '🌱'], names: ['Lily', 'Orchid', 'Jasmine', 'Lavender', 'Lotus', 'Iris', 'Marigold', 'Daisy', 'Magnolia', 'Peony'], priceMultiplier: 5 },
    { cat: 'Love', icons: ['💖', '💕', '💓', '💗', '💞', '💘', '💌', '💋', '💏', '🥰'], names: ['Affection', 'Kiss', 'Sweet Kiss', 'Valentine Heart', 'Cupid Bow', 'Forever Love', 'Endless Kiss', 'Love Spark', 'Sweet Candy', 'Love Charm'], priceMultiplier: 15 },
    { cat: 'Hearts', icons: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '❣️'], names: ['Ruby Heart', 'Amber Heart', 'Topaz Heart', 'Emerald Heart', 'Sapphire Heart', 'Amethyst Heart', 'Obsidian Heart', 'Pearl Heart', 'Bronze Heart', 'Glow Heart'], priceMultiplier: 25 },
    { cat: 'Cute', icons: ['🧸', '🎀', '🎈', '🍭', '🧁', '🍩', '🍬', '🍼', '🐣', '🐰'], names: ['Plush Doll', 'Pink Ribbon', 'Party Balloon', 'Rainbow Lollipop', 'Sweet Cupcake', 'Glaze Donut', 'Cotton Candy', 'Baby Charm', 'Sweet Chick', 'Fluffy Bunny'], priceMultiplier: 10 },
    { cat: 'Animals', icons: ['🐱', '🐶', '🦊', '🦁', '🐯', '🐼', '🐨', '🦄', '🐬', '🦅'], names: ['Lucky Cat', 'Faithful Dog', 'Mystic Fox', 'Safari Lion', 'Bengal Tiger', 'Bao Panda', 'Sleepy Koala', 'Astral Unicorn', 'Ocean Dolphin', 'Sky Eagle'], priceMultiplier: 40 },
    { cat: 'Food', icons: ['🍓', '🎂', '🍕', '🍔', '🍟', '🍦', '🍫', '🍿', '☕', '🥂'], names: ['Royal Berry', 'Celebration Cake', 'Golden Pizza', 'Master Burger', 'Crispy Fries', 'Gelato Cone', 'Swiss Chocolate', 'Cinema Popcorn', 'Espresso Cup', 'Champagne Toast'], priceMultiplier: 8 },
    { cat: 'Luxury', icons: ['💎', '💍', '👑', '🕶️', '👛', '👠', '💄', '⌚', '🏛️', '💰'], names: ['Emerald Gem', 'Platinum Band', 'Tiara Crown', 'Designer Shades', 'Velvet Handbag', 'Crystal Heels', 'Ruby Lipstick', 'Gold Chrono', 'Grand Palace', 'Treasure Chest'], priceMultiplier: 100 },
    { cat: 'Cars', icons: ['🏎️', '🚗', '🚙', '🚕', '🚓', '🚘', '🛻', '🏎️', '🏁', '🛞'], names: ['Cyber Drift', 'Neon GT', 'Desert SUV', 'City Cruiser', 'Interceptor', 'Formula X', 'Titan Truck', 'Speed Demon', 'Checkered Flag', 'Chrome Wheel'], priceMultiplier: 250 },
    { cat: 'Bikes', icons: ['🏍️', '🛵', '🚲', '🏎️', '⚡', '🔥', '💨', '🛡️', '⚙️', '🌟'], names: ['Phantom Bike', 'Retro Vespa', 'Electro Bike', 'Apex Racer', 'Thunder Stunt', 'Nitro Flare', 'Sonic Rush', 'Knight Shield', 'Titan Gear', 'Starlight Bike'], priceMultiplier: 180 },
    { cat: 'Royal', icons: ['👑', '🏰', '🛡️', '⚔️', '🏛️', '⚜️', '🪙', '📜', '🤴', '👸'], names: ['Imperial Scepter', 'Fortress Tower', 'Aegis Shield', 'Excalibur', 'Parthenon', 'Fleur de Lis', 'Royal Sovereign', 'Golden Decree', 'King Scepter', 'Empress Veil'], priceMultiplier: 450 },
    { cat: 'Special', icons: ['🎆', '🎇', '✨', '⭐', '🌟', '💥', '🏆', '🎉', '🎊', '🔮'], names: ['Midnight Pyro', 'Starlight Burst', 'Cosmic Aura', 'Shooting Star', 'Supernova', 'Plasma Nova', 'Glory Trophy', 'Carnival Blast', 'Golden Confetti', 'Mystic Orb'], priceMultiplier: 60 },
    { cat: 'Animated', icons: ['🐉', '🚀', '🛸', '🛰️', '🌋', '🌊', '🌪️', '⚡', '🪐', '🌌'], names: ['Mythic Dragon', 'Apollo Falcon', 'UFO Invader', 'Orbital Laser', 'Volcano Burst', 'Tsunami Wave', 'Storm Vortex', 'Thunderstrike', 'Saturn Rings', 'Infinity Nebula'], priceMultiplier: 800 }
  ];

  let currentId = catalog.length + 1;
  
  // Fill up to 500 gifts systematically
  for (let i = 0; i < categoryTemplates.length && catalog.length < 500; i++) {
    const t = categoryTemplates[i];
    for (let variant = 1; variant <= 40 && catalog.length < 500; variant++) {
      const icon = t.icons[(variant - 1) % t.icons.length];
      const baseName = t.names[(variant - 1) % t.names.length];
      const tierPrefix = variant > 30 ? 'Omega ' : variant > 20 ? 'Ultra ' : variant > 10 ? 'Golden ' : '';
      
      const coins = Math.max(1, (variant * t.priceMultiplier) + Math.floor(Math.random() * 5));
      
      const animTypes: ('pop' | 'glow' | 'float' | 'blast')[] = ['pop', 'glow', 'float', 'blast'];
      const anim = coins > 5000 ? 'blast' : coins > 1000 ? 'glow' : coins > 200 ? 'float' : 'pop';

      catalog.push({
        id: `g_${currentId++}`,
        name: `${tierPrefix}${baseName}`,
        category: (['Popular', 'Luxury', 'Special', 'Exclusive', 'Love'][variant % 5]) as any,
        coins,
        icon,
        imageColor: coins > 2000 ? 'from-[#FFC84A] to-[#EF4444]' : coins > 500 ? 'from-[#8B20FF] to-[#F328D5]' : 'from-[#3B82F6] to-[#06B6D4]',
        animationType: anim
      });
    }
  }

  return catalog;
}

// Cached 500 gifts instance
export const ALL_500_GIFTS = generate500GiftCatalog();
