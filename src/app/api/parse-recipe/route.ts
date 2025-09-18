import { NextRequest, NextResponse } from 'next/server';
import { parseRecipeFromUrl } from '@/lib/recipe-parser';

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

    const recipe = await parseRecipeFromUrl(url);
    
    return NextResponse.json({ recipe });
  } catch (error) {
    console.error('Error parsing recipe:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse recipe' },
      { status: 500 }
    );
  }
}
