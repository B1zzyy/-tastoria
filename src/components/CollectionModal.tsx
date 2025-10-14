'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Folder, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserCollections, createCollection, saveRecipeToCollection, type Collection } from '@/lib/collectionsService';
import type { Recipe } from '@/lib/recipe-parser';

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
  recipeUrl: string;
  onSaved: (collectionName?: string) => void;
}

export default function CollectionModal({ isOpen, onClose, recipe, recipeUrl, onSaved }: CollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCollections();
    }
  }, [isOpen]);

  const loadCollections = async () => {
    setLoading(true);
    setError(null);
    
    const { data, error } = await getUserCollections();
    
    if (error) {
      setError(error.message);
    } else {
      // Filter out "All Recipes" collection since recipes are saved there automatically
      const filteredCollections = (data || []).filter(c => c.name !== 'All Recipes');
      setCollections(filteredCollections);
      
      // Pre-select the first available collection
      if (filteredCollections.length > 0) {
        setSelectedCollectionId(filteredCollections[0].id);
      }
    }
    
    setLoading(false);
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;

    setLoading(true);
    const { data, error } = await createCollection(newCollectionName.trim());
    
    if (error) {
      setError(error.message);
    } else if (data) {
      setCollections(prev => [...prev, { ...data, recipe_count: 0 }]);
      setSelectedCollectionId(data.id);
      setShowNewCollection(false);
      setNewCollectionName('');
    }
    
    setLoading(false);
  };

  const handleSaveToCollection = async () => {
    if (!selectedCollectionId) return;

    setSaving(true);
    const { error } = await saveRecipeToCollection(recipe, recipeUrl, selectedCollectionId);
    
    if (error) {
      setError(error.message);
    } else {
      // Find the collection name to pass to the callback
      const collection = collections.find(c => c.id === selectedCollectionId);
      onSaved(collection?.name);
      onClose();
    }
    
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.3
            }}
            className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
          >
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between p-6 border-b border-border"
            >
              <h2 className="text-xl font-bold text-card-foreground">
                Save to Collection
              </h2>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 text-muted-foreground hover:text-card-foreground rounded-lg hover:bg-accent transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </motion.div>

            {/* Content */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="p-6"
            >
              {/* Recipe Info */}
              <div className="mb-6">
                <h3 className="font-medium text-card-foreground mb-2 line-clamp-1">
                  {recipe.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose a collection to save this recipe
                </p>
              </div>

              {/* Error */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                >
                  <p className="text-sm text-destructive">{error}</p>
                </motion.div>
              )}

              {/* Loading */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Collections List */}
                  <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                    {collections.map((collection, index) => (
                      <motion.button
                        key={collection.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        onClick={() => setSelectedCollectionId(collection.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                          selectedCollectionId === collection.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-accent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            selectedCollectionId === collection.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-accent text-muted-foreground'
                          }`}>
                            <Folder className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-card-foreground">
                              {collection.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {collection.recipe_count || 0} recipes
                            </p>
                          </div>
                        </div>
                        {selectedCollectionId === collection.id && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </motion.button>
                    ))}
                  </div>

                  {/* New Collection Form */}
                  <AnimatePresence>
                    {showNewCollection && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mb-4 p-4 border border-border rounded-xl bg-accent/50"
                      >
                        <input
                          type="text"
                          placeholder="Collection name"
                          value={newCollectionName}
                          onChange={(e) => setNewCollectionName(e.target.value)}
                          className="w-full px-3 py-2 mb-3 bg-background border border-border rounded-lg text-card-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleCreateCollection}
                            disabled={!newCollectionName.trim() || loading}
                            className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            Create
                          </button>
                          <button
                            onClick={() => {
                              setShowNewCollection(false);
                              setNewCollectionName('');
                            }}
                            className="px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* New Collection Button */}
                  {!showNewCollection && (
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      onClick={() => setShowNewCollection(true)}
                      className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Collection
                    </motion.button>
                  )}
                </>
              )}
            </motion.div>

            {/* Footer */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 border-t border-border bg-accent/30"
            >
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveToCollection}
                  disabled={!selectedCollectionId || saving}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
