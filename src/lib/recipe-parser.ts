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
  nutrition?: {
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
  };
  author?: string;
  rating?: string;
  reviewCount?: string;
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
    
    // Debug: Check what spans we can find
    const allSpans = $('span');
    console.log(`🔍 Found ${allSpans.length} span elements on page`);
    
    // Debug: Look for spans with cooking words
    const cookingSpans = $('span').filter((_, el) => {
      const text = $(el).text().trim();
      return /\b(steam|melt|add|stir|cook|bake|mix|combine|heat|place|sprinkle|season|drain|remove|return|gradually|continue|crumble|dot|brown|grill)\b/i.test(text) && text.length > 20;
    });
    console.log(`🍳 Found ${cookingSpans.length} spans with cooking instructions`);
    
    if (cookingSpans.length > 0) {
      console.log('📝 Sample cooking spans:');
      cookingSpans.slice(0, 3).each((_, el) => {
        console.log(`- "${$(el).text().trim().substring(0, 80)}..."`);
      });
    }
    
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

    // ENHANCED PARSING - force span parsing for incomplete instructions (apply to all sites)
    if (recipe.instructions.length <= 8) { // Apply to any recipe with limited instructions
      console.log('🎯 Applying enhanced parsing for incomplete instructions');
      
      // Look for the instructions section specifically
      const instructionsSection = $('h3:contains("Instructions"), h2:contains("Instructions")').parent();
      const targetContainer = instructionsSection.length > 0 ? instructionsSection : $('.entry-content, .recipe-content').first();
      
      const allSpansWithInstructions = targetContainer.find('span').filter((_, el) => {
        const text = $(el).text().trim();
        
        // More inclusive instruction detection
        const hasInstructionWords = /\b(steam|melt|add|stir|cook|bake|mix|combine|heat|place|sprinkle|season|drain|remove|return|gradually|continue|crumble|dot|brown|grill|preheat|roast|oven|temperature|reduce|transfer|cover|rest|spoon|crumble|cube|flour|water|thickened|juices|serve)\b/i.test(text);
        const hasTemperature = /\d+°?[CF]|\d+℃/i.test(text);
        const hasTime = /\d+\s*(minutes?|hours?|mins?|hrs?)/i.test(text);
        const hasAction = /^(preheat|roast|remove|combine|when|to make|spoon|transfer)/i.test(text);
        
        const isLongEnough = text.length > 15; // Reduced from 20
        const isNotIngredient = !text.match(/^\d+\s*(g|kg|ml|l|cup|tsp|tbsp|oz|lb)\s/i);
        
        // Less restrictive notes filtering
        const isNotNotes = !text.match(/\b(misnomer|term|best made using bread that is beginning|if you don't have stale bread)\b/i);
        const isNotAboutBreadcrumbs = !text.includes('fresh breadcrumbs') || text.includes('sprinkle');
        
        return isLongEnough && 
               (hasInstructionWords || hasTemperature || hasTime || hasAction) && 
               isNotIngredient && 
               isNotNotes && 
               isNotAboutBreadcrumbs;
      });
      
      if (allSpansWithInstructions.length > 0) {
        const spanInstructions = allSpansWithInstructions.map((_, el) => decodeHtmlEntities($(el).text().trim())).get().filter(Boolean);
        console.log(`🔧 Found ${spanInstructions.length} span instructions (filtered), replacing existing ${recipe.instructions.length}`);
        
        // Additional filtering: remove anything that looks like notes or tips
        let cleanedInstructions = spanInstructions.filter(instruction => {
          const lowerInstruction = instruction.toLowerCase();
          return !lowerInstruction.includes('misnomer') && 
                 !lowerInstruction.includes('best made using bread that is beginning') &&
                 !lowerInstruction.includes('if you don\'t have stale bread') &&
                 !(lowerInstruction.includes('fresh breadcrumbs') && !lowerInstruction.includes('sprinkle'));
        });
        
        console.log(`🧹 After cleaning: ${cleanedInstructions.length} instructions`);
        
        // Special handling for incomplete section headings (like "To make the gravy")
        const hasIncompleteSection = cleanedInstructions.some(instruction => {
          const lowerInstruction = instruction.toLowerCase();
          return (
            lowerInstruction.includes('to make the') || 
            lowerInstruction.includes('for the') ||
            lowerInstruction.includes('to prepare') ||
            lowerInstruction.includes('for serving') ||
            (instruction.length < 50 && lowerInstruction.match(/^(to|for)\s/)) // Short instructions starting with "to" or "for"
          );
        });
        
        if (hasIncompleteSection) {
          console.log('🔍 Detected incomplete section, looking for more content...');
          
          // Look for additional spans that might contain the rest of the instructions
          const additionalSpans = targetContainer.find('span').filter((_, el) => {
            const text = $(el).text().trim();
            const hasInstructionWords = /\b(spoon|crumble|stir|cook|remove|gradually|transfer|scraping|stirring|preheat|roast|oven|temperature|reduce|cover|rest)\b/i.test(text);
            const hasTemperature = /\d+°?[CF]|\d+℃/i.test(text);
            const hasTime = /\d+\s*(minutes?|hours?|mins?|hrs?)/i.test(text);
            const isLongEnough = text.length > 20; // Reduced from 30
            const isNotAlreadyIncluded = !cleanedInstructions.some(existing => existing.includes(text) || text.includes(existing));
            
            return isLongEnough && 
                   (hasInstructionWords || hasTemperature || hasTime) && 
                   isNotAlreadyIncluded;
          });
          
          if (additionalSpans.length > 0) {
            const additionalInstructions = additionalSpans.map((_, el) => decodeHtmlEntities($(el).text().trim())).get().filter(Boolean);
            console.log(`➕ Found ${additionalInstructions.length} additional instruction spans`);
            cleanedInstructions = cleanedInstructions.concat(additionalInstructions);
          }
        }
        
        recipe.instructions = cleanedInstructions;
      }
    }

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
    instructions: (() => {
      // First try to get instructions with itemprop
      let instructions = recipeElement.find('[itemprop="recipeInstructions"]').map((_, el) => {
        const text = $(el).find('[itemprop="text"]').text() || $(el).text();
        return decodeHtmlEntities(text.trim());
      }).get().filter(Boolean);
      
      // If no instructions found, try looking within instruction containers for lists, paragraphs, spans
      if (instructions.length === 0) {
        const instructionContainer = recipeElement.find('[itemprop="recipeInstructions"]').first();
        if (instructionContainer.length > 0) {
          const stepElements = instructionContainer.find('li, p, div, span').filter((_, el) => {
            const text = $(el).text().trim();
            const hasInstructionWords = /\b(steam|melt|add|stir|cook|bake|mix|combine|heat|place|sprinkle|season|drain|remove|return|gradually|continue|crumble|dot|brown|grill)\b/i.test(text);
            return text.length > 15 && hasInstructionWords; // Only include substantial instruction text
          });
          instructions = stepElements.map((_, el) => decodeHtmlEntities($(el).text().trim())).get().filter(Boolean);
        }
      }
      
      // Clean up fragmented instructions
      instructions = instructions.filter(instruction => {
        const text = instruction.trim();
        
        // Remove very short fragments
        if (text.length < 10) return false;
        
        // Remove fragments that are just numbers/times without context
        if (/^\d+\s*(minutes?|hours?|seconds?)?\s*$/.test(text)) return false;
        
        // Remove fragments that are just temperature units or partial temperatures
        if (/^°?[CF]\)?\s*(or|and)?\s*(the|juices?|until)?$/i.test(text)) return false;
        
        // Remove fragments that start with units or incomplete phrases
        if (/^(°F|°C|\)|\s*or\s+the|and\s+the|until\s+the)/i.test(text)) return false;
        
        // Remove standalone numbers at the beginning
        if (/^\d+\s*$/.test(text)) return false;
        
        // Keep instructions that have actual cooking verbs, reasonable length, or cooking context
        const hasActionVerbs = /\b(place|cut|add|stir|cook|bake|mix|combine|heat|sprinkle|season|drain|remove|return|gradually|continue|crumble|dot|brown|grill|preheat|roast|marinate|garnish|allow|beat|coat|dip|drizzle|flatten|lightly)\b/i.test(text);
        const hasReasonableLength = text.length > 15;
        const hasCookingContext = /\b(oven|temperature|°C|°F|minutes|hours|dish|pan|tray|oil|flour|egg|breadcrumbs|lemon|thyme|oregano|paprika|chilli|cling film|mallet|rolling pin)\b/i.test(text);
        const hasTemperatureOrTime = /\d+\s*°[CF]|\d+\s*(minutes?|hours?|seconds?)/i.test(text);
        
        return hasReasonableLength && (hasActionVerbs || hasCookingContext || hasTemperatureOrTime);
      });
      
      return instructions;
    })(),
    author: decodeHtmlEntities(recipeElement.find('[itemprop="author"]').first().text().trim()),
    rating: recipeElement.find('[itemprop="ratingValue"]').first().text().trim(),
    reviewCount: recipeElement.find('[itemprop="reviewCount"]').first().text().trim(),
  };
}

