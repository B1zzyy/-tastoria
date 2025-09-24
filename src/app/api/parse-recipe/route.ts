import { NextRequest, NextResponse } from 'next/server';
import { parseRecipeFromUrl, type Recipe } from '@/lib/recipe-parser';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Create a timeout promise that rejects after 25 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Recipe parsing timed out after 25 seconds')), 25000);
    });

    // Race the parsing against the timeout
    const recipe = await Promise.race([
      parseRecipeFromUrl(url),
      timeoutPromise
    ]) as Recipe | null;
    
    // Final aggressive cleanup of instructions to remove fragments
    if (recipe && recipe.instructions) {
      console.log('API: Before final cleanup:', recipe.instructions.length, 'instructions');
      console.log('API: Raw instructions:', recipe.instructions.map((inst, i) => `${i+1}: "${inst}"`));
      
      recipe.instructions = recipe.instructions.filter(instruction => {
        const text = instruction.trim();
        
        // Remove very short fragments
        if (text.length < 10) {
          console.log(`API: Removing short fragment: "${text}"`);
          return false;
        }
        
        // Remove fragments that are just numbers/times without context
        if (/^\d+\s*(minutes?|hours?|seconds?)?\s*$/.test(text)) {
          console.log(`API: Removing time fragment: "${text}"`);
          return false;
        }
        
        // Remove fragments that are just temperature units or partial temperatures
        if (/^°?[CF]\)?\s*(or|and)?\s*(the|juices?|until)?$/i.test(text)) {
          console.log(`API: Removing temperature fragment: "${text}"`);
          return false;
        }
        
        // Remove fragments that start with units or incomplete phrases
        if (/^(°F|°C|\)|\s*or\s+the|and\s+the|until\s+the)/i.test(text)) {
          console.log(`API: Removing incomplete fragment: "${text}"`);
          return false;
        }
        
        // Remove standalone numbers at the beginning
        if (/^\d+\s*$/.test(text)) {
          console.log(`API: Removing standalone number: "${text}"`);
          return false;
        }
        
        // Keep instructions that have actual cooking verbs, reasonable length, or cooking context
        const hasActionVerbs = /\b(place|cut|add|stir|cook|bake|mix|combine|heat|sprinkle|season|drain|remove|return|gradually|continue|crumble|dot|brown|grill|preheat|roast|marinate|garnish|allow|beat|coat|dip|drizzle|flatten|lightly)\b/i.test(text);
        const hasReasonableLength = text.length > 15;
        const hasCookingContext = /\b(oven|temperature|°C|°F|minutes|hours|dish|pan|tray|oil|flour|egg|breadcrumbs|lemon|thyme|oregano|paprika|chilli|cling film|mallet|rolling pin)\b/i.test(text);
        const hasTemperatureOrTime = /\d+\s*°[CF]|\d+\s*(minutes?|hours?|seconds?)/i.test(text);
        
        // Keep if it has action verbs, reasonable length, AND (cooking context OR temperature/time)
        if (!hasReasonableLength) {
          console.log(`API: Removing too short: "${text}"`);
          return false;
        }
        
        if (!hasActionVerbs && !hasCookingContext && !hasTemperatureOrTime) {
          console.log(`API: Removing non-cooking instruction: "${text.substring(0, 50)}..."`);
          return false;
        }
        
        return true;
      });
      
      console.log('API: After final cleanup:', recipe.instructions.length, 'instructions');
      console.log('API: Final instructions:', recipe.instructions.map((inst: string, i: number) => `${i+1}: ${inst.substring(0, 50)}...`));
    }
    
    return NextResponse.json({ recipe });
  } catch (error) {
    console.error('Error parsing recipe:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse recipe' },
      { status: 500 }
    );
  }
}
