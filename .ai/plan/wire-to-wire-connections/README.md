# Wire-to-Wire Connections Implementation Plan

## Quick Start

This directory contains the complete implementation plan for junction nodes, which enable wire-to-wire and node-to-wire connections in the circuit editor.

## Reading Order

1. **[00-master-plan.md](./00-master-plan.md)** - Start here
   - Overview of the entire system
   - Key requirements and decisions
   - Data models and workflows
   - Timeline and success criteria

2. **[01-foundation.md](./01-foundation.md)** - Phase 1
   - Type definitions
   - Junction node component
   - Component palette integration
   - Basic rendering

3. **[02-connection-system.md](./02-connection-system.md)** - Phase 2
   - Connection store updates
   - Temporary junction handling
   - Edge click detection
   - Connection completion logic

4. **[03-edge-splitting.md](./03-edge-splitting.md)** - Phase 3
   - Edge splitting algorithm
   - Waypoint distribution
   - Edge merging on deletion
   - Utility functions

5. **[04-visual-feedback.md](./04-visual-feedback.md)** - Phase 4
   - Connection highlighting
   - Hover states
   - Context menu
   - Label editing UI

6. **[05-analysis-integration.md](./05-analysis-integration.md)** - Phase 5
   - Junction collapse algorithm
   - Connection tree traversal
   - Graph transformation updates
   - Validation rules

7. **[06-polish-testing.md](./06-polish-testing.md)** - Phase 6
   - Keyboard shortcuts
   - Edge case handling
   - Comprehensive testing
   - Documentation

## Key Concepts

### Junction Nodes
- **Always visible** connection points (outlined circles)
- **Manually placed** by user (not auto-created)
- **Omnidirectional** connections via single invisible handle
- **Optional labels** (e.g., "VCC", "GND", "Node A")
- **Collapsed in analysis** - only component connections matter

### Connection Modes
- **Handle → Handle** - Direct component connections (existing)
- **Handle → Junction** - Connect component to junction
- **Junction → Handle** - Connect junction to component
- **Junction → Junction** - Connect two junctions
- **→ Edge** - Click edge during connection creates junction

### Technical Approach
- **Virtual junction nodes** - Leverage React Flow's node system
- **Single handle** - Routing handled by waypoints, not handle position
- **Temporary junction** - Stored in ConnectionStore during connection
- **Edge splitting** - Automatic when junction created on edge
- **Edge merging** - Automatic when junction with 2 edges deleted

## Implementation Status

- [ ] Phase 1: Foundation
- [ ] Phase 2: Connection System
- [ ] Phase 3: Edge Splitting
- [ ] Phase 4: Visual Feedback
- [ ] Phase 5: Analysis Integration
- [ ] Phase 6: Polish & Testing

## Timeline

**Estimated**: 22-28 hours total
- Phase 1: 3-4 hours
- Phase 2: 4-5 hours
- Phase 3: 4-5 hours
- Phase 4: 3-4 hours
- Phase 5: 4-5 hours
- Phase 6: 4-5 hours

## Key Files to Create/Modify

### New Files
- `src/types/circuit.ts` - Add JunctionNode types
- `src/components/CircuitEditor/nodes/JunctionNode/index.tsx`
- `src/components/CircuitEditor/nodes/JunctionNode/TemporaryJunction.tsx`
- `src/components/CircuitEditor/nodes/JunctionNode/JunctionContextMenu.tsx`
- `src/components/CircuitEditor/nodes/JunctionNode/JunctionPropertiesDialog.tsx`
- `src/utils/edgeSplitting.ts`
- `src/utils/connectionTraversal.ts`

### Modified Files
- `src/store/connectionStore.ts` - Add temporary junction state
- `src/components/CircuitEditor/nodes/index.ts` - Register junction type
- `src/components/CircuitEditor/ComponentPalette/index.tsx` - Add junction
- `src/components/CircuitEditor/edges/WireEdge/index.tsx` - Add edge click
- `src/contexts/CircuitFlowContext/useConnectionHandlers.ts` - Handle junctions
- `src/contexts/ValidationContext/graphTransformation.ts` - Collapse junctions
- `src/contexts/ValidationContext/validation.ts` - Validate junctions

## Testing Strategy

### Unit Tests
- Type guards and utilities
- Edge splitting logic
- Connection traversal
- Waypoint distribution

### Integration Tests
- Junction creation (palette + edge click)
- All connection modes
- Edge splitting and merging
- Label editing
- Deletion with confirmation

### Visual Tests
- Rendering states
- Highlighting
- Hover effects
- Temporary junction display

## Success Criteria

- ✅ Junctions can be placed from palette
- ✅ All connection modes work
- ✅ Edges split correctly when junction created on edge
- ✅ Selected edge highlights connected handles/junctions
- ✅ Waypoints maintain 5px gap from junctions
- ✅ Junction labels can be added/edited/removed
- ✅ Junction deletion merges edges when possible
- ✅ Analysis correctly traces connections through junctions
- ✅ Circuit validation handles junction topology
- ✅ No visual glitches or performance issues

## Questions or Issues?

Refer to the master plan for:
- Technical decisions and rationale
- Data model details
- User workflows
- Edge case handling

Each phase document includes:
- Detailed implementation steps
- Code examples
- Verification checklists
- Acceptance criteria

---

**Last Updated**: 2024
**Status**: Planning Complete - Ready for Implementation
