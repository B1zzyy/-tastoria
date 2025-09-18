# Tastoria - Recipe Parser

A sleek and modern web application built with Next.js that transforms recipe URLs into beautifully formatted, easy-to-follow recipes. Simply paste any recipe URL from popular cooking websites and get a clean, organized display of ingredients, instructions, and nutritional information.

## ✨ Features

- **Easy URL Parsing**: Simply paste any recipe URL from popular cooking websites
- **Clean Format**: Get recipes in a beautiful, clutter-free format that's easy to follow
- **Lightning Fast**: Parse recipes in seconds with advanced extraction technology
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Dark/Light Mode**: Supports both light and dark themes
- **Structured Data**: Extracts ingredients, instructions, prep time, cooking time, and nutrition info
- **Modern UI**: Built with a custom color palette and smooth animations

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed on your machine
- npm, yarn, pnpm, or bun package manager

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd recipe-parser
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 🎯 How to Use

1. **Paste Recipe URL**: Copy any recipe URL from popular cooking websites like AllRecipes, Food Network, Bon Appétit, etc.
2. **Click Parse Recipe**: Hit the "Parse Recipe" button and wait a few seconds
3. **View Clean Recipe**: Get a beautifully formatted recipe with:
   - Clear ingredient list with measurements
   - Step-by-step instructions
   - Cooking times and serving information
   - Nutritional information (when available)
   - Recipe rating and reviews

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom color palette
- **Web Scraping**: Cheerio for HTML parsing
- **HTTP Client**: Axios for fetching web pages
- **Icons**: Lucide React
- **Deployment**: Ready for Vercel deployment

## 🎨 Custom Color Palette

The application uses a carefully crafted color palette with OKLCH color space for better color consistency:

- **Primary**: Warm earth tones
- **Secondary**: Soft yellows and creams
- **Accent**: Neutral grays
- **Background**: Clean whites and soft grays
- **Dark Mode**: Deep blues and purples with high contrast

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── parse-recipe/
│   │       └── route.ts          # API endpoint for recipe parsing
│   ├── globals.css               # Global styles and color variables
│   ├── layout.tsx                # Root layout with metadata
│   └── page.tsx                  # Main page component
├── components/
│   ├── LoadingSpinner.tsx        # Loading animation component
│   ├── RecipeDisplay.tsx         # Recipe display component
│   └── RecipeForm.tsx            # URL input form component
└── lib/
    ├── recipe-parser.ts          # Core recipe parsing logic
    └── utils.ts                  # Utility functions
```

## 🔧 API Endpoints

### POST `/api/parse-recipe`

Parses a recipe from a given URL.

**Request Body:**
```json
{
  "url": "https://example.com/recipe-url"
}
```

**Response:**
```json
{
  "recipe": {
    "title": "Recipe Title",
    "description": "Recipe description",
    "image": "https://example.com/image.jpg",
    "prepTime": "15m",
    "cookTime": "30m",
    "totalTime": "45m",
    "servings": "4",
    "ingredients": ["ingredient 1", "ingredient 2"],
    "instructions": ["step 1", "step 2"],
    "nutrition": {
      "calories": "250",
      "protein": "15g",
      "carbs": "30g",
      "fat": "8g"
    },
    "author": "Recipe Author",
    "rating": "4.5",
    "reviewCount": "123"
  }
}
```

## 🌐 Supported Websites

The parser supports recipes from most major cooking websites that use:
- JSON-LD structured data
- Microdata markup
- Common HTML patterns

Popular supported sites include:
- AllRecipes
- Food Network
- Bon Appétit
- Serious Eats
- BBC Good Food
- And many more!

## 🚀 Deployment

The application is ready for deployment on Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy with zero configuration

For other platforms, build the application:

```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🐛 Issues and Support

If you encounter any issues or have questions, please [open an issue](https://github.com/your-username/recipe-parser/issues) on GitHub.

---

Built with ❤️ using Next.js and modern web technologies.