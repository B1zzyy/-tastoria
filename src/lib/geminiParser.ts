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
You are a professional recipe parser. Extract recipe information from Instagram content and return ONLY a valid JSON object.

CRITICAL RULES:
1. Combine ingredient fragments into complete entries (e.g., "4 flatbreads" not separate "4" and "flatbreads")
2. Combine instruction fragments into complete cooking steps (e.g., "Mix the sweet chilli sauce, ketchup, and sriracha together in a bowl" as ONE step)
3. IGNORE all promotional text, ads, hashtags, mentions, unrelated product descriptions
4. ONLY extract actual recipe content
5. Keep ingredients with their measurements together
6. Keep instruction steps as complete sentences
7. INTELLIGENTLY ESTIMATE missing details based on ingredients and cooking methods

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

ESTIMATION GUIDELINES:
- Prep Time: Consider chopping, mixing, marinating time
- Cook Time: Based on cooking methods (baking, frying, boiling, etc.)
- Calories: Rough estimate based on ingredients (chicken ~200cal/100g, bread ~250cal/100g, etc.)
- Protein: Estimate from meat, dairy, legumes
- Carbs: Estimate from bread, pasta, rice, vegetables
- Fat: Estimate from oils, cheese, nuts, meat fat
- Difficulty: Easy (no complex techniques), Medium (some skill needed), Hard (advanced techniques)

EXAMPLE - WRONG WAY:
"ingredients": ["4", "flatbreads", "500g", "cooked chicken", "shredded or chopped"]
"instructions": ["Mix", "the sweet chilli sauce", "ketchup"]

EXAMPLE - CORRECT WAY:
"ingredients": ["4 flatbreads", "500g cooked chicken (shredded or chopped)", "4 tbsp sweet chilli sauce"]
"instructions": ["Mix the sweet chilli sauce, ketchup, and sriracha together in a bowl. Stir through the cooked chicken.", "Warm the flatbreads slightly, then spread with Philadelphia."]

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
      
      // Fix common JSON issues and remove garbage
      cleanJson = cleanJson
        .replace(/Coh\],/g, '],') // Fix the specific error we saw
        .replace(/ventilador-de-techo-con-luz-y-mando-a-distancia-marrn-40w-dc-silencioso-efecto-madera-claraboya-con-3-colores-de-luz-natural-clido-fro-y-6-velocidades-para-dormitorio-salon-comedor-cocina-infantil-ninos/g, '') // Remove garbage text
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double quotes
        .replace(/,\s*,/g, ',') // Remove double commas
        .replace(/"\s*,\s*"/g, '", "') // Fix spacing around commas in arrays
        .replace(/\n\s*\n/g, ' '); // Remove extra newlines
      
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
      
      // Try to extract data manually as fallback
      try {
        console.log('🔧 Attempting manual extraction...');
        const titleMatch = text.match(/"title":\s*"([^"]+)"/);
        const ingredientsMatch = text.match(/"ingredients":\s*\[([\s\S]*?)\]/);
        const instructionsMatch = text.match(/"instructions":\s*\[([\s\S]*?)\]/);
        
        if (titleMatch && ingredientsMatch && instructionsMatch) {
          const fallbackRecipe: Recipe = {
            title: titleMatch[1],
            description: '',
            ingredients: ingredientsMatch[1].split(',').map(i => i.replace(/"/g, '').trim()).filter(i => i),
            instructions: instructionsMatch[1].split(',').map(i => i.replace(/"/g, '').trim()).filter(i => i),
            prepTime: '',
            cookTime: '',
            totalTime: '',
            servings: '',
             difficulty: '',
             image: 'instagram-video',
             instagramUrl: '',
            nutrition: {
              calories: '',
              protein: '',
              carbs: '',
              fat: ''
            }
          };
          console.log('✅ Manual extraction successful:', fallbackRecipe.title);
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
