import { Recipe } from './recipe-parser';

/**
 * Compress and encode recipe data for URL sharing
 */
export function encodeRecipeForUrl(recipe: Recipe): string {
  try {
    // Convert recipe to JSON string
    const recipeJson = JSON.stringify(recipe);
    
    // Compress using simple compression (remove whitespace, use shorter property names)
    const compressed = recipeJson
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/"\s+/g, '"') // Remove spaces after quotes
      .replace(/\s+"/g, '"') // Remove spaces before quotes
      .replace(/,\s+/g, ',') // Remove spaces after commas
      .replace(/:\s+/g, ':') // Remove spaces after colons
      .trim();
    
    // Encode to base64 for URL safety - handle Unicode characters properly
    const encoded = btoa(encodeURIComponent(compressed));
    
    return encoded;
  } catch (error) {
    console.error('Error encoding recipe for URL:', error);
    return '';
  }
}

/**
 * Decode and decompress recipe data from URL
 */
export function decodeRecipeFromUrl(encodedData: string): Recipe | null {
  try {
    // Decode from base64
    const compressed = atob(encodedData);
    
    // Decode URI component to handle Unicode characters
    const decompressed = decodeURIComponent(compressed);
    
    // Parse JSON
    const recipe = JSON.parse(decompressed) as Recipe;
    
    return recipe;
  } catch (error) {
    console.error('Error decoding recipe from URL:', error);
    return null;
  }
}

/**
 * Generate a shareable URL for a recipe
 */
export function generateRecipeShareUrl(recipe: Recipe, baseUrl: string = window.location.origin): string {
  const encodedRecipe = encodeRecipeForUrl(recipe);
  
  if (!encodedRecipe) {
    throw new Error('Failed to encode recipe for sharing');
  }
  
  return `${baseUrl}?recipe=${encodeURIComponent(encodedRecipe)}`;
}

/**
 * Shorten a URL using TinyURL service
 */
export async function shortenUrl(longUrl: string): Promise<string> {
  try {
    // Use TinyURL's API - they support CORS for their API endpoint
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const shortUrl = await response.text();
    
    // TinyURL returns the short URL or an error message
    if (shortUrl.startsWith('http')) {
      return shortUrl;
    } else {
      throw new Error(`URL shortening failed: ${shortUrl}`);
    }
  } catch (error) {
    console.error('Error shortening URL:', error);
    // Return original URL if shortening fails
    return longUrl;
  }
}

/**
 * Generate a shortened shareable URL for a recipe
 */
export async function generateShortRecipeShareUrl(recipe: Recipe, baseUrl: string = window.location.origin): Promise<string> {
  const longUrl = generateRecipeShareUrl(recipe, baseUrl);
  return await shortenUrl(longUrl);
}

/**
 * Check if URL contains a shared recipe
 */
export function getSharedRecipeFromUrl(): Recipe | null {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  const encodedRecipe = urlParams.get('recipe');
  
  if (!encodedRecipe) return null;
  
  return decodeRecipeFromUrl(encodedRecipe);
}
