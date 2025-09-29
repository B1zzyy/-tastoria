import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiProps {
  fire: boolean;
  onComplete?: () => void;
}

export default function Confetti({ fire, onComplete }: ConfettiProps) {
  useEffect(() => {
    console.log('🎊 Confetti component - fire prop:', fire);
    if (fire) {
      console.log('🎊 Firing confetti!');
      
      // Create a realistic confetti effect
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: NodeJS.Timeout = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          if (onComplete) {
            onComplete();
          }
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Fire from different positions
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      // Cleanup function
      return () => {
        clearInterval(interval);
      };
    }
  }, [fire, onComplete]);

  // This component doesn't render anything - it just triggers confetti
  return null;
}
