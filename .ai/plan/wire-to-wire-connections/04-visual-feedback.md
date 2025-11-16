# Phase 4: Visual Feedback

## Overview

Implement visual feedback for connection states, including highlighting connected handles/junctions when edges are selected, hover states, and label editing UI.

## Tasks

### Task 4.1: Update ConnectableHandle Highlighting

**File**: `src/components/CircuitEditor/nodes/ConnectableHandle.tsx`

#### Change Highlight Color from Error to Primary

```typescript
export const ConnectableHandle = memo(({ nodeId, handleId, ...handleProps }: ConnectableHandleProps) => {
  const theme = useTheme();
  const { edges } = useCircuitFlow();
  
  // Check if this handle is connected to a selected edge
  const isConnectedToSelectedEdge = useMemo(() => 
    edges.some((edge) => 
      edge.selected && (
        (edge.source === nodeId && edge.sourceHandle === handleId) ||
        (edge.target === nodeId && edge.targetHandle === handleId)
      )
    ), [nodeId, handleId, edges]);
  
  const handleStyle = useMemo(() => ({
    ...handleProps.style,
    cursor: isConnecting ? 'pointer' : 'crosshair',
    // Change from error color to primary color for highlighting
    background: isConnectedToSelectedEdge 
      ? theme.palette.primary.main 
      : handleProps.style?.background,
    // Add glow effect when connected to selected edge
    ...(isConnectedToSelectedEdge && {
      boxShadow: `0 0 8px ${theme.palette.primary.main}`,
    }),
  }), [handleProps.style, isConnecting, isConnectedToSelectedEdge, theme]);
  
  // ... rest of component
});
```

**Verification**:
- Handles highlight in primary color (blue) when edge selected
- Glow effect visible
- No error color (red) used

---

### Task 4.2: Add Junction Highlighting

**File**: `src/components/CircuitEditor/nodes/JunctionNode/index.tsx`

#### Highlight Junction When Connected to Selected Edge

```typescript
export const JunctionNode = memo(({ id, data, selected }: NodeProps<JunctionNodeType>) => {
  const theme = useTheme();
  const { edges } = useCircuitFlow();
  const isConnecting = useConnectionStore(state => state.isConnecting);
  const [isHovered, setIsHovered] = useState(false);

  // Check if this junction is connected to a selected edge
  const isConnectedToSelectedEdge = useMemo(() =>
    edges.some((edge) =>
      edge.selected && (edge.source === id || edge.target === id)
    ), [id, edges]);

  // Visual states
  const isFilled = selected || isConnectedToSelectedEdge; // Fill when selected OR connected to selected edge
  const isHighlighted = isHovered || (isConnecting && isHovered);
  const outlineWidth = isHighlighted ? 3 : 2;
  const circleRadius = 8;
  const svgSize = 20;

  // Determine fill color
  const fillColor = isConnectedToSelectedEdge 
    ? theme.palette.primary.main 
    : (selected ? theme.palette.primary.main : 'none');

  return (
    <Box
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        position: 'relative',
        width: svgSize,
        height: svgSize,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: isConnecting ? 'pointer' : 'default',
      }}
    >
      <svg
        width={svgSize}
        height={svgSize}
        style={{
          overflow: 'visible',
        }}
      >
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={circleRadius}
          fill={fillColor}
          stroke={theme.palette.primary.main}
          strokeWidth={outlineWidth}
          style={{
            transition: 'all 0.2s ease',
            filter: (isHighlighted || isConnectedToSelectedEdge) 
              ? `drop-shadow(0 0 6px ${theme.palette.primary.main})` 
              : 'none',
          }}
        />
      </svg>

      {/* Label */}
      {data.label && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: svgSize + 2,
            fontSize: '10px',
            color: 'text.secondary',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {data.label}
        </Typography>
      )}

      {/* Handle */}
      <Handle
        type="source"
        position={Position.Top}
        id="center"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: svgSize,
          height: svgSize,
          opacity: 0,
          border: 'none',
          background: 'transparent',
          cursor: isConnecting ? 'pointer' : 'crosshair',
        }}
      />
    </Box>
  );
});
```

**Verification**:
- Junction fills when connected to selected edge
- Glow effect appears
- Visual feedback is clear

---

### Task 4.3: Add Edge Hover State During Connection

**File**: `src/components/CircuitEditor/edges/WireEdge/index.tsx`

#### Enhance Hover Feedback

