'use client';

import { motion } from 'framer-motion';
import { List, BookOpen } from 'lucide-react';

export default function RecipeSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Image/Title Card */}
        <div className="lg:col-span-8 bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-muted/30 to-muted/50 flex items-center justify-center">
            {/* Pulsing gradient background */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-muted/20 via-muted/40 to-muted/20"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* Title skeleton */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              <motion.div
                className="h-6 sm:h-8 bg-muted-foreground/20 rounded-lg mb-2 w-3/4 max-w-sm"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.2
                }}
              />
              <motion.div
                className="h-4 sm:h-6 bg-muted-foreground/15 rounded-md w-1/2 max-w-xs"
                animate={{
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.4
                }}
              />
            </div>
          </div>
        </div>

        {/* Quick Info Bento Skeleton */}
        <div className="lg:col-span-4 space-y-4 flex flex-col">
          {/* Time & Servings Card */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-4 flex-grow">
            <div className="grid grid-cols-2 gap-4 h-full">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="text-center flex flex-col justify-center h-full">
                  <motion.div
                    className="w-5 h-5 bg-muted-foreground/20 rounded mx-auto mb-1"
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: item * 0.1
                    }}
                  />
                  <motion.div
                    className="h-3 bg-muted-foreground/15 rounded mx-auto mb-1 w-3/5 max-w-12"
                    animate={{
                      opacity: [0.2, 0.5, 0.2],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: item * 0.1 + 0.2
                    }}
                  />
                  <motion.div
                    className="h-4 bg-muted-foreground/20 rounded mx-auto w-4/5 max-w-16"
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: item * 0.1 + 0.4
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rating & Author Card */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-4 space-y-3">
            <motion.div
              className="flex items-center justify-center gap-2"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="w-5 h-5 bg-muted-foreground/20 rounded" />
              <div className="h-5 bg-muted-foreground/20 rounded w-10" />
            </motion.div>
            
            <motion.div
              className="text-center"
              animate={{
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3
              }}
            >
              <div className="h-3 bg-muted-foreground/15 rounded mx-auto mb-1 w-1/2 max-w-16" />
              <div className="h-4 bg-muted-foreground/20 rounded mx-auto w-3/4 max-w-20" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content Bento Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Ingredients Skeleton */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <List className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-card-foreground">Ingredients</h2>
            </div>
            <motion.div
              className="h-6 sm:h-8 bg-muted-foreground/20 rounded-lg w-16 sm:w-20"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            {/* First section */}
            <div className="space-y-2 sm:space-y-3">
              <motion.div
                className="relative mb-4"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.1
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-muted-foreground/10 via-muted-foreground/5 to-transparent rounded-lg"></div>
                <div className="relative h-4 sm:h-5 bg-muted-foreground/20 rounded-lg w-1/3 max-w-32 px-4 py-3 bg-card/80 border border-muted-foreground/20 shadow-sm"></div>
              </motion.div>
              {[1, 2, 3].map((item) => (
                <motion.div
                  key={item}
                  className="p-2 sm:p-3 rounded-xl bg-accent/30 overflow-hidden"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: item * 0.1 + 0.2
                  }}
                >
                  <div className={`h-3 sm:h-4 bg-muted-foreground/20 rounded ${
                    item === 1 ? 'w-1/3 max-w-32' :
                    item === 2 ? 'w-2/3 max-w-48' :
                    'w-3/4 max-w-52'
                  }`} />
                </motion.div>
              ))}
            </div>

            {/* Second section */}
            <div className="space-y-2 sm:space-y-3">
              <motion.div
                className="relative mb-4"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-muted-foreground/10 via-muted-foreground/5 to-transparent rounded-lg"></div>
                <div className="relative h-4 sm:h-5 bg-muted-foreground/20 rounded-lg w-1/4 max-w-28 px-4 py-3 bg-card/80 border border-muted-foreground/20 shadow-sm"></div>
              </motion.div>
              {[1, 2].map((item) => (
                <motion.div
                  key={item}
                  className="p-2 sm:p-3 rounded-xl bg-accent/30 overflow-hidden"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: item * 0.1 + 0.6
                  }}
                >
                  <div className={`h-3 sm:h-4 bg-muted-foreground/20 rounded ${
                    item === 1 ? 'w-2/3 max-w-48' :
                    'w-4/5 max-w-56'
                  }`} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Instructions Skeleton */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-card-foreground">Instructions</h2>
            </div>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <motion.div
                key={item}
                className="p-2 sm:p-3 rounded-xl bg-accent/30 overflow-hidden"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: item * 0.15
                }}
              >
                <div className="flex gap-2 sm:gap-4">
                  <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-primary/40 rounded-full" />
                  </div>
                  <div className="flex-1 pt-0.5 sm:pt-1 space-y-1 sm:space-y-2 min-w-0">
                    <div className="h-3 sm:h-4 bg-muted-foreground/20 rounded w-full" />
                    <div className="h-3 sm:h-4 bg-muted-foreground/15 rounded w-4/5 max-w-48" />
                    {item % 2 === 0 && (
                      <div className="h-3 sm:h-4 bg-muted-foreground/15 rounded w-3/5 max-w-36" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Nutrition Skeleton */}
      <div className="bg-card rounded-2xl shadow-sm border border-border p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <span className="text-primary font-bold text-base sm:text-lg">🥗</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-card-foreground">Nutrition Information</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {['Calories', 'Protein', 'Carbs', 'Fat'].map((item, index) => (
            <motion.div
              key={item}
              className="text-center p-3 sm:p-4 bg-gradient-to-br from-muted/20 to-muted/30 rounded-xl border border-muted/30 overflow-hidden"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.2
              }}
            >
              <div className="h-5 sm:h-6 bg-muted-foreground/20 rounded mx-auto mb-2 w-12 sm:w-16" />
              <div className="h-3 sm:h-4 bg-muted-foreground/15 rounded mx-auto w-10 sm:w-12" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
