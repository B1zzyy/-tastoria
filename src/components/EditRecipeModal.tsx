'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Instagram, Trash2 } from 'lucide-react';

interface EditRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: {
    id: string;
    title: string;
    image: string;
    metadata?: {
      customPreview?: {
        type: 'emoji' | 'image';
        value: string;
        gradient?: string;
      };
    };
  };
  onSave: (updates: {
    title: string;
    customPreview: { type: 'emoji' | 'image'; value: string; gradient?: string } | null;
  }) => void;
  onDelete?: () => void;
}

const EMOJI_OPTIONS = [
  // Main dishes
  '🍕', '🍝', '🍜', '🍲', '🥘', '🍛', '🍱', '🍣', '🍤', '🍙',
  '🍚', '🍘', '🍥', '🥟', '🍢', '🍡', '🌮', '🌯', '🥙', '🥪',
  '🍔', '🌭', '🥓', '🍖', '🍗', '🥩', '🍳', '🥚', '🧀', '🥞',
  
  // Desserts & sweets
  '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍮', '🍭',
  '🍬', '🍫', '🍿', '🍯', '🧇',
  
  // Fruits & vegetables
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
  '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬',
  '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠',
  
  // Drinks
  '🥛', '🍼', '☕', '🍵', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷',
  '🥃', '🍸', '🍹', '🍾', '🧃', '🧉', '🧊',
  
  // Utensils & cooking
  '🥄', '🍴', '🍽️', '🥢', '🥡', '🧂', '🥜', '🌰', '🍞',
  '🥖', '🥨', '🧈'
];

const GRADIENT_OPTIONS = [
  { name: 'Sunset', gradient: 'from-yellow-400 to-orange-500' },
  { name: 'Ocean', gradient: 'from-blue-400 to-cyan-500' },
  { name: 'Forest', gradient: 'from-green-400 to-emerald-500' },
  { name: 'Purple', gradient: 'from-purple-400 to-pink-500' },
  { name: 'Rose', gradient: 'from-rose-400 to-pink-500' },
  { name: 'Sky', gradient: 'from-sky-400 to-blue-500' },
  { name: 'Lime', gradient: 'from-lime-400 to-green-500' },
  { name: 'Violet', gradient: 'from-violet-400 to-purple-500' },
  { name: 'Amber', gradient: 'from-amber-400 to-yellow-500' },
  { name: 'Teal', gradient: 'from-teal-400 to-cyan-500' },
  { name: 'Indigo', gradient: 'from-indigo-400 to-blue-500' },
  { name: 'Custom', gradient: 'custom' }
];

