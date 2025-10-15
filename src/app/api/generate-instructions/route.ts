import { NextRequest, NextResponse } from 'next/server';
import { requirePremiumAccess } from '@/lib/authMiddleware';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Check premium access
    const premiumCheck = await requirePremiumAccess(request);
    if (premiumCheck && 'error' in premiumCheck) {
      return NextResponse.json(
        { error: premiumCheck.error },
        { status: 401 }
      );
    }

    const { title, ingredients, originalContent } = await request.json();

    if (!title || !ingredients) {
      return NextResponse.json(
        { error: 'Title and ingredients are required' },
        { status: 400 }
      );
    }

    console.log('🤖 Generating AI instructions for:', title);

    // Format ingredients for the prompt
    const ingredientsText = Array.isArray(ingredients) 
      ? ingredients.map(ingredient => {
          if (typeof ingredient === 'string') {
            return ingredient;
          }
          if (typeof ingredient === 'object' && ingredient.ingredients) {
            const sectionTitle = ingredient.title ? `${ingredient.title}: ` : '';
            return sectionTitle + ingredient.ingredients.join(', ');
          }
          return String(ingredient);
        }).join(', ')
      : String(ingredients);

    const prompt = `You are a professional chef. Generate logical cooking instructions for this recipe.

RECIPE INFO:
Title: ${title}
Ingredients: ${ingredientsText}

${originalContent ? `ORIGINAL CONTENT CONTEXT:
${originalContent.substring(0, 1000)}` : ''}

TASK: Create 4-8 logical cooking steps that would make sense for this dish.

RULES:
1. Use common cooking techniques appropriate for the ingredients
2. Follow logical order: prep → cook → finish
3. Include proper temperatures and times where appropriate
4. Make instructions clear and actionable
5. Consider the dish type (pasta, salad, baked, fried, etc.)
6. Use professional cooking terminology
7. Do NOT include numbers in the instructions (e.g., 'Heat oil in pan' not '1. Heat oil in pan')

Return ONLY a JSON array of instruction strings:
["Step 1 instruction", "Step 2 instruction", "Step 3 instruction", ...]

Example:
["Preheat oven to 400°F (200°C)", "Season chicken with salt, pepper, and herbs", "Heat oil in a large skillet over medium-high heat", "Cook chicken for 6-8 minutes per side until golden", "Let rest for 5 minutes before serving"]`;

    const result = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const responseText = result.choices[0]?.message?.content?.trim() || '';
    console.log('🤖 AI instructions response:', responseText.substring(0, 200) + '...');

    // Parse the JSON response
    let cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Remove any garbage text before/after JSON
    const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }

    const instructions = JSON.parse(cleanedText);
    console.log('✅ Successfully generated AI instructions');

    return NextResponse.json({ instructions });

  } catch (error) {
    console.error('❌ Error generating AI instructions:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI instructions' },
      { status: 500 }
    );
  }
}
