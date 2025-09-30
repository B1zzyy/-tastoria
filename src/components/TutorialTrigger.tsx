'use client';

import { motion } from 'framer-motion';
import { HelpCircle, Play } from 'lucide-react';

interface TutorialTriggerProps {
  onStartTutorial: () => void;
  isCompleted: boolean;
}

export default function TutorialTrigger({ onStartTutorial, isCompleted }: TutorialTriggerProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onStartTutorial}
      className="fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group"
      style={{ 
        background: '#ffe0c2', 
        color: '#393028' 
      }}
    >
      {isCompleted ? (
        <HelpCircle className="w-6 h-6" />
      ) : (
        <Play className="w-6 h-6" />
      )}
    </motion.button>
  );
}