```typescript
export const WireEdge = memo((props: EdgeProps) => {
  const { id, selected, /* ... */ } = props;
  const theme = useTheme();
  const isConnecting = useConnectionStore(state => state.isConnecting);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Determine edge style based on state
  const edgeStyle = useMemo(() => {
    let strokeWidth = 2;
    let stroke = theme.palette.text.primary;

    if (selected) {
      strokeWidth = 3;
      stroke = theme.palette.primary.main;
    }

    if (isConnecting && isHovered) {
      strokeWidth = 4;
      stroke = theme.palette.success.main; // Green to indicate connectable
    }

    return {
      strokeWidth,
      stroke,
      transition: 'all 0.2s ease',
    };
  }, [selected, isConnecting, isHovered, theme]);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={edgeStyle}
        interactionWidth={20}
        onClick={handleEdgeClickDuringConnection}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      {/* ... rest of component */}
    </>
  );
});
```

**Verification**:
- Edge highlights green when hovered during connection
- Smooth transition
- Clear visual feedback

---

### Task 4.4: Implement Junction Context Menu

**File**: `src/components/CircuitEditor/nodes/JunctionNode/JunctionContextMenu.tsx`

```typescript
/**
 * Context menu for junction nodes.
 * Shows Edit Properties and Delete options.
 */

import { memo, useCallback } from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { logger } from '../../../../utils/logger';

interface JunctionContextMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onEditProperties: () => void;
  onDelete: () => void;
}

export const JunctionContextMenu = memo(({
  anchorEl,
  open,
  onClose,
  onEditProperties,
  onDelete,
}: JunctionContextMenuProps) => {
  const handleEditClick = useCallback(() => {
    logger.debug({ caller: 'JunctionContextMenu' }, 'Edit properties clicked');
    onEditProperties();
    onClose();
  }, [onEditProperties, onClose]);

  const handleDeleteClick = useCallback(() => {
    logger.debug({ caller: 'JunctionContextMenu' }, 'Delete clicked');
    onDelete();
    onClose();
  }, [onDelete, onClose]);

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <MenuItem onClick={handleEditClick}>
        <ListItemIcon>
          <Edit fontSize="small" />
        </ListItemIcon>
        <ListItemText>Edit Properties</ListItemText>
      </MenuItem>
      
      <MenuItem onClick={handleDeleteClick}>
        <ListItemIcon>
          <Delete fontSize="small" />
        </ListItemIcon>
        <ListItemText>Delete Junction</ListItemText>
      </MenuItem>
    </Menu>
  );
});

JunctionContextMenu.displayName = 'JunctionContextMenu';
```

**Verification**:
- Context menu appears on right-click
- Menu items are clickable
- Menu closes after selection

---

### Task 4.5: Add Context Menu to JunctionNode

**File**: `src/components/CircuitEditor/nodes/JunctionNode/index.tsx`

```typescript
import { JunctionContextMenu } from './JunctionContextMenu';
import { useCircuitFlow } from '../../../../hooks/useCircuitFlow';

export const JunctionNode = memo(({ id, data, selected }: NodeProps<JunctionNodeType>) => {
  // ... existing code
  
  const { deleteNodes, updateNodeData } = useCircuitFlow();
  const [contextMenuAnchor, setContextMenuAnchor] = useState<HTMLElement | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuAnchor(event.currentTarget);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuAnchor(null);
  }, []);

  const handleEditProperties = useCallback(() => {
    setEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    deleteNodes([id]);
  }, [id, deleteNodes]);

  return (
    <>
      <Box
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          position: 'relative',
          width: svgSize,
          height: svgSize,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: isConnecting ? 'pointer' : 'default',
        }}
      >
        {/* ... existing SVG and label */}
      </Box>

      <JunctionContextMenu
        anchorEl={contextMenuAnchor}
        open={Boolean(contextMenuAnchor)}
        onClose={handleCloseContextMenu}
        onEditProperties={handleEditProperties}
        onDelete={handleDelete}
      />

      {/* Edit Properties Dialog - implemented in next task */}
    </>
  );
});
```

**Verification**:
- Right-click opens context menu
- Edit Properties opens dialog
- Delete removes junction

---

### Task 4.6: Implement Junction Properties Dialog

**File**: `src/components/CircuitEditor/nodes/JunctionNode/JunctionPropertiesDialog.tsx`

