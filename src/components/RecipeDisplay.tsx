'use client';

import { useState, useEffect } from 'react';
import { Recipe } from '@/lib/recipe-parser';
import { convertIngredients, convertTemperature, type UnitSystem } from '@/lib/unitConverter';
import UnitToggle from './UnitToggle';

import { Clock, Users, Star, ChefHat, List, BookOpen, Check, Play, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Confetti from './Confetti';
import RecipeAIChat from './RecipeAIChat';
import AIChatButton from './AIChatButton';

interface RecipeDisplayProps {
  recipe: Recipe;
}

export default function RecipeDisplay({ recipe }: RecipeDisplayProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showInstagramPopup, setShowInstagramPopup] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [showAIChat, setShowAIChat] = useState(false);

  // Trigger confetti when all steps are completed
  useEffect(() => {
    console.log('🔍 Confetti check:', {
      instructionsLength: recipe.instructions.length,
      completedSteps: completedSteps.size,
      shouldTrigger: recipe.instructions.length > 0 && completedSteps.size === recipe.instructions.length
    });
    
    if (recipe.instructions.length > 0 && completedSteps.size === recipe.instructions.length) {
      console.log('🎉 Triggering confetti!');
      setShowConfetti(true);
    }
  }, [completedSteps, recipe.instructions.length]);

  const toggleStep = (stepIndex: number) => {
    const newCompletedSteps = new Set(completedSteps);
    if (newCompletedSteps.has(stepIndex)) {
      newCompletedSteps.delete(stepIndex);
    } else {
      newCompletedSteps.add(stepIndex);
    }
    setCompletedSteps(newCompletedSteps);
  };

  return (
    <div className="space-y-6">
      {/* Hero Section - Recipe Image/Video & Title */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          {recipe.image === 'instagram-video' && recipe.instagramUrl ? (
            <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-gray-800 via-gray-600 to-black">
              {/* Instagram-style pattern overlay */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundSize: '30px 30px'
                }} />
              </div>
              
              {/* Clean header with Instagram badge - mobile optimized */}
              <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white/90 text-xs sm:text-sm font-medium">Instagram Recipe</p>
                    <p className="text-white/70 text-xs hidden sm:block">Tap to watch video</p>
                  </div>
                </div>
              </div>
              
              {/* Subtle play button - mobile optimized */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => setShowInstagramPopup(true)}
                  className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:scale-105 group"
                >
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white ml-0.5 group-hover:scale-110 transition-transform" fill="white" />
                </button>
              </div>
              
              {/* Clean title overlay - mobile optimized */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/60 to-transparent">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight">
                  {recipe.title}
                </h1>
              </div>
            </div>
          ) : recipe.image && recipe.image !== 'instagram-video' ? (
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={recipe.image}
                alt={recipe.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 66vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
               <div className="absolute bottom-0 left-0 right-0 p-6">
                 <h1 className="text-2xl md:text-3xl font-bold text-white">
                   {recipe.title}
                 </h1>
               </div>
            </div>
          ) : null}
          
          {!recipe.image && (
            <div className="p-6">
              <h1 className="text-2xl md:text-3xl font-bold text-card-foreground">
                {recipe.title}
              </h1>
            </div>
          )}
        </div>

        {/* Quick Info Bento */}
        <div className="lg:col-span-4 space-y-4 flex flex-col">
          {/* Time & Servings Card */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-4 flex-grow">
            <div className="grid grid-cols-2 gap-4 h-full">
              {recipe.prepTime && (
                <div className="text-center flex flex-col justify-center h-full">
                  <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">Prep</div>
                  <div className="font-semibold text-card-foreground">{recipe.prepTime}</div>
                </div>
              )}
              
              {recipe.cookTime && (
                <div className="text-center flex flex-col justify-center h-full">
                  <ChefHat className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">Cook</div>
                  <div className="font-semibold text-card-foreground">{recipe.cookTime}</div>
                </div>
              )}
              
              {recipe.servings && (
                <div className="text-center flex flex-col justify-center h-full">
                  <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">Serves</div>
                  <div className="font-semibold text-card-foreground">{recipe.servings}</div>
                </div>
              )}
              
              {recipe.difficulty && (
                <div className="text-center flex flex-col justify-center h-full">
                  <ChefHat className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">Difficulty</div>
                  <div className="font-semibold text-card-foreground">{recipe.difficulty}</div>
                </div>
              )}
            </div>
          </div>

          {/* Rating & Author Card */}
          {(recipe.rating || recipe.author) && (
            <div className="bg-card rounded-2xl shadow-sm border border-border p-4 space-y-3">
              {recipe.rating && (
                <div className="flex items-center justify-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold text-lg">{recipe.rating}</span>
                  {recipe.reviewCount && (
                    <span className="text-sm text-muted-foreground">({recipe.reviewCount})</span>
                  )}
                </div>
              )}
              
              {recipe.author && (
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Recipe by</div>
                  <div className="font-medium text-card-foreground">{recipe.author}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Ingredients Bento Box */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <List className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-card-foreground">Ingredients</h2>
            </div>
            <UnitToggle onUnitChange={setUnitSystem} />
          </div>
          
          {recipe.ingredients.length > 0 ? (
            <div className="space-y-3">
              {convertIngredients(recipe.ingredients, unitSystem).map((convertedIngredient, index) => (
                 <div
                   key={index}
                   className="p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors group"
                 >
                   <span className="text-card-foreground leading-relaxed font-medium">
                     {convertedIngredient.converted}
                   </span>
                 </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-3">
                <List className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground italic">No ingredients found</p>
            </div>
          )}
        </div>

        {/* Instructions Bento Box */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-card-foreground">Instructions</h2>
              {recipe.metadata?.instructionsGenerated && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: '#ffe0c2' }}>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#393028' }}>
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-medium" style={{ color: '#393028' }}>AI Instructions</span>
                </div>
              )}
            </div>
            
            {recipe.instructions.length > 0 && completedSteps.size > 0 && (
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-green-600">
                      {completedSteps.size}
                    </span>
                  </div>
                  <span className="text-muted-foreground">of {recipe.instructions.length}</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500 ease-out"
                    style={{ 
                      width: `${(completedSteps.size / recipe.instructions.length) * 100}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          
          {recipe.instructions.length > 0 ? (
            <div className="space-y-4">
              {recipe.instructions.map((instruction, index) => {
                const isCompleted = completedSteps.has(index);
                // Convert temperatures in instructions
                const convertedInstruction = instruction.replace(/\d+°[CF]/gi, (match) => 
                  convertTemperature(match, unitSystem)
                );
                
                return (
                  <div 
                    key={index} 
                    className={`flex gap-4 group cursor-pointer transition-all duration-300 ${
                      isCompleted ? 'opacity-70' : ''
                    }`}
                    onClick={() => toggleStep(index)}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-all duration-300 group-hover:scale-110 ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
                    }`}>
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={`leading-relaxed font-medium transition-all duration-300 ${
                        isCompleted 
                          ? 'text-muted-foreground' 
                          : 'text-card-foreground'
                      }`}>
                        {convertedInstruction}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground italic">No instructions found</p>
            </div>
          )}
        </div>

      </div>

      {/* Nutrition Bento Box */}
      {recipe.nutrition && Object.values(recipe.nutrition).some(value => value) && (
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <span className="text-primary font-bold text-lg">🥗</span>
            </div>
            <h3 className="text-xl font-bold text-card-foreground">Nutrition Information</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recipe.nutrition.calories && (
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl border border-orange-200/50 dark:border-orange-800/30 hover:scale-105 transition-transform">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{recipe.nutrition.calories}</div>
                <div className="text-sm text-orange-700/70 dark:text-orange-300/70 font-medium">Calories</div>
              </div>
            )}
            {recipe.nutrition.protein && (
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200/50 dark:border-blue-800/30 hover:scale-105 transition-transform">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{recipe.nutrition.protein}</div>
                <div className="text-sm text-blue-700/70 dark:text-blue-300/70 font-medium">Protein</div>
              </div>
            )}
            {recipe.nutrition.carbs && (
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200/50 dark:border-green-800/30 hover:scale-105 transition-transform">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{recipe.nutrition.carbs}</div>
                <div className="text-sm text-green-700/70 dark:text-green-300/70 font-medium">Carbs</div>
              </div>
            )}
            {recipe.nutrition.fat && (
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200/50 dark:border-purple-800/30 hover:scale-105 transition-transform">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{recipe.nutrition.fat}</div>
                <div className="text-sm text-purple-700/70 dark:text-purple-300/70 font-medium">Fat</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instagram Video Popup */}
      {showInstagramPopup && recipe.instagramUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-card-foreground">Watch Recipe Video</h3>
                <button
                  onClick={() => setShowInstagramPopup(false)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  This recipe was extracted from an Instagram post. Click below to view the original video on Instagram.
                </p>
                
                <a
                  href={recipe.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105"
                >
                  <ExternalLink className="w-5 h-5" />
                  Open on Instagram
                </a>
                
                <button
                  onClick={() => setShowInstagramPopup(false)}
                  className="w-full p-3 text-muted-foreground hover:text-card-foreground border border-border rounded-xl hover:bg-accent transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confetti Effect */}
      <Confetti 
        fire={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
      />

      {/* AI Chat Button */}
      <AIChatButton onClick={() => setShowAIChat(true)} />

      {/* AI Chat Panel */}
      <RecipeAIChat
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        recipe={recipe}
      />
    </div>
  );
}
