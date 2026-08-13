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
  user: null,
  
  // Actions
  setPlants: (plants) => set({ plantsDatabase: plants }),
  setGardenData: (title, notes) => set({ gardenTitle: title, gardenNotes: notes }),
  setCurrentPlant: (id) => set({ currentPlantId: id }),
  setEditingMode: (isEditing) => set({ editingMode: isEditing }),
  setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt }),
  setUser: (user) => set({ user }),
  
  // ... more actions will be added as we migrate
}));
