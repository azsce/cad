/**
 * Type definitions for CircuitManagerPane components
 */

import type { CircuitId } from "../../../types/identifiers";

export interface EditingState {
  editingId: CircuitId | null;
  editingName: string;
  setEditingName: (name: string) => void;
}

export interface CircuitHandlers {
  handleCreateCircuit: () => void;
  handleSelectCircuit: (id: CircuitId) => void;
  handleStartEdit: (id: CircuitId, currentName: string) => void;
  handleSaveEdit: () => void;
  handleCancelEdit: () => void;
  handleDeleteClick: (id: CircuitId) => void;
  handleConfirmDelete: () => void;
  handleCancelDelete: () => void;
}
