# Recipe Cache Testing Guide

## Overview
The recipe cache system has been implemented to improve performance by caching saved recipes in memory and localStorage. The cache automatically invalidates when recipes are edited, ensuring data consistency.

## How It Works

### 1. **Cache Storage**
- **Memory Cache**: Fast access for current session
- **localStorage**: Persists across browser sessions
- **5-minute TTL**: Cache expires after 5 minutes
- **Version-based Invalidation**: Cache invalidates when recipe content changes

### 2. **Cache Invalidation**
The cache automatically invalidates when:
- Recipe title is updated
- Recipe ingredients are modified
- Recipe instructions are changed
- Recipe custom preview is updated
- Recipe is deleted
- Recipe is saved to a collection

### 3. **Cache Debugger**
A debug panel is available in development mode (bottom-right corner) showing:
- Cache size and entries
- Activity logs
- Manual cache controls

## Testing on Localhost

### Step 1: Start the Development Server
```bash
npm run dev
```

### Step 2: Open the Cache Debugger
1. Look for the database icon (🗄️) in the bottom-right corner
2. Click it to open the cache debugger panel
3. You'll see cache stats and activity logs

### Step 3: Test Cache Behavior

#### **Test 1: Initial Load**
1. Open "Saved Recipes" from the main menu
2. Watch the cache debugger - you should see cache entries being created
3. Close and reopen "Saved Recipes" - should be faster (cache hit)

#### **Test 2: Cache Invalidation on Edit**
1. Open a saved recipe
2. Click "Edit Recipe"
3. Change the title, ingredients, or instructions
4. Save the changes
5. Watch the cache debugger - you should see cache invalidation logs
6. Reopen "Saved Recipes" - cache will rebuild with fresh data

#### **Test 3: Cache Persistence**
1. Cache some recipes by opening "Saved Recipes"
2. Refresh the page (F5)
3. Open "Saved Recipes" again - should still be fast (localStorage cache)

#### **Test 4: Manual Cache Control**
1. Use the "Clear All" button in the cache debugger
2. Use the "Cleanup" button to remove expired entries
3. Watch the activity logs for cache operations

### Step 4: Verify Cache Effectiveness

#### **Performance Indicators**
- **Cache Hit**: Console shows "📦 Cache HIT for recipe [ID]"
- **Cache Miss**: Console shows "📦 Cache MISS for recipe [ID]"
- **Cache Invalidation**: Console shows "🗑️ Invalidated cache for recipe [ID]"

#### **Expected Behavior**
- First load: Cache miss, data fetched from database
- Subsequent loads: Cache hit, data served from cache
- After edits: Cache invalidated, next load fetches fresh data
- After 5 minutes: Cache expires, next load fetches fresh data

## Cache Configuration

### **Cache Duration**
- Default: 5 minutes
- Configurable in `recipeCache.ts`: `CACHE_DURATION`

### **Storage Key**
- localStorage key: `tastoria_recipe_cache`
- Can be changed in `recipeCache.ts`: `STORAGE_KEY`

### **Version Hashing**
- Uses content-based hashing for cache validation
- Changes to title, ingredients, instructions, image, or metadata invalidate cache

## Troubleshooting

### **Cache Not Working**
1. Check browser console for errors
2. Verify localStorage is enabled
3. Check cache debugger for activity logs

### **Stale Data**
1. Use "Clear All" in cache debugger
2. Check if cache invalidation is working on edits
3. Verify version hashing is detecting changes

### **Performance Issues**
1. Check cache hit/miss ratio in console
2. Monitor cache size in debugger
3. Use "Cleanup" to remove expired entries

## Development Notes

- Cache debugger only appears in development mode
- All cache operations are logged to console
- Cache is automatically cleaned up every 10 minutes
- localStorage has size limits (typically 5-10MB)

## Production Considerations

- Cache debugger is automatically disabled in production
- Consider implementing server-side caching for better performance
- Monitor cache hit rates and adjust TTL as needed
- Implement cache warming strategies for frequently accessed recipes
