# Implementation Plan

- [x] 1. Update data model to support rotation





  - Add rotation property to ResistorData, VoltageSourceData, and CurrentSourceData types
  - Define rotation as optional property with type `0 | 90 | 180 | 270`
  - Ensure backward compatibility by making rotation optional with default value of 0
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
- [x] 2. Create reusable RotationButton component






- [x] 2. Create reusable RotationButton component

  - [x] 2.1 Implement RotationButton component with props interface


    - Create component file at `src/components/CircuitEditor/nodes/RotationButton.tsx`
    - Define props: direction ('clockwise' | 'counterclockwise'), position ('top-left' | 'bottom-left'), onClick, visible
    - Import MUI icons: RotateRight for clockwise, RotateLeft for counterclockwise
    - _Requirements: 6.1, 6.4, 6.5_

  - [x] 2.2 Style RotationButton with proper positioning

    - Create 24px circular button with semi-transparent background
    - Position absolutely at corners: top-left (-12px, -12px), bottom-left (-12px, bottom -12px)
    - Add hover effects and tooltip
    - Ensure button appears outside node border and above all content (z-index)
    - _Requirements: 6.2, 6.3, 6.5, 6.6_

- [x] 3. Implement rotation logic in ResistorNode





  - [x] 3.1 Add rotation state and handlers

    - Extract rotation value from data with default of 0
    - Implement handleRotateClockwise: `(rotation + 90) % 360`
    - Implement handleRotateCounterClockwise: `(rotation - 90 + 360) % 360`
    - Call updateNodeData via CircuitFlowContext to update rotation
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_


  - [x] 3.2 Implement two-layer rendering structure
    - Create outer wrapper Box with fixed dimensions (80x40) - no rotation
    - Create inner Box with rotation transform applied
    - Position inner Box centered using translate(-50%, -50%)
    - Move SVG and value label inside inner rotated Box
    - _Requirements: 1.5, 3.1, 3.2, 3.3, 3.4_


  - [x] 3.3 Add hover state and rotation buttons
    - Track hover state using onMouseEnter/onMouseLeave
    - Render RotationButton components on outer wrapper
    - Pass visible prop based on hover or selected state
    - Position buttons outside the node border

    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [x] 3.4 Update handle positions based on rotation

    - Create getHandlePosition helper function
    - Map logical handle IDs ('left', 'right') to React Flow positions based on rotation
    - Update Handle components to use dynamic positions
    - Ensure handles maintain their IDs regardless of rotation
    - _Requirements: 1.4, 3.6_

- [x] 4. Implement rotation logic in VoltageSourceNode





  - [x] 4.1 Add rotation state and handlers

    - Extract rotation value from data with default of 0
    - Implement handleRotateClockwise and handleRotateCounterClockwise
    - Call updateNodeData via CircuitFlowContext
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_


  - [x] 4.2 Implement two-layer rendering structure

    - Create outer wrapper Box with fixed dimensions (60x80) - no rotation
    - Create inner Box with rotation transform applied
    - Move SVG, polarity indicators, and value label inside inner rotated Box
    - Ensure polarity indicators (+ and -) rotate with component
    - _Requirements: 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2_



  - [x] 4.3 Add hover state and rotation buttons

    - Track hover state
    - Render RotationButton components on outer wrapper
    - Position buttons outside the node border

    - _Requirements: 6.1, 6.2, 6.3, 6.6_


  - [x] 4.4 Update handle positions based on rotation

    - Create getHandlePosition helper for 'top' and 'bottom' handles
    - Map handle IDs to React Flow positions based on rotation
    - Verify handles maintain neutral IDs (not polarity-based)
    - Ensure polarity toggle works independently of rotation
    - _Requirements: 1.4, 3.6, 4.1, 4.3, 4.4, 4.5_

- [ ] 5. Implement rotation logic in CurrentSourceNode





  - [x] 5.1 Add rotation state and handlers

    - Extract rotation value from data with default of 0
    - Implement handleRotateClockwise and handleRotateCounterClockwise
    - Call updateNodeData via CircuitFlowContext
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

  - [x] 5.2 Implement two-layer rendering structure

    - Create outer wrapper Box with fixed dimensions (60x80) - no rotation
    - Create inner Box with rotation transform applied
    - Move SVG, arrow indicator, and value label inside inner rotated Box
    - Ensure arrow indicator rotates with component
    - _Requirements: 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2_


  - [x] 5.3 Add hover state and rotation buttons

    - Track hover state
    - Render RotationButton components on outer wrapper
    - Position buttons outside the node border
    - _Requirements: 6.1, 6.2, 6.3, 6.6_





  - [x] 5.4 Update handle positions based on rotation





    - Create getHandlePosition helper for 'top' and 'bottom' handles
    - Map handle IDs to React Flow positions based on rotation
    - Verify handles maintain neutral IDs (not direction-based)
    - Ensure direction toggle works independently of rotation
    - _Requirements: 1.4, 3.6, 4.1, 4.3, 4.4, 4.5_

- [-] 6. Verify state synchronization and persistence




  - [ ] 6.1 Test CircuitFlowContext integration
    - Verify updateNodeData correctly updates rotation in local state
    - Verify rotation updates propagate to Zustand store
    - Verify no infinite render loops occur
    - _Requirements: 1.2, 2.4, 5.2, 5.3_

  - [ ] 6.2 Test rotation persistence
    - Create circuit with rotated components
    - Verify rotation values are stored in Zustand store
    - Reload circuit and verify rotations are restored
    - Verify CircuitFlowContext initializes nodes with correct rotation
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 7. Manual testing and validation
  - [ ] 7.1 Test basic rotation functionality
    - Add resistor and rotate clockwise 4 times, verify returns to 0°
    - Add voltage source and rotate counter-clockwise, verify goes to 270°
    - Verify value labels rotate with nodes (vertical at 90°/270°, upside-down at 180°)
    - _Requirements: 1.1, 1.3, 2.1, 2.2, 3.2, 3.3, 3.4_

  - [ ] 7.2 Test position stability
    - Place node at specific position
    - Rotate through all angles (0° → 90° → 180° → 270° → 0°)
    - Verify node returns to exact same position
    - Verify no cumulative position drift
    - _Requirements: 1.5_

  - [ ] 7.3 Test connection integrity
    - Connect two components with wire
    - Rotate one component through all angles
    - Verify wire remains connected
    - Verify wire updates to new handle positions
    - Verify no position drift after rotation
    - _Requirements: 1.4, 3.6_

  - [ ] 7.4 Test polarity independence
    - Connect voltage source to other components
    - Rotate voltage source to different angles
    - Toggle polarity (click circle)
    - Verify connections remain intact
    - Verify only visual indicators (+ and -) change
    - Verify handle IDs remain constant
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 7.5 Test rotation button visibility and interaction
    - Verify rotation buttons only appear on hover or when selected
    - Verify buttons are positioned outside node border
    - Verify buttons don't rotate with node content
    - Verify tooltips show correct rotation direction
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ] 7.6 Test edge cases
    - Rotate component while dragging (should not interfere)
    - Rotate component while editing value (should not close editor)
    - Rotate component with multiple connections (all wires should update)
    - Toggle polarity on rotated component (connections should remain stable)
    - _Requirements: 1.1, 1.2, 1.4, 4.5_
