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
  
  // Actions
  setPlants: (plants) => set({ plantsDatabase: plants }),
  setCurrentPlant: (id) => set({ currentPlantId: id }),
  setEditingMode: (isEditing) => set({ editingMode: isEditing }),
  
  // ... more actions will be added as we migrate
}));
