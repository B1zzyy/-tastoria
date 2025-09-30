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
    
    // STEP 1: Extract only what's actually in the content
    console.log('📝 Step 1: Extracting actual content from caption...');
    const extractionPrompt = `
You are a strict recipe content extractor. Your job is to copy EXACTLY what is written in the content below.

ABSOLUTE RULES - NO EXCEPTIONS:
1. Copy ingredients EXACTLY as written - do NOT change measurements, quantities, or descriptions
2. Copy nutrition info EXACTLY as written - do NOT convert or estimate
3. Copy any instructions EXACTLY as written - do NOT paraphrase or summarize
4. Copy time information EXACTLY as written - do NOT estimate
5. If something is not explicitly written, leave that field empty
6. Do NOT add, remove, or modify any text from the original content

EXAMPLES:
- If caption says "40oz Lean Ground Beef (96/4)" → extract exactly "40oz Lean Ground Beef (96/4)"
- If caption says "12 Eggs (720g)" → extract exactly "12 Eggs (720g)" 
- If caption says "450 Calories" → extract exactly "450"
- If caption says "65g Protein" → extract exactly "65g"
- Do NOT convert "40oz" to "1 lb" or "12 Eggs" to "8 large eggs"

JSON Structure (copy exactly what's written):
{
  "title": "Recipe name (clean, no emojis)",
  "ingredients": ["copy each ingredient exactly as written"],
  "instructions": ["copy each instruction exactly as written"],
  "prepTime": "copy prep time exactly as written",
  "cookTime": "copy cook time exactly as written", 
  "totalTime": "copy total time exactly as written",
  "servings": "copy servings exactly as written",
  "description": "copy description exactly as written",
  "calories": "copy calories exactly as written",
  "protein": "copy protein exactly as written",
  "carbs": "copy carbs exactly as written",
  "fat": "copy fat exactly as written",
  "difficulty": "copy difficulty exactly as written"
}

Content to extract from:
${content}

Return ONLY the JSON object copying exactly what's written:`;

    const extractionResult = await model.generateContent(extractionPrompt);
    const extractionResponse = await extractionResult.response;
    const extractionText = extractionResponse.text().trim();
    
    console.log('📝 Step 1 response:', extractionText.substring(0, 200) + '...');
    
    // Parse the extraction result
    let extractedData: Record<string, unknown> = {};
    try {
      const cleanExtractionJson = extractionText.replace(/```json\n?|\n?```/g, '').trim();
      extractedData = JSON.parse(cleanExtractionJson);
      console.log('✅ Step 1: Successfully extracted actual content');
    } catch (parseError) {
      console.error('❌ Step 1: Failed to parse extraction result:', parseError);
      return null;
    }
    
    // STEP 2: Fill in missing information with intelligent estimates
    console.log('🧠 Step 2: Filling in missing information...');
    const estimationPrompt = `
You are a recipe completion expert. Take the extracted recipe data and fill in ONLY the missing fields with intelligent estimates.

EXTRACTED DATA:
${JSON.stringify(extractedData, null, 2)}

CRITICAL RULES:
1. DO NOT change any extracted data - keep it exactly as extracted
2. ONLY fill in fields that are missing, null, undefined, or empty strings
3. If a field already has data, leave it unchanged
4. Do NOT modify ingredients or nutrition values that were extracted

SPECIAL INSTRUCTION HANDLING:
- If instructions are missing or empty → generate proper cooking steps based on ingredients and title
- If instructions contain only "notes", "tips", or "additional info" → replace with proper cooking steps
- If instructions are incomplete (less than 3 steps) → generate complete cooking instructions
- If instructions are proper cooking steps → keep them as extracted

FILL ONLY MISSING FIELDS:
- If prepTime is missing → estimate based on ingredients and cooking methods
- If cookTime is missing → estimate based on cooking methods
- If totalTime is missing → calculate from prepTime + cookTime + buffer
- If servings is missing → estimate based on ingredient quantities
- If difficulty is missing → estimate based on cooking techniques required

COOKING INSTRUCTION GENERATION:
When generating instructions, create 4-8 logical cooking steps that would make sense for this dish:
1. Use common cooking techniques appropriate for the ingredients
2. Follow logical order: prep → cook → finish
3. Include proper temperatures and times where appropriate
4. Make instructions clear and actionable
5. Consider the dish type (burritos, pasta, salad, baked, fried, etc.)
6. Use professional cooking terminology

ESTIMATION GUIDELINES:
- Prep Time: Based on chopping, mixing, marinating (5-30 minutes typical)
- Cook Time: Based on cooking methods - baking (20-60min), frying (5-15min), boiling (10-30min)
- Total Time: prepTime + cookTime + 5-10 minutes buffer
- Servings: Based on ingredient quantities (2-8 servings typical)
- Difficulty: Easy (basic cooking), Medium (some techniques), Hard (advanced skills required)

TIME FORMATTING RULES:
- If extracted time already includes "minutes", "hours", or "hrs" → keep it exactly as extracted
- If extracted time is just a number → add appropriate unit (e.g., "20" → "20 min")
- For estimates, use format: "X min" or "X hr Y min" (never duplicate units)
- Always use short forms: "min" instead of "minutes", "hr" instead of "hour/hours"

DEFAULT VALUES FOR MISSING FIELDS:
- prepTime: "15 min"
- cookTime: "25 min" 
- totalTime: "40 min"
- servings: "4"
- difficulty: "Medium"

Return ONLY the complete JSON object with missing fields filled:`;

    const estimationResult = await model.generateContent(estimationPrompt);
    const estimationResponse = await estimationResult.response;
    const estimationText = estimationResponse.text().trim();
    
    console.log('🧠 Step 2 response:', estimationText.substring(0, 200) + '...');
    
    // Parse the final result
    let finalRecipe: Record<string, unknown> = {};
    try {
      const cleanEstimationJson = estimationText.replace(/```json\n?|\n?```/g, '').trim();
      finalRecipe = JSON.parse(cleanEstimationJson);
      console.log('✅ Step 2: Successfully filled missing information');
    } catch (parseError) {
      console.error('❌ Step 2: Failed to parse estimation result:', parseError);
      return null;
    }

    // Check if instructions were generated (not extracted from source)
    const originalInstructions = Array.isArray(extractedData.instructions) ? extractedData.instructions as string[] : [];
    const finalInstructions = Array.isArray(finalRecipe.instructions) ? finalRecipe.instructions as string[] : [];
    
    // More precise logic: check if we had proper instructions originally OR if they were replaced
    let instructionsWereGenerated = false;
    
    if (originalInstructions.length === 0) {
      // No instructions found at all
      instructionsWereGenerated = true;
    } else if (originalInstructions.length === 1) {
      // Only one instruction - check if it's just a note/tip
      const singleInstruction = originalInstructions[0].toLowerCase();
      if (singleInstruction.includes('note') || 
          singleInstruction.includes('tip') || 
          singleInstruction.includes('additional') ||
          singleInstruction.length < 20) { // Very short instructions are likely just notes
        instructionsWereGenerated = true;
      }
    } else if (originalInstructions.length < 3) {
      // Less than 3 instructions - check if they're all just notes/tips
      const allNotesOrTips = originalInstructions.every(inst => {
        const lowerInst = inst.toLowerCase();
        return lowerInst.includes('note') || 
               lowerInst.includes('tip') || 
               lowerInst.includes('additional') ||
               inst.length < 20;
      });
      instructionsWereGenerated = allNotesOrTips;
    }
    
    // Additional check: if final instructions are significantly different from original, they were likely generated
    if (!instructionsWereGenerated && originalInstructions.length > 0 && finalInstructions.length > 0) {
      // Check if the instructions were completely replaced (different content)
      const originalText = originalInstructions.join(' ').toLowerCase();
      const finalText = finalInstructions.join(' ').toLowerCase();
      
      // If the final instructions are much longer and don't contain the original text, they were generated
      if (finalText.length > originalText.length * 2 && !finalText.includes(originalText.substring(0, 50))) {
        instructionsWereGenerated = true;
        console.log('🔄 Instructions were replaced with generated ones');
      }
    }
    
    console.log('🔍 Instruction generation check:', {
      originalCount: originalInstructions.length,
      finalCount: finalInstructions.length,
      originalInstructions: originalInstructions.slice(0, 2), // Show first 2 for debugging
      finalInstructions: finalInstructions.slice(0, 2), // Show first 2 for debugging
      instructionsWereGenerated,
      originalText: originalInstructions.join(' ').substring(0, 100),
      finalText: finalInstructions.join(' ').substring(0, 100)
    });

    // Helper function to clean up duplicate time units and convert to shorter forms
    const cleanTimeUnit = (timeStr: string): string => {
      if (!timeStr) return timeStr;
      
      // Remove duplicate "minutes" (e.g., "20 minutes minutes" → "20 minutes")
      timeStr = timeStr.replace(/\bminutes\s+minutes\b/gi, 'minutes');
      timeStr = timeStr.replace(/\bmin\s+minutes\b/gi, 'minutes');
      timeStr = timeStr.replace(/\bminutes\s+min\b/gi, 'minutes');
      
      // Remove duplicate "hours" (e.g., "1 hour hour" → "1 hour")
      timeStr = timeStr.replace(/\bhour\s+hour\b/gi, 'hour');
      timeStr = timeStr.replace(/\bhours\s+hours\b/gi, 'hours');
      timeStr = timeStr.replace(/\bhr\s+hour\b/gi, 'hour');
      timeStr = timeStr.replace(/\bhour\s+hr\b/gi, 'hour');
      
      // Convert to shorter forms
      timeStr = timeStr.replace(/\bminutes\b/gi, 'min');
      timeStr = timeStr.replace(/\bhour\b/gi, 'hr');
      timeStr = timeStr.replace(/\bhours\b/gi, 'hr');
      
      return timeStr.trim();
    };

    // Convert to our Recipe format
    const recipe: Recipe = {
      title: (finalRecipe.title as string) || 'Untitled Recipe',
      description: (finalRecipe.description as string) || '',
      ingredients: Array.isArray(finalRecipe.ingredients) ? finalRecipe.ingredients as string[] : [],
      instructions: finalInstructions,
      prepTime: cleanTimeUnit((finalRecipe.prepTime as string) || ''),
      cookTime: cleanTimeUnit((finalRecipe.cookTime as string) || ''),
      totalTime: cleanTimeUnit((finalRecipe.totalTime as string) || ''),
      servings: (finalRecipe.servings as string) || '',
      difficulty: (finalRecipe.difficulty as string) || '',
      image: sourceUrl.includes('instagram.com') ? 'instagram-video' : '',
      instagramUrl: sourceUrl.includes('instagram.com') ? sourceUrl : '',
      nutrition: {
        calories: (finalRecipe.calories as string) || '',
        protein: (finalRecipe.protein as string) || '',
        carbs: (finalRecipe.carbs as string) || '',
        fat: (finalRecipe.fat as string) || ''
      },
      // Add metadata about AI generation
      metadata: {
        instructionsGenerated: instructionsWereGenerated
      }
    };
    
    console.log(`✅ Two-step parsing successful: ${recipe.title}`);
    console.log(`📊 Extracted: ${recipe.ingredients.length} ingredients, ${recipe.instructions.length} instructions`);
    console.log(`⏱️ Times: prep: ${recipe.prepTime}, cook: ${recipe.cookTime}, total: ${recipe.totalTime}`);
    console.log(`🎯 Difficulty: ${recipe.difficulty}`);
    
    return recipe;
    
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
