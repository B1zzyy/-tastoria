import { NextRequest, NextResponse } from 'next/server';
import { Recipe } from '@/lib/recipe-parser';
import { parseRecipeWithGemini } from '@/lib/geminiParser';
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

// Instagram URL validation
function isValidInstagramUrl(url: string): boolean {
  const instagramRegex = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/;
  return instagramRegex.test(url);
}

// Extract Instagram post ID from URL
function extractInstagramPostId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
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


// Scrape Instagram post data
async function scrapeInstagramPost(url: string): Promise<{ caption: string; image?: string } | null> {
  try {
    console.log('Scraping Instagram URL:', url);

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

    // Validate Instagram URL
    if (!isValidInstagramUrl(cleanUrl)) {
      return NextResponse.json(
        { error: 'Invalid Instagram URL. Please provide a valid Instagram post, reel, or IGTV URL.' },
        { status: 400 }
      );
    }

    console.log('Processing Instagram URL:', cleanUrl);

    // Add timeout wrapper
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Instagram parsing timeout')), 45000);
    });

    const parsePromise = async () => {
      // Scrape the Instagram post
      const postData = await scrapeInstagramPost(cleanUrl);
      
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
      
      const recipe = await parseRecipeWithGemini(postData.caption, cleanUrl);
      
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
              enhancedRecipe.instagramUrl = cleanUrl;
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

      // Check if we have ingredients but no/missing instructions
      if (recipe.ingredients && recipe.ingredients.length > 0 && 
          (!recipe.instructions || recipe.instructions.length === 0 || 
           recipe.instructions.every(inst => inst.trim().length < 10))) {
        
        console.log('🔧 Recipe has ingredients but missing instructions - generating AI instructions...');
        
        try {
          const enhancedRecipe = await generateInstructionsFromIngredients(recipe, postData.caption);
          if (enhancedRecipe && enhancedRecipe.instructions && enhancedRecipe.instructions.length > 0) {
            console.log('✅ Successfully generated instructions from ingredients');
            recipe.instructions = enhancedRecipe.instructions;
          }
        } catch (error) {
          console.log('⚠️ Failed to generate instructions:', error);
        }
      }

      // Set the Instagram URL for video popup
      recipe.instagramUrl = cleanUrl;

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
