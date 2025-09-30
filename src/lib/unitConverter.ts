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
  'tablespoon': { metric: 'ml', factor: 14.7868 },
  'tablespoons': { metric: 'ml', factor: 14.7868 },
  'tsp': { metric: 'ml', factor: 4.92892 },
  'teaspoon': { metric: 'ml', factor: 4.92892 },
  'teaspoons': { metric: 'ml', factor: 4.92892 },
};

// Special ingredient-specific conversions (volume to weight)
const ingredientConversions = {
  'flour': { 'cup': '120g', 'tbsp': '7.5g', 'tsp': '2.5g' },
  'sugar': { 'cup': '200g', 'tbsp': '12.5g', 'tsp': '4.2g' },
  'brown sugar': { 'cup': '220g', 'tbsp': '13.8g', 'tsp': '4.6g' },
  'butter': { 'cup': '227g', 'tbsp': '14.2g', 'tsp': '4.7g' },
  'milk': { 'cup': '240ml', 'tbsp': '15ml', 'tsp': '5ml' },
  'oil': { 'cup': '240ml', 'tbsp': '15ml', 'tsp': '5ml' },
  'water': { 'cup': '240ml', 'tbsp': '15ml', 'tsp': '5ml' },
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
  const parsed = parseIngredient(ingredient);
  
  // If no amount or unit, return as-is
  if (parsed.amount === 0 || !parsed.unit) {
    return { original: ingredient, converted: ingredient, showBoth: false };
  }

  // Check for ingredient-specific conversions first
  const ingredientName = parsed.name.toLowerCase();
  for (const [ingredientKey, conversions] of Object.entries(ingredientConversions)) {
    if (ingredientName.includes(ingredientKey)) {
      const conversion = conversions[parsed.unit as keyof typeof conversions];
      if (conversion) {
        const convertedAmount = parsed.amount * parseFloat(conversion.replace(/[^\d.]/g, ''));
        const convertedUnit = conversion.replace(/[\d.]/g, '').trim();
        return {
          original: ingredient,
          converted: `${convertedAmount.toFixed(1)}${convertedUnit} ${parsed.name}`,
          showBoth: true
        };
      }
    }
  }

  // Standard unit conversions
  const conversion = conversionFactors[parsed.unit as keyof typeof conversionFactors];
  if (!conversion) {
    return { original: ingredient, converted: ingredient, showBoth: false };
  }

  const targetUnit = targetSystem === 'metric' ? 
    ('metric' in conversion ? conversion.metric : null) : 
    ('imperial' in conversion ? conversion.imperial : null);
    
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
  
  return {
    original: ingredient,
    converted: `${roundedAmount} ${targetUnit} ${parsed.name}`,
    showBoth: true
  };
}

export function convertIngredients(ingredients: string[], targetSystem: UnitSystem): ConvertedIngredient[] {
  return ingredients.map(ingredient => convertIngredient(ingredient, targetSystem));
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
