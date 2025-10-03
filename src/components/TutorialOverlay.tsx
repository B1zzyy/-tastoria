'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type TutorialStep } from '@/hooks/useTutorial';
import { X, ChevronLeft, ChevronRight, SkipForward, ChefHat } from 'lucide-react';
import './TutorialOverlay.css';

interface TutorialOverlayProps {
  isActive: boolean;
  currentStep: TutorialStep;
  currentStepIndex: number;
  progress: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
  totalSteps: number;
}

export default function TutorialOverlay({
  isActive,
  currentStep,
  currentStepIndex,
  progress,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  totalSteps
}: TutorialOverlayProps) {
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Render appropriate icon for each step
  const renderStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'welcome':
        return <ChefHat className="w-5 h-5 text-white" />;
      case 'web-parsing':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" color="#ffffff" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth="1.5"></circle>
            <ellipse cx="12" cy="12" rx="4" ry="10" stroke="#ffffff" strokeWidth="1.5"></ellipse>
            <path d="M2 12H22" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        );
      case 'instagram-toggle':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" color="#ffffff" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="#ffffff" strokeWidth="1.5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" stroke="#ffffff" strokeWidth="1.5"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="#ffffff" strokeWidth="1.5"></line>
          </svg>
        );
      case 'parse-button':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" color="#ffffff" fill="none">
            <path d="M11 6L21 6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path>
            <path d="M11 12L21 12" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path>
            <path d="M11 18L21 18" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path>
            <path d="M3 7.39286C3 7.39286 4 8.04466 4.5 9C4.5 9 6 5.25 8 4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M3 18.3929C3 18.3929 4 19.0447 4.5 20C4.5 20 6 16.25 8 15" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        );
      case 'save-recipe':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" color="#ffffff" fill="none">
            <path d="M4 17.9808V9.70753C4 6.07416 4 4.25748 5.17157 3.12874C6.34315 2 8.22876 2 12 2C15.7712 2 17.6569 2 18.8284 3.12874C20 4.25748 20 6.07416 20 9.70753V17.9808C20 20.2867 20 21.4396 19.2272 21.8523C17.7305 22.6514 14.9232 19.9852 13.59 19.1824C12.8168 18.7168 12.4302 18.484 12 18.484C11.5698 18.484 11.1832 18.7168 10.41 19.1824C9.0768 19.9852 6.26947 22.6514 4.77285 21.8523C4 21.4396 4 20.2867 4 17.9808Z" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        );
      case 'ai-chat':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" color="#ffffff" fill="none">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M13 8H7" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M17 12H7" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        );
      case 'collections':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" color="#ffffff" fill="none">
            <path d="M3 17.9808V12.7075C3 9.07416 3 7.25748 4.09835 6.12874C5.1967 5 6.96447 5 10.5 5C14.0355 5 15.8033 5 16.9017 6.12874C18 7.25748 18 9.07416 18 12.7075V17.9808C18 20.2867 18 21.4396 17.2755 21.8523C15.8724 22.6514 13.2405 19.9852 11.9906 19.1824C11.2657 18.7168 10.9033 18.484 10.5 18.484C10.0967 18.484 9.73425 18.7168 9.00938 19.1824C7.7595 19.9852 5.12763 22.6514 3.72454 21.8523C3 21.4396 3 20.2867 3 17.9808Z" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M9 2H11C15.714 2 18.0711 2 19.5355 3.46447C21 4.92893 21 7.28595 21 12V18" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  // Find and highlight the target element
  useEffect(() => {
    // Reset highlight state when step changes to ensure animation triggers
    setHighlightedElement(null);
    setHighlightRect(null);
    
    if (!isActive || !currentStep.targetElement) {
      return;
    }

    const findElement = () => {
      // Query all matches (there can be mobile and desktop duplicates)
      const nodeList = document.querySelectorAll(currentStep.targetElement!);
      const candidates = Array.from(nodeList) as HTMLElement[];
      
      console.log(`🔍 Looking for element: ${currentStep.targetElement}, found ${candidates.length} candidates`);
      
      for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        console.log(`📏 Element rect:`, rect, `isVisible: ${isVisible}`);
        if (isVisible) {
          // Add a small delay to ensure animation triggers
          setTimeout(() => {
            // Scroll to element on mobile devices only
            if (windowSize.width > 0 && windowSize.width < 768) {
              try {
                el.scrollIntoView({ 
                  block: 'center', 
                  inline: 'center', 
                  behavior: 'smooth' 
                });
              } catch (error) {
                console.warn('Failed to scroll to element:', error);
              }
            }
            
            setHighlightedElement(el);
            setHighlightRect(rect);
            console.log('✅ Found tutorial element:', currentStep.targetElement);
          }, 50);
          return true;
        }
      }
      
      // As a last resort, pick the first and scroll it into view then re-measure
      if (candidates.length > 0) {
        const el = candidates[0];
        try {
          el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as ScrollBehavior });
        } catch { /* no-op */ }
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          // Add a small delay to ensure animation triggers
          setTimeout(() => {
            // Scroll to element on mobile devices only (additional scroll for fallback case)
            if (windowSize.width > 0 && windowSize.width < 768) {
              try {
                el.scrollIntoView({ 
                  block: 'center', 
                  inline: 'center', 
                  behavior: 'smooth' 
                });
              } catch (error) {
                console.warn('Failed to scroll to element in fallback:', error);
              }
            }
            
            setHighlightedElement(el);
            setHighlightRect(rect);
            console.log('✅ Found tutorial element after scroll');
          }, 50);
          return true;
        }
      }
      return false;
    };

    // Try to find element immediately
    if (!findElement()) {
      // If not found, try multiple times with increasing delays
      const attempts = [100, 300, 500, 1000, 2000];
      let attemptIndex = 0;
      
      const tryAgain = () => {
        if (attemptIndex < attempts.length) {
          setTimeout(() => {
            console.log(`🔄 Retry attempt ${attemptIndex + 1} for: ${currentStep.targetElement}`);
            if (!findElement()) {
              attemptIndex++;
              tryAgain();
            }
          }, attempts[attemptIndex]);
        } else {
          console.warn('❌ Could not find tutorial element:', currentStep.targetElement);
        }
      };
      
      tryAgain();
    }
  }, [isActive, currentStep.targetElement, currentStepIndex, windowSize.width]);

  // Update highlight position on scroll/resize
  useEffect(() => {
    if (!highlightedElement) return;

    const updatePosition = () => {
      const rect = highlightedElement.getBoundingClientRect();
      setHighlightRect(rect);
    };

    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [highlightedElement]);

  // Track window size for responsive positioning
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    // Set initial size
    updateWindowSize();

    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 pointer-events-auto"
      >
        {/* Backdrop with blur - create cutout effect */}
        {highlightRect ? (
          <>
            {/* Top section */}
            <div 
              className="absolute bg-black/30 backdrop-blur-md"
              style={{
                top: 0,
                left: 0,
                right: 0,
                height: highlightRect.top - 12
              }}
            />
            {/* Bottom section */}
            <div 
              className="absolute bg-black/30 backdrop-blur-md"
              style={{
                top: highlightRect.bottom + 12,
                left: 0,
                right: 0,
                bottom: 0
              }}
            />
            {/* Left section */}
            <div 
              className="absolute bg-black/30 backdrop-blur-md"
              style={{
                top: highlightRect.top - 12,
                left: 0,
                right: `calc(100% - ${highlightRect.left - 12}px)`,
                height: highlightRect.height + 24
              }}
            />
            {/* Right section */}
            <div 
              className="absolute bg-black/30 backdrop-blur-md"
              style={{
                top: highlightRect.top - 12,
                left: highlightRect.right + 12,
                right: 0,
                height: highlightRect.height + 24
              }}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />
        )}
        
        {/* Highlight overlay */}
        {highlightRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute border-2 rounded-xl"
            style={{
              left: highlightRect.left - 12,
              top: highlightRect.top - 12,
              width: highlightRect.width + 24,
              height: highlightRect.height + 24,
              borderColor: '#ffe0c2',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4), 0 0 30px rgba(255, 224, 194, 0.6), inset 0 0 20px rgba(255, 224, 194, 0.2)'
            }}
          />
        )}

        {/* Tutorial content - Smart positioning for mobile, fixed for desktop */}
        <motion.div 
          className="fixed z-10"
          animate={{
            // Smart positioning for mobile devices and save button
            ...(windowSize.width > 0 && windowSize.width < 768 && highlightRect ? {
              // Position away from highlighted element on mobile
              left: highlightRect.left < windowSize.width / 2 ? 
                Math.min(highlightRect.right + 16, windowSize.width - 320 - 16) : 
                Math.max(highlightRect.left - 320 - 16, 16),
              top: highlightRect.top < windowSize.height / 2 ? 
                Math.min(highlightRect.bottom + 16, windowSize.height - 400 - 16) : 
                Math.max(highlightRect.top - 400 - 16, 16),
              right: 'auto',
              bottom: 'auto'
            } : highlightRect && currentStep.id === 'ai-chat' ? {
              // Special positioning for AI chat button on desktop - move panel up and left
              bottom: '7rem',
              right: '1rem',
              left: 'auto',
              top: 'auto'
            } : {
              // Default fixed positioning for desktop or when no highlight
              bottom: '1rem',
              right: '1rem',
              left: 'auto',
              top: 'auto'
            })
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.4
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-80"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: '#ffe0c2', color: '#393028' }}
                >
                  {currentStepIndex + 1}
                </div>
              </div>
              <button
                onClick={onSkip}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                title="Skip tutorial"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="px-5 py-3">
              <div className="w-full bg-white/20 rounded-full h-1.5">
                <motion.div
                  className="h-1.5 rounded-full"
                  style={{ background: '#ffe0c2' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                {currentStep.title}
                {renderStepIcon(currentStep.id)}
              </h2>
              <p className="text-white/80 leading-relaxed mb-4 text-sm">
                {currentStep.description}
              </p>
              
              {currentStep.actionText && (
                <div 
                  className="rounded-lg p-3 mb-4 border"
                  style={{ 
                    background: 'rgba(255, 224, 194, 0.1)', 
                    borderColor: 'rgba(255, 224, 194, 0.3)' 
                  }}
                >
                  <p className="text-white/90 text-sm font-medium">
                    💡 {currentStep.actionText}
                  </p>
                </div>
              )}
              
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-white/10">
              {currentStepIndex === 0 ? (
                // First step: Show skip button in place of Previous
                currentStep.skipable ? (
                  <button
                    onClick={onSkip}
                    className="flex items-center gap-1.5 px-3 py-2 text-white/60 hover:text-white/80 transition-colors text-sm"
                  >
                    <SkipForward className="w-4 h-4" />
                    Skip
                  </button>
                ) : (
                  <div></div>
                )
              ) : (
                // Other steps: Show Previous button
                <button
                  onClick={onPrevious}
                  className="flex items-center gap-1.5 px-3 py-2 text-white/70 hover:text-white transition-colors text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
              )}

              <div className="flex items-center gap-2">
                {currentStep.skipable && currentStepIndex !== 0 && currentStepIndex !== totalSteps - 1 && (
                  <button
                    onClick={onSkip}
                    className="flex items-center gap-1.5 px-3 py-2 text-white/60 hover:text-white/80 transition-colors text-sm"
                  >
                    <SkipForward className="w-4 h-4" />
                    Skip
                  </button>
                )}
                
                <button
                  onClick={currentStepIndex === totalSteps - 1 ? onComplete : onNext}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl text-sm ${
                    currentStepIndex === totalSteps - 1 
                      ? 'whitespace-nowrap' 
                      : 'whitespace-nowrap flex items-center gap-1.5'
                  }`}
                  style={{ 
                    background: '#ffe0c2', 
                    color: '#393028' 
                  }}
                >
                  {currentStepIndex === totalSteps - 1 ? (
                    'Get Started!'
                  ) : (
                    <>
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>

      </motion.div>
    </AnimatePresence>
  );
}

