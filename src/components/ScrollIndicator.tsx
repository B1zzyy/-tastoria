'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export default function ScrollIndicator() {
  return (
    <div className="flex flex-col items-center gap-2 mt-8">
      <span className="text-sm text-muted-foreground">Learn more</span>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown className="w-6 h-6 text-primary" />
      </motion.div>
    </div>
  )
}
