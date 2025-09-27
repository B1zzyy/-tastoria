import { NextRequest, NextResponse } from 'next/server';
import { Recipe } from '@/lib/recipe-parser';

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

// Extract caption and image from HTML using multiple methods
function extractDataFromHtml(html: string): { caption: string | null; image: string | null } {
  console.log('Extracting data from HTML...');
  
  let caption: string | null = null;
  let image: string | null = null;
  
  // Method 1: Look for meta tags (description and image)
  const metaDescMatch = html.match(/<meta property="og:description" content="([^"]*)"[^>]*>/);
  if (metaDescMatch && metaDescMatch[1]) {
    console.log('Found caption in meta description');
    caption = decodeHtmlEntities(metaDescMatch[1]);
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

  // Method 3: Look for window._sharedData
  if (!caption || !image) {
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.*?});/);
    if (sharedDataMatch) {
      try {
        const sharedData = JSON.parse(sharedDataMatch[1]);
        const postData = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
        
        if (!caption && postData?.edge_media_to_caption?.edges?.[0]?.node?.text) {
          console.log('Found caption in shared data');
          caption = decodeHtmlEntities(postData.edge_media_to_caption.edges[0].node.text);
        }
        
        if (!image && postData?.display_url) {
          console.log('Found image in shared data');
          image = postData.display_url;
        }
      } catch (e) {
        console.log('Failed to parse shared data:', e);
      }
    }
  }

  // Method 4: Look for any script containing caption and image data
  if (!caption || !image) {
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
    if (scriptMatches) {
      for (const script of scriptMatches) {
        // Look for various caption patterns
        if (!caption) {
          const captionPatterns = [
            /"caption":\s*"([^"]*?)"/,
            /"text":\s*"([^"]*?)"/,
            /caption['"]\s*:\s*['"]([^'"]*?)['"]/,
            /"edge_media_to_caption":\s*{\s*"edges":\s*\[\s*{\s*"node":\s*{\s*"text":\s*"([^"]*?)"/
          ];
          
          for (const pattern of captionPatterns) {
            const match = script.match(pattern);
            if (match && match[1] && match[1].length > 10) {
              console.log('Found caption in script tag');
              caption = decodeHtmlEntities(match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\u[\dA-F]{4}/gi, ''));
              break;
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

  console.log('Extraction complete - Caption:', !!caption, 'Image:', !!image);
  return { caption, image };
}

// Parse recipe from Instagram caption text
function parseRecipeFromCaption(caption: string): Recipe | null {
  console.log('=== PARSING CAPTION ===');
  console.log('Full caption length:', caption.length);
  console.log('Full caption:', caption);
  console.log('========================');

  // Clean up the caption
  const cleanCaption = caption
    .replace(/\n+/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  // Try to extract title from first line or hashtags
  const lines = cleanCaption.split('\n');
  let title = '';
  
  // Look for a title in the first few lines - be more flexible
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#') && !line.startsWith('@') && line.length > 5 && line.length < 150) {
      // Clean up the line to make a good title
      const cleanTitle = line
        .replace(/[🍽️🥘🍳👩‍🍳👨‍🍳🔥✨💫⭐🌟💯❤️😍🤤👌🙌💪🎉🎊]/g, '') // Remove emojis
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
      
      // Skip lines that are clearly not titles
      if (cleanTitle.toLowerCase().includes('ingredients') || 
          cleanTitle.toLowerCase().includes('instructions') ||
          cleanTitle.toLowerCase().includes('prep time') ||
          cleanTitle.toLowerCase().includes('cook time') ||
          cleanTitle.toLowerCase().includes('serves')) {
        continue;
      }
      
      // If it looks like a good title, use it
      if (cleanTitle.length > 5) {
        title = cleanTitle;
        break;
      }
    }
  }

  // If no title found, try to extract from hashtags
  if (!title) {
    const hashtagMatches = caption.match(/#([a-zA-Z0-9]+(?:recipe|pasta|chicken|beef|salmon|pizza|burger|salad|soup|curry|stir|fry))/gi);
    if (hashtagMatches && hashtagMatches.length > 0) {
      // Take the first relevant hashtag and make it a title
      const hashtag = hashtagMatches[0].replace('#', '');
      title = hashtag.replace(/recipe$/i, '').replace(/([A-Z])/g, ' $1').trim() + ' Recipe';
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }
  }

  // Try to extract from common recipe patterns
  if (!title) {
    const recipePatterns = [
      /(?:this|my|homemade|easy|quick|best|perfect|delicious|amazing)\s+([^.!?\n]{10,50})/i,
      /([^.!?\n]{10,50})\s+(?:recipe|dish|meal)/i
    ];
    
    for (const pattern of recipePatterns) {
      const match = caption.match(pattern);
      if (match && match[1]) {
        title = match[1].trim();
        if (!title.toLowerCase().includes('recipe')) {
          title += ' Recipe';
        }
        break;
      }
    }
  }

  // Default title if nothing found
  if (!title) {
    title = 'Delicious Recipe';
  }

  console.log('Extracted title:', title);

  // Look for ingredients section with more flexible patterns
  const ingredientsPatterns = [
    /(?:ingredients?|what you need|you'll need|shopping list):?\s*([\s\S]*?)(?=(?:instructions?|method|directions|steps|how to make|recipe|preparation)|$)/i,
    /(?:ingredients?):?\s*([\s\S]*?)(?=(?:instructions?|method|directions|steps)|$)/i,
    // Look for emoji-based ingredient lists
    /🛒[\s\S]*?([\s\S]*?)(?=(?:👩‍🍳|🍳|📝|instructions?|method|directions|steps)|$)/i,
    /(?:🥕|🧄|🧅|🥔|🍅|🥒|🌶️|🧈|🥛|🧀|🥩|🐟|🍖|🥓)[\s\S]*?([\s\S]*?)(?=(?:👩‍🍳|🍳|📝|instructions?|method|directions|steps)|$)/i
  ];

  let ingredients: string[] = [];
  
  for (const pattern of ingredientsPatterns) {
    const match = caption.match(pattern);
    if (match && match[1]) {
      const ingredientsText = match[1];
      ingredients = ingredientsText
        .split(/\n|•|-|\*|✓|▪️|🔸|→/)
        .map(item => decodeHtmlEntities(item.trim())) // Decode HTML entities
        .filter(item => {
          // Filter out empty lines, hashtags, mentions, and very short items
          return item && 
                 !item.startsWith('#') && 
                 !item.startsWith('@') && 
                 item.length > 3 &&
                 item.length < 200 &&
                 // Look for ingredient-like patterns
                 (/\d+/.test(item) || 
                  /cup|tbsp|tsp|gram|kg|lb|oz|ml|liter|clove|slice|piece|bunch|handful|pinch/i.test(item) || 
                  item.split(' ').length <= 10);
        })
        .slice(0, 20); // Limit to reasonable number
      
      if (ingredients.length > 0) {
        console.log(`Found ${ingredients.length} ingredients using pattern`);
        break;
      }
    }
  }

  // Look for instructions section with more flexible patterns
  const instructionsPatterns = [
    /(?:instructions?|method|directions|steps|how to make|recipe|preparation):?\s*([\s\S]*?)(?=#|@|$)/i,
    /(?:👩‍🍳|🍳|📝)[\s\S]*?([\s\S]*?)(?=#|@|$)/i,
    /(?:instructions?):?\s*([\s\S]*?)(?=#|@|$)/i
  ];

  let instructions: string[] = [];
  
  for (const pattern of instructionsPatterns) {
    const match = caption.match(pattern);
    if (match && match[1]) {
      const instructionsText = match[1];
      console.log('Raw instructions text:', instructionsText);
      
      // SIMPLE approach: Just split on double newlines or single newlines, preserve full sentences
      instructions = instructionsText
        .split(/\n\n|\n/)
        .map(item => decodeHtmlEntities(item.trim())) // Decode HTML entities
        .filter(item => {
          // Very basic filtering - just remove empty lines and obvious non-instructions
          if (!item || item.length < 10 || item.length > 800) return false;
          if (item.startsWith('#') || item.startsWith('@')) return false;
          if (item.match(/^[👩‍🍳🍳📝🔥✨💫]+$/)) return false; // Remove lines that are just emojis
          
          // Filter out timing and serving information that should go in metadata
          const lowerItem = item.toLowerCase();
          if (lowerItem.match(/^(prep|preparation)(\s+time)?:?\s*\d+/)) return false;
          if (lowerItem.match(/^cook(ing)?(\s+time)?:?\s*\d+/)) return false;
          if (lowerItem.match(/^total(\s+time)?:?\s*\d+/)) return false;
          if (lowerItem.match(/^serves?:?\s*\d+/)) return false;
          if (lowerItem.match(/^servings?:?\s*\d+/)) return false;
          if (lowerItem.match(/^makes?:?\s*\d+/)) return false;
          if (lowerItem.match(/^yield:?\s*\d+/)) return false;
          
          // Filter out emoji-based timing/serving info
          if (lowerItem.match(/^⏱️\s*\d+/)) return false;
          if (lowerItem.match(/^🕐\s*\d+/)) return false;
          if (lowerItem.match(/^⏰\s*\d+/)) return false;
          if (lowerItem.match(/^👥\s*\d+/)) return false;
          if (lowerItem.match(/^🍽️\s*\d+/)) return false;
          
          // Filter out lines that are just timing info without context
          if (lowerItem.match(/^\d+\s*(min|minute|minutes|hr|hour|hours)(\s+(prep|cook|total))?$/)) return false;
          if (lowerItem.match(/^\d+\s*(people|servings?)$/)) return false;
          
          // Filter out promotional/descriptive text that's not instructions
          // Look for lines that are clearly descriptions, not cooking steps
          if (lowerItem.match(/\b(bold|buttery|unforgettable|comfort food|delicious|amazing|perfect|incredible|mouthwatering)\b/) && 
              !lowerItem.match(/\b(add|mix|cook|bake|heat|stir|combine|place|put|cut|chop|dice|slice|season|serve|garnish|sprinkle|pour|blend|whisk|sauté|fry|boil|simmer|roast|grill|preheat|prepare|remove|drain|cover|let|allow|until|then|next|first|finally|in|melt|return|toss)\b/)) {
            return false;
          }
          
          // Filter out lines with excessive emojis (likely promotional)
          const emojiCount = (item.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
          if (emojiCount > 2) return false;
          
          // Filter out lines that are clearly taglines or descriptions
          if (lowerItem.match(/^(this|that|these|those)\s+.*(is|are)\s+/) && 
              !lowerItem.match(/\b(add|mix|cook|bake|heat|stir|combine|place|put|cut|chop|dice|slice|season|serve|garnish|sprinkle|pour|blend|whisk|sauté|fry|boil|simmer|roast|grill|preheat|prepare|remove|drain|cover|let|allow|until|then|next|first|finally|in|melt|return|toss)\b/)) {
            return false;
          }
          
          // Filter out lines that end with exclamation marks and contain descriptive words (likely promotional)
          if (item.endsWith('!') && 
              lowerItem.match(/\b(kick|style|comfort|southern|bold|amazing|perfect|delicious|incredible)\b/) &&
              !lowerItem.match(/\b(add|mix|cook|bake|heat|stir|combine|place|put|cut|chop|dice|slice|season|serve|garnish|sprinkle|pour|blend|whisk|sauté|fry|boil|simmer|roast|grill|preheat|prepare|remove|drain|cover|let|allow|until|then|next|first|finally|in|melt|return|toss)\b/)) {
            return false;
          }
          
          return true;
        })
        .slice(0, 20); // Allow more instructions
      
      console.log('Parsed instructions:', instructions);
      
      if (instructions.length > 0) {
        console.log(`Found ${instructions.length} instructions using pattern`);
        break;
      }
    }
  }

  // Extract recipe metadata (prep time, cook time, servings, etc.)
  let prepTime = '';
  let cookTime = '';
  let totalTime = '';
  let servings = '';

  // Look for timing and serving information patterns
  const timingPatterns = [
    /prep(?:\s+time)?:?\s*(\d+(?:\s*-\s*\d+)?\s*(?:min|minute|minutes|hr|hour|hours))/i,
    /preparation(?:\s+time)?:?\s*(\d+(?:\s*-\s*\d+)?\s*(?:min|minute|minutes|hr|hour|hours))/i,
    /cook(?:\s+time)?:?\s*(\d+(?:\s*-\s*\d+)?\s*(?:min|minute|minutes|hr|hour|hours))/i,
    /cooking(?:\s+time)?:?\s*(\d+(?:\s*-\s*\d+)?\s*(?:min|minute|minutes|hr|hour|hours))/i,
    /total(?:\s+time)?:?\s*(\d+(?:\s*-\s*\d+)?\s*(?:min|minute|minutes|hr|hour|hours))/i,
    /serves?:?\s*(\d+(?:\s*-\s*\d+)?(?:\s*people)?)/i,
    /servings?:?\s*(\d+(?:\s*-\s*\d+)?)/i,
    /makes?:?\s*(\d+(?:\s*-\s*\d+)?(?:\s*servings?)?)/i,
    /yield:?\s*(\d+(?:\s*-\s*\d+)?(?:\s*servings?)?)/i,
    // Look for emoji-based timing
    /⏱️\s*(\d+(?:\s*-\s*\d+)?\s*(?:min|minute|minutes|hr|hour|hours))/i,
    /🕐\s*(\d+(?:\s*-\s*\d+)?\s*(?:min|minute|minutes|hr|hour|hours))/i,
    /⏰\s*(\d+(?:\s*-\s*\d+)?\s*(?:min|minute|minutes|hr|hour|hours))/i,
    /👥\s*(\d+(?:\s*-\s*\d+)?(?:\s*people)?)/i,
    /🍽️\s*(\d+(?:\s*-\s*\d+)?(?:\s*servings?)?)/i
  ];

  for (const pattern of timingPatterns) {
    const match = caption.match(pattern);
    if (match && match[1]) {
      const value = match[1].trim();
      const fullMatch = match[0].toLowerCase();
      
      if (fullMatch.includes('prep')) {
        prepTime = value;
        console.log('Found prep time:', prepTime);
      } else if (fullMatch.includes('cook')) {
        cookTime = value;
        console.log('Found cook time:', cookTime);
      } else if (fullMatch.includes('total')) {
        totalTime = value;
        console.log('Found total time:', totalTime);
      } else if (fullMatch.includes('serv') || fullMatch.includes('makes') || fullMatch.includes('yield') || fullMatch.includes('👥') || fullMatch.includes('🍽️')) {
        servings = value.replace(/people|servings?/gi, '').trim();
        console.log('Found servings:', servings);
      }
    }
  }

  // Look for additional timing patterns in a more flexible way
  if (!prepTime || !cookTime) {
    // Look for patterns like "15 minutes prep, 20 minutes cook"
    const combinedTimeMatch = caption.match(/(\d+)\s*(?:min|minute|minutes)\s*prep.*?(\d+)\s*(?:min|minute|minutes)\s*cook/i);
    if (combinedTimeMatch) {
      if (!prepTime) prepTime = combinedTimeMatch[1] + ' minutes';
      if (!cookTime) cookTime = combinedTimeMatch[2] + ' minutes';
    }
  }

  // Only return a recipe if we found at least some ingredients or instructions
  if (ingredients.length > 0 || instructions.length > 0) {
    console.log(`Found recipe: ${title}, ${ingredients.length} ingredients, ${instructions.length} instructions`);
    console.log(`Metadata - Prep: ${prepTime}, Cook: ${cookTime}, Total: ${totalTime}, Servings: ${servings}`);
    
      return {
        title,
        ingredients,
        instructions,
        prepTime,
        cookTime,
        totalTime,
        servings,
        image: 'instagram-video', // Special flag to indicate this is an Instagram video
        instagramUrl: '', // Will be set to the original Instagram URL for video popup
      };
  }

  console.log('No recipe pattern found in caption');
  return null;
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
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch Instagram page:', response.status, response.statusText);
      return null;
    }

    const html = await response.text();
    console.log('Fetched HTML length:', html.length);

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
      setTimeout(() => reject(new Error('Instagram parsing timeout')), 25000);
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

      // Try to parse recipe from caption
      const recipe = parseRecipeFromCaption(postData.caption);
      
      if (!recipe) {
        return {
          error: 'No recipe found in the Instagram caption. You can manually create a recipe while watching the video.',
          fallbackMode: true,
          caption: postData.caption.substring(0, 500) // Provide caption preview for manual entry
        };
      }

      // Set the Instagram URL for video popup
      if (recipe.instagramUrl !== undefined) {
        recipe.instagramUrl = cleanUrl;
      }

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
