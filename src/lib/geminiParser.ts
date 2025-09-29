import { GoogleGenerativeAI } from '@google/generative-ai';
import { Recipe } from './recipe-parser';

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
console.log('🔑 Gemini API Key status:', apiKey ? 'Found' : 'Missing');

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not found in environment variables');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

export async function parseRecipeWithGemini(content: string, sourceUrl: string): Promise<Recipe | null> {
  try {
    console.log('🤖 Using Gemini AI to parse recipe...');
    
    if (!apiKey) {
      console.error('❌ Cannot use Gemini: API key is missing');
      return null;
    }
    
    // Use the correct gemini model from the official docs
    console.log('🔄 Using gemini-2.5-flash model');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
You are a professional recipe parser. Extract recipe information from web content and return ONLY a valid JSON object.

CRITICAL RULES:
1. Combine ingredient fragments into complete entries (e.g., "2 cups flour" not separate "2" and "cups flour")
2. Combine instruction fragments into complete cooking steps (e.g., "Preheat oven to 350°F and grease a baking pan" as ONE step)
3. IGNORE all promotional text, ads, navigation menus, social media buttons, unrelated content
4. ONLY extract actual recipe content
5. Keep ingredients with their measurements together
6. Keep instruction steps as complete sentences - NEVER break them into individual words or phrases
7. ALWAYS PROVIDE ALL FIELDS - Never leave any field empty or null
8. Handle both structured recipe data and free-form text content
9. FORMAT INGREDIENTS PROFESSIONALLY: Capitalize first letter of each ingredient, proper spacing around measurements
10. INSTRUCTIONS MUST BE COMPLETE SENTENCES: Each instruction should be a full, actionable step that makes sense on its own

MANDATORY REQUIREMENTS:
- ALWAYS estimate prepTime, cookTime, totalTime, servings, calories, protein, carbs, fat, difficulty
- If exact values aren't provided, make intelligent estimates based on ingredients and cooking methods
- NEVER return null, undefined, or empty strings for any field
- Be consistent with estimates - similar recipes should have similar values

JSON Structure:
{
  "title": "Recipe name (clean, no emojis)",
  "ingredients": ["complete ingredient with measurement", "another complete ingredient", ...],
  "instructions": ["complete cooking step 1", "complete cooking step 2", ...],
  "prepTime": "estimated prep time in minutes (e.g., '10 minutes')",
  "cookTime": "estimated cook time in minutes (e.g., '15 minutes')",
  "totalTime": "total time combining prep + cook (e.g., '25 minutes')",
  "servings": "estimated servings (e.g., '4')",
  "description": "Brief recipe description",
  "calories": "estimated calories per serving (e.g., '450')",
  "protein": "estimated protein per serving in grams (e.g., '25g')",
  "carbs": "estimated carbs per serving in grams (e.g., '35g')",
  "fat": "estimated fat per serving in grams (e.g., '18g')",
  "difficulty": "difficulty level: Easy, Medium, or Hard"
}

ESTIMATION GUIDELINES (ALWAYS PROVIDE THESE):
- Prep Time: Estimate based on chopping, mixing, marinating (5-30 minutes typical)
- Cook Time: Based on cooking methods - baking (20-60min), frying (5-15min), boiling (10-30min)
- Total Time: Always prepTime + cookTime + 5-10 minutes buffer
- Servings: Estimate based on ingredient quantities (2-8 servings typical)
- Calories: Calculate from main ingredients (chicken ~200cal/100g, bread ~250cal/100g, oil ~900cal/100g)
- Protein: Estimate from meat (25-30g/100g), dairy (3-8g/100g), legumes (8-15g/100g)
- Carbs: Estimate from bread/pasta (45-50g/100g), rice (25g/100g), vegetables (5-15g/100g)
- Fat: Estimate from oils (100g/100g), cheese (20-30g/100g), nuts (50-70g/100g), meat (5-20g/100g)
- Difficulty: Easy (basic cooking), Medium (some techniques), Hard (advanced skills required)

DEFAULT VALUES IF UNCERTAIN:
- prepTime: "15 minutes"
- cookTime: "25 minutes" 
- totalTime: "40 minutes"
- servings: "4"
- calories: "350"
- protein: "20g"
- carbs: "25g"
- fat: "15g"
- difficulty: "Medium"

EXAMPLE - WRONG WAY (FRAGMENTED):
"ingredients": ["2", "cups", "flour", "1", "tsp", "salt"]
"instructions": ["Preheat", "oven", "to", "350°F", "Mix", "ingredients", "In", "a", "bowl", "combine", "chicken", "breast"]

EXAMPLE - CORRECT WAY (COMPLETE SENTENCES):
"ingredients": ["2 cups all-purpose flour", "1 tsp salt", "1/2 cup butter, softened", "225g Greek-style yogurt", "2 teaspoons paprika", "4 chicken breasts, skinned and boned", "Coriander, to garnish (optional)"]
"instructions": ["Preheat oven to 350°F and grease a 9-inch baking pan.", "Mix flour and salt in a large bowl, then cut in butter until mixture resembles coarse crumbs.", "In a separate bowl, combine chicken breast with yogurt and spices, mixing until fully coated."]

FORMATTING RULES:
- Capitalize first letter of each ingredient
- Use proper spacing: "2 teaspoons paprika" not "2teaspoonpaprika"
- Use consistent units: "teaspoons" not "teaspoon" for plural
- Add commas for clarity: "4 chicken breasts, skinned and boned"
- Capitalize proper nouns: "Greek-style yogurt", "Coriander"

INSTRUCTION PARSING RULES:
- If you see fragmented text like "1. Prepare the popcorn chicken: In a bowl 2. combine the chicken breast 3. black pepper", combine them into: "1. Prepare the popcorn chicken: In a bowl, combine the chicken breast and black pepper."
- NEVER create separate instruction steps for individual words or short phrases
- ALWAYS combine related cooking actions into logical, complete steps
- Each instruction should be a full sentence that makes sense on its own

Content to parse:
${content}

Return ONLY the JSON object, no markdown, no extra text:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    console.log('🤖 Gemini response:', text.substring(0, 200) + '...');
    
    // Try to parse JSON response
    try {
      // Remove any markdown formatting if present
      let cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
      
      // Fix common JSON issues and remove garbage - be more surgical
      cleanJson = cleanJson
        .replace(/Coh\],/g, '],') // Fix the specific error we saw
        .replace(/ventilador-de-techo-con-luz-y-mando-a-distancia-marrn-40w-dc-silencioso-efecto-madera-claraboya-con-3-colores-de-luz-natural-clido-fro-y-6-velocidades-para-dormitorio-salon-comedor-cocina-infantil-ninos/g, '') // Remove garbage text
        .replace(/focused\s*,?/g, '') // Remove "focused" text
        .replace(/部份\s*,?/g, '') // Remove Chinese characters
        .replace(/bottlenecks, or points of friction in the user journey\.\*/g, '') // Remove random text
        .replace(/\*   \*\*Visual Design:\*\* Ensure the chatbot's interface is clean.*$/g, '') // Remove long random text
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double quotes
        .replace(/,\s*,/g, ',') // Remove double commas
        .replace(/"\s*,\s*"/g, '", "') // Fix spacing around commas in arrays
        .replace(/\n\s*\n/g, ' ') // Remove extra newlines
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      console.log('🧹 Cleaned JSON preview:', cleanJson.substring(0, 300) + '...');
      
      const recipe = JSON.parse(cleanJson);
      
      // Validate and restructure the parsed recipe
      if (recipe && typeof recipe === 'object' && recipe.title) {
        // Restructure nutrition data to match Recipe interface
        const structuredRecipe: Recipe = {
          title: recipe.title,
          description: recipe.description || '',
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
          prepTime: recipe.prepTime || '',
          cookTime: recipe.cookTime || '',
          totalTime: recipe.totalTime || '',
          servings: recipe.servings || '',
           difficulty: recipe.difficulty || '',
           image: 'instagram-video', // Instagram recipes show video preview
           instagramUrl: '', // Will be set by the calling function
          nutrition: {
            calories: recipe.calories || '',
            protein: recipe.protein || '',
            carbs: recipe.carbs || '',
            fat: recipe.fat || ''
          }
        };
        
        console.log('✅ Gemini successfully parsed recipe:', structuredRecipe.title);
        console.log('📊 Estimated nutrition:', structuredRecipe.nutrition);
        console.log('⏱️ Estimated times:', `prep: ${structuredRecipe.prepTime}, cook: ${structuredRecipe.cookTime}, total: ${structuredRecipe.totalTime}`);
        console.log('🎯 Difficulty:', structuredRecipe.difficulty);
        
        return structuredRecipe;
      } else {
        console.log('❌ Gemini returned invalid recipe structure');
        return null;
      }
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini JSON response:', parseError);
      console.log('Raw response:', text);
      
      // Try to extract data manually as fallback - try to parse arrays too
      try {
        console.log('🔧 Attempting manual extraction with array parsing...');
        
        // Extract basic info
        const titleMatch = text.match(/"title":\s*"([^"]+)"/);
        const prepTimeMatch = text.match(/"prepTime":\s*"([^"]+)"/);
        const cookTimeMatch = text.match(/"cookTime":\s*"([^"]+)"/);
        const totalTimeMatch = text.match(/"totalTime":\s*"([^"]+)"/);
        const servingsMatch = text.match(/"servings":\s*"([^"]+)"/);
        const difficultyMatch = text.match(/"difficulty":\s*"([^"]+)"/);
        const caloriesMatch = text.match(/"calories":\s*"([^"]+)"/);
        const proteinMatch = text.match(/"protein":\s*"([^"]+)"/);
        const carbsMatch = text.match(/"carbs":\s*"([^"]+)"/);
        const fatMatch = text.match(/"fat":\s*"([^"]+)"/);
        
        // Try to extract ingredients array
        let ingredients: string[] = [];
        const ingredientsMatch = text.match(/"ingredients":\s*\[([\s\S]*?)\]/);
        if (ingredientsMatch) {
          const ingredientsText = ingredientsMatch[1];
          // Split by quotes and clean up
          const ingredientMatches = ingredientsText.match(/"([^"]+)"/g);
          if (ingredientMatches) {
            ingredients = ingredientMatches.map(match => match.replace(/"/g, '').trim()).filter(Boolean);
          }
        }
        
        // Try to extract instructions array
        let instructions: string[] = [];
        const instructionsMatch = text.match(/"instructions":\s*\[([\s\S]*?)\]/);
        if (instructionsMatch) {
          const instructionsText = instructionsMatch[1];
          // Split by quotes and clean up
          const instructionMatches = instructionsText.match(/"([^"]+)"/g);
          if (instructionMatches) {
            instructions = instructionMatches.map(match => match.replace(/"/g, '').trim()).filter(Boolean);
          }
        }
        
        if (titleMatch) {
          const fallbackRecipe: Recipe = {
            title: titleMatch[1],
            description: '',
            ingredients: ingredients,
            instructions: instructions,
            prepTime: prepTimeMatch ? prepTimeMatch[1] : '',
            cookTime: cookTimeMatch ? cookTimeMatch[1] : '',
            totalTime: totalTimeMatch ? totalTimeMatch[1] : '',
            servings: servingsMatch ? servingsMatch[1] : '',
            difficulty: difficultyMatch ? difficultyMatch[1] : '',
            image: 'instagram-video',
            instagramUrl: '',
            nutrition: {
              calories: caloriesMatch ? caloriesMatch[1] : '',
              protein: proteinMatch ? proteinMatch[1] : '',
              carbs: carbsMatch ? carbsMatch[1] : '',
              fat: fatMatch ? fatMatch[1] : ''
            }
          };
          console.log(`✅ Manual extraction successful: ${fallbackRecipe.title} (${ingredients.length} ingredients, ${instructions.length} instructions)`);
          return fallbackRecipe;
        }
      } catch (manualError) {
        console.log('❌ Manual extraction also failed');
      }
      
      return null;
    }
    
  } catch (error) {
    console.error('❌ Gemini AI error:', error);
    return null;
  }
}

