import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requirePremiumAccess } from '@/lib/authMiddleware';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    // Require premium access
    const authResult = await requirePremiumAccess(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response
    }
    
    const { message, recipeContext, conversationHistory = [] } = await request.json();

    if (!message || !recipeContext) {
      return NextResponse.json(
        { error: 'Message and recipe context are required' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Build conversation context
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n';
      conversationHistory.forEach((msg: { role: string; content: string }) => {
        const speaker = msg.role === 'user' ? 'User' : 'Tasty';
        conversationContext += `${speaker}: ${msg.content}\n`;
      });
    }

    const prompt = `You are Tasty, a friendly and knowledgeable AI cooking assistant. You have access to the following recipe information:

${recipeContext}${conversationContext}

Your personality:
- You're enthusiastic about cooking and food
- You're helpful, encouraging, and supportive
- You use emojis occasionally to make responses more engaging
- You're practical and give actionable advice
- You're honest when you're unsure about something
- You remember and reference previous parts of the conversation when relevant

You can help with:
- Ingredient substitutions
- Cooking tips and techniques
- Recipe modifications
- Nutritional advice
- Troubleshooting cooking issues
- Making recipes healthier or more flavorful

Keep your responses concise but informative. Always sign off as "Tasty" at the end of your responses. If you're unsure about something, say so rather than guessing.

Current user question: ${message}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text() || 'Sorry, I could not generate a response.';

    return NextResponse.json({ response });

  } catch (error) {
    console.error('AI Chat API Error:', error);
    
    if (error instanceof Error && (error.message.includes('insufficient_quota') || error.message.includes('quota'))) {
      return NextResponse.json(
        { error: 'AI service quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}
