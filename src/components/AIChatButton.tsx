'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Sparkles } from 'lucide-react';

interface AIChatButtonProps {
  onClick: () => void;
}

export default function AIChatButton({ onClick }: AIChatButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-6 z-30 w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
    >
      <motion.div
        animate={{ rotate: isHovered ? 360 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <Sparkles className="w-6 h-6 text-primary-foreground" />
      </motion.div>
      
      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 10 }}
        transition={{ duration: 0.2 }}
        className="absolute right-full mr-3 px-3 py-1.5 bg-card border border-border rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
      >
        <p className="text-sm text-card-foreground font-medium">Ask Tasty about this recipe</p>
        <div className="absolute top-1/2 left-full -translate-y-1/2 w-0 h-0 border-l-4 border-l-card border-t-4 border-t-transparent border-b-4 border-b-transparent" />
      </motion.div>
    </motion.button>
  );
}