```typescript
/**
 * Dialog for editing junction properties (label).
 */

import { memo, useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import { logger } from '../../../../utils/logger';

interface JunctionPropertiesDialogProps {
  open: boolean;
  currentLabel?: string;
  onClose: () => void;
  onSave: (label: string) => void;
}

export const JunctionPropertiesDialog = memo(({
  open,
  currentLabel = '',
  onClose,
  onSave,
}: JunctionPropertiesDialogProps) => {
  const [label, setLabel] = useState(currentLabel);

  // Update local state when dialog opens with new label
  useEffect(() => {
    if (open) {
      setLabel(currentLabel);
    }
  }, [open, currentLabel]);

  const handleSave = useCallback(() => {
    logger.debug({ caller: 'JunctionPropertiesDialog' }, 'Saving label', { label });
    onSave(label);
    onClose();
  }, [label, onSave, onClose]);

  const handleCancel = useCallback(() => {
    setLabel(currentLabel); // Reset to original
    onClose();
  }, [currentLabel, onClose]);

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Junction Properties</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Label"
          type="text"
          fullWidth
          variant="outlined"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., VCC, GND, Node A"
          helperText="Optional label for this junction"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
});

JunctionPropertiesDialog.displayName = 'JunctionPropertiesDialog';
```

**Verification**:
- Dialog opens with current label
- Can edit label
- Save updates junction
- Cancel discards changes

---

### Task 4.7: Add Dialog to JunctionNode

**File**: `src/components/CircuitEditor/nodes/JunctionNode/index.tsx`

```typescript
import { JunctionPropertiesDialog } from './JunctionPropertiesDialog';

export const JunctionNode = memo(({ id, data, selected }: NodeProps<JunctionNodeType>) => {
  // ... existing code
  
  const handleSaveLabel = useCallback((newLabel: string) => {
    logger.debug({ caller: 'JunctionNode' }, 'Saving label', { id, newLabel });
    updateNodeData(id, { label: newLabel });
    setEditDialogOpen(false);
  }, [id, updateNodeData]);

  return (
    <>
      {/* ... existing Box and context menu */}

      <JunctionPropertiesDialog
        open={editDialogOpen}
        currentLabel={data.label}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleSaveLabel}
      />
    </>
  );
});
```

**Verification**:
- Dialog opens from context menu
- Label updates on save
- Dialog closes after save

---

### Task 4.8: Add Double-Click Label Editing

**File**: `src/components/CircuitEditor/nodes/JunctionNode/index.tsx`

```typescript
export const JunctionNode = memo(({ id, data, selected }: NodeProps<JunctionNodeType>) => {
  // ... existing code

  const handleLabelDoubleClick = useCallback((event: React.MouseEvent) => {
    if (!data.label) return; // Only if label exists
    
    event.stopPropagation();
    setEditDialogOpen(true);
  }, [data.label]);

  return (
    <>
      <Box
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          position: 'relative',
          width: svgSize,
          height: svgSize,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: isConnecting ? 'pointer' : 'default',
        }}
      >
        {/* ... SVG */}

        {/* Label with double-click editing */}
        {data.label && (
          <Typography
            variant="caption"
            onDoubleClick={handleLabelDoubleClick}
            sx={{
              position: 'absolute',
              top: svgSize + 2,
              fontSize: '10px',
              color: 'text.secondary',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              cursor: 'text',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {data.label}
          </Typography>
        )}

        {/* Handle */}
      </Box>

      {/* ... context menu and dialog */}
    </>
  );
});
```

**Verification**:
- Double-clicking label opens edit dialog
- Hover shows underline
- Cursor changes to text cursor

---

## Testing Checklist

### Unit Tests
- [ ] Context menu component renders
- [ ] Properties dialog component renders
- [ ] Label editing updates data

### Integration Tests
- [ ] Handles highlight when edge selected
- [ ] Junctions highlight when edge selected
- [ ] Edge highlights green when hovered during connection
- [ ] Right-click opens context menu
- [ ] Edit Properties opens dialog
- [ ] Delete removes junction
- [ ] Double-click label opens dialog
- [ ] Label updates on save

### Visual Tests
- [ ] Highlight color is primary (blue), not error (red)
- [ ] Glow effect visible on handles/junctions
- [ ] Edge hover state is clear
- [ ] Context menu positioned correctly
- [ ] Dialog is centered and styled

## Acceptance Criteria

- ✅ Handles highlight in primary color when edge selected
- ✅ Junctions highlight when edge selected
- ✅ Edges highlight green when hovered during connection
- ✅ Context menu works on right-click
- ✅ Properties dialog allows label editing
- ✅ Double-click label opens edit dialog
- ✅ All visual states are clear and consistent
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ No console errors

## Next Phase

Proceed to **Phase 5: Analysis Integration** to implement junction collapse and connection tree traversal.
