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
  facebookUrl?: string; // For Facebook video popup
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
- Extract ALL ingredients from ALL sections in the content
- Use sections when there are clearly distinct ingredient groups (e.g., "🥩 Шаурма с пиле:", "🍚 Ароматен жълт ориз:", "🧄 Чеснов бял сос:")
- Use the exact section titles as written (e.g., "🥩 Шаурма с пиле", "🍚 Ароматен жълт ориз")
- Section format: {"title": "Section Name", "ingredients": ["ingredient1", "ingredient2"]}
- CRITICAL: Extract EVERY ingredient from EVERY section - do not miss any ingredients
- Each line that contains an ingredient should be included as a separate ingredient
- DO NOT include nutrition/macro information in ingredients - put that in the nutrition section instead
- DO NOT include cooking instructions in ingredients - those belong in the instructions section
- EXAMPLE: For content with "🥩 Шаурма с пиле:\n1000г пилешко бутче\n30г счукан чесън\n2 ч.л. сол", extract as:
  {"title": "🥩 Шаурма с пиле", "ingredients": ["1000г пилешко бутче (без кожа и кост)", "30г счукан чесън", "2 ч.л. сол"]}

Content to parse:
${content}

ENHANCEMENT RULES:
- For missing instructions: Generate complete, clear cooking steps without numbers (e.g., 'Heat oil in pan' not '1. Heat oil in pan')
- For existing instructions: Copy them EXACTLY as written - preserve all measurements, times, and details
- For missing times: Use realistic estimates based on recipe complexity
- For missing nutrition: ONLY provide estimates if NO nutrition information exists in the original content
- For existing nutrition: Extract EXACTLY as written - do NOT generate estimates
- For missing servings: Estimate based on ingredient quantities

CRITICAL INSTRUCTION RULE:
- If the content already contains cooking instructions, extract them EXACTLY as written - do NOT shorten, simplify, or modify them
- Preserve all details, measurements, times, and specific instructions from the original content
- Do NOT generate new instructions if cooking steps already exist in the content
- Only generate instructions if the content has NO cooking steps at all
- Copy instructions word-for-word from the original content, including all measurements and timing details

NUTRITION PARSING RULES:
- If you see macro/nutrition information (calories, protein, carbs, fat, etc.), extract ONLY the numeric values to the nutrition section
- Look for patterns like "553 калории | 46г протеин | 48г въглехидрати | 19г мазнини"
- Extract ONLY the numeric values, NO units or Bulgarian labels
- EXAMPLE: If content has "553 калории | 46г протеин | 48г въглехидрати | 19г мазнини", extract as:
  {"calories": "553", "protein": "46", "carbs": "48", "fat": "19"}
