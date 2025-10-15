'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';
import { Recipe } from '@/lib/recipe-parser';
import { supabase } from '@/lib/supabase';
import SplitText from './SplitText';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface RecipeAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
}

export default function RecipeAIChat({ isOpen, onClose, recipe }: RecipeAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isQuickQuestionsDragging, setIsQuickQuestionsDragging] = useState(false);
  const [quickQuestionsStartX, setQuickQuestionsStartX] = useState(0);
  const [quickQuestionsScrollLeft, setQuickQuestionsScrollLeft] = useState(0);
  const [welcomeAnimationComplete, setWelcomeAnimationComplete] = useState(false);
  const quickQuestionsRef = useRef<HTMLDivElement>(null);
  const [animatedMessages, setAnimatedMessages] = useState<Set<string>>(new Set());

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Prevent background scrolling when chat is open on mobile
  useEffect(() => {
    if (isOpen) {
      // Prevent background scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      // Restore background scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Create a fun, dynamic description of the recipe
      const getFunRecipeDescription = (title: string) => {
        const descriptions = [
          `this delicious ${title.toLowerCase()}`,
          `this mouthwatering ${title.toLowerCase()}`,
          `this scrumptious ${title.toLowerCase()}`,
          `this incredible ${title.toLowerCase()}`,
          `this amazing ${title.toLowerCase()}`,
          `this fantastic ${title.toLowerCase()}`,
          `this wonderful ${title.toLowerCase()}`,
          `this spectacular ${title.toLowerCase()}`
        ];
        return descriptions[Math.floor(Math.random() * descriptions.length)];
      };

      const welcomeMessage: Message = {
        id: 'welcome',
        content: `Hi! I'm Tasty, your personal AI chef! 🍳\n\nI can help you with any questions you have about ${getFunRecipeDescription(recipe.title)}. Ask me about substitutions, modifications, cooking tips, or anything else!`,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, recipe.title, messages.length]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Debug: Log recipe data
      console.log('🤖 AI Chat - Recipe data:', {
        title: recipe.title,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        aiInstructions: recipe.metadata?.aiInstructions,
        hasIngredients: Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0,
        hasInstructions: Array.isArray(recipe.instructions) && recipe.instructions.length > 0,
        hasAIInstructions: recipe.metadata?.aiInstructions && recipe.metadata.aiInstructions.length > 0
      });

      // Helper function to format ingredients
      const formatIngredients = (ingredients: any) => {
        if (!Array.isArray(ingredients)) return 'No ingredients available';
        
        return ingredients.map(ingredient => {
          // If it's a string, return as is
          if (typeof ingredient === 'string') {
            return ingredient;
          }
          // If it's an IngredientSection object
          if (typeof ingredient === 'object' && ingredient.ingredients) {
            const sectionTitle = ingredient.title ? `${ingredient.title}: ` : '';
            return sectionTitle + ingredient.ingredients.join(', ');
          }
          // Fallback for any other format
          return String(ingredient);
        }).join(', ');
      };

      // Create context-aware prompt
      const recipeContext = `
Recipe: ${recipe.title}
Ingredients: ${formatIngredients(recipe.ingredients)}
Instructions: ${Array.isArray(recipe.instructions) && recipe.instructions.length > 0 ? recipe.instructions.join(' | ') : (recipe.metadata?.aiInstructions && recipe.metadata.aiInstructions.length > 0 ? recipe.metadata.aiInstructions.join(' | ') : 'No instructions available')}
${recipe.prepTime ? `Prep Time: ${recipe.prepTime}` : ''}
${recipe.cookTime ? `Cook Time: ${recipe.cookTime}` : ''}
${recipe.servings ? `Servings: ${recipe.servings}` : ''}
${recipe.difficulty ? `Difficulty: ${recipe.difficulty}` : ''}
      `.trim();

      // Prepare conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          message: inputValue.trim(),
          recipeContext,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle authentication and authorization errors
        if (response.status === 401) {
          throw new Error('Please log in to use AI chat');
        } else if (response.status === 403) {
          throw new Error('Premium subscription required for AI chat');
        }
        
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Oops! It looks like the kitchen is catching on fire! Give me a few hours to restore this mishap. 🥹 (Tasty is currently undergoing maintenance. Please try again later.)",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Quick questions drag handlers
  const handleQuickQuestionsMouseDown = (e: React.MouseEvent) => {
    if (quickQuestionsRef.current) {
      setIsQuickQuestionsDragging(true);
      setQuickQuestionsStartX(e.pageX - quickQuestionsRef.current.offsetLeft);
      setQuickQuestionsScrollLeft(quickQuestionsRef.current.scrollLeft);
    }
  };

  const handleQuickQuestionsMouseLeave = () => {
    setIsQuickQuestionsDragging(false);
  };

  const handleQuickQuestionsMouseUp = () => {
    setIsQuickQuestionsDragging(false);
  };

  const handleQuickQuestionsMouseMove = (e: React.MouseEvent) => {
    if (!isQuickQuestionsDragging || !quickQuestionsRef.current) return;
    e.preventDefault();
    const x = e.pageX - quickQuestionsRef.current.offsetLeft;
    const walk = (x - quickQuestionsStartX) * 2; // Multiply for faster scrolling
    quickQuestionsRef.current.scrollLeft = quickQuestionsScrollLeft - walk;
  };

  const quickQuestions = [
    "Can I substitute any ingredients?",
    "How can I make this healthier?",
    "What if I don't have all ingredients?",
    "Any cooking tips for this recipe?"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />
          
          {/* Chat Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-96 bg-card border-l border-border z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">Tasty</h3>
                  <p className="text-xs text-muted-foreground">Your AI cooking assistant</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender === 'ai' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground ml-12'
                        : 'bg-accent/20 text-card-foreground border border-white/10'
                    }`}
                  >
                    {message.sender === 'ai' ? (
                      message.id === 'welcome' ? (
                        <SplitText
                          key="welcome-message"
                          text={message.content}
                          className="text-sm whitespace-pre-wrap"
                          delay={15}
                          duration={0.2}
                          ease="power2.out"
                          splitType="chars"
                          from={{ opacity: 0, y: 20 }}
                          to={{ opacity: 1, y: 0 }}
                          threshold={0.1}
                          rootMargin="0px"
                          textAlign="left"
                          tag="p"
                          shouldAnimate={!animatedMessages.has(message.id)}
                          onLetterAnimationComplete={() => {
                            setAnimatedMessages(prev => new Set(prev).add(message.id));
                            setWelcomeAnimationComplete(true);
                          }}
                        />
                      ) : (
                        <div className="text-sm prose prose-sm prose-invert max-w-none">
                          <ReactMarkdown 
                            components={{
                              p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-2 ml-4">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-2 ml-4">{children}</ol>,
                              li: ({ children }) => <li className="text-sm leading-relaxed mb-1">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                              h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 mt-4 first:mt-0">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
                              blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-3 italic my-2">{children}</blockquote>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>

                  {message.sender === 'user' && (
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-card-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 justify-start"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="bg-accent/20 text-card-foreground border border-white/10 p-3 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}


              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-card/50 backdrop-blur-md">
              {/* Show input and questions only after welcome animation completes */}
              {welcomeAnimationComplete && (
                <>
                  {/* Quick Questions Pills */}
                  {messages.length === 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mb-3"
                    >
                      <div className="relative">
                        <div 
                          ref={quickQuestionsRef}
                          className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 select-none" 
                          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                          onMouseDown={handleQuickQuestionsMouseDown}
                          onMouseLeave={handleQuickQuestionsMouseLeave}
                          onMouseUp={handleQuickQuestionsMouseUp}
                          onMouseMove={handleQuickQuestionsMouseMove}
                        >
                          {quickQuestions.map((question, index) => (
                            <button
                              key={index}
                              onClick={() => setInputValue(question)}
                              className="flex-shrink-0 px-3 py-1.5 text-xs bg-accent/20 hover:bg-accent/40 text-card-foreground rounded-full border border-white/10 hover:border-primary/30 transition-all duration-200 whitespace-nowrap"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                        {/* Gradient fade edges */}
                        <div className="absolute left-0 top-0 bottom-1 w-4 bg-gradient-to-r from-card/50 to-transparent pointer-events-none"></div>
                        <div className="absolute right-0 top-0 bottom-1 w-4 bg-gradient-to-l from-card/50 to-transparent pointer-events-none"></div>
                      </div>
                    </motion.div>
                  )}

                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex gap-2 items-center"
                  >
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask Tasty about this recipe..."
                      className="flex-1 px-3 py-2 h-10 bg-background border border-border rounded-lg text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      className="px-3 h-10 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
