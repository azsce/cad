import { useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import './CircuitManagerPane.css';

/**
 * Circuit Manager Pane Component
 * Displays list of all circuits with metadata and provides circuit management functionality.
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export function CircuitManagerPane() {
  const circuits = useCircuitStore((state) => state.circuits);
  const activeCircuitId = useCircuitStore((state) => state.activeCircuitId);
  const createCircuit = useCircuitStore((state) => state.createCircuit);
  const deleteCircuit = useCircuitStore((state) => state.deleteCircuit);
  const setActiveCircuit = useCircuitStore((state) => state.setActiveCircuit);
  const updateCircuitName = useCircuitStore((state) => state.updateCircuitName);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Convert circuits record to array and sort by creation date (newest first)
  const circuitList = Object.values(circuits).sort(
    (a, b) => b.createdAt - a.createdAt
  );

  const handleCreateCircuit = () => {
    createCircuit();
  };

  const handleSelectCircuit = (id: string) => {
    setActiveCircuit(id);
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      updateCircuitName(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      deleteCircuit(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="circuit-manager-pane">
      <div className="circuit-manager-header">
        <h2>Circuit Manager</h2>
        <button
          className="btn-new-circuit"
          onClick={handleCreateCircuit}
          title="Create new circuit"
        >
          + New Circuit
        </button>
      </div>

      <div className="circuit-list">
        {circuitList.length === 0 ? (
          <div className="empty-state">
            <p>No circuits yet</p>
            <p className="empty-state-hint">
              Click "New Circuit" to get started
            </p>
          </div>
        ) : (
          circuitList.map((circuit) => {
            const isActive = circuit.id === activeCircuitId;
            const isEditing = editingId === circuit.id;
            const isDeleting = deleteConfirmId === circuit.id;

            return (
              <div
                key={circuit.id}
                className={`circuit-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (!isEditing) {
                    handleSelectCircuit(circuit.id);
                  }
                }}
              >
                <div className="circuit-item-content">
                  {isEditing ? (
                    <div className="circuit-name-edit">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => {
                          setEditingName(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit();
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        autoFocus
                        className="circuit-name-input"
                      />
                      <div className="edit-actions">
                        <button
                          className="btn-save"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit();
                          }}
                          title="Save"
                        >
                          ✓
                        </button>
                        <button
                          className="btn-cancel"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="circuit-name-row">
                        <h3 className="circuit-name">{circuit.name}</h3>
                        <div className="circuit-actions">
                          <button
                            className="btn-edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(circuit.id, circuit.name);
                            }}
                            title="Rename circuit"
                          >
                            ✎
                          </button>
                          <button
                            className="btn-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(circuit.id);
                            }}
                            title="Delete circuit"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                      <div className="circuit-metadata">
                        <div className="metadata-item">
                          <span className="metadata-label">Created:</span>
                          <span className="metadata-value">
                            {formatDate(circuit.createdAt)}
                          </span>
                        </div>
                        <div className="metadata-item">
                          <span className="metadata-label">Modified:</span>
                          <span className="metadata-value">
                            {formatDate(circuit.modifiedAt)} at{' '}
                            {formatTime(circuit.modifiedAt)}
                          </span>
                        </div>
                        <div className="metadata-item">
                          <span className="metadata-label">Components:</span>
                          <span className="metadata-value">
                            {circuit.nodes.length}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {isDeleting && (
                  <div
                    className="delete-confirmation"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <p className="delete-message">
                      Delete "{circuit.name}"?
                    </p>
                    <div className="delete-actions">
                      <button
                        className="btn-confirm-delete"
                        onClick={handleConfirmDelete}
                      >
                        Delete
                      </button>
                      <button
                        className="btn-cancel-delete"
                        onClick={handleCancelDelete}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
