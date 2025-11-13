import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  TextField,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
} from '@mui/icons-material';
import { useCircuitStore } from '../../store/circuitStore';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Circuit Manager Pane Component
 * Displays list of all circuits with metadata and provides circuit management functionality.
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 11.3
 */
export function CircuitManagerPane() {
  const circuits = useCircuitStore((state) => state.circuits);
  const activeCircuitId = useCircuitStore((state) => state.activeCircuitId);
  const createCircuit = useCircuitStore((state) => state.createCircuit);
  const deleteCircuit = useCircuitStore((state) => state.deleteCircuit);
  const setActiveCircuit = useCircuitStore((state) => state.setActiveCircuit);
  const updateCircuitName = useCircuitStore((state) => state.updateCircuitName);

  const { mode, toggleTheme } = useTheme();

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
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="h2">
            Circuit Manager
          </Typography>
          <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton onClick={toggleTheme} size="small">
              {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
            </IconButton>
          </Tooltip>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateCircuit}
          fullWidth
        >
          New Circuit
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {circuitList.length === 0 ? (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body1" gutterBottom>
              No circuits yet
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Click "New Circuit" to get started
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {circuitList.map((circuit) => {
              const isActive = circuit.id === activeCircuitId;
              const isEditing = editingId === circuit.id;

              return (
                <ListItem
                  key={circuit.id}
                  disablePadding
                  sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                  }}
                >
                  <ListItemButton
                    selected={isActive}
                    onClick={() => {
                      if (!isEditing) {
                        handleSelectCircuit(circuit.id);
                      }
                    }}
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      py: 1.5,
                    }}
                  >
                    {isEditing ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          value={editingName}
                          onChange={(e) => { setEditingName(e.target.value); }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit();
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          onClick={(e) => { e.stopPropagation(); }}
                          autoFocus
                          size="small"
                          fullWidth
                        />
                        <Tooltip title="Save">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveEdit();
                            }}
                          >
                            <CheckIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Cancel">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                          >
                            <CloseIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : (
                      <>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                          }}
                        >
                          <Typography variant="subtitle1" fontWeight="medium">
                            {circuit.name}
                          </Typography>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Rename circuit">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(circuit.id, circuit.name);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete circuit">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(circuit.id);
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            Created: {formatDate(circuit.createdAt)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Modified: {formatDate(circuit.modifiedAt)} at{' '}
                            {formatTime(circuit.modifiedAt)}
                          </Typography>
                          <Box>
                            <Chip
                              label={`${circuit.nodes.length.toString()} components`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Stack>
                      </>
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onClose={handleCancelDelete}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Circuit</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "
            {deleteConfirmId !== null ? circuits[deleteConfirmId]?.name : ''}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
