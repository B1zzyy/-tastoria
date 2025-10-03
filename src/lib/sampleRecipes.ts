import { Recipe } from './recipe-parser';

export const sampleChocolateChipCookies: Recipe = {
  id: 'sample-chocolate-chip-cookies',
  title: 'Classic Chocolate Chip Cookies',
  image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&h=600&fit=crop',
  description: 'Soft, chewy, and perfectly sweet chocolate chip cookies that are sure to be a hit with everyone!',
  servings: '24 cookies',
  totalTime: '30 minutes',
  prepTime: '15 minutes',
  cookTime: '12 minutes',
  difficulty: 'Easy',
  cuisine: 'American',
  category: 'Dessert',
  author: 'Tastoria Kitchen',
  ingredients: [
    '2 1/4 cups all-purpose flour',
    '1 tsp baking soda',
    '1 tsp salt',
    '1 cup butter, softened',
    '3/4 cup granulated sugar',
    '3/4 cup packed brown sugar',
    '2 large eggs',
    '2 tsp vanilla extract',
    '2 cups semi-sweet chocolate chips',
    '1 cup chopped walnuts (optional)'
  ],
  instructions: [
    'Preheat oven to 375°F (190°C). Line baking sheets with parchment paper.',
    'In a medium bowl, whisk together flour, baking soda, and salt. Set aside.',
    'In a large bowl, cream together butter, granulated sugar, and brown sugar until light and fluffy, about 3-4 minutes.',
    'Beat in eggs one at a time, then stir in vanilla extract.',
    'Gradually blend in the flour mixture until just combined.',
    'Fold in chocolate chips and walnuts (if using).',
    'Drop rounded tablespoons of dough onto prepared baking sheets, spacing about 2 inches apart.',
    'Bake for 9-11 minutes or until golden brown around the edges.',
    'Cool on baking sheets for 2 minutes before removing to wire racks to cool completely.',
    'Store in an airtight container at room temperature for up to 1 week.'
  ],
  nutrition: {
    calories: 180,
    protein: '2g',
    carbohydrates: '22g',
    fat: '9g',
    fiber: '1g',
    sugar: '14g',
    sodium: '150mg',
    cholesterol: '25mg'
  },
  tags: ['dessert', 'cookies', 'chocolate', 'baking', 'sweet', 'family-friendly'],
  notes: 'For extra chewy cookies, slightly underbake them. For crispier cookies, bake for the full 11 minutes.',
  metadata: {
    instructionsGenerated: true,
    customPreview: {
      type: 'emoji',
      value: '🍪',
      gradient: 'from-yellow-400 to-orange-500'
    }
  }
};

export const sampleRecipes: Recipe[] = [
  sampleChocolateChipCookies
];
