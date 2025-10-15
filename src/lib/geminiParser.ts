import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface IngredientSection {
  title?: string;
  ingredients: string[];
}

export interface Recipe {
  title: string;
  ingredients: string[] | IngredientSection[];
  instructions: string[];
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: string;
  difficulty?: string;
  nutrition?: {
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
    fiber?: string;
    sugar?: string;
  };
  image?: string;
  instagramUrl?: string; // For Instagram video popup
  metadata?: {
    instructionsGenerated: boolean;
    aiInstructions?: string[]; // Store AI-generated instructions separately
  };
}

export async function parseRecipeWithGemini(content: string): Promise<Recipe> {
  console.log('🚀 Parsing recipe with single optimized call...');
  
  const combinedPrompt = `You are a recipe extraction and enhancement expert. Extract information from this content and fill in missing fields intelligently.

EXTRACTION RULES:
1. Copy text EXACTLY as written (e.g., "40oz Lean Ground Beef (96/4)" not "40 oz lean ground beef")
2. If information is explicitly mentioned, use it exactly as written
3. If information is missing, provide reasonable estimates
4. Do NOT change ingredient names or descriptions that are provided
5. PRESERVE THE ORIGINAL LANGUAGE - if the content is in Bulgarian, Spanish, French, etc., keep it in that language
6. Do NOT translate recipe content to English unless explicitly requested

INGREDIENT SECTIONS:
- ONLY use sections if there are clearly distinct ingredient groups (e.g., "For the sauce:", "For the main dish:", "For the marinade:")
- If there are fewer than 10 total ingredients, use a simple array instead of sections
- If ingredients are mixed together without clear grouping, use a simple array
- Use the exact section titles as written (e.g., "For the sauce", "For the main dish")
- Section format: {"title": "Section Name", "ingredients": ["ingredient1", "ingredient2"]}
- DO NOT include nutrition/macro information in ingredients - put that in the nutrition section instead

Content to parse:
${content}

ENHANCEMENT RULES:
- For missing instructions: Generate complete, clear cooking steps without numbers (e.g., 'Heat oil in pan' not '1. Heat oil in pan')
- For existing instructions: Copy them EXACTLY as written - preserve all measurements, times, and details
- For missing times: Use realistic estimates based on recipe complexity
- For missing nutrition: Provide reasonable estimates based on ingredients
- For missing servings: Estimate based on ingredient quantities

CRITICAL INSTRUCTION RULE:
- If the content already contains cooking instructions, extract them EXACTLY as written - do NOT shorten, simplify, or modify them
- Preserve all details, measurements, times, and specific instructions from the original content
- Do NOT generate new instructions if cooking steps already exist in the content
- Only generate instructions if the content has NO cooking steps at all
- Copy instructions word-for-word from the original content, including all measurements and timing details

NUTRITION PARSING RULES:
- If you see macro/nutrition information (calories, protein, carbs, fat, etc.), extract it to the nutrition section
- Look for patterns like "553 калории | 46г протеин | 48г въглехидрати | 19г мазнини"
- Convert to nutrition format: calories, protein, carbs, fat
- Do NOT put nutrition info in ingredients - it belongs in the nutrition section

TIME FORMATTING RULES:
- If time already includes "minutes", "hours", or "hrs" → keep it exactly as written
- If time is just a number → add appropriate unit (e.g., "20" → "20 min")
- Use short forms: "min" instead of "minutes", "hr" instead of "hour/hours"
- Never duplicate units (e.g., "20 min min" is wrong)

DEFAULT VALUES FOR MISSING FIELDS:
- prepTime: "15 min"
- cookTime: "25 min" 
- totalTime: "40 min"
- servings: "4"
- difficulty: "Medium"

Return ONLY a JSON object with these exact fields:
{
  "title": "recipe title (exact if provided, estimated if missing)",
  "ingredients": ["ingredient text as written or estimated"] OR [{"title": "Section Name", "ingredients": ["ingredient1", "ingredient2"]}],
  "instructions": ["complete cooking steps without numbers"],
  "prepTime": "prep time with units",
  "cookTime": "cook time with units", 
  "totalTime": "total time with units",
  "servings": "number of servings",
  "difficulty": "Easy/Medium/Hard",
  "nutrition": {
    "calories": "calorie estimate",
    "protein": "protein estimate",
    "carbs": "carbs estimate",
    "fat": "fat estimate",
    "fiber": "fiber estimate",
    "sugar": "sugar estimate"
  }
}

Return ONLY the JSON object:`;

  try {
    const result = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: combinedPrompt }],
      temperature: 0.2,
    });

    const responseText = result.choices[0]?.message?.content?.trim() || '';
    console.log('🚀 Combined parsing result:', responseText.substring(0, 200) + '...');

    // Clean the JSON response
    let cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Remove any garbage text before/after JSON
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }

    const finalRecipe = JSON.parse(cleanedText);
    console.log('✅ Successfully parsed recipe in single call');

    // Clean time units to prevent duplication
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

    // Determine if instructions were AI-generated
    const finalInstructions = finalRecipe.instructions || [];
    
    let instructionsWereGenerated = false;
    let aiInstructions: string[] = [];
    
    // Check if the original content had proper cooking instructions
    console.log('🔍 Checking for existing instructions in content...');
    console.log('📝 Content preview:', content.substring(0, 500) + '...');
    
    const hasEnglishKeywords = (
      content.toLowerCase().includes('instructions:') ||
      content.toLowerCase().includes('directions:') ||
      content.toLowerCase().includes('method:') ||
      content.toLowerCase().includes('how to make') ||
      content.toLowerCase().includes('how to cook')
    );
    
    const hasBulgarianKeywords = (
      content.toLowerCase().includes('изпече') ||
      content.toLowerCase().includes('задуши') ||
      content.toLowerCase().includes('добави') ||
      content.toLowerCase().includes('вари') ||
      content.toLowerCase().includes('запържи') ||
      content.toLowerCase().includes('оставете') ||
      content.toLowerCase().includes('нарежете')
    );
    
    const hasSpanishKeywords = (
      content.toLowerCase().includes('cocinar') ||
      content.toLowerCase().includes('agregar') ||
      content.toLowerCase().includes('mezclar') ||
      content.toLowerCase().includes('freír')
    );
    
    const hasFrenchKeywords = (
      content.toLowerCase().includes('cuire') ||
      content.toLowerCase().includes('ajouter') ||
      content.toLowerCase().includes('mélanger') ||
      content.toLowerCase().includes('faire')
    );
    
    const hasNumberedSteps = (
      content.match(/\d+\.\s*(heat|add|mix|stir|cook|bake|fry|boil|simmer|season|preheat|combine|whisk|beat|fold|pour|drain|serve)/gi) && 
      content.match(/\d+\.\s*(heat|add|mix|stir|cook|bake|fry|boil|simmer|season|preheat|combine|whisk|beat|fold|pour|drain|serve)/gi)!.length >= 3
    );
    
    const hasBulgarianSentences = (
      content.match(/[а-яё]{3,}\s+[а-яё]{3,}\s+[а-яё]{3,}/gi) && 
      content.match(/[а-яё]{3,}\s+[а-яё]{3,}\s+[а-яё]{3,}/gi)!.length >= 2
    );
    
    const hasProperInstructions = hasEnglishKeywords || hasBulgarianKeywords || hasSpanishKeywords || hasFrenchKeywords || hasNumberedSteps || hasBulgarianSentences;
    
    console.log('🔍 Instruction detection results:');
    console.log('- English keywords:', hasEnglishKeywords);
    console.log('- Bulgarian keywords:', hasBulgarianKeywords);
    console.log('- Spanish keywords:', hasSpanishKeywords);
    console.log('- French keywords:', hasFrenchKeywords);
    console.log('- Numbered steps:', hasNumberedSteps);
    console.log('- Bulgarian sentences:', hasBulgarianSentences);
    console.log('- Final result:', hasProperInstructions);
    
    // The key logic: if we detected proper instructions in the ORIGINAL content, they were extracted
    // If we didn't detect any instructions in the original content, leave instructions empty for on-demand generation
    if (hasProperInstructions) {
      instructionsWereGenerated = false;
      console.log('✅ Instructions were extracted from original content - NOT AI generated');
    } else {
      // Don't generate AI instructions automatically - let user request them on-demand
      instructionsWereGenerated = false;
      finalRecipe.instructions = []; // Clear any generated instructions
      console.log('ℹ️ No instructions found in original content - leaving empty for on-demand generation');
    }

    console.log('🔍 Instruction analysis:');
    console.log('- Content has proper instructions:', hasProperInstructions);
    console.log('- Final instructions:', finalInstructions);
    console.log('- Were generated:', instructionsWereGenerated);
    console.log('- AI instructions stored separately:', aiInstructions.length > 0);

    const recipe: Recipe = {
      title: finalRecipe.title as string,
      ingredients: Array.isArray(finalRecipe.ingredients) ? finalRecipe.ingredients : [],
      // If instructions were AI-generated, show empty instructions by default
      instructions: instructionsWereGenerated ? [] : (Array.isArray(finalRecipe.instructions) ? finalRecipe.instructions : []),
      prepTime: cleanTimeUnit(finalRecipe.prepTime || ''),
      cookTime: cleanTimeUnit(finalRecipe.cookTime || ''),
      totalTime: cleanTimeUnit(finalRecipe.totalTime || ''),
      servings: finalRecipe.servings || '',
      difficulty: finalRecipe.difficulty || '',
      nutrition: finalRecipe.nutrition || {},
      metadata: {
        instructionsGenerated: instructionsWereGenerated,
        aiInstructions: instructionsWereGenerated ? aiInstructions : undefined
      }
    };

    console.log('🎉 Final recipe parsed successfully!');
    return recipe;

  } catch (error) {
    console.error('❌ OpenAI parsing error:', error);
    throw error;
  }
}