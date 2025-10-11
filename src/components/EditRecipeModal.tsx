'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Instagram, Trash2, Plus, GripVertical } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface EditRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: {
    id: string;
    title: string;
    image: string;
    ingredients: string[];
    instructions: string[];
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
    ingredients: string[];
    instructions: string[];
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
  { name: 'Custom', gradient: 'custom' }
];

export default function EditRecipeModal({ isOpen, onClose, recipe, onSave, onDelete }: EditRecipeModalProps) {
  const [title, setTitle] = useState(recipe.title);
  const [selectedPreviewType, setSelectedPreviewType] = useState<'default' | 'emoji' | 'image'>(
    recipe.metadata?.customPreview?.type || 'default'
  );
  const [selectedEmoji, setSelectedEmoji] = useState(
    recipe.metadata?.customPreview?.type === 'emoji' ? recipe.metadata?.customPreview?.value || '🍕' : '🍕'
  );
  const [selectedGradient, setSelectedGradient] = useState(recipe.metadata?.customPreview?.gradient || 'from-yellow-400 to-orange-500');
  const [imageUrl, setImageUrl] = useState(
    recipe.metadata?.customPreview?.type === 'image' ? recipe.metadata?.customPreview?.value || '' : ''
  );
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [customGradientStart, setCustomGradientStart] = useState('#fbbf24'); // yellow-400
  const [customGradientEnd, setCustomGradientEnd] = useState('#f97316'); // orange-500
  const [showCustomGradient, setShowCustomGradient] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<'start' | 'end' | null>(null);
  const [tempColor, setTempColor] = useState('#fbbf24');
  const emojiCarouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  // Instructions editing state
  const [editableInstructions, setEditableInstructions] = useState<string[]>([]);
  const [instructionKeys, setInstructionKeys] = useState<string[]>([]);
  
  // Ingredients editing state
  const [editableIngredients, setEditableIngredients] = useState<string[]>([]);
  const [ingredientKeys, setIngredientKeys] = useState<string[]>([]);
  
  // Drag and drop state
  const [activeInstruction, setActiveInstruction] = useState<string | null>(null);
  
  // Memoized keys to ensure they're always valid
  const memoizedIngredientKeys = useMemo(() => {
    return editableIngredients.map((_, index) => {
      const existingKey = ingredientKeys[index];
      if (existingKey && existingKey !== '' && existingKey.trim() !== '') {
        return existingKey;
      }
      return `ingredient-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
    });
  }, [editableIngredients, ingredientKeys]);
  
  const memoizedInstructionKeys = useMemo(() => {
    return editableInstructions.map((_, index) => {
      const existingKey = instructionKeys[index];
      if (existingKey && existingKey !== '' && existingKey.trim() !== '') {
        return existingKey;
      }
      return `instruction-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
    });
  }, [editableInstructions, instructionKeys]);

  // Reset state when recipe changes
  useEffect(() => {
    setTitle(recipe.title);
    setSelectedPreviewType(recipe.metadata?.customPreview?.type || 'default');
    setSelectedEmoji(
      recipe.metadata?.customPreview?.type === 'emoji' ? recipe.metadata?.customPreview?.value || '🍕' : '🍕'
    );
    
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
    
    // Initialize instructions
    const instructions = [...recipe.instructions];
    setEditableInstructions(instructions);
    const instructionKeysArray = instructions.map((_, index) => `instruction-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`);
    setInstructionKeys(instructionKeysArray);
    
    
    // Initialize ingredients
    const ingredients = [...recipe.ingredients];
    setEditableIngredients(ingredients);
    const ingredientKeysArray = ingredients.map((_, index) => `ingredient-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`);
    setIngredientKeys(ingredientKeysArray);
    
  }, [recipe]);


  // Auto-resize textareas when modal opens or content changes
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const textareas = document.querySelectorAll('.instruction-textarea, .ingredient-textarea');
        textareas.forEach((textarea) => {
          const element = textarea as HTMLTextAreaElement;
          element.style.height = '1px';
          element.style.height = element.scrollHeight + 'px';
        });
      }, 100);
    }
  }, [isOpen, editableInstructions, editableIngredients]);

  // Additional useEffect to ensure ingredients resize properly when content changes
  useEffect(() => {
    if (isOpen && editableIngredients.length > 0) {
      setTimeout(() => {
        const ingredientTextareas = document.querySelectorAll('.ingredient-textarea');
        ingredientTextareas.forEach((textarea) => {
          const element = textarea as HTMLTextAreaElement;
          element.style.height = '1px';
          element.style.height = element.scrollHeight + 'px';
        });
      }, 50);
    }
  }, [isOpen, editableIngredients]);

  // Force resize on initial render
  useEffect(() => {
    if (isOpen) {
      const resizeTextareas = () => {
        const ingredientTextareas = document.querySelectorAll('.ingredient-textarea');
        ingredientTextareas.forEach((textarea) => {
          const element = textarea as HTMLTextAreaElement;
          element.style.height = '1px';
          element.style.height = element.scrollHeight + 'px';
        });
      };
      
      // Multiple attempts to ensure proper sizing
      setTimeout(resizeTextareas, 0);
      setTimeout(resizeTextareas, 100);
      setTimeout(resizeTextareas, 300);
    }
  }, [isOpen]);

  // Get current gradient value (either predefined or custom)
  const getCurrentGradient = () => {
    if (showCustomGradient) {
      return `${customGradientStart}-${customGradientEnd}`;
    }
    return selectedGradient;
  };

  // Handle instruction text changes
  const updateInstruction = (index: number, text: string) => {
    const newInstructions = [...editableInstructions];
    const newKeys = [...instructionKeys];
    
    // Auto-delete step if text is empty and there's more than one step
    if (text.trim() === '' && newInstructions.length > 1) {
      newInstructions.splice(index, 1);
      newKeys.splice(index, 1);
    } else {
      newInstructions[index] = text;
    }
    
    // Ensure the key exists and is unique - regenerate if empty
    if (!newKeys[index] || newKeys[index] === '' || newKeys[index].trim() === '') {
      newKeys[index] = `instruction-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    setEditableInstructions(newInstructions);
    setInstructionKeys(newKeys);
  };

  // Handle adding new instruction
  const addInstruction = (index: number) => {
    const newInstructions = [...editableInstructions];
    const newKeys = [...instructionKeys];
    const newKey = `instruction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
    
    newInstructions.splice(index + 1, 0, '');
    newKeys.splice(index + 1, 0, newKey);
    
    setEditableInstructions(newInstructions);
    setInstructionKeys(newKeys);
  };

  // Handle deleting instruction (currently unused but kept for future functionality)
  // const deleteInstruction = (index: number) => {
  //   if (editableInstructions.length > 1) {
  //     const newInstructions = [...editableInstructions];
  //     const newKeys = [...instructionKeys];
      
  //     newInstructions.splice(index, 1);
  //     newKeys.splice(index, 1);
      
  //     setEditableInstructions(newInstructions);
  //     setInstructionKeys(newKeys);
  //   }
  // };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, instructionId: string) => {
    e.dataTransfer.setData("instructionId", instructionId);
    setActiveInstruction(instructionId);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const instructionId = e.dataTransfer.getData("instructionId");
    setActiveInstruction(null);
    clearHighlights();

    const indicators = getIndicators();
    const { element } = getNearestIndicator(e, indicators);

    const before = (element as HTMLElement).dataset.before || "-1";

    if (before !== instructionId) {
      let copy = [...editableInstructions];
      let keysCopy = [...instructionKeys];

      const dragIndex = parseInt(instructionId);
      const instructionToMove = copy[dragIndex];
      const keyToMove = keysCopy[dragIndex];

      if (!instructionToMove) return;

      copy = copy.filter((_, index) => index !== dragIndex);
      keysCopy = keysCopy.filter((_, index) => index !== dragIndex);

      const moveToBack = before === "-1";

      if (moveToBack) {
        copy.push(instructionToMove);
        keysCopy.push(keyToMove);
      } else {
        const beforeIndex = parseInt(before);
        const dragIndex = parseInt(instructionId);
        
        // If dragging to a position after the current position, we need to adjust
        // because removing the item shifts all subsequent indices down by 1
        const insertAtIndex = beforeIndex > dragIndex ? beforeIndex - 1 : beforeIndex;
        
        copy.splice(insertAtIndex, 0, instructionToMove);
        keysCopy.splice(insertAtIndex, 0, keyToMove);
      }

      setEditableInstructions(copy);
      setInstructionKeys(keysCopy);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    highlightIndicator(e);
  };

  const clearHighlights = (els?: Element[]) => {
    const indicators = els || getIndicators();
    indicators.forEach((i) => {
      (i as HTMLElement).style.opacity = "0";
    });
  };

  const highlightIndicator = (e: React.DragEvent) => {
    const indicators = getIndicators();
    clearHighlights(indicators);

    const el = getNearestIndicator(e, indicators);
    (el.element as HTMLElement).style.opacity = "1";
  };

  const getNearestIndicator = (e: React.DragEvent, indicators: Element[]) => {
    const DISTANCE_OFFSET = 50;

    const el = indicators.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = e.clientY - (box.top + DISTANCE_OFFSET);

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      {
        offset: Number.NEGATIVE_INFINITY,
        element: indicators[indicators.length - 1],
      }
    );

    return el;
  };

  const getIndicators = () => {
    return Array.from(document.querySelectorAll('[data-column="instructions"]'));
  };

  // DropIndicator component
  const DropIndicator = ({ beforeId, column }: { beforeId: string | null; column: string }) => {
    return (
      <div
        data-before={beforeId || "-1"}
        data-column={column}
        className="my-0.5 h-0.5 w-full bg-primary opacity-0"
      />
    );
  };

  // Handle ingredient text changes
  const updateIngredient = (index: number, text: string) => {
    const newIngredients = [...editableIngredients];
    const newKeys = [...ingredientKeys];
    
    // Auto-delete ingredient if text is empty and there's more than one ingredient
    if (text.trim() === '' && newIngredients.length > 1) {
      newIngredients.splice(index, 1);
      newKeys.splice(index, 1);
    } else {
      newIngredients[index] = text;
    }
    
    // Ensure the key exists and is unique - regenerate if empty
    if (!newKeys[index] || newKeys[index] === '' || newKeys[index].trim() === '') {
      newKeys[index] = `ingredient-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    setEditableIngredients(newIngredients);
    setIngredientKeys(newKeys);
  };

  // Handle adding new ingredient
  const addIngredient = (index: number) => {
    const newIngredients = [...editableIngredients];
    const newKeys = [...ingredientKeys];
    const newKey = `ingredient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
    
    newIngredients.splice(index + 1, 0, '');
    newKeys.splice(index + 1, 0, newKey);
    
    setEditableIngredients(newIngredients);
    setIngredientKeys(newKeys);
  };

  // Handle deleting ingredient (currently unused but kept for future functionality)
  // const deleteIngredient = (index: number) => {
  //   if (editableIngredients.length > 1) {
  //     const newIngredients = [...editableIngredients];
  //     const newKeys = [...ingredientKeys];
      
  //     newIngredients.splice(index, 1);
  //     newKeys.splice(index, 1);
      
  //     setEditableIngredients(newIngredients);
  //     setIngredientKeys(newKeys);
  //   }
  // };

  const handleSave = () => {
    let customPreview: { type: 'emoji' | 'image'; value: string; gradient?: string } | null = null;
    
    if (selectedPreviewType === 'emoji') {
      customPreview = { type: 'emoji', value: selectedEmoji, gradient: getCurrentGradient() };
    } else if (selectedPreviewType === 'image' && imageUrl.trim()) {
      customPreview = { type: 'image', value: imageUrl.trim() };
    }

    // Filter out empty instructions and ingredients
    const filteredInstructions = editableInstructions.filter(instruction => instruction.trim() !== '');
    const filteredIngredients = editableIngredients.filter(ingredient => ingredient.trim() !== '');

    onSave({
      title: title.trim(),
      ingredients: filteredIngredients,
      instructions: filteredInstructions,
      customPreview
    });
    onClose();
  };

  // Image compression function
  const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Canvas to blob conversion failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Image loading failed'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!validImageTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      e.target.value = ''; // Clear the input
      return;
    }
    
    // Validate file size (limit to 20MB before compression)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      alert('Image file is too large. Please select an image smaller than 20MB.');
      e.target.value = ''; // Clear the input
      return;
    }
    
    // Clean up previous object URL to prevent memory leaks
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    
    // Create object URL for immediate preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setImageUrl(objectUrl); // Set for immediate preview
    
    // Upload to Supabase Storage
    try {
      setIsUploadingImage(true);
      
      // Compress the image
      const compressedFile = await compressImage(file, 1200, 0.8);
      
      console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB, Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
      
      // Generate unique filename
      const fileExt = 'jpg'; // Always use jpg for compressed images
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `recipe-images/${fileName}`;

      // Upload compressed image to Supabase Storage
      const { data, error } = await supabase.storage
        .from('recipe-images')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        
        // Check for common error types
        if (error.message?.includes('not found') || error.message?.includes('404')) {
          throw new Error('Storage bucket "recipe-images" not found. Please create it in your Supabase dashboard.');
        } else if (error.message?.includes('row-level security policy')) {
          throw new Error('Permission denied. Please check your Supabase RLS policies for the recipe-images bucket.');
        } else if (error.message?.includes('JWT')) {
          throw new Error('Authentication error. Please make sure you are logged in.');
        } else {
          throw new Error(`Upload failed: ${error.message}`);
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(filePath);

      // Update with the actual Supabase URL
      setImageUrl(publicUrl);
      setPreviewUrl(publicUrl);
      
      // Clean up the blob URL
      URL.revokeObjectURL(objectUrl);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setPreviewUrl('');
      setImageUrl(recipe.image || '');
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      e.target.value = '';
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
        <div key="edit-recipe-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-h2 text-card-foreground">Edit Recipe</h2>
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
                <label className="block text-label text-card-foreground mb-2">
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
                <label className="block text-label text-card-foreground mb-3">
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
                         <Image
                           src={recipe.image}
                           alt="Original recipe"
                           fill
                           className="object-cover"
                         />
                       ) : (
                         <div className="w-full h-full bg-gradient-to-br from-gray-700 via-gray-800 to-black flex items-center justify-center">
                           <Instagram className="w-6 h-6 text-white" />
                         </div>
                       )}
                     </div>
                     <p className="text-caption text-center text-muted-foreground mt-2">Default</p>
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
                    <p className="text-caption text-center text-muted-foreground mt-2">Emoji</p>
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
                    <p className="text-caption text-center text-muted-foreground mt-2">Image</p>
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
                       <h4 className="text-h5 text-card-foreground mb-3">Choose an emoji:</h4>
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
                      <h4 className="text-h5 text-card-foreground mb-3">Choose background gradient:</h4>
                      <div className="grid grid-cols-3 gap-3 justify-items-center">
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
                          <h4 className="text-h5 text-card-foreground mb-3">Custom Gradient:</h4>
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
                                <label className="block text-label text-card-foreground mb-2">
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
                                <label className="block text-label text-card-foreground mb-2">
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
                    {/* Large Clickable Image Circle */}
                    <div className="flex justify-center">
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          id="image-upload"
                          disabled={isUploadingImage}
                        />
                        <div className={`relative w-48 h-32 rounded-xl overflow-hidden border-4 transition-all duration-200 ${
                          isUploadingImage 
                            ? 'border-primary/50 cursor-not-allowed' 
                            : 'border-border hover:border-primary/50 cursor-pointer'
                        }`}>
                          {previewUrl ? (
                            <Image
                              src={previewUrl}
                              alt="Recipe preview"
                              fill
                              className="object-cover"
                              onError={() => setPreviewUrl('')}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-muted/30 to-muted/50 flex items-center justify-center">
                              <svg className="w-12 h-12 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          
                          {/* Edit Icon Overlay */}
                          {!isUploadingImage && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <div className="bg-white/90 rounded-full p-2">
                                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </div>
                            </div>
                          )}
                          
                          {/* Loading Overlay */}
                          {isUploadingImage && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <div className="text-center text-white">
                                <div className="w-8 h-8 mx-auto mb-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <p className="text-sm">Uploading...</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* Ingredients and Instructions Section */}
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Ingredients Column */}
                  <div className="p-4 bg-accent/20 rounded-xl border border-white/10">
                    <h4 className="text-h5 text-card-foreground mb-3">Ingredients:</h4>
                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout">
                        {editableIngredients.map((ingredient, index) => {
                          // Use memoized key which is guaranteed to be valid
                          const key = memoizedIngredientKeys[index];
                          
                          return (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ 
                              type: "spring", 
                              stiffness: 300, 
                              damping: 30,
                              opacity: { duration: 0.2 },
                              scale: { duration: 0.2 }
                            }}
                            layout
                            className="p-2 bg-background border border-border rounded-xl h-fit flex items-center gap-2"
                          >
                            <textarea
                              value={ingredient}
                              onChange={(e) => {
                                updateIngredient(index, e.target.value);
                                // Auto-resize textarea
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = '1px';
                                target.style.height = target.scrollHeight + 'px';
                              }}
                              onInput={(e) => {
                                // Additional auto-resize on input for immediate feedback
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = '1px';
                                target.style.height = target.scrollHeight + 'px';
                              }}
                              className="ingredient-textarea flex-1 p-1 bg-transparent border-none text-card-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
                              style={{
                                fontSize: '16px',
                                lineHeight: '1.4',
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                height: 'auto',
                                minHeight: '1px'
                              }}
                              placeholder="Enter ingredient..."
                            />
                          </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>

                    {/* Add New Ingredient Button */}
                    <div className="mt-4">
                      <button
                        onClick={() => addIngredient(editableIngredients.length - 1)}
                        className="w-full p-3 border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-primary text-button"
                      >
                        <Plus className="w-4 h-4" />
                        Add Ingredient
                      </button>
                    </div>
                  </div>

                  {/* Mobile-only break line */}
                  <div className="block lg:hidden w-full h-0.5 bg-border/60 my-6"></div>

                  {/* Instructions Column */}
                  <div className="p-4 bg-accent/20 rounded-xl border border-white/10">
                    <h4 className="text-h5 text-card-foreground mb-3">Instructions:</h4>
                     <div
                       onDrop={handleDragEnd}
                       onDragOver={handleDragOver}
                       onDragLeave={() => clearHighlights()}
                       className="space-y-3"
                     >
                       <AnimatePresence mode="popLayout">
                         {editableInstructions.map((instruction, index) => {
                           // Use memoized key which is guaranteed to be valid
                           const key = memoizedInstructionKeys[index];
                           
                             return (
                               <div key={key}>
                                 <DropIndicator beforeId={index.toString()} column="instructions" />
                                 <motion.div
                                 layout
                                 layoutId={index.toString()}
                                 draggable="true"
                                 onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, index.toString())}
                                 initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                 animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                 transition={{ 
                                   type: "spring", 
                                   stiffness: 300, 
                                   damping: 30,
                                   opacity: { duration: 0.2 },
                                   scale: { duration: 0.2 }
                                 }}
                                 className={`group flex items-start gap-3 p-3 bg-background border border-border rounded-xl cursor-grab active:cursor-grabbing transition-colors ${
                                   activeInstruction === index.toString() ? 'opacity-50' : 'hover:bg-accent/20'
                                 }`}
                               >
                                 {/* Step Number */}
                                 <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-sm font-semibold text-primary">
                                   {index + 1}
                                 </div>

                                 {/* Instruction Input */}
                                 <div className="flex-1">
                                   <textarea
                                     value={instruction}
                                     onChange={(e) => {
                                       updateInstruction(index, e.target.value);
                                       // Auto-resize textarea
                                       e.target.style.height = 'auto';
                                       e.target.style.height = e.target.scrollHeight + 'px';
                                     }}
                                     className="instruction-textarea w-full p-0 bg-transparent border-none text-card-foreground placeholder:text-muted-foreground focus:outline-none resize-none overflow-hidden"
                                     style={{
                                       fontSize: '16px', // Prevents zoom on iOS
                                       transform: 'translateZ(0)', // Hardware acceleration
                                       backfaceVisibility: 'hidden', // Prevents flickering
                                       minHeight: '40px',
                                       height: 'auto'
                                     }}
                                     placeholder="Enter instruction..."
                                   />
                                 </div>

                                 {/* Hover Drag Handle */}
                                 <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing self-center">
                                   <GripVertical className="w-4 h-4" />
                                 </div>
                                 </motion.div>
                               </div>
                           );
                         })}
                         <DropIndicator beforeId={null} column="instructions" />
                       </AnimatePresence>
                     </div>

                    {/* Add New Instruction Button */}
                    <div className="mt-4">
                      <button
                        onClick={() => addInstruction(editableInstructions.length - 1)}
                        className="w-full p-3 border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-primary text-button"
                      >
                        <Plus className="w-4 h-4" />
                        Add Instruction
                      </button>
                    </div>
                  </div>
                </div>
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
