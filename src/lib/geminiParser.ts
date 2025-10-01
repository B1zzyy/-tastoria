import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface Recipe {
  title: string;
  ingredients: string[];
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
  metadata?: {
    instructionsGenerated: boolean;
  };
}

export async function parseRecipeWithGemini(content: string, _sourceType: 'web' | 'instagram' = 'web'): Promise<Recipe> {
  console.log('🚀 Parsing recipe with single optimized call...');
  
  const combinedPrompt = `You are a recipe extraction and enhancement expert. Extract information from this content and fill in missing fields intelligently.

EXTRACTION RULES:
1. Copy text EXACTLY as written (e.g., "40oz Lean Ground Beef (96/4)" not "40 oz lean ground beef")
2. If information is explicitly mentioned, use it exactly as written
3. If information is missing, provide reasonable estimates
4. Do NOT change ingredient names or descriptions that are provided

Content to parse:
${content}

ENHANCEMENT RULES:
- For missing instructions: Generate complete, clear cooking steps without numbers (e.g., 'Heat oil in pan' not '1. Heat oil in pan')
- For missing times: Use realistic estimates based on recipe complexity
- For missing nutrition: Provide reasonable estimates based on ingredients
- For missing servings: Estimate based on ingredient quantities

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
  "ingredients": ["ingredient text as written or estimated"],
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
    // Since we're now doing single-step parsing, we need to analyze the content to see if instructions were present
    const finalInstructions = finalRecipe.instructions || [];
    
    let instructionsWereGenerated = false;
    
    // Check if the original content had proper cooking instructions
    const hasProperInstructions = content.toLowerCase().includes('step') || 
                                 content.toLowerCase().includes('instructions') ||
                                 content.toLowerCase().includes('directions') ||
                                 content.toLowerCase().includes('method') ||
                                 (content.match(/\d+\./g) && content.match(/\d+\./g)!.length >= 3); // Has numbered steps
    
    // If no proper instructions found in content, they were likely generated
    if (!hasProperInstructions) {
      instructionsWereGenerated = true;
    } else if (finalInstructions.length === 1 && finalInstructions[0].length < 50) {
      // Single short instruction is likely a note/tip
      instructionsWereGenerated = true;
    } else if (finalInstructions.length < 3 && finalInstructions.every((inst: string) => 
      inst.toLowerCase().includes('note') || 
      inst.toLowerCase().includes('tip') || 
      inst.toLowerCase().includes('additional')
    )) {
      // Less than 3 instructions that are all notes/tips
      instructionsWereGenerated = true;
    }

    console.log('🔍 Instruction analysis:');
    console.log('- Content has proper instructions:', hasProperInstructions);
    console.log('- Final instructions:', finalInstructions);
    console.log('- Were generated:', instructionsWereGenerated);

    const recipe: Recipe = {
      title: finalRecipe.title as string,
      ingredients: Array.isArray(finalRecipe.ingredients) ? finalRecipe.ingredients : [],
      instructions: Array.isArray(finalRecipe.instructions) ? finalRecipe.instructions : [],
      prepTime: cleanTimeUnit(finalRecipe.prepTime || ''),
      cookTime: cleanTimeUnit(finalRecipe.cookTime || ''),
      totalTime: cleanTimeUnit(finalRecipe.totalTime || ''),
      servings: finalRecipe.servings || '',
      difficulty: finalRecipe.difficulty || '',
      nutrition: finalRecipe.nutrition || {},
      metadata: {
        instructionsGenerated: instructionsWereGenerated
      }
    };

    console.log('🎉 Final recipe parsed successfully!');
    return recipe;

  } catch (error) {
    console.error('❌ OpenAI parsing error:', error);
    throw error;
  }
}