'use client';

import { useState, useRef, useEffect } from 'react';
import { Pin, PinOff } from 'lucide-react';

interface SwipeToPinProps {
  children: React.ReactNode;
  onPin: () => void;
  isPinned: boolean;
  className?: string;
}

export default function SwipeToPin({ children, onPin, isPinned, className = '' }: SwipeToPinProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isHorizontalSwipe, setIsHorizontalSwipe] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const threshold = 100; // Distance needed to trigger pin action

  // Lock body scroll when dragging
  useEffect(() => {
    if (isDragging && isHorizontalSwipe) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDragging, isHorizontalSwipe]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
    setIsHorizontalSwipe(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = Math.abs(startX - currentX);
    const deltaY = Math.abs(startY - currentY);
    
    // Determine if this is a horizontal or vertical swipe
    if (!isHorizontalSwipe && deltaX > 10) {
      setIsHorizontalSwipe(true);
    }
    
    // Only proceed if it's a horizontal swipe
    if (isHorizontalSwipe || deltaX > deltaY) {
      e.preventDefault(); // Prevent scrolling
      const distance = startX - currentX; // Negative for left swipe
      
      if (distance > 0) { // Only allow left swipe
        // Cancel any pending animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        // Use requestAnimationFrame for smooth updates
        animationFrameRef.current = requestAnimationFrame(() => {
          setDragDistance(Math.min(distance, 150)); // Max drag distance
        });
      }
    }
  };

  const handleTouchEnd = () => {
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (dragDistance >= threshold) {
      onPin();
    }
    setIsDragging(false);
    setDragDistance(0);
    setIsHorizontalSwipe(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX);
    setStartY(e.clientY);
    setIsDragging(true);
    setIsHorizontalSwipe(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = Math.abs(startX - e.clientX);
    const deltaY = Math.abs(startY - e.clientY);
    
    // Determine if this is a horizontal or vertical drag
    if (!isHorizontalSwipe && deltaX > 10) {
      setIsHorizontalSwipe(true);
    }
    
    // Only proceed if it's a horizontal drag
    if (isHorizontalSwipe || deltaX > deltaY) {
      const distance = startX - e.clientX;
      if (distance > 0) {
        // Cancel any pending animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        // Use requestAnimationFrame for smooth updates
        animationFrameRef.current = requestAnimationFrame(() => {
          setDragDistance(Math.min(distance, 150));
        });
      }
    }
  };

  const handleMouseUp = () => {
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (dragDistance >= threshold) {
      onPin();
    }
    setIsDragging(false);
    setDragDistance(0);
    setIsHorizontalSwipe(false);
  };

  // Reset drag when mouse leaves
  const handleMouseLeave = () => {
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsDragging(false);
    setDragDistance(0);
    setIsHorizontalSwipe(false);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        // Enable hardware acceleration
        transform: 'translateZ(0)',
        willChange: isDragging ? 'transform' : 'auto'
      }}
    >
      {/* Dynamic expanding background */}
      <div 
        className="absolute top-0 right-0 h-full flex items-center justify-center"
        style={{ 
          width: `${dragDistance}px`,
          opacity: dragDistance > 20 ? 1 : 0,
          background: 'linear-gradient(to left, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
          // Hardware acceleration for smooth animation
          transform: 'translateZ(0)',
          willChange: isDragging ? 'width, opacity' : 'auto',
          // Smooth transitions only when not dragging
          transition: isDragging ? 'none' : 'width 0.2s ease-out, opacity 0.2s ease-out'
        }}
      >
        <div className="text-center text-white px-4">
          {isPinned ? (
            <>
              <PinOff className="w-6 h-6 mx-auto mb-1" />
              <p className="text-xs font-medium">Unpin</p>
            </>
          ) : (
            <>
              <Pin className="w-6 h-6 mx-auto mb-1" />
              <p className="text-xs font-medium">Pin</p>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div 
        className="relative z-10"
        style={{ 
          transform: `translate3d(-${dragDistance}px, 0, 0)`,
          // Hardware acceleration for smooth animation
          willChange: isDragging ? 'transform' : 'auto',
          // Smooth transitions only when not dragging
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
}
