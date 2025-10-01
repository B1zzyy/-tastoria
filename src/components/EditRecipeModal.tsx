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
  { name: 'Fuchsia', gradient: 'from-fuchsia-400 to-pink-500' }
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
  const emojiCarouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Reset state when recipe changes
  useEffect(() => {
    setTitle(recipe.title);
    setSelectedPreviewType(recipe.metadata?.customPreview?.type || 'default');
    setSelectedEmoji(recipe.metadata?.customPreview?.value || '🍕');
    setSelectedGradient(recipe.metadata?.customPreview?.gradient || 'from-yellow-400 to-orange-500');
    
    // Handle image preview
    if (recipe.metadata?.customPreview?.type === 'image' && recipe.metadata?.customPreview?.value) {
      setImageUrl(recipe.metadata.customPreview.value);
      setPreviewUrl(recipe.metadata.customPreview.value);
    } else {
      setImageUrl('');
      setPreviewUrl('');
    }
  }, [recipe]);

  const handleSave = () => {
    let customPreview: { type: 'emoji' | 'image'; value: string; gradient?: string } | null = null;
    
    if (selectedPreviewType === 'emoji') {
      customPreview = { type: 'emoji', value: selectedEmoji, gradient: selectedGradient };
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
      // Create a data URL for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPreviewUrl(dataUrl);
        setImageUrl(dataUrl); // Store the data URL
      };
      reader.readAsDataURL(file);
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


  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
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
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${selectedGradient} flex items-center justify-center text-3xl shadow-lg border-4 transition-all ${
                      selectedPreviewType === 'emoji'
                        ? 'border-primary shadow-lg shadow-primary/25'
                        : 'border-border hover:border-primary/50'
                    }`}>
                      {selectedEmoji}
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
                            onClick={() => setSelectedGradient(gradient.gradient)}
                            className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${gradient.gradient} border-2 transition-all duration-200 hover:scale-110 ${
                              selectedGradient === gradient.gradient
                                ? 'border-primary shadow-lg shadow-primary/25 scale-105'
                                : 'border-border hover:border-primary/50'
                            }`}
                            title={gradient.name}
                          >
                            {selectedGradient === gradient.gradient && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
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
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2">
                        Upload Image:
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileUpload(e)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-card-foreground file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose from gallery or take a photo
                      </p>
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
    </AnimatePresence>
  );
}
