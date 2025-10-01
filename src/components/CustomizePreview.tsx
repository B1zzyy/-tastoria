'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Instagram } from 'lucide-react';

interface CustomizePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreview: {
    type: 'emoji' | 'image' | 'default';
    value?: string;
  };
  onSave: (preview: { type: 'emoji' | 'image'; value: string } | null) => void;
}

const EMOJI_OPTIONS = [
  '🍕', '🍝', '🍜', '🍲', '🥘', '🍛', '🍱', '🍣', '🍤', '🍙',
  '🍚', '🍘', '🍥', '🥟', '🍢', '🍡', '🍧', '🍨', '🍩', '🍪',
  '🎂', '🍰', '🧁', '🥧', '🍮', '🍭', '🍬', '🍫', '🍿', '🍯',
  '🥛', '🍼', '☕', '🍵', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷',
  '🥃', '🍸', '🍹', '🍾', '🥄', '🍴', '🍽️', '🥢', '🥡', '🍯'
];

export default function CustomizePreview({ isOpen, onClose, currentPreview, onSave }: CustomizePreviewProps) {
  const [selectedType, setSelectedType] = useState<'emoji' | 'image' | 'default'>(
    currentPreview.type || 'default'
  );
  const [selectedEmoji, setSelectedEmoji] = useState(currentPreview.value || '🍕');
  const [imageUrl, setImageUrl] = useState(currentPreview.value || '');
  const [previewUrl, setPreviewUrl] = useState('');

  const handleSave = () => {
    if (selectedType === 'default') {
      onSave(null);
    } else if (selectedType === 'emoji') {
      onSave({ type: 'emoji', value: selectedEmoji });
    } else if (selectedType === 'image' && imageUrl.trim()) {
      onSave({ type: 'image', value: imageUrl.trim() });
    }
    onClose();
  };

  const handleImageUrlChange = (url: string) => {
    setImageUrl(url);
    // Create a preview URL for validation
    if (url.trim()) {
      setPreviewUrl(url.trim());
    } else {
      setPreviewUrl('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-card-foreground">Customize Preview</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Preview Options */}
            <div className="space-y-4">
              {/* Option 1: Default Instagram */}
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedType === 'default'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedType('default')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-800 via-gray-600 to-black rounded-lg flex items-center justify-center">
                    <Instagram className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground">Default Instagram</h3>
                    <p className="text-sm text-muted-foreground">Use the original Instagram logo</p>
                  </div>
                </div>
              </div>

              {/* Option 2: Emoji */}
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedType === 'emoji'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedType('emoji')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-3xl shadow-lg">
                    {selectedEmoji}
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground">Custom Emoji</h3>
                    <p className="text-sm text-muted-foreground">Choose a fun emoji for your recipe</p>
                  </div>
                </div>
              </div>

              {/* Emoji Picker */}
              {selectedType === 'emoji' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-accent/20 rounded-xl border border-white/10"
                >
                  <h4 className="font-medium text-card-foreground mb-4">Choose an emoji:</h4>
                  <div className="grid grid-cols-8 gap-3 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setSelectedEmoji(emoji)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl hover:scale-110 transition-all duration-200 ${
                          selectedEmoji === emoji 
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105' 
                            : 'hover:bg-white/10 hover:shadow-md'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Option 3: Custom Image */}
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedType === 'image'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedType('image')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground">Custom Image</h3>
                    <p className="text-sm text-muted-foreground">Upload your own image</p>
                  </div>
                </div>
              </div>

              {/* Image URL Input */}
              {selectedType === 'image' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-accent/30 rounded-xl space-y-3"
                >
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      Image URL:
                    </label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => handleImageUrlChange(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  {/* Image Preview */}
                  {previewUrl && (
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2">
                        Preview:
                      </label>
                      <div className="w-20 h-20 rounded-lg overflow-hidden border border-border">
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
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-muted-foreground hover:text-card-foreground border border-border rounded-xl hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
              >
                Save Preview
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
