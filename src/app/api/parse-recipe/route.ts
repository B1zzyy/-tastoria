import { NextRequest, NextResponse } from 'next/server';
import { parseRecipeWithGemini } from '@/lib/geminiParser';
import axios from 'axios';
import * as cheerio from 'cheerio';

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

    console.log('🌐 Fetching webpage content for Gemini parsing:', url);

    // Fetch the webpage content
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      timeout: 15000,
    });

    console.log('✅ Got webpage content, length:', response.data.length);

    // Parse HTML to extract clean text content and image
    const $ = cheerio.load(response.data);
    
    // Remove script and style elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share').remove();
    
    // Extract main content - try to find the recipe content area
    let content = '';
    
    // Try to find recipe-specific selectors first
    const recipeSelectors = [
      '[itemtype*="Recipe"]',
      '.recipe-content',
      '.recipe-body',
      '.recipe-instructions',
      '.recipe-ingredients',
      '.entry-content',
      '.post-content',
      '.content',
      'main',
      'article'
    ];
    
    for (const selector of recipeSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 200) { // Make sure we have substantial content
          console.log(`📄 Found content using selector: ${selector}`);
          break;
        }
      }
    }
    
    // Fallback to body if no specific content found
    if (!content || content.length < 200) {
      content = $('body').text().trim();
      console.log('📄 Using body content as fallback');
    }
    
    // Clean up the content
    content = content
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
    
    if (content.length < 100) {
      return NextResponse.json(
        { error: 'No recipe content found on this page' },
        { status: 404 }
      );
    }

    // Extract image from webpage (ONLY thing we get from HTML)
    let imageUrl = '';
    
    // Try to find recipe image using various selectors
    const imageSelectors = [
      '[itemtype*="Recipe"] img',
      '.recipe-image img',
      '.recipe-photo img',
      '.recipe-hero img',
      '.featured-image img',
      'article img',
      'main img',
      'img[alt*="recipe" i]',
      'img[alt*="dish" i]',
      'img[alt*="food" i]'
    ];
    
    for (const selector of imageSelectors) {
      const img = $(selector).first();
      if (img.length > 0) {
        const src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
        if (src) {
          // Convert relative URLs to absolute
          imageUrl = src.startsWith('http') ? src : new URL(src, url).toString();
          console.log(`🖼️ Found image using selector: ${selector}`);
          break;
        }
      }
    }
    
    // Fallback to first image on page if no recipe-specific image found
    if (!imageUrl) {
      const firstImg = $('img').first();
      if (firstImg.length > 0) {
        const src = firstImg.attr('src') || firstImg.attr('data-src') || firstImg.attr('data-lazy-src');
        if (src) {
          imageUrl = src.startsWith('http') ? src : new URL(src, url).toString();
          console.log('🖼️ Using first image on page as fallback');
        }
      }
    }

    console.log('🤖 Sending content to Gemini for parsing...');
    
    // Use Gemini to parse the recipe from the webpage content
    const recipe = await parseRecipeWithGemini(content, url);
    
    if (!recipe) {
      return NextResponse.json(
        { error: 'No recipe found on this page' },
        { status: 404 }
      );
    }

    // Add the extracted image to the recipe (ONLY thing we get from HTML)
    if (imageUrl) {
      recipe.image = imageUrl;
      console.log('🖼️ Added image to recipe:', imageUrl);
    }

    console.log('✅ Gemini successfully parsed recipe:', recipe.title);
    
    return NextResponse.json({ recipe });
  } catch (error) {
    console.error('Error parsing recipe:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse recipe' },
      { status: 500 }
    );
  }
}