export default function EditRecipeModal({ isOpen, onClose, recipe, onSave, onDelete }: EditRecipeModalProps) {
  const [title, setTitle] = useState(recipe.title);
  const [selectedPreviewType, setSelectedPreviewType] = useState<'default' | 'emoji' | 'image'>(
    recipe.metadata?.customPreview?.type || 'default'
  );
  const [selectedEmoji, setSelectedEmoji] = useState(recipe.metadata?.customPreview?.value || '🍕');
  const [selectedGradient, setSelectedGradient] = useState(recipe.metadata?.customPreview?.gradient || 'from-yellow-400 to-orange-500');
  const [imageUrl, setImageUrl] = useState(recipe.metadata?.customPreview?.value || '');
  const [previewUrl, setPreviewUrl] = useState('');
  const [customGradientStart, setCustomGradientStart] = useState('#fbbf24'); // yellow-400
  const [customGradientEnd, setCustomGradientEnd] = useState('#f97316'); // orange-500
  const [showCustomGradient, setShowCustomGradient] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<'start' | 'end' | null>(null);
  const [tempColor, setTempColor] = useState('#fbbf24');
  const emojiCarouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Reset state when recipe changes
  useEffect(() => {
    setTitle(recipe.title);
    setSelectedPreviewType(recipe.metadata?.customPreview?.type || 'default');
    setSelectedEmoji(recipe.metadata?.customPreview?.value || '🍕');
    
    const gradient = recipe.metadata?.customPreview?.gradient || 'from-yellow-400 to-orange-500';
    setSelectedGradient(gradient);
    
    // Check if it's a custom gradient (starts with #)
    if (gradient.startsWith('#')) {
      setShowCustomGradient(true);
      // Parse custom gradient format: #color1-#color2
      const colors = gradient.split('-');
      if (colors.length === 2) {
        setCustomGradientStart(colors[0]);
        setCustomGradientEnd(colors[1]);
      }
    } else {
      setShowCustomGradient(false);
    }
    
    // Handle image preview
    if (recipe.metadata?.customPreview?.type === 'image' && recipe.metadata?.customPreview?.value) {
      setImageUrl(recipe.metadata.customPreview.value);
      setPreviewUrl(recipe.metadata.customPreview.value);
    } else {
      setImageUrl('');
      setPreviewUrl('');
    }
  }, [recipe]);

  // Get current gradient value (either predefined or custom)
  const getCurrentGradient = () => {
    if (showCustomGradient) {
      return `${customGradientStart}-${customGradientEnd}`;
    }
    return selectedGradient;
  };

  const handleSave = () => {
    let customPreview: { type: 'emoji' | 'image'; value: string; gradient?: string } | null = null;
    
    if (selectedPreviewType === 'emoji') {
      customPreview = { type: 'emoji', value: selectedEmoji, gradient: getCurrentGradient() };
    } else if (selectedPreviewType === 'image' && imageUrl.trim()) {
      customPreview = { type: 'image', value: imageUrl.trim() };
    }

    onSave({
      title: title.trim(),
      customPreview
    });
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      
      if (!validImageTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF, WebP, or SVG)');
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file size (optional - limit to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('Image file is too large. Please select an image smaller than 10MB.');
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Clean up previous object URL to prevent memory leaks
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      
      // Create object URL for preview (much more performant)
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setImageUrl(objectUrl); // Store the object URL
    }
  };

  const handleWheel = (e: WheelEvent) => {
    if (emojiCarouselRef.current) {
      e.preventDefault();
      const scrollAmount = e.deltaY * 0.5; // Reduce sensitivity for smoother scrolling
      emojiCarouselRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (emojiCarouselRef.current) {
      setIsDragging(true);
      setStartX(e.pageX - emojiCarouselRef.current.offsetLeft);
      setScrollLeft(emojiCarouselRef.current.scrollLeft);
      emojiCarouselRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (emojiCarouselRef.current) {
      emojiCarouselRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (emojiCarouselRef.current) {
      emojiCarouselRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !emojiCarouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - emojiCarouselRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Multiply for faster scrolling
    emojiCarouselRef.current.scrollLeft = scrollLeft - walk;
  };

  useEffect(() => {
    const carousel = emojiCarouselRef.current;
    if (carousel) {
      carousel.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        carousel.removeEventListener('wheel', handleWheel);
      };
    }
  }, []);

  // Cleanup object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);


  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-card-foreground">Edit Recipe</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Title Section */}
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Title:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter recipe title..."
                />
              </div>

              {/* Preview Section */}
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-3">
                  Preview Style:
                </label>
                
                {/* Preview Options - 3 Circles */}
                <div className="flex items-center justify-center gap-6">
                   {/* Default */}
                   <div
                     className={`relative cursor-pointer transition-all ${
                       selectedPreviewType === 'default'
                         ? 'scale-110'
                         : 'hover:scale-105'
                     }`}
                     onClick={() => setSelectedPreviewType('default')}
                   >
                     <div className={`w-16 h-16 rounded-full overflow-hidden border-4 transition-all ${
                       selectedPreviewType === 'default'
                         ? 'border-primary shadow-lg shadow-primary/25'
                         : 'border-border hover:border-primary/50'
                     }`}>
                       {recipe.image && recipe.image !== 'instagram-video' ? (
                         <img
                           src={recipe.image}
                           alt="Original recipe"
                           className="w-full h-full object-cover"
                         />
                       ) : (
                         <div className="w-full h-full bg-gradient-to-br from-gray-700 via-gray-800 to-black flex items-center justify-center">
                           <Instagram className="w-6 h-6 text-white" />
                         </div>
                       )}
                     </div>
                     <p className="text-xs text-center text-muted-foreground mt-2">Default</p>
                   </div>

                  {/* Emoji */}
                  <div
                    className={`relative cursor-pointer transition-all ${
                      selectedPreviewType === 'emoji'
                        ? 'scale-110'
                        : 'hover:scale-105'
                    }`}
                    onClick={() => setSelectedPreviewType('emoji')}
                  >
                    <div 
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg border-4 transition-all relative ${
                        selectedPreviewType === 'emoji'
                          ? 'border-primary shadow-lg shadow-primary/25'
                          : 'border-border hover:border-primary/50'
                      }`}
                      style={{
                        background: showCustomGradient 
                          ? `linear-gradient(135deg, ${customGradientStart}, ${customGradientEnd})`
                          : undefined
                      }}
                    >
                      {!showCustomGradient && (
                        <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${selectedGradient}`}></div>
                      )}
                      <span className="relative z-10">{selectedEmoji}</span>
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-2">Emoji</p>
                  </div>

                  {/* Custom Image */}
                  <div
                    className={`relative cursor-pointer transition-all ${
                      selectedPreviewType === 'image'
                        ? 'scale-110'
                        : 'hover:scale-105'
                    }`}
                    onClick={() => setSelectedPreviewType('image')}
                  >
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-4 transition-all ${
                      selectedPreviewType === 'image'
                        ? 'border-primary shadow-lg shadow-primary/25'
                        : 'border-border hover:border-primary/50'
                    }`}>
                      <ImageIcon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-2">Image</p>
                  </div>
                </div>

                {/* Emoji Picker */}
                <AnimatePresence>
                  {selectedPreviewType === 'emoji' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="mt-4 space-y-4"
                    >
                     {/* Emoji Selection */}
                     <div className="p-4 bg-accent/20 rounded-xl border border-white/10">
                       <h4 className="font-medium text-card-foreground mb-3">Choose an emoji:</h4>
                       <div className="relative">
                         <div 
                           ref={emojiCarouselRef}
                           className="flex gap-3 overflow-x-auto scrollbar-hide pt-2 pb-2 px-2 cursor-grab select-none" 
                           style={{ 
                             scrollbarWidth: 'none', 
                             msOverflowStyle: 'none',
                             scrollBehavior: 'smooth'
                           }}
                           onMouseDown={handleMouseDown}
                           onMouseLeave={handleMouseLeave}
                           onMouseUp={handleMouseUp}
                           onMouseMove={handleMouseMove}
                         >
                           {EMOJI_OPTIONS.map((emoji, index) => (
                             <button
                               key={`emoji-${index}`}
                               onClick={() => setSelectedEmoji(emoji)}
                               className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl hover:scale-110 transition-all duration-200 ${
                                 selectedEmoji === emoji 
                                   ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105' 
                                   : 'hover:bg-white/10 hover:shadow-md'
                               }`}
                             >
                               {emoji}
                             </button>
                           ))}
                         </div>
                         {/* Gradient fade edges */}
                         <div className="absolute left-2 top-2 bottom-2 w-8 bg-gradient-to-r from-accent/20 to-transparent pointer-events-none"></div>
                         <div className="absolute right-2 top-2 bottom-2 w-8 bg-gradient-to-l from-accent/20 to-transparent pointer-events-none"></div>
                       </div>
                     </div>

                    {/* Gradient Selection */}
                    <div className="p-4 bg-accent/20 rounded-xl border border-white/10">
                      <h4 className="font-medium text-card-foreground mb-3">Choose background gradient:</h4>
                      <div className="grid grid-cols-6 gap-3">
                        {GRADIENT_OPTIONS.map((gradient) => (
                          <button
                            key={gradient.gradient}
                            onClick={() => {
                              if (gradient.gradient === 'custom') {
                                setShowCustomGradient(true);
                                setSelectedGradient('custom');
                              } else {
                                setShowCustomGradient(false);
                                setSelectedGradient(gradient.gradient);
                              }
                            }}
                            className={`relative w-12 h-12 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                              (showCustomGradient && gradient.gradient === 'custom') || 
                              (!showCustomGradient && selectedGradient === gradient.gradient)
                                ? 'border-primary shadow-lg shadow-primary/25 scale-105'
                                : 'border-border hover:border-primary/50'
                            }`}
                            style={{
                              background: gradient.gradient === 'custom' 
                                ? `linear-gradient(135deg, ${customGradientStart}, ${customGradientEnd})`
                                : undefined
                            }}
                            title={gradient.name}
                          >
                            {gradient.gradient !== 'custom' && (
                              <div className={`w-full h-full rounded-full bg-gradient-to-br ${gradient.gradient}`}></div>
                            )}
                            {gradient.gradient === 'custom' && (
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-300 to-white flex items-center justify-center">
                                <div className="w-5 h-5 text-gray-600 flex items-center justify-center">
                                  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </div>
                              </div>
                            )}
                            {((showCustomGradient && gradient.gradient === 'custom') || 
                              (!showCustomGradient && selectedGradient === gradient.gradient)) && gradient.gradient !== 'custom' && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Gradient Picker */}
                    <AnimatePresence>
                      {showCustomGradient && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ 
                            duration: 0.2, 
                            ease: [0.4, 0, 0.2, 1],
                            opacity: { duration: 0.15 },
                            height: { duration: 0.2 }
                          }}
                          className="p-4 bg-accent/20 rounded-xl border border-white/10"
                        >
                          <h4 className="font-medium text-card-foreground mb-3">Custom Gradient:</h4>
                          <div className="space-y-4">
                            {/* Preview */}
                            <div className="flex items-center justify-center">
                              <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg border-2 border-white/20">
                                <div 
                                  className="w-full h-full flex items-center justify-center text-2xl"
                                  style={{
                                    background: `linear-gradient(135deg, ${customGradientStart}, ${customGradientEnd})`
                                  }}
                                >
                                  {selectedEmoji}
                                </div>
                              </div>
                            </div>
                            
                            {/* Color Pickers */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-card-foreground mb-2">
                                  Start Color:
                                </label>
                                <button
                                  onClick={() => {
                                    setTempColor(customGradientStart);
                                    setShowColorPicker('start');
                                  }}
                                  className="w-full h-12 rounded-xl border-2 border-border hover:border-primary/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
                                  style={{ backgroundColor: customGradientStart }}
                                >
                                  <div className="w-full h-full rounded-lg flex items-center justify-center">
                                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </div>
                                  </div>
                                </button>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-card-foreground mb-2">
                                  End Color:
                                </label>
                                <button
                                  onClick={() => {
                                    setTempColor(customGradientEnd);
                                    setShowColorPicker('end');
                                  }}
                                  className="w-full h-12 rounded-xl border-2 border-border hover:border-primary/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
                                  style={{ backgroundColor: customGradientEnd }}
                                >
                                  <div className="w-full h-full rounded-lg flex items-center justify-center">
                                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </div>
                                  </div>
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Image Upload */}
                <AnimatePresence>
                  {selectedPreviewType === 'image' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="mt-4 p-4 bg-accent/20 rounded-xl border border-white/10 space-y-3"
                    >
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="flex items-center justify-center w-full px-4 py-3 bg-background border-2 border-dashed border-border rounded-xl text-card-foreground hover:border-primary/50 transition-colors cursor-pointer"
                      >
                        <svg className="w-5 h-5 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Choose Image
                      </label>
                    </div>
                    
                    {/* Image Preview */}
                    {previewUrl && (
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-2">
                          Preview:
                        </label>
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-border">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={() => setPreviewUrl('')}
                          />
                        </div>
                      </div>
                    )}
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-muted-foreground hover:text-card-foreground border border-border rounded-xl hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="px-4 py-2 text-destructive hover:text-destructive-foreground border border-destructive rounded-xl hover:bg-destructive transition-colors"
                  title="Delete recipe"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modern Color Picker Modal */}
      <AnimatePresence>
        {showColorPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowColorPicker(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 max-w-sm w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-card-foreground">
                  Choose {showColorPicker === 'start' ? 'Start' : 'End'} Color
                </h3>
                <button
                  onClick={() => setShowColorPicker(null)}
                  className="p-1 hover:bg-accent rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Color Preview */}
              <div className="mb-4">
                <div 
                  className="w-full h-16 rounded-xl border-2 border-border shadow-sm"
                  style={{ backgroundColor: tempColor }}
                >
                  <div className="w-full h-full rounded-lg flex items-center justify-center">
                    <div className="px-3 py-1 bg-black/50 rounded-full">
                      <span className="text-white text-sm font-mono">{tempColor.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modern Color Palette */}
              <div className="space-y-4">
                {/* Popular Colors */}
                <div>
                  <h4 className="text-sm font-medium text-card-foreground mb-2">Popular Colors</h4>
                  <div className="grid grid-cols-8 gap-2">
                    {[
                      // Column 1: Reds
                      '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#000000',
                      // Column 2: Oranges  
                      '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#ffffff',
                      // Column 3: Yellows
                      '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#f3f4f6',
                      // Column 4: Greens
                      '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#d1d5db',
                      // Column 5: Teals
                      '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#9ca3af',
                      // Column 6: Blues
                      '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#6b7280',
                      // Column 7: Purples
                      '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#374151',
                      // Column 8: Pinks
                      '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#1f2937'
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => setTempColor(color)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                          tempColor === color ? 'border-primary shadow-lg shadow-primary/25' : 'border-border hover:border-primary/50'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Custom Color Input */}
                <div>
                  <h4 className="text-sm font-medium text-card-foreground mb-2">Custom Color</h4>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={tempColor}
                      onChange={(e) => setTempColor(e.target.value)}
                      className="w-12 h-10 rounded-lg border-2 border-border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={tempColor}
                      onChange={(e) => setTempColor(e.target.value)}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-card-foreground text-sm font-mono"
                      placeholder="#fbbf24"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowColorPicker(null)}
                  className="flex-1 px-4 py-2 text-muted-foreground hover:text-card-foreground border border-border rounded-xl hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (showColorPicker === 'start') {
                      setCustomGradientStart(tempColor);
                    } else {
                      setCustomGradientEnd(tempColor);
                    }
                    setShowColorPicker(null);
                  }}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
