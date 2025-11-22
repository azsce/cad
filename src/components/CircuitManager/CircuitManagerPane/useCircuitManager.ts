/**
 * Hook for managing circuit manager state and handlers
 */

import { useState, useMemo, useCallback } from "react";
import type { Circuit } from "../../../types/circuit";
import type { CircuitId } from "../../../types/identifiers";

interface UseCircuitManagerParams {
  circuits: Record<string, Circuit>;
  createCircuit: () => void;
  deleteCircuit: (id: CircuitId) => void;
  setActiveCircuit: (id: CircuitId) => void;
  updateCircuitName: (id: CircuitId, name: string) => void;
}

export const useCircuitManager = ({
  circuits,
  createCircuit,
  deleteCircuit,
  setActiveCircuit,
  updateCircuitName,
}: UseCircuitManagerParams) => {
  const [editingId, setEditingId] = useState<CircuitId | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<CircuitId | null>(null);

  const circuitList = useMemo(() => {
    return Object.values(circuits).sort((a, b) => b.createdAt - a.createdAt);
  }, [circuits]);

  const handleCreateCircuit = useCallback(() => {
    createCircuit();
  }, [createCircuit]);

  const handleSelectCircuit = useCallback(
    (id: CircuitId) => {
      setActiveCircuit(id);
    },
    [setActiveCircuit]
  );

  const handleStartEdit = useCallback((id: CircuitId, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingId && editingName.trim()) {
      updateCircuitName(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName("");
  }, [editingId, editingName, updateCircuitName]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingName("");
  }, []);

  const handleDeleteClick = useCallback((id: CircuitId) => {
    setDeleteConfirmId(id);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      deleteCircuit(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, deleteCircuit]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  return {
    circuitList,
    editingState: {
      editingId,
      editingName,
      setEditingName,
    },
    deleteConfirmId,
    handlers: {
      handleCreateCircuit,
      handleSelectCircuit,
      handleStartEdit,
      handleSaveEdit,
      handleCancelEdit,
      handleDeleteClick,
      handleConfirmDelete,
      handleCancelDelete,
    },
  };
};
