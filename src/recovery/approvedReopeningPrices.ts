/**
 * Reopening Menu tab in Talk_of_the_Town_Reopening_Price_Plan.xlsx.
 * Small and Medium are DRAFT review prices. Large retains the old full selling
 * prices. This affects only a newly enrolled local device; existing ledgers and
 * Firebase records are never overwritten by an app upgrade.
 */
export const REOPENING_PRICE_VARIANTS: Record<string, {Small:number; Medium:number; Large:number}> = {
  prod_chow_veg:     {Small:40, Medium:50, Large:110},
  prod_chow_egg:     {Small:40, Medium:60, Large:130},
  prod_chow_chicken: {Small:50, Medium:80, Large:150},
  prod_chow_pork:    {Small:60, Medium:90, Large:160},
  prod_chow_mixed:   {Small:50, Medium:80, Large:200},
  prod_fr_veg:       {Small:30, Medium:50, Large:130},
  prod_fr_egg:       {Small:40, Medium:60, Large:140},
  prod_fr_chicken:   {Small:50, Medium:70, Large:160},
  prod_fr_pork:      {Small:60, Medium:90, Large:170},
  prod_fr_mixed:     {Small:50, Medium:80, Large:210}
};
