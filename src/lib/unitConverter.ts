export type UnitSystem = 'metric' | 'imperial';

export interface ConvertedIngredient {
  original: string;
  converted: string;
  showBoth: boolean;
}

// Conversion factors for common units
const conversionFactors = {
  // Weight conversions (grams to imperial)
  'g': { imperial: 'oz', factor: 0.035274 },
  'gram': { imperial: 'oz', factor: 0.035274 },
  'grams': { imperial: 'oz', factor: 0.035274 },
  'kg': { imperial: 'lbs', factor: 2.20462 },
  'kilogram': { imperial: 'lbs', factor: 2.20462 },
  'kilograms': { imperial: 'lbs', factor: 2.20462 },
  
  // Volume conversions (ml to imperial)
  'ml': { imperial: 'fl oz', factor: 0.033814 },
  'milliliter': { imperial: 'fl oz', factor: 0.033814 },
  'milliliters': { imperial: 'fl oz', factor: 0.033814 },
  'l': { imperial: 'cups', factor: 4.22675 },
  'liter': { imperial: 'cups', factor: 4.22675 },
  'liters': { imperial: 'cups', factor: 4.22675 },
  
  
  // Imperial to metric (reverse conversions)
  'oz': { metric: 'g', factor: 28.3495 },
  'ounce': { metric: 'g', factor: 28.3495 },
  'ounces': { metric: 'g', factor: 28.3495 },
  'lbs': { metric: 'kg', factor: 0.453592 },
  'pound': { metric: 'kg', factor: 0.453592 },
  'pounds': { metric: 'kg', factor: 0.453592 },
  'fl oz': { metric: 'ml', factor: 29.5735 },
  'cup': { metric: 'ml', factor: 236.588 },
  'cups': { metric: 'ml', factor: 236.588 },
  'tbsp': { metric: 'ml', factor: 14.7868 },
  'tbsps': { metric: 'ml', factor: 14.7868 },
  'tbs': { metric: 'ml', factor: 14.7868 },
  'tablespoon': { metric: 'ml', factor: 14.7868 },
  'tablespoons': { metric: 'ml', factor: 14.7868 },
  'tsp': { metric: 'ml', factor: 4.92892 },
  'tsps': { metric: 'ml', factor: 4.92892 },
  'teaspoon': { metric: 'ml', factor: 4.92892 },
  'teaspoons': { metric: 'ml', factor: 4.92892 },
};

// Special ingredient-specific conversions (volume to weight)
const ingredientConversions = {
  'flour': { 'cup': '120g', 'tbsp': '7.5g', 'tbsps': '7.5g', 'tbs': '7.5g', 'tsp': '2.5g', 'tsps': '2.5g' },
  'sugar': { 'cup': '200g', 'tbsp': '12.5g', 'tbsps': '12.5g', 'tbs': '12.5g', 'tsp': '4.2g', 'tsps': '4.2g' },
  'brown sugar': { 'cup': '220g', 'tbsp': '13.8g', 'tbsps': '13.8g', 'tbs': '13.8g', 'tsp': '4.6g', 'tsps': '4.6g' },
  'butter': { 'cup': '227g', 'tbsp': '14.2g', 'tbsps': '14.2g', 'tbs': '14.2g', 'tsp': '4.7g', 'tsps': '4.7g' },
  'milk': { 'cup': '240ml', 'tbsp': '15ml', 'tbsps': '15ml', 'tbs': '15ml', 'tsp': '5ml', 'tsps': '5ml' },
  'oil': { 'cup': '240ml', 'tbsp': '15ml', 'tbsps': '15ml', 'tbs': '15ml', 'tsp': '5ml', 'tsps': '5ml' },
  'water': { 'cup': '240ml', 'tbsp': '15ml', 'tbsps': '15ml', 'tbs': '15ml', 'tsp': '5ml', 'tsps': '5ml' },
};

