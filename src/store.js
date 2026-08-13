import { create } from 'zustand';

export const useStore = create((set) => ({
  gardenTitle: "🌿 Gestione Piante Tropicali - Pro",
  gardenNotes: "",
  plantsDatabase: [],
  generalExpenses: [],
  wishlist: [],
  
  // App State
  currentPlantId: null,
  editingMode: false,
  unsavedChanges: false,
  isFormDirty: false,
  isBatchMode: false,
  selectedBatchPlants: new Set(),
  deferredPrompt: null,
  
  // Actions
  setPlants: (plants) => set({ plantsDatabase: plants }),
  setCurrentPlant: (id) => set({ currentPlantId: id }),
  setEditingMode: (isEditing) => set({ editingMode: isEditing }),
  setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt }),
  
  // ... more actions will be added as we migrate
}));
