import * as cheerio from 'cheerio';
import axios from 'axios';

// HTML entity decoder
function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#x27;': "'",
    '&#39;': "'",
    '&#x2019;': "'",
    '&#8217;': "'",
    '&#x201C;': '"',
    '&#x201D;': '"',
    '&#8220;': '"',
    '&#8221;': '"',
    '&#x2013;': '–',
    '&#x2014;': '—',
    '&#8211;': '–',
    '&#8212;': '—',
    '&nbsp;': ' ',
    '&#160;': ' ',
  };

  return text.replace(/&[#\w]+;/g, (entity) => {
    return entities[entity] || entity;
  });
}

export interface Recipe {
  title: string;
  description?: string;
  image?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: string;
  ingredients: string[];
  instructions: string[];
  instagramUrl?: string; // For Instagram video popup
  nutrition?: {
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
  };
  difficulty?: string;
  author?: string;
  rating?: string;
  reviewCount?: string;
  metadata?: {
    instructionsGenerated?: boolean; // True if instructions were AI-generated
    customPreview?: {
      type: 'emoji' | 'image';
      value: string; // emoji string or image URL
      gradient?: string; // gradient class for emoji background
    };
  };
}

export async function parseRecipeFromUrl(url: string): Promise<Recipe> {
  try {
    console.log('🔍 Starting recipe parsing for:', url);
    
    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      timeout: 10000,
    });

    console.log('✅ Got response, content length:', response.data.length);
    const $ = cheerio.load(response.data);
    
  // Manual parsing debug removed - using only Gemini AI
    
    // Try to find JSON-LD structured data first (most reliable)
    const jsonLdScript = $('script[type="application/ld+json"]').get();
    let recipe: Recipe | null = null;

    for (const script of jsonLdScript) {
      try {
        const jsonData = JSON.parse($(script).html() || '');
        const recipeData = findRecipeInJsonLd(jsonData);
        if (recipeData) {
          recipe = recipeData;
          break;
        }
      } catch {
        // Continue to next script tag
      }
    }

    // If JSON-LD didn't work, try microdata
    if (!recipe) {
      recipe = parseRecipeFromMicrodata($);
    }

    // If microdata didn't work, try general parsing
    if (!recipe) {
      recipe = parseRecipeGeneral($);
    }

    if (!recipe) {
      throw new Error('Could not parse recipe from the provided URL');
    }

    // Manual parsing removed - using only Gemini AI for consistent results

    return recipe;
  } catch (error) {
    console.error('Error parsing recipe:', error);
    throw new Error('Failed to parse recipe. Please check the URL and try again.');
  }
}

function findRecipeInJsonLd(data: unknown): Recipe | null {
  if (Array.isArray(data)) {
    for (const item of data) {
      const recipe = findRecipeInJsonLd(item);
      if (recipe) return recipe;
    }
    return null;
  }

  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const dataObj = data as Record<string, unknown>;
  
  if (dataObj['@type'] === 'Recipe' || (Array.isArray(dataObj['@type']) && dataObj['@type'].includes('Recipe'))) {
    return {
      title: typeof dataObj.name === 'string' ? decodeHtmlEntities(dataObj.name) : '',
      description: typeof dataObj.description === 'string' ? decodeHtmlEntities(dataObj.description) : '',
      image: extractImageUrl(dataObj.image),
      prepTime: formatTime(dataObj.prepTime),
      cookTime: formatTime(dataObj.cookTime),
      totalTime: formatTime(dataObj.totalTime),
      servings: typeof dataObj.recipeYield === 'string' ? decodeHtmlEntities(dataObj.recipeYield) : 
                typeof dataObj.recipeYield === 'number' ? dataObj.recipeYield.toString() :
                typeof dataObj.yield === 'string' ? decodeHtmlEntities(dataObj.yield) :
                typeof dataObj.yield === 'number' ? dataObj.yield.toString() : undefined,
      ingredients: extractIngredients(dataObj.recipeIngredient),
      instructions: extractInstructions(dataObj.recipeInstructions),
      nutrition: extractNutrition(dataObj.nutrition),
      author: extractAuthor(dataObj.author),
      rating: typeof dataObj.aggregateRating === 'object' && dataObj.aggregateRating !== null && 
              typeof (dataObj.aggregateRating as Record<string, unknown>).ratingValue === 'string' ?
              (dataObj.aggregateRating as Record<string, unknown>).ratingValue as string : undefined,
      reviewCount: typeof dataObj.aggregateRating === 'object' && dataObj.aggregateRating !== null && 
                   typeof (dataObj.aggregateRating as Record<string, unknown>).reviewCount === 'string' ?
                   (dataObj.aggregateRating as Record<string, unknown>).reviewCount as string : undefined,
    };
  }

  // Check if it's a graph or contains nested objects
  if (dataObj['@graph']) {
    return findRecipeInJsonLd(dataObj['@graph']);
  }

  // Recursively search in object values
  for (const key in dataObj) {
    if (typeof dataObj[key] === 'object') {
      const recipe = findRecipeInJsonLd(dataObj[key]);
      if (recipe) return recipe;
    }
  }

  return null;
}

