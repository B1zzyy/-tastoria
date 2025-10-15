import { NextRequest, NextResponse } from 'next/server';
import { parseRecipeWithGemini } from '@/lib/geminiParser';
import { requirePremiumAccess } from '@/lib/authMiddleware';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    // Require premium access
    const authResult = await requirePremiumAccess(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response
    }
    
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

    // Try multiple approaches to fetch the webpage content
    let response: { data: string } | null = null;

    // Approach 1: Enhanced headers to bypass bot detection
    try {
      response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
          'DNT': '1',
          'Referer': 'https://www.google.com/',
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Accept redirects
        },
      });
      console.log('✅ Successfully fetched with enhanced headers');
    } catch {
      console.log('❌ Enhanced headers failed, trying fallback approach...');
    }

    // Approach 2: Fallback with different headers
    if (!response) {
      try {
        response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Referer': 'https://www.bing.com/',
          },
          timeout: 15000,
        });
        console.log('✅ Successfully fetched with fallback headers');
      } catch {
        console.log('❌ Fallback headers also failed');
      }
    }

    // Approach 3: Simple request as last resort
    if (!response) {
      try {
        response = await axios.get(url, {
          timeout: 15000,
        });
        console.log('✅ Successfully fetched with simple request');
      } catch (error) {
        console.log('❌ All fetch attempts failed');
        throw new Error(`Failed to fetch webpage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Ensure we have a response
    if (!response) {
      throw new Error('Failed to fetch webpage: No response received');
    }

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
    console.log('📝 Content being sent to AI (first 1000 chars):', content.substring(0, 1000));
    console.log('📏 Total content length:', content.length);
    
    // Use Gemini to parse the recipe from the webpage content
    const recipe = await parseRecipeWithGemini(content);
    
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