export function parseIngredient(ingredient: string): { amount: number; unit: string; name: string; original: string } {
  // Handle fractions
  const fractionMap: { [key: string]: number } = {
    '½': 0.5, '⅓': 0.33, '⅔': 0.67, '¼': 0.25, '¾': 0.75,
    '1/2': 0.5, '1/3': 0.33, '2/3': 0.67, '1/4': 0.25, '3/4': 0.75
  };

  // Extract amount and unit
  const amountMatch = ingredient.match(/^([\d½⅓⅔¼¾\/\.]+)\s*([a-zA-Z]+)?\s*(.+)$/);
  if (!amountMatch) {
    return { amount: 0, unit: '', name: ingredient, original: ingredient };
  }

  let amountStr = amountMatch[1];
  const unit = amountMatch[2] || '';
  const name = amountMatch[3];

  // Convert fractions to decimals
  if (fractionMap[amountStr]) {
    amountStr = fractionMap[amountStr].toString();
  } else if (amountStr.includes('/')) {
    const [numerator, denominator] = amountStr.split('/');
    amountStr = (parseFloat(numerator) / parseFloat(denominator)).toString();
  }

  const amount = parseFloat(amountStr) || 0;

  return { amount, unit: unit.toLowerCase(), name: name.trim(), original: ingredient };
}

export function convertIngredient(ingredient: string, targetSystem: UnitSystem): ConvertedIngredient {
  // Clean the ingredient by removing any existing converted values in brackets
  const cleanedIngredient = ingredient.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  const parsed = parseIngredient(cleanedIngredient);
  
  // If no amount or unit, return as-is
  if (parsed.amount === 0 || !parsed.unit) {
    return { original: ingredient, converted: ingredient, showBoth: false };
  }

  // Check if the ingredient is already in the target system
  const isMetricUnit = ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters'].includes(parsed.unit);
  const isImperialUnit = ['oz', 'ounce', 'ounces', 'lbs', 'pound', 'pounds', 'fl oz', 'cup', 'cups', 'tbsp', 'tbsps', 'tbs', 'tablespoon', 'tablespoons', 'tsp', 'tsps', 'teaspoon', 'teaspoons'].includes(parsed.unit);
  
  // If already in target system, return as-is
  if ((targetSystem === 'metric' && isMetricUnit) || (targetSystem === 'imperial' && isImperialUnit)) {
    return { original: ingredient, converted: cleanedIngredient, showBoth: false };
  }

  // Check for ingredient-specific conversions first
  const ingredientName = parsed.name.toLowerCase();
  for (const [ingredientKey, conversions] of Object.entries(ingredientConversions)) {
    if (ingredientName.includes(ingredientKey)) {
      const conversion = conversions[parsed.unit as keyof typeof conversions];
      if (conversion) {
        const convertedAmount = parsed.amount * parseFloat(conversion.replace(/[^\d.]/g, ''));
        const convertedUnit = conversion.replace(/[\d.]/g, '').trim();
        // Format the unit with proper spacing
        const unitSpacing = ['ml', 'g', 'kg', 'oz', 'lbs'].includes(convertedUnit) ? '' : ' ';
        
        return {
          original: ingredient,
          converted: `${convertedAmount.toFixed(1)}${unitSpacing}${convertedUnit} ${parsed.name}`,
          showBoth: false
        };
      }
    }
  }

  // Special handling for solid ingredients that should be converted to weight
  const solidIngredients = [
    'cheese', 'cheddar', 'cottage cheese', 'ground beef', 'beef', 'chicken', 'meat', 
    'onion', 'garlic', 'eggs', 'egg', 'butter', 'flour', 'sugar', 'brown sugar',
    'minced garlic', 'diced onion', 'white onion', 'red onion', 'yellow onion',
    'garlic salt', 'salt', 'pepper', 'herbs', 'spices', 'seasoning',
    'tortillas', 'bread', 'pasta', 'rice', 'nuts', 'seeds'
  ];
  const isSolidIngredient = solidIngredients.some(solid => ingredientName.includes(solid));
  
  // Always convert solid ingredients from volume to weight in metric
  if (isSolidIngredient && targetSystem === 'metric' && ['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters'].includes(parsed.unit)) {
    // Convert volume to weight for solid ingredients (approximate 1ml = 1g for most solids)
    const convertedAmount = Math.round(parsed.amount);
    return {
      original: ingredient,
      converted: `${convertedAmount}g ${parsed.name}`,
      showBoth: false
    };
  }
  
  // Always convert solid ingredients from weight to volume in imperial
  if (isSolidIngredient && targetSystem === 'imperial' && ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms'].includes(parsed.unit)) {
    // Convert weight to volume for solid ingredients (approximate 1g = 1ml for most solids)
    const convertedAmount = Math.round(parsed.amount);
    return {
      original: ingredient,
      converted: `${convertedAmount}ml ${parsed.name}`,
      showBoth: false
    };
  }

  // Standard unit conversions
  const conversion = conversionFactors[parsed.unit as keyof typeof conversionFactors];
  if (!conversion) {
    return { original: ingredient, converted: ingredient, showBoth: false };
  }

  // Determine the target unit based on ingredient type
  let targetUnit: string | null = null;
  if (targetSystem === 'metric') {
    if ('metric' in conversion) {
      // For solid ingredients, convert to grams instead of ml
      if (isSolidIngredient && ['cup', 'cups', 'tbsp', 'tbsps', 'tbs', 'tablespoon', 'tablespoons', 'tsp', 'tsps', 'teaspoon', 'teaspoons'].includes(parsed.unit)) {
        targetUnit = 'g';
      } else {
        targetUnit = conversion.metric;
      }
    }
  } else {
    if ('imperial' in conversion) {
      // For solid ingredients, convert to ml instead of weight units
      if (isSolidIngredient && ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms'].includes(parsed.unit)) {
        targetUnit = 'ml';
      } else {
        targetUnit = conversion.imperial;
      }
    }
  }
    
  if (!targetUnit) {
    return { original: ingredient, converted: ingredient, showBoth: false };
  }

  const convertedAmount = parsed.amount * conversion.factor;
  
  // Smart rounding for metric conversions
  let roundedAmount: string;
  if (targetSystem === 'metric') {
    if (convertedAmount < 5) {
      // For small amounts (< 5), round to nearest 0.5 or 1
      const rounded = convertedAmount < 1 ? 
        Math.round(convertedAmount * 2) / 2 : // Round to nearest 0.5
        Math.round(convertedAmount); // Round to nearest whole number
      roundedAmount = rounded.toString();
    } else if (convertedAmount < 50) {
      // For medium amounts (5-50), round to nearest 5
      const rounded = Math.round(convertedAmount / 5) * 5;
      roundedAmount = rounded.toString();
    } else {
      // For large amounts (50+), round to nearest 10
      const rounded = Math.round(convertedAmount / 10) * 10;
      roundedAmount = rounded.toString();
    }
  } else {
    // For imperial, use more precise rounding
    roundedAmount = convertedAmount < 1 ? convertedAmount.toFixed(2) : convertedAmount.toFixed(1);
  }
  
  // Format the unit with proper spacing
  const unitSpacing = ['ml', 'g', 'kg', 'oz', 'lbs'].includes(targetUnit) ? '' : ' ';
  
  return {
    original: ingredient,
    converted: `${roundedAmount}${unitSpacing}${targetUnit} ${parsed.name}`,
    showBoth: false
  };
}

