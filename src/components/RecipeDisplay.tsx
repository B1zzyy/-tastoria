'use client';

import { useState, useEffect } from 'react';
import { Recipe } from '@/lib/recipe-parser';
import { convertIngredients, convertTemperature, type UnitSystem } from '@/lib/unitConverter';
import { updateRecipeInstructions } from '@/lib/recipeService';
import UnitToggle from './UnitToggle';

import { Clock, Users, Star, ChefHat, List, BookOpen, Check, ExternalLink, X, GripVertical, Plus, Instagram } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from './Confetti';
import RecipeAIChat from './RecipeAIChat';
import AIChatButton from './AIChatButton';

interface RecipeDisplayProps {
  recipe: Recipe;
  onUpdateRecipe?: (recipe: Recipe) => void;
  isEditable?: boolean;
  savedRecipeId?: string | null;
}

export default function RecipeDisplay({ recipe, onUpdateRecipe, isEditable = false, savedRecipeId }: RecipeDisplayProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showInstagramPopup, setShowInstagramPopup] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [showAIChat, setShowAIChat] = useState(false);
  const [showEditInstructionsModal, setShowEditInstructionsModal] = useState(false);
  const [editableInstructions, setEditableInstructions] = useState<string[]>([]);
  const [instructionKeys, setInstructionKeys] = useState<string[]>([]);

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

  // Initialize editable instructions when modal opens (currently unused)
  // const openEditInstructionsModal = () => {
  //   const instructions = [...recipe.instructions];
  //   setEditableInstructions(instructions);
  //   // Generate stable keys for each instruction
  //   setInstructionKeys(instructions.map((_, index) => `instruction-${index}-${Date.now()}`));
  //   setShowEditInstructionsModal(true);
  // };

  // Auto-resize textareas when modal opens and prevent mobile keyboard issues
  useEffect(() => {
    if (showEditInstructionsModal) {
      // Prevent background scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      
      // Prevent mobile viewport issues
      const originalViewport = document.querySelector('meta[name="viewport"]');
      const originalContent = originalViewport?.getAttribute('content');
      
      // Set viewport to prevent zoom and movement (Safari-friendly)
      if (originalViewport) {
        originalViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
      }
      
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const textareas = document.querySelectorAll('.instruction-textarea');
        textareas.forEach((textarea) => {
          const element = textarea as HTMLTextAreaElement;
          element.style.height = 'auto';
          element.style.height = element.scrollHeight + 'px';
        });
      }, 100);
      
      // Cleanup function to restore original viewport and scroll
      return () => {
        // Restore background scroll
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        
        if (originalViewport && originalContent) {
          originalViewport.setAttribute('content', originalContent);
        }
      };
    }
  }, [showEditInstructionsModal, editableInstructions]);

  // Cleanup on unmount to ensure scroll is restored
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, []);

  // Handle instruction text changes
  const updateInstruction = (index: number, text: string) => {
    const newInstructions = [...editableInstructions];
    const newKeys = [...instructionKeys];
    
    // Auto-delete step if text is empty and there's more than one step
    if (text.trim() === '' && newInstructions.length > 1) {
      newInstructions.splice(index, 1);
      newKeys.splice(index, 1);
    } else {
      newInstructions[index] = text;
    }
    
    setEditableInstructions(newInstructions);
    setInstructionKeys(newKeys);
  };


  // Handle adding new instruction
  const addInstruction = (index: number) => {
    const newInstructions = [...editableInstructions];
    const newKeys = [...instructionKeys];
    const newKey = `instruction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    newInstructions.splice(index + 1, 0, '');
    newKeys.splice(index + 1, 0, newKey);
    
    setEditableInstructions(newInstructions);
    setInstructionKeys(newKeys);
  };

  // Handle saving instructions
  const saveInstructions = async () => {
    // Filter out empty instructions and update the recipe
    const filteredInstructions = editableInstructions.filter(instruction => instruction.trim() !== '');
    
    // Create updated recipe with new instructions
    const updatedRecipe = {
      ...recipe,
      instructions: filteredInstructions
    };
    
    // Call the onUpdateRecipe callback to update the parent component
    if (onUpdateRecipe) {
      onUpdateRecipe(updatedRecipe);
    }
    
    // Save to database if this is a saved recipe
    if (savedRecipeId && isEditable) {
      try {
        const { error } = await updateRecipeInstructions(savedRecipeId, filteredInstructions);
        if (error) {
          console.error('Failed to save instructions:', error);
          // You could show a toast notification here
        }
      } catch (error) {
        console.error('Error saving instructions:', error);
      }
    }
    
    // Close the modal
    setShowEditInstructionsModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Hero Section - Recipe Image/Video & Title */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          {(() => {
            // Check for custom preview first
            const customPreview = recipe.metadata?.customPreview;
            
            if (customPreview?.type === 'emoji') {
              const gradient = customPreview.gradient || 'from-yellow-400 to-orange-500';
              
              // Check if it's a custom gradient (starts with #)
              if (gradient.startsWith('#')) {
                const colors = gradient.split('-');
                if (colors.length === 2) {
                  return (
                    <div 
                      className="relative aspect-video overflow-hidden flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`
                      }}
                    >
                      <div className="text-8xl md:text-9xl">
                        {customPreview.value}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
                          {recipe.title}
                        </h1>
                      </div>
                      {/* Instagram open button - top right corner */}
                      {recipe.image === 'instagram-video' && recipe.instagramUrl && (
                        <div className="absolute top-4 right-4">
                          <button
                            onClick={() => setShowInstagramPopup(true)}
                            className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:scale-105 group"
                          >
                            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:scale-110 transition-transform" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
              }
              
              return (
                <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <div className="text-8xl md:text-9xl">
                    {customPreview.value}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
                      {recipe.title}
                    </h1>
                  </div>
                  {/* Instagram open button - top right corner */}
                  {recipe.image === 'instagram-video' && recipe.instagramUrl && (
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={() => setShowInstagramPopup(true)}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:scale-105 group"
                      >
                        <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>
              );
            } else if (customPreview?.type === 'image') {
              return (
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={customPreview.value}
                    alt={recipe.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 66vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
                      {recipe.title}
                    </h1>
                  </div>
                  {/* Instagram open button - top right corner */}
                  {recipe.image === 'instagram-video' && recipe.instagramUrl && (
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={() => setShowInstagramPopup(true)}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:scale-105 group"
                      >
                        <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>
              );
            } else if (recipe.image && recipe.image !== 'instagram-video') {
              // Fall back to original image
              return (
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={recipe.image}
                    alt={recipe.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 66vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
                      {recipe.title}
                    </h1>
                  </div>
                  {/* Instagram open button - top right corner */}
                  {recipe.image === 'instagram-video' && recipe.instagramUrl && (
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={() => setShowInstagramPopup(true)}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:scale-105 group"
                      >
                        <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>
              );
            } else if (recipe.image === 'instagram-video' && recipe.instagramUrl) {
              // Fallback for Instagram recipes without custom preview - use same graphic as SavedRecipes
              return (
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-gray-700 via-gray-800 to-black flex items-center justify-center">
                  {/* Instagram logo - same as SavedRecipes default */}
                  <Instagram className="w-16 h-16 sm:w-20 sm:h-20 text-white" />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
                      {recipe.title}
                    </h1>
                  </div>
                  {/* Instagram open button - top right corner */}
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => setShowInstagramPopup(true)}
                      className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:scale-105 group"
                    >
                      <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {!recipe.image && !recipe.metadata?.customPreview && (
            <div className="p-6">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-card-foreground leading-tight tracking-tight">
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
              {recipe.totalTime && (
                <div className="text-center flex flex-col justify-center h-full">
                  <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="font-semibold text-card-foreground">{recipe.totalTime}</div>
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
                    className={`p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors group cursor-pointer ${
                      isCompleted ? 'opacity-70' : ''
                    }`}
                    onClick={() => toggleStep(index)}
                  >
                    <div className="flex gap-4">
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

      {/* Edit Instructions Modal */}
      <AnimatePresence>
        {showEditInstructionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto scrollbar-hide mx-auto"
              style={{
                maxHeight: '80vh',
                width: 'calc(100vw - 2rem)',
                maxWidth: '32rem'
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-card-foreground">Edit Instructions</h2>
                <button
                  onClick={() => setShowEditInstructionsModal(false)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Instructions List */}
              <div className="space-y-4 mb-6">
                <AnimatePresence mode="popLayout">
                  {editableInstructions.map((instruction, index) => (
                    <motion.div
                      key={instructionKeys[index] || `instruction-${index}`}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 30,
                        opacity: { duration: 0.2 },
                        scale: { duration: 0.2 }
                      }}
                      layout
                      className="flex items-start gap-3 p-4 bg-background border border-border rounded-xl"
                    >
                    {/* Drag Handle */}
                    <div className="flex flex-col items-center gap-2 mt-1">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-semibold text-primary">
                        {index + 1}
                      </div>
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    </div>

                    {/* Instruction Input */}
                    <div className="flex-1">
                      <textarea
                        value={instruction}
                        onChange={(e) => {
                          updateInstruction(index, e.target.value);
                          // Auto-resize textarea
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        className="instruction-textarea w-full p-3 bg-background border border-border rounded-lg text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none overflow-hidden"
                        style={{
                          fontSize: '16px', // Prevents zoom on iOS
                          transform: 'translateZ(0)', // Hardware acceleration
                          backfaceVisibility: 'hidden', // Prevents flickering
                          minHeight: '60px'
                        }}
                        placeholder="Enter instruction..."
                      />
                    </div>

                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Add New Instruction Button */}
              <div className="mb-6">
                <button
                  onClick={() => addInstruction(editableInstructions.length - 1)}
                  className="w-full p-4 border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                >
                  <Plus className="w-5 h-5" />
                  Add New Instruction
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditInstructionsModal(false)}
                  className="flex-1 px-4 py-2 text-muted-foreground hover:text-card-foreground border border-border rounded-xl hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveInstructions}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
