import { useState, useEffect, useCallback } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string; // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  arrowDirection?: 'up' | 'down' | 'left' | 'right';
  action?: 'click' | 'type' | 'scroll' | 'wait';
  actionText?: string;
  skipable?: boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Tastoria!',
    description: 'Your AI-powered recipe parser that works with any website or Instagram post. Let\'s take a quick tour!',
    position: 'center',
    skipable: true
  },
  {
    id: 'web-parsing',
    title: 'Parse Any Recipe Website',
    description: 'Paste any recipe URL from websites like AllRecipes, Food Network, or any cooking blog. Our AI will extract all the details!',
    targetElement: '[data-tutorial="url-input"]',
    position: 'bottom',
    arrowDirection: 'up',
    action: 'type',
  },
  {
    id: 'instagram-toggle',
    title: 'Instagram Recipe Parsing',
    description: 'Toggle to Instagram mode to parse recipes from Instagram posts and reels. Works great with food content creators!',
    targetElement: '[data-tutorial="source-toggle"]',
    position: 'bottom',
    arrowDirection: 'up',
    action: 'click',
  },
  {
    id: 'parse-button',
    title: 'Parse Your Recipe',
    description: 'Click this button to start parsing. Our AI will extract ingredients, instructions, nutrition facts, and more!',
    targetElement: '[data-tutorial="parse-button"]',
    position: 'top',
    arrowDirection: 'down',
    action: 'click',
  },
  {
    id: 'save-recipe',
    title: 'Save to Collections',
    description: 'Once you parse a recipe, you\'ll see a save button appear. Save your favorite recipes to collections for easy access!',
    position: 'center'
  },
  {
    id: 'collections',
    title: 'View Your Collections',
    description: 'Access all your saved recipes and collections. Organize them by cuisine, meal type, or any way you prefer!',
    targetElement: '[data-tutorial="collections-button"]',
    position: 'bottom',
    arrowDirection: 'up',
    action: 'click',
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🎉',
    description: 'You now know how to parse recipes from any website or Instagram post. Start building your digital cookbook!',
    position: 'center',
    skipable: true
  }
];

export const useTutorial = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Check if tutorial was completed before
  useEffect(() => {
    const completed = localStorage.getItem('tastoria-tutorial-completed');
    setIsCompleted(completed === 'true');
  }, []);

  const startTutorial = useCallback(() => {
    setIsActive(true);
    setCurrentStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      completeTutorial();
    }
  }, [currentStepIndex]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const skipTutorial = useCallback(() => {
    completeTutorial();
  }, []);

  const completeTutorial = useCallback(() => {
    setIsActive(false);
    setIsCompleted(true);
    localStorage.setItem('tastoria-tutorial-completed', 'true');
  }, []);

  const resetTutorial = useCallback(() => {
    setIsCompleted(false);
    localStorage.removeItem('tastoria-tutorial-completed');
  }, []);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / TUTORIAL_STEPS.length) * 100;

  return {
    isActive,
    isCompleted,
    currentStep,
    currentStepIndex,
    progress,
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
    resetTutorial,
    totalSteps: TUTORIAL_STEPS.length
  };
};