export async function enhanceRecipeWithGemini(partialRecipe: Partial<Recipe>, originalContent: string): Promise<Recipe | null> {
  try {
    console.log('🔧 Using Gemini AI to enhance partial recipe...');
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
You are enhancing an incomplete recipe. Here's what was already parsed:

Current Recipe:
${JSON.stringify(partialRecipe, null, 2)}

Original Content:
${originalContent}

Please return a COMPLETE recipe JSON with this structure:
{
  "title": "Improved title",
  "ingredients": ["complete ingredient list"],
  "instructions": ["complete, clear cooking steps"],
  "prepTime": "estimated prep time",
  "cookTime": "estimated cook time", 
  "totalTime": "total time",
  "servings": "estimated servings",
  "description": "brief description"
}

Rules:
1. Fix fragmented instructions by combining related steps
2. Estimate missing times based on cooking methods
3. Improve ingredient descriptions with proper measurements
4. Remove any promotional or non-cooking text
5. Make instructions actionable and clear

Return ONLY the JSON object:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    try {
      const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
      const enhancedRecipe = JSON.parse(cleanJson);
      
      if (enhancedRecipe && typeof enhancedRecipe === 'object' && enhancedRecipe.title) {
        console.log('✅ Gemini enhanced recipe successfully');
        return enhancedRecipe as Recipe;
      }
    } catch (parseError) {
      console.error('❌ Failed to parse enhanced recipe:', parseError);
    }
    
    return null;
  } catch (error) {
    console.error('❌ Gemini enhancement error:', error);
    return null;
  }
}