export function convertIngredients(ingredients: string[], targetSystem: UnitSystem): ConvertedIngredient[] {
  return ingredients.map(ingredient => convertIngredient(ingredient, targetSystem));
}

export interface IngredientSection {
  title?: string;
  ingredients: string[];
}

export interface ConvertedIngredientSection {
  title?: string;
  ingredients: ConvertedIngredient[];
}

export function convertIngredientSections(sections: IngredientSection[], targetSystem: UnitSystem): ConvertedIngredientSection[] {
  return sections.map(section => ({
    title: section.title,
    ingredients: convertIngredients(section.ingredients, targetSystem)
  }));
}

// Temperature conversions
export function convertTemperature(temp: string, targetSystem: UnitSystem): string {
  const tempMatch = temp.match(/(\d+)\s*°?[CF]/i);
  if (!tempMatch) return temp;

  const value = parseInt(tempMatch[1]);
  let converted: number;
  let unit: string;

  if (temp.toLowerCase().includes('c')) {
    // Celsius to Fahrenheit
    converted = targetSystem === 'imperial' ? (value * 9/5) + 32 : value;
    unit = targetSystem === 'imperial' ? '°F' : '°C';
  } else {
    // Fahrenheit to Celsius
    converted = targetSystem === 'metric' ? (value - 32) * 5/9 : value;
    unit = targetSystem === 'metric' ? '°C' : '°F';
  }

  return `${Math.round(converted)}${unit}`;
}