function parseRecipeFromMicrodata($: cheerio.Root): Recipe | null {
  const recipeElement = $('[itemtype*="Recipe"]').first();
  if (recipeElement.length === 0) return null;

  return {
    title: decodeHtmlEntities(recipeElement.find('[itemprop="name"]').first().text().trim()) || '',
    description: decodeHtmlEntities(recipeElement.find('[itemprop="description"]').first().text().trim()),
    image: recipeElement.find('[itemprop="image"]').first().attr('src') || recipeElement.find('[itemprop="image"]').first().attr('content'),
    prepTime: formatTime(recipeElement.find('[itemprop="prepTime"]').first().attr('datetime') || recipeElement.find('[itemprop="prepTime"]').first().text()),
    cookTime: formatTime(recipeElement.find('[itemprop="cookTime"]').first().attr('datetime') || recipeElement.find('[itemprop="cookTime"]').first().text()),
    totalTime: formatTime(recipeElement.find('[itemprop="totalTime"]').first().attr('datetime') || recipeElement.find('[itemprop="totalTime"]').first().text()),
    servings: decodeHtmlEntities(recipeElement.find('[itemprop="recipeYield"], [itemprop="yield"]').first().text().trim()),
    ingredients: recipeElement.find('[itemprop="recipeIngredient"]').map((_, el) => decodeHtmlEntities($(el).text().trim())).get().filter(Boolean),
    instructions: recipeElement.find('[itemprop="recipeInstructions"]').map((_, el) => {
      const text = $(el).find('[itemprop="text"]').text() || $(el).text();
      return decodeHtmlEntities(text.trim());
    }).get().filter(Boolean),
    author: decodeHtmlEntities(recipeElement.find('[itemprop="author"]').first().text().trim()),
    rating: recipeElement.find('[itemprop="ratingValue"]').first().text().trim(),
    reviewCount: recipeElement.find('[itemprop="reviewCount"]').first().text().trim(),
  };
}

function parseRecipeGeneral($: cheerio.Root): Recipe | null {
  // Common selectors for recipe elements
  const titleSelectors = ['h1', '.recipe-title', '.entry-title', '[class*="title"]'];
  const ingredientSelectors = ['.recipe-ingredient', '.ingredient', '[class*="ingredient"]', 'li[class*="ingredient"]'];

  let title = '';
  for (const selector of titleSelectors) {
    const element = $(selector).first();
    if (element.length && element.text().trim()) {
      title = decodeHtmlEntities(element.text().trim());
      break;
    }
  }

  let ingredients: string[] = [];
  for (const selector of ingredientSelectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      ingredients = elements.map((_, el) => decodeHtmlEntities($(el).text().trim())).get().filter(Boolean);
      if (ingredients.length > 0) break;
    }
  }

  let instructions: string[] = [];
  
  // Simple fallback - only use basic structured data parsing
  const instructionSelectors = [
    '[itemprop="recipeInstructions"] li',
    '[itemprop="recipeInstructions"] p',
    '.recipe-instructions li',
    '.instructions li', 
    '.method li',
    '.directions li',
    'ol li'
  ];
  
  for (const selector of instructionSelectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      instructions = elements.map((_, el) => decodeHtmlEntities($(el).text().trim())).get().filter(text => text.length > 10);
      if (instructions.length >= 3) break;
    }
  }

  if (!title && ingredients.length === 0 && instructions.length === 0) {
    return null;
  }

  return {
    title: title || 'Recipe',
    ingredients,
    instructions,
  };
}

// Helper functions
function extractImageUrl(image: unknown): string | undefined {
  if (typeof image === 'string') return image;
  if (Array.isArray(image) && image.length > 0) {
    return typeof image[0] === 'string' ? image[0] : 
           typeof image[0] === 'object' && image[0] !== null && 
           typeof (image[0] as Record<string, unknown>).url === 'string' ?
           (image[0] as Record<string, unknown>).url as string : undefined;
  }
  if (typeof image === 'object' && image !== null && 
      typeof (image as Record<string, unknown>).url === 'string') {
    return (image as Record<string, unknown>).url as string;
  }
  return undefined;
}

