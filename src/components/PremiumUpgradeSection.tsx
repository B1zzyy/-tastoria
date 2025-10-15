'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Infinity, 
  Check,
  Star,
  Info,
  MessageCircle,
  Instagram,
  FolderPlus,
  Headphones
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTrial } from '@/hooks/useTrial'

export default function PremiumUpgradeSection() {
  const { user } = useAuth()
  const { isPaidUser } = useTrial()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  const features = [
    {
      icon: Infinity,
      title: "Save unlimited recipes",
      description: "Never lose a recipe again",
      tooltip: "Add as many recipes as you want to your personal cookbook. With the free version, you can save up to 5."
    },
    {
      icon: MessageCircle,
      title: "AI-powered recipe chat",
      description: "Get cooking help and tips from our AI",
      tooltip: "Ask our AI assistant questions about cooking techniques, ingredient substitutions, and get personalized recipe recommendations."
    },
    {
      icon: Instagram,
      title: "Instagram Reels recipes",
      description: "Parse recipes from Instagram videos",
      tooltip: "Extract recipes directly from Instagram Reels and Posts. No more screenshots or manual note-taking."
    },
    {
      icon: FolderPlus,
      title: "Create custom collections",
      description: "Organize recipes your way",
      tooltip: "Create themed collections like 'Weeknight Dinners', 'Desserts', or 'Meal Prep' to keep your recipes organized."
    },
    {
      icon: Headphones,
      title: "Priority support",
      description: "Fast response times",
      tooltip: "Get priority customer support with faster response times and dedicated assistance for any issues."
    },
    {
      icon: Star,
      title: "Ad-free experience",
      description: "Clean, distraction-free cooking",
      tooltip: "Enjoy a completely ad-free experience while browsing and cooking with your recipes."
    }
  ]

  const testimonials = [
    {
      name: "Sarah M.",
      rating: 5,
      text: "The AI chat feature is **incredible!** It helped me fix my bread recipe when it wasn't rising properly."
    },
    {
      name: "Alex R.",
      rating: 5,
      text: "Finally, I can save recipes from Instagram Reels! **No more screenshots** cluttering my phone."
    },
    {
      name: "Emma L.",
      rating: 5,
      text: "**Love the collections feature!** I have separate folders for desserts, weeknight dinners, and meal prep."
    },
    {
      name: "Mike T.",
      rating: 5,
      text: "The recipe parsing is **spot on every time.** No more scrolling through someone's life story to find ingredients."
    }
  ]

  const handleUpgrade = async () => {
    if (!user) {
      console.error('No user found for upgrade')
      return
    }

    setIsUpgrading(true)

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          planType: selectedPlan,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const result = await response.json()

      if (result.url) {
        // Add a small delay to show the loading state
        setTimeout(() => {
          window.location.href = result.url
        }, 250)
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      alert('Failed to start upgrade process. Please try again.')
      setIsUpgrading(false)
    }
  }

  // Show different content for paid users
  if (isPaidUser) {
    return (
      <div className="min-h-screen bg-background text-foreground py-16" data-premium-section>
        <div className="max-w-4xl mx-auto px-6">
          {/* Header for paid users */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-full border border-primary/20 mb-6"
            >
              <Check className="w-6 h-6 text-primary" />
              <span className="text-lg font-semibold text-primary">Premium Member</span>
            </motion.div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Welcome to the team! 🎉
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              You&apos;re already part of the Tastoria Premium family. Enjoy unlimited access to all our features!
            </p>
          </div>

          {/* Features showcase for paid users */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              Your Premium Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-card/50 rounded-xl border border-border/30"
                >
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                  <Check className="w-5 h-5 text-primary" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Thank you message */}
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 rounded-2xl border border-primary/20"
            >
              <h3 className="text-2xl font-bold text-foreground mb-3">
                Thank you for your support! 🙏
              </h3>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Your subscription helps us continue building amazing features for home cooks everywhere. 
                Keep exploring and happy cooking!
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-16" data-premium-section>
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Unlock the full app with
          </h1>
          <h2 className="text-3xl font-bold text-foreground">
            Tastoria Premium
          </h2>
        </div>

        {/* Features */}
        <div className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 bg-card/50 rounded-xl border border-border/30"
              >
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
                <div 
                  className="relative"
                  onMouseEnter={() => setHoveredFeature(index)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                  {hoveredFeature === index && (
                    <div className="absolute top-6 right-0 z-50 bg-card border border-border/50 rounded-lg p-3 shadow-xl max-w-xs w-64">
                      <p className="text-sm text-foreground leading-relaxed">
                        {feature.tooltip}
                      </p>
                      <div className="absolute -top-1 right-4 w-2 h-2 bg-card border-l border-t border-border/50 rotate-45"></div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-foreground mb-6 text-center">What people say</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="bg-card/50 p-6 rounded-xl border border-border/30"
              >
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground mb-3 leading-relaxed">
                  {testimonial.text.split('**').map((part, i) => 
                    i % 2 === 1 ? (
                      <span key={i} className="font-semibold text-yellow-400">{part}</span>
                    ) : (
                      part
                    )
                  )}
                </p>
                <p className="text-xs text-muted-foreground font-medium">- {testimonial.name}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Subscription Options */}
        <div className="mb-12">
          <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Option */}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              onClick={() => setSelectedPlan('monthly')}
              className={`relative bg-card/50 p-8 rounded-xl border-2 w-full transition-all duration-200 ${
                selectedPlan === 'monthly' 
                  ? 'border-primary' 
                  : 'border-border/30 hover:border-primary/50'
              }`}
            >
              {selectedPlan === 'monthly' && (
                <div className="absolute top-4 right-4 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-black" />
                </div>
              )}
              <div className="text-center">
                <h3 className="text-xl font-bold text-foreground mb-3">Monthly</h3>
                <p className="text-3xl font-bold text-foreground mb-2">$6.99</p>
                <p className="text-sm text-muted-foreground">$1.75 per week</p>
              </div>
            </motion.button>

            {/* Yearly Option */}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 }}
              onClick={() => setSelectedPlan('yearly')}
              className={`relative bg-card/50 p-8 rounded-xl border-2 w-full transition-all duration-200 ${
                selectedPlan === 'yearly' 
                  ? 'border-primary' 
                  : 'border-border/30 hover:border-primary/50'
              }`}
            >
              <div className="absolute top-3 left-3 bg-primary text-black text-xs px-3 py-1 rounded-full font-semibold">
                30% OFF
              </div>
              {selectedPlan === 'yearly' && (
                <div className="absolute top-4 right-4 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-black" />
                </div>
              )}
              <div className="text-center">
                <h3 className="text-xl font-bold text-foreground mb-3">Yearly</h3>
                <div className="mb-2">
                  <p className="text-3xl font-bold text-foreground">$59.88</p>
                </div>
                <p className="text-sm text-muted-foreground">$4.99 per month</p>
              </div>
            </motion.button>
          </div>
        </div>

        {/* CTA Button */}
        <div className="max-w-md mx-auto">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className="w-full bg-primary text-black py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
          >
            {isUpgrading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Redirecting to checkout...
              </div>
            ) : (
              'Upgrade now'
            )}
          </motion.button>
          
          <p className="text-center text-sm text-muted-foreground mt-4">
            Easily cancel at any time.
          </p>
        </div>
      </div>
    </div>
  )
}