- Do NOT include the Bulgarian words "калории", "протеин", "въглехидрати", "мазнини" in the nutrition values
- Do NOT include units like "г", "g", "grams" in the nutrition values
- Do NOT put nutrition info in ingredients - it belongs in the nutrition section
- CRITICAL: If nutrition info exists in the content, extract it exactly - do NOT generate estimates
- Only generate nutrition estimates if NO nutrition information is provided in the original content
- When extracting existing nutrition, extract ONLY the numbers, remove all text and units

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
    const aiInstructions: string[] = [];
    
    // Check if the original content had proper cooking instructions
    console.log('🔍 Checking for existing instructions in content...');
    console.log('📝 Content preview:', content.substring(0, 500) + '...');
    
    // Decode Unicode escape sequences for proper text matching
    const decodedContent = content.replace(/\\u[\dA-Fa-f]{4}/g, (match) => {
      return String.fromCharCode(parseInt(match.replace('\\u', ''), 16));
    });
    console.log('📝 Decoded content preview:', decodedContent.substring(0, 500) + '...');
    
    const hasEnglishKeywords = (
      decodedContent.toLowerCase().includes('instructions:') ||
      decodedContent.toLowerCase().includes('directions:') ||
      decodedContent.toLowerCase().includes('method:') ||
      decodedContent.toLowerCase().includes('how to make') ||
      decodedContent.toLowerCase().includes('how to cook')
    );
    
    const hasBulgarianKeywords = (
      decodedContent.toLowerCase().includes('изпече') ||
      decodedContent.toLowerCase().includes('задуши') ||
      decodedContent.toLowerCase().includes('добави') ||
      decodedContent.toLowerCase().includes('вари') ||
      decodedContent.toLowerCase().includes('запържи') ||
      decodedContent.toLowerCase().includes('оставете') ||
      decodedContent.toLowerCase().includes('нарежете') ||
      decodedContent.toLowerCase().includes('смесете') ||
      decodedContent.toLowerCase().includes('разбъркайте') ||
      decodedContent.toLowerCase().includes('загрейте') ||
      decodedContent.toLowerCase().includes('пресейте') ||
      decodedContent.toLowerCase().includes('намажете') ||
      decodedContent.toLowerCase().includes('покрийте') ||
      decodedContent.toLowerCase().includes('сложете') ||
      decodedContent.toLowerCase().includes('вземете') ||
      decodedContent.toLowerCase().includes('подгответе') ||
      decodedContent.toLowerCase().includes('нарежете') ||
      decodedContent.toLowerCase().includes('накълцайте') ||
      decodedContent.toLowerCase().includes('измийте') ||
      decodedContent.toLowerCase().includes('изсущете') ||
      decodedContent.toLowerCase().includes('сварете') ||
      decodedContent.toLowerCase().includes('запечете') ||
      decodedContent.toLowerCase().includes('пържете') ||
      decodedContent.toLowerCase().includes('тушете') ||
      decodedContent.toLowerCase().includes('мариновайте') ||
      decodedContent.toLowerCase().includes('подправете') ||
      decodedContent.toLowerCase().includes('солете') ||
      decodedContent.toLowerCase().includes('подправки') ||
      decodedContent.toLowerCase().includes('минути') ||
      decodedContent.toLowerCase().includes('часове') ||
      decodedContent.toLowerCase().includes('градуса') ||
      decodedContent.toLowerCase().includes('фурна') ||
      decodedContent.toLowerCase().includes('тиган') ||
      decodedContent.toLowerCase().includes('капак') ||
      decodedContent.toLowerCase().includes('слабо') ||
      decodedContent.toLowerCase().includes('силно') ||
      decodedContent.toLowerCase().includes('средно')
    );
    
    // Debug Bulgarian keyword detection
    console.log('🔍 Bulgarian keyword detection debug:');
    console.log('- Decoded content contains "изпече":', decodedContent.toLowerCase().includes('изпече'));
    console.log('- Decoded content contains "оставете":', decodedContent.toLowerCase().includes('оставете'));
    console.log('- Decoded content contains "нарежете":', decodedContent.toLowerCase().includes('нарежете'));
    console.log('- Decoded content contains "задушете":', decodedContent.toLowerCase().includes('задушете'));
    console.log('- Decoded content contains "минути":', decodedContent.toLowerCase().includes('минути'));
    console.log('- Decoded content contains "фурна":', decodedContent.toLowerCase().includes('фурна'));
    console.log('- Decoded content sample (first 200 chars):', decodedContent.substring(0, 200));
    
    const hasSpanishKeywords = (
      decodedContent.toLowerCase().includes('cocinar') ||
      decodedContent.toLowerCase().includes('agregar') ||
      decodedContent.toLowerCase().includes('mezclar') ||
      decodedContent.toLowerCase().includes('freír') ||
      decodedContent.toLowerCase().includes('hervir') ||
      decodedContent.toLowerCase().includes('hornear') ||
      decodedContent.toLowerCase().includes('saltear') ||
      decodedContent.toLowerCase().includes('revolver') ||
      decodedContent.toLowerCase().includes('cortar') ||
      decodedContent.toLowerCase().includes('pelar') ||
      decodedContent.toLowerCase().includes('batir') ||
      decodedContent.toLowerCase().includes('servir') ||
      decodedContent.toLowerCase().includes('minutos') ||
      decodedContent.toLowerCase().includes('horas') ||
      decodedContent.toLowerCase().includes('grados') ||
      decodedContent.toLowerCase().includes('horno') ||
      decodedContent.toLowerCase().includes('sartén') ||
      decodedContent.toLowerCase().includes('olla')
    );
    
    const hasFrenchKeywords = (
      decodedContent.toLowerCase().includes('cuire') ||
      decodedContent.toLowerCase().includes('ajouter') ||
      decodedContent.toLowerCase().includes('mélanger') ||
      decodedContent.toLowerCase().includes('faire') ||
      decodedContent.toLowerCase().includes('bouillir') ||
      decodedContent.toLowerCase().includes('rôtir') ||
      decodedContent.toLowerCase().includes('sauter') ||
      decodedContent.toLowerCase().includes('remuer') ||
      decodedContent.toLowerCase().includes('couper') ||
      decodedContent.toLowerCase().includes('éplucher') ||
      decodedContent.toLowerCase().includes('battre') ||
      decodedContent.toLowerCase().includes('servir') ||
      decodedContent.toLowerCase().includes('minutes') ||
      decodedContent.toLowerCase().includes('heures') ||
      decodedContent.toLowerCase().includes('degrés') ||
      decodedContent.toLowerCase().includes('four') ||
      decodedContent.toLowerCase().includes('poêle') ||
      decodedContent.toLowerCase().includes('casserole')
    );
    
    const hasNumberedSteps = (
      decodedContent.match(/\d+\.\s*(heat|add|mix|stir|cook|bake|fry|boil|simmer|season|preheat|combine|whisk|beat|fold|pour|drain|serve)/gi) && 
      decodedContent.match(/\d+\.\s*(heat|add|mix|stir|cook|bake|fry|boil|simmer|season|preheat|combine|whisk|beat|fold|pour|drain|serve)/gi)!.length >= 3
    );
    
    const hasBulgarianSentences = (
      decodedContent.match(/[а-яё]{3,}\s+[а-яё]{3,}\s+[а-яё]{3,}/gi) && 
      decodedContent.match(/[а-яё]{3,}\s+[а-яё]{3,}\s+[а-яё]{3,}/gi)!.length >= 2
    );
    
    // Additional detection for Bulgarian cooking instructions with numbers and measurements
    const hasBulgarianCookingInstructions = (
      decodedContent.match(/\d+[°сc]\s*[а-яё]+/gi) || // Temperature patterns like "200°C"
      decodedContent.match(/\d+\s*минути/gi) || // Time patterns like "20 минути"
      decodedContent.match(/\d+\s*часа/gi) || // Time patterns like "2 часа"
      decodedContent.match(/във\s+фурна/gi) || // "във фурна" (in the oven)
      decodedContent.match(/на\s+средно/gi) || // "на средно" (on medium)
      decodedContent.match(/на\s+слабо/gi) || // "на слабо" (on low)
      decodedContent.match(/на\s+силно/gi) || // "на силно" (on high)
      decodedContent.match(/под\s+капак/gi) || // "под капак" (covered)
      decodedContent.match(/до\s+златено/gi) || // "до златено" (until golden)
      decodedContent.match(/до\s+готово/gi) || // "до готово" (until done)
      decodedContent.match(/след\s+това/gi) || // "след това" (after that)
      decodedContent.match(/след\s+което/gi) || // "след което" (after which)
      decodedContent.match(/за\s+\d+\s*минути/gi) || // "за 20 минути" (for 20 minutes)
      decodedContent.match(/за\s+\d+\s*часа/gi) // "за 2 часа" (for 2 hours)
    );
    
    // Check if content contains only notes/tips (not actual cooking instructions)
    const hasOnlyNotes = (
      decodedContent.toLowerCase().includes('additional notes:') ||
      decodedContent.toLowerCase().includes('notes:') ||
      decodedContent.toLowerCase().includes('tips:') ||
      decodedContent.toLowerCase().includes('suggestions:')
    );
    
    const hasProperInstructions = (hasEnglishKeywords || hasBulgarianKeywords || hasSpanishKeywords || hasFrenchKeywords || hasNumberedSteps || hasBulgarianSentences || hasBulgarianCookingInstructions) && !hasOnlyNotes;
    
    console.log('🔍 Instruction detection results:');
    console.log('- English keywords:', hasEnglishKeywords);
    console.log('- Bulgarian keywords:', hasBulgarianKeywords);
    console.log('- Spanish keywords:', hasSpanishKeywords);
    console.log('- French keywords:', hasFrenchKeywords);
    console.log('- Numbered steps:', hasNumberedSteps);
    console.log('- Bulgarian sentences:', hasBulgarianSentences);
    console.log('- Bulgarian cooking instructions:', hasBulgarianCookingInstructions);
    console.log('- Has only notes/tips:', hasOnlyNotes);
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
    console.log('- finalRecipe.instructions:', finalRecipe.instructions);
    console.log('- finalRecipe.instructions type:', typeof finalRecipe.instructions);
    console.log('- finalRecipe.instructions isArray:', Array.isArray(finalRecipe.instructions));

    const finalInstructionsArray = instructionsWereGenerated ? [] : (Array.isArray(finalRecipe.instructions) ? finalRecipe.instructions : []);
    
    console.log('🔍 Final recipe construction:');
    console.log('- instructionsWereGenerated:', instructionsWereGenerated);
    console.log('- finalRecipe.instructions:', finalRecipe.instructions);
    console.log('- finalInstructionsArray:', finalInstructionsArray);
    console.log('- finalInstructionsArray length:', finalInstructionsArray.length);

    const recipe: Recipe = {
      title: finalRecipe.title as string,
      ingredients: Array.isArray(finalRecipe.ingredients) ? finalRecipe.ingredients : [],
      // If instructions were AI-generated, show empty instructions by default
      instructions: finalInstructionsArray,
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