function parseRecipeGeneral($: cheerio.Root): Recipe | null {
  // Common selectors for recipe elements
  const titleSelectors = ['h1', '.recipe-title', '.entry-title', '[class*="title"]'];
  const ingredientSelectors = ['.recipe-ingredient', '.ingredient', '[class*="ingredient"]', 'li[class*="ingredient"]'];
  const instructionSelectors = ['.recipe-instruction', '.instruction', '.recipe-step', '[class*="instruction"]', '[class*="step"]'];

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
  
  // SIMPLE AND DIRECT: Mirror the successful ingredients approach
  console.log('Using SIMPLE DIRECT instruction parsing...');
  
  const directInstructionSelectors = [
    '[itemprop="recipeInstructions"] li',
    '[itemprop="recipeInstructions"] p',
    '.recipe-instructions li',
    '.instructions li', 
    '.method li',
    '.directions li',
    '.recipe-method li',
    '.recipe-directions li',
    '[class*="instruction"] li',
    '[class*="method"] li',
    '[class*="step"] li',
    'ol li',
    '.recipe-card ol li',
    '.entry-content ol li'
  ];
  
  for (const selector of directInstructionSelectors) {
    console.log(`Trying direct instruction selector: ${selector}`);
    const elements = $(selector);
    
    if (elements.length > 0) {
      console.log(`Found ${elements.length} instruction elements with: ${selector}`);
      instructions = elements.map((_, el) => {
        const text = $(el).text().trim();
        console.log(`Instruction found: "${text.substring(0, 100)}..."`);
        return decodeHtmlEntities(text);
      }).get().filter(text => text.length > 10);
      
      if (instructions.length >= 3) {
        console.log(`SUCCESS: Got ${instructions.length} instructions with selector: ${selector}`);
        break;
      }
    }
  }
  
  // Special handling for recipe card structures (like recipesmadeeasy.co.uk)
  if (instructions.length === 0) {
    const recipeCard = $('.recipe-card, [class*="recipe-card"], .entry-content, [itemtype*="Recipe"]');
    if (recipeCard.length > 0) {
      // Look for instruction lists within the recipe card
      const instructionLists = recipeCard.find('ul li, ol li').filter((_, el) => {
        const text = $(el).text().trim();
        return text.length > 20 && !text.match(/^\d+\s*(g|kg|ml|l|cup|tsp|tbsp|oz|lb)\s/i); // Not just ingredients
      });
      
      if (instructionLists.length > 0) {
        instructions = instructionLists.map((_, el) => decodeHtmlEntities($(el).text().trim())).get().filter(Boolean);
      }
    }
  }
  
  // If no instructions found, try looking for ordered/unordered lists
  if (instructions.length === 0) {
    const listSelectors = ['ol li', 'ul li', '.instructions ol li', '.instructions ul li', '.recipe-instructions ol li', '.recipe-instructions ul li'];
    for (const selector of listSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        instructions = elements.map((_, el) => decodeHtmlEntities($(el).text().trim())).get().filter(Boolean);
        if (instructions.length > 0) break;
      }
    }
  }
  
  // If still no instructions, try to find them in divs or paragraphs within instruction containers
  if (instructions.length === 0) {
    const containerSelectors = [
      '.instructions', '.recipe-instructions', '.method', '.directions', 
      '[class*="instruction"]', '[class*="method"]', '[class*="step"]',
      '.recipe-method', '.cooking-instructions', '.preparation'
    ];
    
    for (const containerSelector of containerSelectors) {
      const container = $(containerSelector).first();
      if (container.length > 0) {
        console.log(`Found container: ${containerSelector}`);
        
        // Try to find paragraphs or divs within the container
        const stepElements = container.find('p, div, li, span').filter((_, el) => {
          const text = $(el).text().trim();
          const hasSubstantialText = text.length > 15; // Increased threshold
          const isNotJustNumber = !/^\d+\.?\s*$/.test(text); // Not just a number
          return hasSubstantialText && isNotJustNumber;
        });
        
        console.log(`Found ${stepElements.length} step elements in ${containerSelector}`);
        
        if (stepElements.length > 0) {
          instructions = stepElements.map((_, el) => {
            const text = $(el).text().trim();
            console.log(`Step text: ${text.substring(0, 50)}...`);
            return decodeHtmlEntities(text);
          }).get().filter(Boolean);
          
          if (instructions.length > 0) break;
        }
        
        // If no sub-elements found, try getting all text content and splitting it
        if (instructions.length === 0) {
          const fullText = container.text().trim();
          if (fullText.length > 50) {
            // Try to split on numbered steps at the beginning of lines, but not mid-sentence
            const splitInstructions = fullText
              .split(/(?:\n|^)(\d+\.?\s)/)
              .filter(part => part.trim().length > 0)
              .reduce((acc: string[], part: string, index: number) => {
                if (/^\d+\.?\s$/.test(part.trim())) {
                  // This is a step number, combine with next part
                  return acc;
                } else if (index > 0 && /^\d+\.?\s$/.test(splitInstructions[index - 1]?.trim())) {
                  // This follows a step number
                  const stepNumber = splitInstructions[index - 1].trim();
                  acc.push(stepNumber + part.trim());
                } else if (!/^\d+\.?\s/.test(part.trim()) && part.trim().length > 15) {
                  // This is content without a step number
                  acc.push(part.trim());
                }
                return acc;
              }, [])
              .filter(step => step.length > 15);
            
            if (splitInstructions.length > 1) {
              instructions = splitInstructions.map(step => decodeHtmlEntities(step));
              console.log(`Split instructions into ${instructions.length} steps`);
              break;
            }
          }
        }
      }
    }
  }
  
  // Specific parsing for structured recipe formats (headings with sub-instructions)
  if (instructions.length <= 3) { // If we only got main headings
    console.log('Trying structured recipe parsing...');
    
    // First, try to find the actual instructions container
    let instructionsContainer = $('h3:contains("Instructions"), h2:contains("Instructions")').next();
    
    // If not found, look for the instructions section in different ways
    if (instructionsContainer.length === 0) {
      instructionsContainer = $('.recipe-instructions, [class*="instructions"], .method, .directions').first();
    }
    
    // Try looking in the recipe card or main content area
    if (instructionsContainer.length === 0) {
      instructionsContainer = $('.entry-content, .recipe-content, [itemtype*="Recipe"]').first();
    }
    
    if (instructionsContainer.length > 0) {
      console.log('Found instructions container');
      
      // Look for ALL elements (li, span, p) that contain cooking instructions
      const allInstructionItems = instructionsContainer.find('ul li, ol li, span, p').filter((_, el) => {
        const text = $(el).text().trim();
        const hasInstructionVerbs = /\b(steam|melt|add|stir|cook|bake|mix|combine|heat|place|sprinkle|season|drain|remove|return|gradually|continue|crumble|dot|brown|grill)\b/i.test(text);
        const isLongEnough = text.length > 15;
        const isNotIngredient = !text.match(/^\d+\s*(g|kg|ml|l|cup|tsp|tbsp|oz|lb)\s/i);
        
        return isLongEnough && hasInstructionVerbs && isNotIngredient;
      });
      
      console.log(`Found ${allInstructionItems.length} instruction items`);
      
      if (allInstructionItems.length > instructions.length) {
        instructions = allInstructionItems.map((_, el) => decodeHtmlEntities($(el).text().trim())).get().filter(Boolean);
        console.log('Using detailed instruction items');
      }
    }
    
    // Alternative: Look for recipe schema or structured data
    if (instructions.length <= 3) {
      console.log('Trying alternative parsing methods...');
      
      // Method 1: Look for ANY elements (li, span) on the page that contain cooking instructions
      const allInstructionElements = $('li, span').filter((_, el) => {
        const text = $(el).text().trim();
        const hasInstructionWords = /\b(steam|melt|add|stir|cook|bake|mix|combine|heat|place|sprinkle|season|drain|remove|return|gradually|continue|crumble|dot|brown|grill)\b/i.test(text);
        const isLongEnough = text.length > 20;
        const isNotIngredient = !text.match(/^\d+\s*(g|kg|ml|l|cup|tsp|tbsp|oz|lb)\s/i);
        const isNotNavigation = !text.match(/^(about|recipes|contact|home|subscribe)/i);
        
        return isLongEnough && hasInstructionWords && isNotIngredient && isNotNavigation;
      });
      
      console.log(`Found ${allInstructionElements.length} potential instruction elements`);
      
      if (allInstructionElements.length > 3) {
        instructions = allInstructionElements.map((_, el) => decodeHtmlEntities($(el).text().trim())).get().filter(Boolean);
        console.log('Using all instruction list items from page');
      }
      
      // Method 2: If still not enough, look for paragraphs with instruction content
      if (instructions.length <= 3) {
        const instructionParagraphs = $('p').filter((_, el) => {
          const text = $(el).text().trim();
          const hasInstructionWords = /\b(steam|melt|add|stir|cook|bake|mix|combine|heat|place|sprinkle|season|drain|remove|return|gradually|continue|crumble|dot|brown|grill)\b/i.test(text);
          const isLongEnough = text.length > 30;
          const startsWithAction = /^(steam|melt|add|stir|cook|bake|mix|combine|heat|place|sprinkle|season|drain|remove|return|gradually|continue|crumble|dot|brown|grill)/i.test(text);
          
          return isLongEnough && (hasInstructionWords || startsWithAction);
        });
        
        console.log(`Found ${instructionParagraphs.length} instruction paragraphs`);
        
        if (instructionParagraphs.length > 0) {
          const paragraphInstructions = instructionParagraphs.map((_, el) => decodeHtmlEntities($(el).text().trim())).get().filter(Boolean);
          instructions = instructions.concat(paragraphInstructions);
          console.log('Added instruction paragraphs');
        }
      }
    }
  }
  
  // Debug: Log what we found so far
  console.log(`Current instructions count: ${instructions.length}`);
  if (instructions.length > 0) {
    console.log('Current instructions:', instructions.slice(0, 8).map((inst, i) => `${i+1}: "${inst.substring(0, 100)}..."`));
  }
  
  // ULTRA AGGRESSIVE: If we still don't have enough instructions, scan EVERYTHING
  if (instructions.length <= 3) {
    console.log('Using ULTRA AGGRESSIVE approach...');
    
    // Get ALL elements that could possibly contain instructions
    const allPossibleInstructions: string[] = [];
    
    // Method 1: Look for ANY text that starts with cooking verbs
    $('p, div, li, span').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20 && 
          /^(preheat|cut|combine|place|coat|bake|add|stir|cook|mix|heat|season|drain|remove|beat|dip|drizzle|flatten)/i.test(text)) {
        allPossibleInstructions.push(decodeHtmlEntities(text));
      }
    });
    
    // Method 2: Look for text with cooking context words
    $('p, div, li, span').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 30 && 
          /\b(oven|temperature|°C|°F|minutes|dish|pan|tray|oil|flour|egg|breadcrumbs)\b/i.test(text) &&
          /\b(preheat|cut|combine|place|coat|bake|add|stir|cook|mix|heat|season|drain|remove|beat|dip|drizzle|flatten|lightly|until|then|with)\b/i.test(text)) {
        allPossibleInstructions.push(decodeHtmlEntities(text));
      }
    });
    
    // Method 3: Look in the raw text for numbered instructions
    const bodyText = $('body').text();
    const numberedMatches = bodyText.match(/(?:^|\n)\s*(?:\d+\.?\s+)?([^.\n]{30,200}(?:preheat|cut|combine|place|coat|bake|add|stir|cook|mix|heat|season|drain|remove|beat|dip|drizzle|flatten|lightly|until|then|with|oven|temperature|°C|°F|minutes|dish|pan|tray|oil|flour|egg|breadcrumbs)[^.\n]{0,200})[.\n]/gim);
    
    if (numberedMatches) {
      numberedMatches.forEach(match => {
        const cleanMatch = match.replace(/^\s*\d+\.?\s*/, '').trim();
        if (cleanMatch.length > 20) {
          allPossibleInstructions.push(decodeHtmlEntities(cleanMatch));
        }
      });
    }
    
    console.log(`Found ${allPossibleInstructions.length} potential instructions from ultra-aggressive search`);
    
    if (allPossibleInstructions.length > instructions.length) {
      // Remove duplicates and sort by likely instruction order
      const uniqueInstructions = [...new Set(allPossibleInstructions)]
        .filter(inst => inst.length > 15 && inst.length < 500)
        .sort((a, b) => {
          // Prioritize instructions that start with action verbs
          const aStartsWithVerb = /^(preheat|cut|combine|place|coat|bake)/i.test(a);
          const bStartsWithVerb = /^(preheat|cut|combine|place|coat|bake)/i.test(b);
          if (aStartsWithVerb && !bStartsWithVerb) return -1;
          if (!aStartsWithVerb && bStartsWithVerb) return 1;
          return 0;
        });
      
      if (uniqueInstructions.length > 0) {
        instructions = uniqueInstructions.slice(0, 10); // Limit to 10 max
        console.log('Using ultra-aggressive instruction extraction');
      }
    }
  }
  
  // Last resort: look for any numbered or bulleted content
  if (instructions.length === 0) {
    const allText = $('body').text();
    const numberedSteps = allText.match(/\d+\.?\s+[A-Z][^.!?]*[.!?]/g);
    if (numberedSteps && numberedSteps.length > 2) {
      instructions = numberedSteps.map(step => decodeHtmlEntities(step.trim()));
      console.log(`Found ${instructions.length} numbered steps via regex`);
    }
  }

  // Final cleanup - Remove fragmented instructions
  console.log(`Before cleanup - instructions count: ${instructions.length}`);
  if (instructions.length > 0) {
    console.log('Before cleanup preview:', instructions.slice(0, 7).map((inst, i) => `${i+1}: ${inst.substring(0, 50)}...`));
  }
  
  // Filter out fragmented or incomplete instructions
  instructions = instructions.filter(instruction => {
    const text = instruction.trim();
    
    // Remove very short fragments
    if (text.length < 10) {
      console.log(`Removing short fragment: "${text}"`);
      return false;
    }
    
    // Remove fragments that are just numbers/times without context
    if (/^\d+\s*(minutes?|hours?|seconds?)?\s*$/.test(text)) {
      console.log(`Removing time fragment: "${text}"`);
      return false;
    }
    
    // Remove fragments that are just temperature units or partial temperatures
    if (/^°?[CF]\)?\s*(or|and)?\s*(the|juices?|until)?$/i.test(text)) {
      console.log(`Removing temperature fragment: "${text}"`);
      return false;
    }
    
    // Remove fragments that start with units or incomplete phrases
    if (/^(°F|°C|\)|\s*or\s+the|and\s+the|until\s+the)/i.test(text)) {
      console.log(`Removing incomplete fragment: "${text}"`);
      return false;
    }
    
    // Remove standalone numbers at the beginning
    if (/^\d+\s*$/.test(text)) {
      console.log(`Removing standalone number: "${text}"`);
      return false;
    }
    
    // Keep instructions that have actual cooking verbs, reasonable length, or cooking context
    const hasActionVerbs = /\b(place|cut|add|stir|cook|bake|mix|combine|heat|sprinkle|season|drain|remove|return|gradually|continue|crumble|dot|brown|grill|preheat|roast|marinate|garnish|allow|beat|coat|dip|drizzle|flatten|lightly)\b/i.test(text);
    const hasReasonableLength = text.length > 15;
    const hasCookingContext = /\b(oven|temperature|°C|°F|minutes|hours|dish|pan|tray|oil|flour|egg|breadcrumbs|lemon|thyme|oregano|paprika|chilli|cling film|mallet|rolling pin)\b/i.test(text);
    const hasTemperatureOrTime = /\d+\s*°[CF]|\d+\s*(minutes?|hours?|seconds?)/i.test(text);
    
    // Keep if it has reasonable length AND (action verbs OR cooking context OR temperature/time)
    if (!hasReasonableLength) {
      console.log(`Removing too short: "${text}"`);
      return false;
    }
    
    if (!hasActionVerbs && !hasCookingContext && !hasTemperatureOrTime) {
      console.log(`Removing non-cooking instruction: "${text.substring(0, 50)}..."`);
      return false;
    }
    
    return true;
  });
  
  console.log(`After cleanup - instructions count: ${instructions.length}`);
  if (instructions.length > 0) {
    console.log('After cleanup preview:', instructions.slice(0, 5).map((inst, i) => `${i+1}: ${inst.substring(0, 50)}...`));
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
          // Clean up the text and preserve complete instructions
          const cleanText = text.trim();
          
          // Only split if we have clear paragraph breaks, not just any line break
          const subSteps = cleanText.split(/\n\s*\n/).filter(step => {
            const trimmedStep = step.trim();
            return trimmedStep.length > 15 && 
                   /\b(steam|melt|add|stir|cook|bake|mix|combine|heat|place|sprinkle|season|drain|remove|return|gradually|continue|crumble|dot|brown|grill|preheat|roast|marinate|garnish|cut|allow)\b/i.test(trimmedStep);
          });
          
          if (subSteps.length > 1) {
            // Multiple clear instruction steps found
            subSteps.forEach(subStep => {
              extractedInstructions.push(decodeHtmlEntities(subStep.trim()));
            });
          } else {
            // Single step - keep it intact
            extractedInstructions.push(decodeHtmlEntities(cleanText));
          }
        }
      }
    }
    
    return extractedInstructions.filter(Boolean);
  }
  
  if (typeof instructions === 'string') {
    // Handle multi-line instructions by splitting on clear paragraph breaks only
    const cleanInstructions = instructions.trim();
    const steps = cleanInstructions.split(/\n\s*\n/).filter(step => {
      const trimmedStep = step.trim();
      return trimmedStep.length > 15 && 
             /\b(steam|melt|add|stir|cook|bake|mix|combine|heat|place|sprinkle|season|drain|remove|return|gradually|continue|crumble|dot|brown|grill|preheat|roast|marinate|garnish|cut|allow)\b/i.test(trimmedStep);
    });
    
    if (steps.length > 1) {
      return steps.map(step => decodeHtmlEntities(step.trim()));
    }
    return [decodeHtmlEntities(cleanInstructions)];
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
