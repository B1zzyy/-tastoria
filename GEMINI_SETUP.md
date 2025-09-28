# 🤖 Google Gemini AI Integration Setup

## Quick Setup (2 minutes):

### 1. Get Your Free API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### 2. Add to Environment Variables
Add this to your `.env.local` file:
```bash
GEMINI_API_KEY=your_api_key_here
```

### 3. Deploy to Vercel
Add the environment variable in Vercel:
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add: `GEMINI_API_KEY` = `your_api_key_here`
4. Redeploy

## ✨ What This Gives You:

### 🎯 Instagram Parsing
- **Perfect recipe extraction** from any Instagram caption
- **Smart title generation** from context
- **Complete ingredient lists** with proper formatting
- **Clear step-by-step instructions**
- **Automatic metadata** (prep time, cook time, servings)

### 🔧 Web Recipe Enhancement
- **Fixes fragmented instructions** automatically
- **Combines related steps** for clarity
- **Estimates missing cook times** based on cooking methods
- **Improves ingredient descriptions**
- **Removes promotional text**

### 📊 Free Tier Limits
- ✅ **15 requests per minute** (more than enough)
- ✅ **1,500 requests per day** (plenty for your users)
- ✅ **1 million tokens per request** (handles entire webpages)
- ✅ **No credit card required**

## 🧪 Test It:

1. Try parsing that problematic Instagram URL again
2. Test some websites with fragmented instructions
3. Watch the console logs for Gemini enhancement messages

**The AI will automatically kick in when needed and make your recipe parsing PERFECT!** 🚀
