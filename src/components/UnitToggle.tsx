'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type UnitSystem = 'metric' | 'imperial';

interface UnitToggleProps {
  onUnitChange: (system: UnitSystem) => void;
  className?: string;
}

export default function UnitToggle({ onUnitChange, className }: UnitToggleProps) {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('preferred-unit-system') as UnitSystem;
    if (saved && (saved === 'metric' || saved === 'imperial')) {
      setUnitSystem(saved);
      onUnitChange(saved);
    }
  }, [onUnitChange]);

  const handleToggle = (system: UnitSystem) => {
    setUnitSystem(system);
    localStorage.setItem('preferred-unit-system', system);
    onUnitChange(system);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative inline-flex bg-muted rounded-lg p-1">
        {/* Sliding Background */}
        <motion.div
          className="absolute inset-y-1 bg-background rounded-md shadow-sm"
          initial={false}
          animate={{
            x: unitSystem === 'metric' ? 0 : '105%',
            width: '45%'
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30
          }}
        />
        
        <button
          type="button"
          onClick={() => handleToggle('metric')}
          className={cn(
            "relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 z-10",
            unitSystem === 'metric' 
              ? "text-foreground" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Metric
        </button>
        
        <button
          type="button"
          onClick={() => handleToggle('imperial')}
          className={cn(
            "relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 z-10",
            unitSystem === 'imperial' 
              ? "text-foreground" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Imperial
        </button>
      </div>
    </div>
  );
}
