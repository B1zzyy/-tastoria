import { NextRequest, NextResponse } from 'next/server';
import { Recipe } from '@/lib/recipe-parser';
import { parseRecipeWithGemini } from '@/lib/geminiParser';
import { requirePremiumAccess } from '@/lib/authMiddleware';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
  const entities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&ndash;': '–',
    '&mdash;': '—',
    '&hellip;': '…',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&bull;': '•',
    '&middot;': '·',
    '&deg;': '°',
    '&trade;': '™',
    '&copy;': '©',
    '&reg;': '®'
  };

  return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return entities[entity] || entity;
  }).replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(dec);
  }).replace(/&#x([a-fA-F0-9]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

// Instagram/Facebook URL validation
function isValidInstagramUrl(url: string): boolean {
  const instagramRegex = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/;
  return instagramRegex.test(url);
}

function isValidFacebookUrl(url: string): boolean {
  const facebookRegex = /^https?:\/\/(www\.|m\.)?(facebook\.com|fb\.com)\/(reel|posts|videos|watch|share\/r)\/[A-Za-z0-9_-]+/;
  return facebookRegex.test(url);
}

// Extract Instagram post ID from URL
function extractInstagramPostId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

// Resolve Facebook share URL to actual post URL
async function resolveFacebookShareUrl(shareUrl: string): Promise<string | null> {
  try {
    console.log('🔗 Resolving Facebook share URL:', shareUrl);
    
    // Method 1: Try with manual redirect to catch redirect headers
    try {
      console.log('🔄 Method 1: Trying manual redirect...');
      const response = await fetch(shareUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        redirect: 'manual'
      });

      console.log('📡 Method 1 response status:', response.status);
      console.log('📡 Method 1 response headers:', Object.fromEntries(response.headers.entries()));

      // Check if we got a redirect
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          console.log('✅ Method 1: Resolved Facebook share URL via redirect to:', location);
          return location;
        }
      }
    } catch (error) {
      console.log('⚠️ Method 1: Manual redirect method failed:', error);
    }

    // Method 2: Try with automatic redirect and check final URL
    try {
      console.log('🔄 Method 2: Trying automatic redirect...');
      const response = await fetch(shareUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        redirect: 'follow'
      });

      console.log('📡 Method 2 response status:', response.status);
      console.log('📡 Method 2 final URL:', response.url);

      // Check if the final URL is different from the original
      const finalUrl = response.url;
      if (finalUrl !== shareUrl && finalUrl.includes('facebook.com')) {
        console.log('✅ Method 2: Resolved Facebook share URL via automatic redirect to:', finalUrl);
        return finalUrl;
      }
    } catch (error) {
      console.log('⚠️ Method 2: Automatic redirect method failed:', error);
    }

    // Method 3: Try to extract the actual post ID from the share URL by making a request
    try {
      console.log('🔄 Method 3: Trying HTML parsing...');
      const response = await fetch(shareUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'follow'
      });

      console.log('📡 Method 3 response status:', response.status);
      console.log('📡 Method 3 final URL:', response.url);

      const html = await response.text();
      console.log('📄 Method 3 HTML length:', html.length);
      console.log('📄 Method 3 HTML preview:', html.substring(0, 500));
      
      // Look for the actual post ID in the HTML content
      const postIdMatch = html.match(/\/reel\/(\d+)/);
      if (postIdMatch) {
        const actualPostId = postIdMatch[1];
        const resolvedUrl = `https://www.facebook.com/reel/${actualPostId}`;
        console.log('✅ Method 3: Extracted actual post ID from HTML:', resolvedUrl);
        return resolvedUrl;
      }

      // Also try to find it in meta tags or other patterns
      const metaMatch = html.match(/property="og:url" content="([^"]*\/reel\/\d+)/);
      if (metaMatch) {
        console.log('✅ Method 3: Found post URL in meta tags:', metaMatch[1]);
        return metaMatch[1];
      }

      // Try other patterns
      const otherPatterns = [
        /"video_id":"(\d+)"/,
        /"post_id":"(\d+)"/,
        /"id":"(\d+)"/,
        /reel\/(\d+)/g,
        /"target_id":"(\d+)"/,
        /"object_id":"(\d+)"/,
        /"story_id":"(\d+)"/,
        /"media_id":"(\d+)"/,
        /"content_id":"(\d+)"/,
        /"item_id":"(\d+)"/,
        /"video_id":(\d+)/,
        /"post_id":(\d+)/,
        /"id":(\d+)/,
        /"target_id":(\d+)/,
        /"object_id":(\d+)/,
        /"story_id":(\d+)/,
        /"media_id":(\d+)/,
        /"content_id":(\d+)/,
        /"item_id":(\d+)/
      ];

      for (const pattern of otherPatterns) {
        const match = html.match(pattern);
        if (match) {
          const id = match[1];
          const resolvedUrl = `https://www.facebook.com/reel/${id}`;
          console.log('✅ Method 3: Found ID with pattern:', pattern, '->', resolvedUrl);
          return resolvedUrl;
        }
      }

      // Try to find any long numeric ID that could be a post ID
      const longNumericIds = html.match(/\b(\d{10,})\b/g);
      if (longNumericIds) {
        console.log('🔍 Found potential long numeric IDs:', longNumericIds);
        // Try the first long numeric ID as a potential post ID
        const potentialId = longNumericIds[0];
        const resolvedUrl = `https://www.facebook.com/reel/${potentialId}`;
        console.log('🔄 Method 3: Trying potential post ID:', resolvedUrl);
        return resolvedUrl;
      }
    } catch (error) {
      console.log('⚠️ Method 3: HTML parsing method failed:', error);
    }

    // Method 4: Try using Facebook's mobile API or different user agents
    try {
      console.log('🔄 Method 4: Trying mobile Facebook API...');
      
      // Try with mobile user agent
      const mobileResponse = await fetch(shareUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        redirect: 'follow'
      });

      console.log('📡 Method 4 mobile response status:', mobileResponse.status);
      console.log('📡 Method 4 mobile final URL:', mobileResponse.url);

      if (mobileResponse.url !== shareUrl && mobileResponse.url.includes('facebook.com') && mobileResponse.url.includes('/reel/')) {
        console.log('✅ Method 4: Mobile user agent resolved to:', mobileResponse.url);
        return mobileResponse.url;
      } else if (mobileResponse.url !== shareUrl) {
        console.log('⚠️ Method 4: Mobile URL changed but not to reel:', mobileResponse.url);
      }

      // Try with different headers
      const altResponse = await fetch(shareUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept': '*/*',
        },
        redirect: 'follow'
      });

      console.log('📡 Method 4 alt response status:', altResponse.status);
      console.log('📡 Method 4 alt final URL:', altResponse.url);

      if (altResponse.url !== shareUrl && altResponse.url.includes('facebook.com') && altResponse.url.includes('/reel/')) {
        console.log('✅ Method 4: Alt headers resolved to:', altResponse.url);
        return altResponse.url;
      } else if (altResponse.url !== shareUrl) {
        console.log('⚠️ Method 4: Alt URL changed but not to reel:', altResponse.url);
      }

    } catch (error) {
      console.log('⚠️ Method 4: Mobile/alt method failed:', error);
    }

    // Method 5: Try to use Facebook's embed endpoint or other public endpoints
    try {
      console.log('🔄 Method 5: Trying Facebook embed endpoint...');
      
      // Extract the share ID from the original URL
      const shareMatch = shareUrl.match(/\/share\/r\/([A-Za-z0-9_-]+)/);
      if (shareMatch) {
        const shareId = shareMatch[1];
        console.log('🔍 Extracted share ID:', shareId);
        
        // Try Facebook's embed endpoint
        const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(shareUrl)}`;
        console.log('🔗 Trying embed URL:', embedUrl);
        
        const embedResponse = await fetch(embedUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          },
          redirect: 'follow'
        });

        console.log('📡 Method 5 embed response status:', embedResponse.status);
        console.log('📡 Method 5 embed final URL:', embedResponse.url);

        if (embedResponse.url !== embedUrl && embedResponse.url.includes('facebook.com')) {
          console.log('✅ Method 5: Embed endpoint resolved to:', embedResponse.url);
          return embedResponse.url;
        }

        // Try to extract post ID from embed response
        const embedHtml = await embedResponse.text();
        const embedPostIdMatch = embedHtml.match(/\/reel\/(\d+)/);
        if (embedPostIdMatch) {
          const actualPostId = embedPostIdMatch[1];
          const resolvedUrl = `https://www.facebook.com/reel/${actualPostId}`;
          console.log('✅ Method 5: Found post ID in embed response:', resolvedUrl);
          return resolvedUrl;
        }
      }
    } catch (error) {
      console.log('⚠️ Method 5: Embed endpoint method failed:', error);
    }

    // Method 6: Try to use a different approach - make a request to the share URL with different parameters
    try {
      console.log('🔄 Method 6: Trying share URL with different parameters...');
      
      // Try adding different parameters to the share URL
      const variations = [
        `${shareUrl}?ref=share`,
        `${shareUrl}?ref=embed`,
        `${shareUrl}?ref=video`,
        `${shareUrl}?ref=reel`,
        `${shareUrl}?ref=post`,
        `${shareUrl}?ref=watch`,
        `${shareUrl}?ref=share&ref_src=embed`,
        `${shareUrl}?ref=share&ref_src=video`,
        `${shareUrl}?ref=share&ref_src=reel`
      ];

      for (const variation of variations) {
        try {
          console.log('🔗 Trying variation:', variation);
          const response = await fetch(variation, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            },
            redirect: 'follow'
          });

          console.log('📡 Method 6 variation response status:', response.status);
          console.log('📡 Method 6 variation final URL:', response.url);

          if (response.url !== variation && response.url.includes('facebook.com') && response.url.includes('/reel/')) {
            console.log('✅ Method 6: Variation resolved to:', response.url);
            return response.url;
          }
        } catch (error) {
          console.log('⚠️ Method 6: Variation failed:', variation, error);
        }
      }
    } catch (error) {
      console.log('⚠️ Method 6: Parameter variation method failed:', error);
    }

    // Method 7: Try using a different approach - maybe the share ID can be converted directly
    try {
      console.log('🔄 Method 7: Trying direct conversion approach...');
      
      // Extract the share ID from the original URL
      const shareMatch = shareUrl.match(/\/share\/r\/([A-Za-z0-9_-]+)/);
      if (shareMatch) {
        const shareId = shareMatch[1];
        console.log('🔍 Extracted share ID:', shareId);
        
        // Try to make a request to see if we can get more info about this share ID
        // Sometimes share IDs are just encoded versions of the actual post ID
        const testUrls = [
          `https://www.facebook.com/reel/${shareId}`,
          `https://www.facebook.com/posts/${shareId}`,
          `https://www.facebook.com/videos/${shareId}`,
          `https://www.facebook.com/watch/${shareId}`,
          `https://m.facebook.com/reel/${shareId}`,
          `https://m.facebook.com/posts/${shareId}`,
          `https://m.facebook.com/videos/${shareId}`,
          `https://m.facebook.com/watch/${shareId}`
        ];

        for (const testUrl of testUrls) {
          try {
            console.log('🔗 Testing URL:', testUrl);
            const response = await fetch(testUrl, {
              method: 'HEAD',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              },
              redirect: 'manual'
            });

            console.log('📡 Method 7 test response status:', response.status, 'for URL:', testUrl);

            // If we get a 200 or redirect, this might be a valid URL
            if (response.status === 200 || (response.status >= 300 && response.status < 400)) {
              console.log('✅ Method 7: Found potentially valid URL:', testUrl);
              return testUrl;
            }
          } catch (error) {
            console.log('⚠️ Method 7: Test URL failed:', testUrl, error);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Method 7: Direct conversion method failed:', error);
    }

    console.log('❌ All methods failed to resolve Facebook share URL');
    return null;
  } catch (error) {
    console.error('❌ Error resolving Facebook share URL:', error);
    return null;
  }
}

// Extract Facebook post ID from URL
function extractFacebookPostId(url: string): string | null {
  // Handle share URLs
  const shareMatch = url.match(/(?:facebook\.com|fb\.com)\/share\/r\/([A-Za-z0-9_-]+)/);
  if (shareMatch) {
    return shareMatch[1];
  }

  // Handle regular URLs
  const match = url.match(/(?:facebook\.com|fb\.com)\/(?:reel|posts|videos|watch)\/([A-Za-z0-9_-]+)/);
  if (match) {
    // Clean the post ID - remove any trailing non-numeric characters that might be added
    let postId = match[1];
    // If it ends with letters, try to extract just the numeric part
    if (/[a-zA-Z]+$/.test(postId)) {
      const numericMatch = postId.match(/^(\d+)/);
      if (numericMatch) {
        postId = numericMatch[1];
        console.log('🧹 Cleaned Facebook post ID:', postId);
      }
    }
    return postId;
  }
  return null;
}

// Extract ingredients from caption using pattern matching
async function extractIngredientsFromCaption(caption: string, url: string): Promise<Recipe | null> {
  try {
    console.log('🔍 Attempting fallback ingredient extraction from caption...');
    
    // Look for common ingredient patterns
    const ingredientPatterns = [
      // Pattern: "800g chicken breast" or "2 tbsp soy sauce"
      /(\d+(?:\.\d+)?(?:g|kg|ml|l|tbsp|tsp|cups?|oz|lb|pounds?)?)\s+([^,\n]+?)(?=\s*[,\n-]|$)/gi,
      // Pattern: "chicken breast" or "soy sauce" (without measurements)
      /(?:^|\n|,|\s)([a-zA-Z][a-zA-Z\s]+(?:breast|thigh|wing|sauce|oil|flour|sugar|salt|pepper|garlic|onion|cheese|milk|cream|butter|egg|eggs|bread|pasta|rice|noodles|vegetables?|herbs?|spices?))(?=\s*[,\n-]|$)/gi
    ];
    
    const ingredients: string[] = [];
    const foundIngredients = new Set<string>();
    
    // Extract title from caption
    let title = 'Instagram Recipe';
    const titleMatch = caption.match(/([A-Z][^!?\n]*?(?:chicken|pasta|salad|soup|pizza|burger|sandwich|tacos?|curry|stir.?fry|noodles?|rice|bread|pancakes?|waffles?|muffins?|cookies?|cake|pie|smoothie|bowl|wrap|roll|dip|sauce|dressing))/i);
    if (titleMatch) {
      title = titleMatch[1].trim().replace(/[^\w\s-]/g, '').trim();
    }
    
    // Try to extract ingredients using patterns
    for (const pattern of ingredientPatterns) {
      let match;
      while ((match = pattern.exec(caption)) !== null) {
        let ingredient = match[0].trim();
        
        // Clean up the ingredient
        ingredient = ingredient
          .replace(/^[,\n\s-]+/, '') // Remove leading punctuation
          .replace(/[,\n\s-]+$/, '') // Remove trailing punctuation
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        // Skip if too short or already found
        if (ingredient.length < 3 || foundIngredients.has(ingredient.toLowerCase())) {
          continue;
        }
        
        // Skip common non-ingredient words
        const skipWords = ['serves', 'calories', 'protein', 'carbs', 'fat', 'macros', 'meal', 'prep', 'cookbook', 'dm', 'link', 'recipe', 'like', 'comment', 'follow', 'subscribe'];
        if (skipWords.some(word => ingredient.toLowerCase().includes(word))) {
          continue;
        }
        
        ingredients.push(ingredient);
        foundIngredients.add(ingredient.toLowerCase());
      }
    }
    
    // If we found ingredients, create a basic recipe
    if (ingredients.length > 0) {
      console.log('✅ Fallback extraction found', ingredients.length, 'ingredients');
      
      const recipe: Recipe = {
        title: title,
        ingredients: ingredients,
        instructions: [], // Will be generated later
        image: 'instagram-video',
        instagramUrl: url,
        prepTime: '15 minutes',
        cookTime: '20 minutes',
        totalTime: '35 minutes',
        servings: '4',
        description: `Recipe extracted from Instagram caption`,
        nutrition: {
          calories: '400',
          protein: '25g',
          carbs: '30g',
          fat: '15g'
        },
        difficulty: 'Medium'
      };
      
      return recipe;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error in fallback ingredient extraction:', error);
    return null;
  }
}

// Generate cooking instructions from ingredients and title
async function generateInstructionsFromIngredients(recipe: Recipe, caption: string): Promise<Recipe | null> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ Cannot generate instructions: Gemini API key is missing');
      return null;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
You are a professional chef. Generate logical cooking instructions for a recipe based on the ingredients and title.

RECIPE INFO:
Title: ${recipe.title}
Ingredients: ${recipe.ingredients.join(', ')}

ORIGINAL CAPTION CONTEXT:
${caption.substring(0, 1000)}

TASK: Create 4-8 logical cooking steps that would make sense for this dish.

RULES:
1. Use common cooking techniques appropriate for the ingredients
2. Follow logical order: prep → cook → finish
3. Include proper temperatures and times where appropriate
4. Make instructions clear and actionable
5. Consider the dish type (pasta, salad, baked, fried, etc.)
6. Use professional cooking terminology

Return ONLY a JSON array of instruction strings:
["Step 1 instruction", "Step 2 instruction", "Step 3 instruction", ...]

Example:
["Preheat oven to 400°F (200°C)", "Season chicken with salt, pepper, and herbs", "Heat oil in a large skillet over medium-high heat", "Cook chicken for 6-8 minutes per side until golden", "Let rest for 5 minutes before serving"]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    console.log('🤖 Generated instructions response:', text.substring(0, 200) + '...');
    
    // Parse the JSON response
    try {
      let cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
      cleanJson = cleanJson
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double quotes
        .replace(/,\s*,/g, ',') // Remove double commas
        .replace(/\n\s*\n/g, ' '); // Remove extra newlines
      
      const instructions = JSON.parse(cleanJson);
      
      if (Array.isArray(instructions) && instructions.length > 0) {
        const enhancedRecipe = { ...recipe };
        enhancedRecipe.instructions = instructions.filter(inst => 
          typeof inst === 'string' && inst.trim().length > 10
        );
        
        console.log('✅ Generated', enhancedRecipe.instructions.length, 'cooking instructions');
        return enhancedRecipe;
      }
    } catch (parseError) {
      console.log('⚠️ Failed to parse generated instructions JSON:', parseError);
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error generating instructions:', error);
    return null;
  }
}

// Extract caption and image from HTML using multiple methods
function extractDataFromHtml(html: string): { caption: string | null; image: string | null } {
  console.log('Extracting data from HTML...');
  
  let caption: string | null = null;
  let image: string | null = null;
  
  // Method 1: Look for meta tags (description and image) - but don't use if we find full caption later
  const metaDescMatch = html.match(/<meta property="og:description" content="([^"]*)"[^>]*>/);
  let metaCaption: string | null = null;
  if (metaDescMatch && metaDescMatch[1]) {
    console.log('Found caption in meta description');
    metaCaption = decodeHtmlEntities(metaDescMatch[1]);
    console.log('Meta description caption length:', metaCaption.length);
    console.log('Meta description caption preview:', metaCaption.substring(0, 300));
  }
  
  // Look for og:image meta tag
  const metaImageMatch = html.match(/<meta property="og:image" content="([^"]*)"[^>]*>/);
  if (metaImageMatch && metaImageMatch[1]) {
    console.log('Found image in og:image meta tag');
    image = metaImageMatch[1];
  }
  
  // Also try twitter:image
  if (!image) {
    const twitterImageMatch = html.match(/<meta name="twitter:image" content="([^"]*)"[^>]*>/);
    if (twitterImageMatch && twitterImageMatch[1]) {
      console.log('Found image in twitter:image meta tag');
      image = twitterImageMatch[1];
    }
  }

  // Method 2: Look for JSON-LD structured data
  if (!caption || !image) {
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (!caption && (jsonData.caption || jsonData.description)) {
          console.log('Found caption in JSON-LD');
          caption = decodeHtmlEntities(jsonData.caption || jsonData.description);
        }
        if (!image && jsonData.image) {
          console.log('Found image in JSON-LD');
          image = Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image;
        }
      } catch (e) {
        console.log('Failed to parse JSON-LD:', e);
      }
    }
  }

  // Method 3: Look for window._sharedData (PRIORITIZE THIS for full caption)
  const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.*?});/);
  if (sharedDataMatch) {
    try {
      const sharedData = JSON.parse(sharedDataMatch[1]);
      const postData = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
      
      if (postData?.edge_media_to_caption?.edges?.[0]?.node?.text) {
        const fullCaption = decodeHtmlEntities(postData.edge_media_to_caption.edges[0].node.text);
        console.log('Found FULL caption in shared data, length:', fullCaption.length);
        console.log('Full caption preview:', fullCaption.substring(0, 500));
        
        // ALWAYS use full caption from shared data if available
        console.log('✅ Using full caption from shared data (overriding meta description)');
        caption = fullCaption;
      }
      
      if (!image && postData?.display_url) {
        console.log('Found image in shared data');
        image = postData.display_url;
      }
    } catch (e) {
      console.log('Failed to parse shared data:', e);
    }
  }

  // Method 4: Look for any script containing caption and image data (ENHANCED)
  if (!caption || !image) {
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
    if (scriptMatches) {
      for (const script of scriptMatches) {
        // Look for various caption patterns (ENHANCED)
        if (!caption) {
          const captionPatterns = [
            // Modern Instagram patterns
            /"edge_media_to_caption":\s*{\s*"edges":\s*\[\s*{\s*"node":\s*{\s*"text":\s*"([^"]*?)"/,
            /"caption":\s*"([^"]*?)"/,
            /"text":\s*"([^"]*?)"/,
            /caption['"]\s*:\s*['"]([^'"]*?)['"]/,
            // Look for longer captions in JSON structures
            /"shortcode_media":\s*{[\s\S]*?"edge_media_to_caption":\s*{[\s\S]*?"text":\s*"([^"]*?)"/
          ];
          
          for (const pattern of captionPatterns) {
            const match = script.match(pattern);
            if (match && match[1] && match[1].length > 50) { // Require longer captions
              const extractedCaption = decodeHtmlEntities(match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\u[\dA-F]{4}/gi, ''));
              console.log('Found caption in script tag, length:', extractedCaption.length);
              console.log('Script caption preview:', extractedCaption.substring(0, 500));
              
              // Use this caption if it's longer than what we have
              if (!caption || extractedCaption.length > caption.length) {
                console.log('Using longer caption from script tag');
                caption = extractedCaption;
              }
            }
          }
        }
        
        // Look for image patterns
        if (!image) {
          const imagePatterns = [
            /"display_url":\s*"([^"]*?)"/,
            /"display_src":\s*"([^"]*?)"/,
            /"thumbnail_src":\s*"([^"]*?)"/
          ];
          
          for (const pattern of imagePatterns) {
            const match = script.match(pattern);
            if (match && match[1]) {
              console.log('Found image in script tag');
              image = match[1].replace(/\\u[\dA-F]{4}/gi, '');
              break;
            }
          }
        }
        
        if (caption && image) break;
      }
    }
  }

  // Fallback: Use meta caption if we still don't have a caption
  if (!caption && metaCaption) {
    console.log('⚠️ Using meta caption as fallback');
    caption = metaCaption;
  }
  
  console.log('Extraction complete - Caption:', !!caption, 'Image:', !!image);
  if (caption) {
    console.log('Final caption length:', caption.length);
    console.log('Final caption preview:', caption.substring(0, 500));
  }
  return { caption, image };
}


// Scrape Facebook post data
async function scrapeFacebookPost(url: string): Promise<{ caption: string; image?: string } | null> {
  try {
    console.log('🔍 Scraping Facebook post:', url);
    
    // Normalize Facebook URL
    const postId = extractFacebookPostId(url);
    if (!postId) {
      console.log('❌ Could not extract Facebook post ID');
      return null;
    }
    
    const normalizedUrl = `https://www.facebook.com/reel/${postId}`;
    console.log('📝 Normalized Facebook URL:', normalizedUrl);
    
    // Try multiple methods to get Facebook content with more sophisticated headers
    const methods: Array<{ name: string; url: string; headers: Record<string, string> }> = [
      {
        name: 'Direct URL with Chrome Headers',
        url: normalizedUrl,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://www.google.com/',
        }
      },
      {
        name: 'Mobile URL with Safari Headers',
        url: normalizedUrl.replace('www.facebook.com', 'm.facebook.com'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Referer': 'https://www.google.com/',
        }
      },
      {
        name: 'Alternative Facebook URL',
        url: normalizedUrl.replace('/reel/', '/posts/'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.facebook.com/',
        }
      }
    ];

    for (const method of methods) {
      try {
        console.log(`🔍 Trying ${method.name}:`, method.url);
        
        const response = await fetch(method.url, { headers: method.headers });
        console.log(`📡 ${method.name} response status:`, response.status);

        if (response.ok) {
          const html = await response.text();
          console.log(`📄 ${method.name} HTML length:`, html.length);
          
          // Try multiple patterns to extract post content from Facebook HTML
          const patterns = [
            // Try to find the full content in JSON-LD or other structured data
            /"description":"([^"]{100,})"/i,
            /"text":"([^"]{100,})"/i,
            /"content":"([^"]{100,})"/i,
            /"caption":"([^"]{100,})"/i,
            // Try to find content in script tags
            /window\.__INITIAL_STATE__\s*=\s*({[^}]+})/i,
            /window\._sharedData\s*=\s*({[^}]+})/i,
            // Meta tags (these are often truncated)
            /<meta property="og:description" content="([^"]*)"[^>]*>/i,
            /<meta name="description" content="([^"]*)"[^>]*>/i,
            /<meta property="twitter:description" content="([^"]*)"[^>]*>/i,
            /<title>([^<]*)<\/title>/i
          ];
          
          for (const pattern of patterns) {
            const contentMatch = html.match(pattern);
            if (contentMatch && contentMatch[1].trim()) {
              let caption = decodeHtmlEntities(contentMatch[1]);
              
              // If we found JSON data, try to extract the full text
              if (pattern.source.includes('{') && caption.includes('{')) {
                try {
                  const jsonMatch = caption.match(/"text":"([^"]+)"/i) || 
                                  caption.match(/"description":"([^"]+)"/i) ||
                                  caption.match(/"content":"([^"]+)"/i);
                  if (jsonMatch) {
                    caption = jsonMatch[1];
                  }
                } catch {
                  // Continue with original caption
                }
              }
              
              // Skip if it's just generic Facebook text
              if (!caption.includes('Facebook') && !caption.includes('Log In') && caption.length > 50) {
                console.log(`✅ Extracted Facebook content via ${method.name} (pattern ${patterns.indexOf(pattern) + 1}):`, caption.substring(0, 200) + '...');
                console.log(`📏 Full caption length: ${caption.length}`);
                
                // Extract post image
                const imageMatch = html.match(/<meta property="og:image" content="([^"]*)"[^>]*>/i);
                const image = imageMatch ? imageMatch[1] : undefined;
                
                return { caption, image };
              }
            }
          }
        } else {
          console.log(`❌ ${method.name} failed with status:`, response.status);
        }
      } catch (error) {
        console.log(`⚠️ ${method.name} failed:`, error);
      }
    }
    
    console.log('❌ All Facebook scraping methods failed');
    return null;
  } catch (error) {
    console.error('❌ Error scraping Facebook post:', error);
    return null;
  }
}

// Scrape Instagram post data
async function scrapeInstagramPost(url: string): Promise<{ caption: string; image?: string } | null> {
  try {
    const isFacebook = isValidFacebookUrl(url);
    console.log('Scraping URL:', url, isFacebook ? '(Facebook)' : '(Instagram)');
    
    if (isFacebook) {
      return await scrapeFacebookPost(url);
    }

    // Try different approaches to get Instagram data
    
    // Method 1: Try the embed URL first (often more accessible)
    const postId = extractInstagramPostId(url);
    if (postId) {
      console.log('Extracted post ID:', postId);
      
      // Try Instagram's embed endpoint
      const embedUrl = `https://www.instagram.com/p/${postId}/embed/`;
      console.log('Trying embed URL:', embedUrl);
      
      try {
        const embedResponse = await fetch(embedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://www.instagram.com/',
          },
        });
        
        if (embedResponse.ok) {
          const embedHtml = await embedResponse.text();
          console.log('Embed HTML length:', embedHtml.length);
          
          // Try to extract data from embed
          const embedData = extractDataFromHtml(embedHtml);
          if (embedData.caption) {
            console.log('Found data in embed - Caption:', embedData.caption.substring(0, 100), 'Image:', !!embedData.image);
            return { caption: embedData.caption, image: embedData.image || undefined };
          }
        }
      } catch (embedError) {
        console.log('Embed method failed:', embedError);
      }
      
      // Try alternative URL formats
      const alternativeUrls = [
        `https://www.instagram.com/p/${postId}/`,
        `https://www.instagram.com/reel/${postId}/`,
        `https://www.instagram.com/tv/${postId}/`
      ];
      
      for (const altUrl of alternativeUrls) {
        if (altUrl !== url) {
          console.log('Trying alternative URL:', altUrl);
          try {
            const altResponse = await fetch(altUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.instagram.com/',
              },
            });
            
            if (altResponse.ok) {
              const altHtml = await altResponse.text();
              console.log('Alternative URL HTML length:', altHtml.length);
              
              // Check if this has the full caption
              const hasFullCaption = altHtml.includes('40oz Lean Ground Beef') || 
                                    altHtml.includes('96/4') || 
                                    altHtml.includes('450 Calories') ||
                                    altHtml.includes('65g Protein');
              
              if (hasFullCaption) {
                console.log('✅ Found full caption in alternative URL!');
                const altData = extractDataFromHtml(altHtml);
                if (altData.caption) {
                  return { caption: altData.caption, image: altData.image || undefined };
                }
              }
            }
          } catch (altError) {
            console.log('Alternative URL failed:', altError);
          }
        }
      }
    }

    // Method 2: Try the regular URL with updated headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch Instagram page:', response.status, response.statusText);
      return null;
    }

    const html = await response.text();
    console.log('Fetched HTML length:', html.length);
    
    // Debug: Check if we can find the full caption in the HTML
    console.log('🔍 Searching for full caption in HTML...');
    
    // Look for the specific ingredients we know should be there
    const hasFullCaption = html.includes('40oz Lean Ground Beef') || 
                          html.includes('96/4') || 
                          html.includes('450 Calories') ||
                          html.includes('65g Protein');
    
    console.log('🔍 Does HTML contain full caption data?', hasFullCaption);
    
    if (hasFullCaption) {
      console.log('✅ Found full caption data in HTML!');
    } else {
      console.log('❌ Full caption data NOT found in HTML');
      // Let's see what we can find
      const captionMatches = html.match(/"text":\s*"([^"]{500,})"/g);
      if (captionMatches) {
        console.log('🔍 Found potential long captions:', captionMatches.length);
        captionMatches.forEach((match, i) => {
          console.log(`🔍 Caption ${i + 1} preview:`, match.substring(0, 200) + '...');
        });
      }
      
      // Try alternative extraction methods
      console.log('🔍 Trying alternative caption extraction...');
      
      // Look for any long text blocks that might be the caption
      const longTextBlocks = html.match(/"text":\s*"([^"]{200,})"/g);
      if (longTextBlocks) {
        console.log('🔍 Found long text blocks:', longTextBlocks.length);
        longTextBlocks.forEach((block, i) => {
          const text = block.match(/"text":\s*"([^"]+)"/);
          if (text && text[1]) {
            const decodedText = decodeHtmlEntities(text[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'));
            console.log(`🔍 Text block ${i + 1} (${decodedText.length} chars):`, decodedText.substring(0, 300) + '...');
          }
        });
      }
    }

    // Use the improved extraction method
    const data = extractDataFromHtml(html);
    
    console.log('Extracted data - Caption length:', data.caption?.length || 0, 'Image:', !!data.image);
    if (data.caption) {
      console.log('Caption preview:', data.caption.substring(0, 200));
      return { caption: data.caption, image: data.image || undefined };
    }

    return null;
  } catch (error) {
    console.error('Error scraping Instagram post:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require premium access
    const authResult = await requirePremiumAccess(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response
    }
    
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Clean the URL by removing parameters
    const cleanUrl = url.split('?')[0];
    console.log('Original URL:', url);
    console.log('Cleaned URL:', cleanUrl);

    // Validate Instagram or Facebook URL
    const isInstagram = isValidInstagramUrl(cleanUrl);
    const isFacebook = isValidFacebookUrl(cleanUrl);
    
    if (!isInstagram && !isFacebook) {
      return NextResponse.json(
        { error: 'Invalid URL. Please provide a valid Instagram post, reel, IGTV, or Facebook post/reel URL.' },
        { status: 400 }
      );
    }

    console.log('Processing URL:', cleanUrl, isInstagram ? '(Instagram)' : '(Facebook)');
    console.log('🔍 Checking for share URL pattern in:', cleanUrl);
    console.log('🔍 Contains /share/r/:', cleanUrl.includes('/share/r/'));

    // Resolve Facebook share URLs to actual post URLs
    let finalUrl = cleanUrl;
    if (isFacebook && cleanUrl.includes('/share/r/')) {
      console.log('🔗 Detected Facebook share URL, resolving...');
      const resolvedUrl = await resolveFacebookShareUrl(cleanUrl);
      if (resolvedUrl) {
        finalUrl = resolvedUrl;
        console.log('✅ Using resolved URL:', finalUrl);
      } else {
        console.log('⚠️ Could not resolve share URL, using original');
      }
    } else {
      console.log('ℹ️ Not a share URL or not Facebook, using original URL');
    }

    // Add timeout wrapper
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Instagram parsing timeout')), 45000);
    });

    const parsePromise = async () => {
      // Scrape the Instagram post
      const postData = await scrapeInstagramPost(finalUrl);
      
      if (!postData || !postData.caption) {
        return {
          error: 'Could not extract caption from Instagram post. The post might be private or the caption might be empty.',
          fallbackMode: true
        };
      }

      // Use Gemini AI to parse recipe from caption
      console.log('🤖 Sending Instagram caption to Gemini AI...');
      console.log('📝 Caption length:', postData.caption.length);
      console.log('📝 Caption preview:', postData.caption.substring(0, 200));
      
      const recipe = await parseRecipeWithGemini(postData.caption);
      
      // Set platform-specific properties
      if (isInstagram) {
        recipe.image = 'instagram-video';
        recipe.instagramUrl = cleanUrl;
      } else if (isFacebook) {
        recipe.image = 'facebook-video';
        recipe.facebookUrl = cleanUrl;
      }
      
      if (!recipe) {
        console.log('❌ Gemini failed to parse recipe from caption - trying fallback extraction...');
        
        // Try to extract ingredients manually from the caption
        const fallbackRecipe = await extractIngredientsFromCaption(postData.caption, cleanUrl);
        
        if (fallbackRecipe && fallbackRecipe.ingredients && fallbackRecipe.ingredients.length > 0) {
          console.log('✅ Fallback extraction found ingredients, generating instructions...');
          
          // Generate instructions for the extracted ingredients
          try {
            const enhancedRecipe = await generateInstructionsFromIngredients(fallbackRecipe, postData.caption);
            if (enhancedRecipe && enhancedRecipe.instructions && enhancedRecipe.instructions.length > 0) {
              console.log('✅ Successfully generated complete recipe from fallback');
              if (isInstagram) {
                enhancedRecipe.image = 'instagram-video';
                enhancedRecipe.instagramUrl = cleanUrl;
              } else if (isFacebook) {
                enhancedRecipe.image = 'facebook-video';
                enhancedRecipe.facebookUrl = cleanUrl;
              }
              return { recipe: enhancedRecipe };
            }
          } catch (error) {
            console.log('⚠️ Failed to generate instructions for fallback recipe:', error);
          }
        }
        
        return {
          error: 'No recipe found in the Instagram caption. You can manually create a recipe while watching the video.',
          fallbackMode: true,
          caption: postData.caption.substring(0, 500) // Provide caption preview for manual entry
        };
      }

      // The new logic in parseRecipeWithGemini already handles AI instruction generation
      // and stores them separately in metadata.aiInstructions
      // No additional processing needed here

      // Note: Instagram URL is handled separately in the frontend

      console.log('✅ Gemini successfully parsed Instagram recipe:', recipe.title);
      return { recipe };
    };

    const result = await Promise.race([parsePromise(), timeoutPromise]) as { error?: Error; recipe?: Recipe; fallbackMode?: boolean; caption?: string };

    if (result.error) {
      return NextResponse.json(result, { status: 422 }); // Unprocessable Entity
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Instagram parsing error:', error);
    
    if (error instanceof Error && error.message === 'Instagram parsing timeout') {
      return NextResponse.json(
        { 
          error: 'Instagram parsing timed out. Please try again or create the recipe manually.',
          fallbackMode: true
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to parse Instagram post. Please try again or create the recipe manually.',
        fallbackMode: true
      },
      { status: 500 }
    );
  }
}
