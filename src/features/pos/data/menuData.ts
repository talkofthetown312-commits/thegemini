import { Product, MenuItemSize } from '../models/pos';

export const INITIAL_MENU_ITEMS: Product[] = [
  // ==================== CHOWMEIN ====================
  {
    id: 'prod_chow_veg',
    name: 'Veg Chowmein',
    category: 'Chowmein',
    price: 60, // Small entry price; Large fixed to original costing workbook
    isAvailable: true,
    active: true,
    costPrice: 16.77, // Modeled estimate; confirm supplier costs and yield
    sizes: [
      { item_id: 'prod_chow_veg', size: 'Small', price: 60, cost_price: 16.77, active: true },
      { item_id: 'prod_chow_veg', size: 'Medium', price: 80, cost_price: 22.87, active: true },
      { item_id: 'prod_chow_veg', size: 'Large', price: 110, cost_price: 30.49, active: true },
    ]
  },
  {
    id: 'prod_chow_egg',
    name: 'Egg Chowmein',
    category: 'Chowmein',
    price: 70, // Small entry price; Large fixed to original costing workbook
    isAvailable: true,
    active: true,
    costPrice: 23.44, // Modeled estimate; confirm supplier costs and yield
    sizes: [
      { item_id: 'prod_chow_egg', size: 'Small', price: 70, cost_price: 23.44, active: true },
      { item_id: 'prod_chow_egg', size: 'Medium', price: 90, cost_price: 27.46, active: true },
      { item_id: 'prod_chow_egg', size: 'Large', price: 130, cost_price: 33.49, active: true },
    ]
  },
  {
    id: 'prod_chow_chicken',
    name: 'Chicken Chowmein',
    category: 'Chowmein',
    price: 80, // Small entry price; Large fixed to original costing workbook
    isAvailable: true,
    active: true,
    costPrice: 26.12, // Modeled estimate; confirm supplier costs and yield
    sizes: [
      { item_id: 'prod_chow_chicken', size: 'Small', price: 80, cost_price: 26.12, active: true },
      { item_id: 'prod_chow_chicken', size: 'Medium', price: 110, cost_price: 35.62, active: true },
      { item_id: 'prod_chow_chicken', size: 'Large', price: 150, cost_price: 47.49, active: true },
    ]
  },
  {
    id: 'prod_chow_pork',
    name: 'Pork Chowmein',
    category: 'Chowmein',
    price: 80, // Small entry price; Large fixed to original costing workbook
    isAvailable: true,
    active: true,
    costPrice: 33.6, // Modeled estimate; confirm supplier costs and yield
    sizes: [
      { item_id: 'prod_chow_pork', size: 'Small', price: 80, cost_price: 33.6, active: true },
      { item_id: 'prod_chow_pork', size: 'Medium', price: 110, cost_price: 45.82, active: true },
      { item_id: 'prod_chow_pork', size: 'Large', price: 160, cost_price: 61.09, active: true },
    ]
  },
  {
    id: 'prod_chow_mixed',
    name: 'Mixed Chowmein (Chicken+Pork)',
    category: 'Chowmein',
    price: 100, // Small entry price; Large fixed to original costing workbook
    isAvailable: true,
    active: true,
    costPrice: 29.86, // Modeled estimate; confirm supplier costs and yield
    sizes: [
      { item_id: 'prod_chow_mixed', size: 'Small', price: 100, cost_price: 29.86, active: true },
      { item_id: 'prod_chow_mixed', size: 'Medium', price: 140, cost_price: 40.72, active: true },
      { item_id: 'prod_chow_mixed', size: 'Large', price: 200, cost_price: 54.29, active: true },
    ]
  },

  // ==================== FRIED RICE ====================
  {
    id: 'prod_fr_veg',
    name: 'Veg Fried Rice',
    category: 'Fried Rice',
    price: 70, // Small entry price; Large fixed to original costing workbook
    isAvailable: true,
    active: true,
    costPrice: 15.45, // Modeled estimate; confirm supplier costs and yield
    sizes: [
      { item_id: 'prod_fr_veg', size: 'Small', price: 70, cost_price: 15.45, active: true },
      { item_id: 'prod_fr_veg', size: 'Medium', price: 90, cost_price: 21.07, active: true },
      { item_id: 'prod_fr_veg', size: 'Large', price: 130, cost_price: 28.09, active: true },
    ]
  },
  {
    id: 'prod_fr_egg',
    name: 'Egg Fried Rice',
    category: 'Fried Rice',
    price: 70, // Small entry price; Large fixed to original costing workbook
    isAvailable: true,
    active: true,
    costPrice: 21.76, // Modeled estimate; confirm supplier costs and yield
    sizes: [
      { item_id: 'prod_fr_egg', size: 'Small', price: 70, cost_price: 21.76, active: true },
      { item_id: 'prod_fr_egg', size: 'Medium', price: 100, cost_price: 25.49, active: true },
      { item_id: 'prod_fr_egg', size: 'Large', price: 140, cost_price: 31.09, active: true },
    ]
  },
  {
    id: 'prod_fr_chicken',
    name: 'Chicken Fried Rice',
    category: 'Fried Rice',
    price: 80, // Small entry price; Large fixed to original costing workbook
    isAvailable: true,
    active: true,
    costPrice: 24.8, // Modeled estimate; confirm supplier costs and yield
    sizes: [
      { item_id: 'prod_fr_chicken', size: 'Small', price: 80, cost_price: 24.8, active: true },
      { item_id: 'prod_fr_chicken', size: 'Medium', price: 110, cost_price: 33.82, active: true },
      { item_id: 'prod_fr_chicken', size: 'Large', price: 160, cost_price: 45.09, active: true },
    ]
  },
  {
    id: 'prod_fr_pork',
    name: 'Pork Fried Rice',
    category: 'Fried Rice',
    price: 90, // Small entry price; Large fixed to original costing workbook
    isAvailable: true,
    active: true,
    costPrice: 32.28, // Modeled estimate; confirm supplier costs and yield
    sizes: [
      { item_id: 'prod_fr_pork', size: 'Small', price: 90, cost_price: 32.28, active: true },
      { item_id: 'prod_fr_pork', size: 'Medium', price: 120, cost_price: 44.02, active: true },
      { item_id: 'prod_fr_pork', size: 'Large', price: 170, cost_price: 58.69, active: true },
    ]
  },
  {
    id: 'prod_fr_mixed',
    name: 'Mixed Fried Rice (Chicken+Pork)',
    category: 'Fried Rice',
    price: 110, // Small entry price; Large fixed to original costing workbook
    isAvailable: true,
    active: true,
    costPrice: 28.54, // Modeled estimate; confirm supplier costs and yield
    sizes: [
      { item_id: 'prod_fr_mixed', size: 'Small', price: 110, cost_price: 28.54, active: true },
      { item_id: 'prod_fr_mixed', size: 'Medium', price: 150, cost_price: 38.92, active: true },
      { item_id: 'prod_fr_mixed', size: 'Large', price: 210, cost_price: 51.89, active: true },
    ]
  },

  // ==================== CHILLY (Specials category, single size = Standard) ====================
  {
    id: 'prod_chilly_chicken_gravy',
    name: 'Chicken Chilly Gravy',
    category: 'Specials',
    price: 260,
    isAvailable: true,
    active: true,
    costPrice: 110,
    sizes: [
      { item_id: 'prod_chilly_chicken_gravy', size: 'Standard', price: 260, cost_price: 110, active: true }
    ]
  },
  {
    id: 'prod_chilly_chicken_dry',
    name: 'Chicken Chilly Dry',
    category: 'Specials',
    price: 250,
    isAvailable: true,
    active: true,
    costPrice: 105,
    sizes: [
      { item_id: 'prod_chilly_chicken_dry', size: 'Standard', price: 250, cost_price: 105, active: true }
    ]
  },
  {
    id: 'prod_chilly_pork_gravy',
    name: 'Pork Chilly Gravy',
    category: 'Specials',
    price: 290,
    isAvailable: true,
    active: true,
    costPrice: 125,
    sizes: [
      { item_id: 'prod_chilly_pork_gravy', size: 'Standard', price: 290, cost_price: 125, active: true }
    ]
  },
  {
    id: 'prod_chilly_pork_dry',
    name: 'Pork Chilly Dry',
    category: 'Specials',
    price: 280,
    isAvailable: true,
    active: true,
    costPrice: 120,
    sizes: [
      { item_id: 'prod_chilly_pork_dry', size: 'Standard', price: 280, cost_price: 120, active: true }
    ]
  },
  {
    id: 'prod_chilly_bites',
    name: 'Chilly Chicken Bites',
    category: 'Specials',
    price: 50,
    isAvailable: true,
    active: true,
    costPrice: 22,
    isSubItem: true,
    sizes: [
      { item_id: 'prod_chilly_bites', size: 'Standard', price: 50, cost_price: 22, active: true }
    ]
  },

  // ==================== MODULAR COMBO MEALS ====================
  // Each combo is a bundle of existing full-size Chilly and standard Medium base dishes.
  // No separate small/medium Chilly recipe is introduced.
  {
    id: 'prod_combo_chicken_noodle_feast',
    name: 'Chicken Signature Noodle Feast',
    category: 'Combo Meals',
    price: 390,
    isAvailable: true,
    active: true,
    costPrice: 131.05, // Provisional estimate; verify BOM, packaging and actual yields
    isCombo: true,
    comboDescription: 'Full Chicken Chilly Dry + 2 Medium Veg Chowmein',
    sizes: [{ item_id: 'prod_combo_chicken_noodle_feast', size: 'Standard', price: 390, cost_price: 131.05, active: true }],
    comboComponents: [
      { itemId: 'prod_chilly_chicken_dry', name: 'Chicken Chilly Dry', size: 'Standard', quantity: 1 },
      { itemId: 'prod_chow_veg', name: 'Veg Chowmein', size: 'Medium', quantity: 2 }
    ]
  },
  {
    id: 'prod_combo_chicken_rice_feast',
    name: 'Chicken Signature Rice Feast',
    category: 'Combo Meals',
    price: 440,
    isAvailable: true,
    active: true,
    costPrice: 113.32, // Provisional estimate; verify BOM, packaging and actual yields
    isCombo: true,
    comboDescription: 'Full Chicken Chilly Gravy + 2 Medium Veg Fried Rice',
    sizes: [{ item_id: 'prod_combo_chicken_rice_feast', size: 'Standard', price: 440, cost_price: 113.32, active: true }],
    comboComponents: [
      { itemId: 'prod_chilly_chicken_gravy', name: 'Chicken Chilly Gravy', size: 'Standard', quantity: 1 },
      { itemId: 'prod_fr_veg', name: 'Veg Fried Rice', size: 'Medium', quantity: 2 }
    ]
  },
  {
    id: 'prod_combo_pork_noodle_feast',
    name: 'Pork Signature Noodle Feast',
    category: 'Combo Meals',
    price: 420,
    isAvailable: true,
    active: true,
    costPrice: 146.4, // Provisional estimate; verify BOM, packaging and actual yields
    isCombo: true,
    comboDescription: 'Full Pork Chilly Dry + 2 Medium Veg Chowmein',
    sizes: [{ item_id: 'prod_combo_pork_noodle_feast', size: 'Standard', price: 420, cost_price: 146.4, active: true }],
    comboComponents: [
      { itemId: 'prod_chilly_pork_dry', name: 'Pork Chilly Dry', size: 'Standard', quantity: 1 },
      { itemId: 'prod_chow_veg', name: 'Veg Chowmein', size: 'Medium', quantity: 2 }
    ]
  },
  {
    id: 'prod_combo_pork_rice_feast',
    name: 'Pork Signature Rice Feast',
    category: 'Combo Meals',
    price: 460,
    isAvailable: true,
    active: true,
    costPrice: 143.92, // Provisional estimate; verify BOM, packaging and actual yields
    isCombo: true,
    comboDescription: 'Full Pork Chilly Gravy + 2 Medium Veg Fried Rice',
    sizes: [{ item_id: 'prod_combo_pork_rice_feast', size: 'Standard', price: 460, cost_price: 143.92, active: true }],
    comboComponents: [
      { itemId: 'prod_chilly_pork_gravy', name: 'Pork Chilly Gravy', size: 'Standard', quantity: 1 },
      { itemId: 'prod_fr_veg', name: 'Veg Fried Rice', size: 'Medium', quantity: 2 }
    ]
  },

  // ==================== DEACTIVATED ITEMS (Retained for history, active: false) ====================
  // Momo
  {
    id: 'prod_momo_veg',
    name: 'Veg Momo',
    category: 'Momo',
    price: 50,
    isAvailable: false,
    active: false,
    costPrice: 20,
    sizes: [{ item_id: 'prod_momo_veg', size: 'Standard', price: 50, cost_price: 20, active: false }]
  },
  {
    id: 'prod_momo_chicken',
    name: 'Chicken Momo',
    category: 'Momo',
    price: 70,
    isAvailable: false,
    active: false,
    costPrice: 30,
    sizes: [{ item_id: 'prod_momo_chicken', size: 'Standard', price: 70, cost_price: 30, active: false }]
  },
  {
    id: 'prod_momo_pork',
    name: 'Pork Momo',
    category: 'Momo',
    price: 80,
    isAvailable: false,
    active: false,
    costPrice: 35,
    sizes: [{ item_id: 'prod_momo_pork', size: 'Standard', price: 80, cost_price: 35, active: false }]
  },
  {
    id: 'prod_momo_fried',
    name: 'Fried Momo',
    category: 'Momo',
    price: 75,
    isAvailable: false,
    active: false,
    costPrice: 32,
    sizes: [{ item_id: 'prod_momo_fried', size: 'Standard', price: 75, cost_price: 32, active: false }]
  },
  // Macaroni
  {
    id: 'prod_mac_veg',
    name: 'Veg Macaroni',
    category: 'Macaroni',
    price: 40,
    isAvailable: false,
    active: false,
    costPrice: 18,
    sizes: [{ item_id: 'prod_mac_veg', size: 'Standard', price: 40, cost_price: 18, active: false }]
  },
  {
    id: 'prod_mac_egg',
    name: 'Egg Macaroni',
    category: 'Macaroni',
    price: 50,
    isAvailable: false,
    active: false,
    costPrice: 22,
    sizes: [{ item_id: 'prod_mac_egg', size: 'Standard', price: 50, cost_price: 22, active: false }]
  },
  {
    id: 'prod_mac_chicken',
    name: 'Chicken Macaroni',
    category: 'Macaroni',
    price: 65,
    isAvailable: false,
    active: false,
    costPrice: 28,
    sizes: [{ item_id: 'prod_mac_chicken', size: 'Standard', price: 65, cost_price: 28, active: false }]
  },
  {
    id: 'prod_mac_pork',
    name: 'Pork Macaroni',
    category: 'Macaroni',
    price: 75,
    isAvailable: false,
    active: false,
    costPrice: 34,
    sizes: [{ item_id: 'prod_mac_pork', size: 'Standard', price: 75, cost_price: 34, active: false }]
  },
  // Stir Fry
  {
    id: 'prod_sf_veg',
    name: 'Veg Stir Fry',
    category: 'Stir Fry',
    price: 50,
    isAvailable: false,
    active: false,
    costPrice: 20,
    sizes: [{ item_id: 'prod_sf_veg', size: 'Standard', price: 50, cost_price: 20, active: false }]
  },
  {
    id: 'prod_sf_chicken',
    name: 'Chicken Stir Fry',
    category: 'Stir Fry',
    price: 80,
    isAvailable: false,
    active: false,
    costPrice: 35,
    sizes: [{ item_id: 'prod_sf_chicken', size: 'Standard', price: 80, cost_price: 35, active: false }]
  },
  {
    id: 'prod_sf_pork',
    name: 'Pork Stir Fry',
    category: 'Stir Fry',
    price: 90,
    isAvailable: false,
    active: false,
    costPrice: 40,
    sizes: [{ item_id: 'prod_sf_pork', size: 'Standard', price: 90, cost_price: 40, active: false }]
  },
  // Beverages
  {
    id: 'prod_bev_red_tea',
    name: 'Red Tea',
    category: 'Beverage',
    price: 15,
    isAvailable: false,
    active: false,
    costPrice: 4,
    sizes: [{ item_id: 'prod_bev_red_tea', size: 'Standard', price: 15, cost_price: 4, active: false }]
  },
  {
    id: 'prod_bev_black_coffee',
    name: 'Black Coffee',
    category: 'Beverage',
    price: 25,
    isAvailable: false,
    active: false,
    costPrice: 7,
    sizes: [{ item_id: 'prod_bev_black_coffee', size: 'Standard', price: 25, cost_price: 7, active: false }]
  },
  {
    id: 'prod_bev_coffee_latte',
    name: 'Coffee Latte',
    category: 'Beverage',
    price: 45,
    isAvailable: false,
    active: false,
    costPrice: 15,
    sizes: [{ item_id: 'prod_bev_coffee_latte', size: 'Standard', price: 45, cost_price: 15, active: false }]
  },
  {
    id: 'prod_bev_fruit_juice',
    name: 'Fruit Juice',
    category: 'Beverage',
    price: 50,
    isAvailable: false,
    active: false,
    costPrice: 18,
    sizes: [{ item_id: 'prod_bev_fruit_juice', size: 'Standard', price: 50, cost_price: 18, active: false }]
  },
  {
    id: 'prod_bev_fruit_shake',
    name: 'Fruit Shake',
    category: 'Beverage',
    price: 60,
    isAvailable: false,
    active: false,
    costPrice: 22,
    sizes: [{ item_id: 'prod_bev_fruit_shake', size: 'Standard', price: 60, cost_price: 22, active: false }]
  }
];

export const getAllMenuItemSizes = (): MenuItemSize[] => {
  const sizes: MenuItemSize[] = [];
  for (const item of INITIAL_MENU_ITEMS) {
    if (item.sizes) {
      for (const s of item.sizes) {
        sizes.push({
          ...s,
          id: `${s.item_id}_${s.size.toLowerCase()}`
        });
      }
    }
  }
  return sizes;
};