function formatTime(time: unknown): string | undefined {
  if (!time) return undefined;
  if (typeof time === 'string') {
    // Convert ISO 8601 duration to readable format
    if (time.startsWith('PT')) {
      const hours = time.match(/(\d+)H/);
      const minutes = time.match(/(\d+)M/);
      let result = '';
      if (hours) result += `${hours[1]}h `;
      if (minutes) result += `${minutes[1]}m`;
      return result.trim();
    }
    return time;
  }
  return undefined;
}

function extractIngredients(ingredients: unknown): string[] {
  if (!ingredients) return [];
  if (Array.isArray(ingredients)) {
    return ingredients.map(ing => {
      if (typeof ing === 'string') return decodeHtmlEntities(ing);
      if (typeof ing === 'object' && ing !== null) {
        const ingObj = ing as Record<string, unknown>;
        const text = typeof ingObj.text === 'string' ? ingObj.text :
                     typeof ingObj.name === 'string' ? ingObj.name : '';
        return decodeHtmlEntities(text);
      }
      return '';
    }).filter(Boolean);
  }
  if (typeof ingredients === 'string') return [decodeHtmlEntities(ingredients)];
  return [];
}

function extractInstructions(instructions: unknown): string[] {
  if (!instructions) return [];
  
  if (Array.isArray(instructions)) {
    const extractedInstructions: string[] = [];
    
    for (const inst of instructions) {
      if (typeof inst === 'string') {
        extractedInstructions.push(decodeHtmlEntities(inst));
      } else if (typeof inst === 'object' && inst !== null) {
        const instObj = inst as Record<string, unknown>;
        
        // Try different text properties
        let text = '';
        if (typeof instObj.text === 'string') {
          text = instObj.text;
        } else if (typeof instObj.name === 'string') {
          text = instObj.name;
        } else if (typeof instObj.description === 'string') {
          text = instObj.description;
        }
        
        if (text) {
          // Simple text extraction - let Gemini handle the parsing
          const cleanText = text.trim();
          extractedInstructions.push(decodeHtmlEntities(cleanText));
        }
      }
    }
    
    return extractedInstructions.filter(Boolean);
  }
  
  if (typeof instructions === 'string') {
    // Simple string handling - let Gemini handle the parsing
    return [decodeHtmlEntities(instructions.trim())];
  }
  
  return [];
}

function extractNutrition(nutrition: unknown): Recipe['nutrition'] | undefined {
  if (!nutrition || typeof nutrition !== 'object') return undefined;
  const nutritionObj = nutrition as Record<string, unknown>;
  return {
    calories: typeof nutritionObj.calories === 'string' ? nutritionObj.calories :
              typeof nutritionObj.calories === 'number' ? nutritionObj.calories.toString() : undefined,
    protein: typeof nutritionObj.proteinContent === 'string' ? nutritionObj.proteinContent :
             typeof nutritionObj.proteinContent === 'number' ? nutritionObj.proteinContent.toString() : undefined,
    carbs: typeof nutritionObj.carbohydrateContent === 'string' ? nutritionObj.carbohydrateContent :
           typeof nutritionObj.carbohydrateContent === 'number' ? nutritionObj.carbohydrateContent.toString() : undefined,
    fat: typeof nutritionObj.fatContent === 'string' ? nutritionObj.fatContent :
         typeof nutritionObj.fatContent === 'number' ? nutritionObj.fatContent.toString() : undefined,
  };
}

function extractAuthor(author: unknown): string | undefined {
  if (!author) return undefined;
  if (typeof author === 'string') return decodeHtmlEntities(author);
  if (typeof author === 'object' && author !== null) {
    const authorObj = author as Record<string, unknown>;
    if (typeof authorObj.name === 'string') return decodeHtmlEntities(authorObj.name);
  }
  if (Array.isArray(author) && author.length > 0) {
    if (typeof author[0] === 'string') return decodeHtmlEntities(author[0]);
    if (typeof author[0] === 'object' && author[0] !== null) {
      const firstAuthor = author[0] as Record<string, unknown>;
      if (typeof firstAuthor.name === 'string') return decodeHtmlEntities(firstAuthor.name);
    }
  }
  return undefined;
}
