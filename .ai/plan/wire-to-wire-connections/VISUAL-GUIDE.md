# Junction Nodes - Visual Guide

## What Are Junctions?

Junctions are **connection points** that allow multiple wires to meet at a single electrical node, enabling complex circuit topologies.

```
Without Junctions:              With Junctions:
                                
R1 ──────── R2                  R1 ────┐
                                       ○ J1 ──── R2
R3 ──────── R4                  R3 ────┘
                                
(Separate circuits)             (Connected at junction J1)
```

---

## Visual Design

### Junction Appearance

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Normal State:        Selected State:    With Label:   │
│                                                         │
│       ○                    ●                 ○          │
│                                            VCC          │
│                                                         │
│  • Outlined circle    • Filled circle   • Label below  │
│  • 16px diameter      • Primary color   • Optional     │
│  • Primary color      • Glow effect                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Temporary Junction (During Connection)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Temporary Junction:                                    │
│                                                         │
│       ○  (dashed outline)                               │
│                                                         │
│  • Appears when clicking edge during connection         │
│  • Dashed outline (not solid)                           │
│  • 60% opacity                                          │
│  • Becomes permanent when connection completes          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Connection Modes

### 1. Handle → Junction

```
Step 1: Click handle          Step 2: Click junction
┌─────┐                       ┌─────┐
│ R1  ├─→ (cursor)            │ R1  ├───────→ ○ J1
└─────┘                       └─────┘
```

### 2. Junction → Handle

```
Step 1: Click junction        Step 2: Click handle
○ J1 ─→ (cursor)              ○ J1 ───────→ ┌─────┐
                                             │ R2  │
                                             └─────┘
```

### 3. Junction → Junction

```
Step 1: Click junction        Step 2: Click another junction
○ J1 ─→ (cursor)              ○ J1 ───────→ ○ J2
```

### 4. Click Edge (Creates Junction)

```
Step 1: Start connection      Step 2: Click edge
┌─────┐                       ┌─────┐
│ R1  ├─→ (cursor)            │ R1  ├───┐
└─────┘                       └─────┘   │
                                        ○ (temp)
                              ┌─────┐   │
                              │ R2  ├───┘
                              └─────┘

Step 3: Connection completes  Result: Edge split, junction created
┌─────┐                       ┌─────┐
│ R1  ├───────────┐           │ R1  ├───────┐
└─────┘           │           └─────┘       │
                  ○ J1                      ○ J1
┌─────┐           │           ┌─────┐       │
│ R2  ├───────────┘           │ R2  ├───────┘
└─────┘                       └─────┘
```

---

## Visual Feedback

### Connection Highlighting

When an edge is selected, connected endpoints are highlighted:

```
Selected Edge:
┌─────┐                       ┌─────┐
│ R1  ├───────────────────────┤ R2  │
└─────┘                       └─────┘
  ↑                             ↑
  Highlighted                   Highlighted
  (blue glow)                   (blue glow)

With Junction:
┌─────┐                       ┌─────┐
│ R1  ├───────→ ● J1 ─────────┤ R2  │
└─────┘         ↑             └─────┘
  ↑             Highlighted
  Highlighted   (filled + glow)
```

### Hover States

```
Normal:           Hovered:          During Connection:
  ○                 ○                    ○
                (thicker)            (green glow)
                (glow)               "Click to connect"
```

---

## Edge Splitting

### Before Junction Creation

```
┌─────┐                                   ┌─────┐
│ R1  ├───────────────────────────────────┤ R2  │
└─────┘                                   └─────┘
        ↑
        Click here during connection
```

### After Junction Creation

```
┌─────┐                       ┌─────┐
│ R1  ├───────→ ○ J1 ─────────┤ R2  │
└─────┘                       └─────┘

Original edge split into:
- Edge 1: R1 → J1
- Edge 2: J1 → R2
```

### With Waypoints

```
Before:
┌─────┐     ×     ×     ×     ┌─────┐
│ R1  ├─────┼─────┼─────┼─────┤ R2  │
└─────┘     ↑                 └─────┘
            Click here

After:
┌─────┐     ×     ○     ×     ┌─────┐
│ R1  ├─────┼─────┤ J1 ├┼─────┤ R2  │
└─────┘           └────┘      └─────┘
        ↑                ↑
    Waypoints        Waypoints
    before J1        after J1
```

---

## Junction Deletion

### With 2 Connections (Edges Merge)

```
Before Deletion:
┌─────┐                       ┌─────┐
│ R1  ├───────→ ○ J1 ─────────┤ R2  │
└─────┘                       └─────┘

After Deletion:
┌─────┐                                   ┌─────┐
│ R1  ├───────────────────────────────────┤ R2  │
└─────┘                                   └─────┘
(Edges merged automatically)
```

### With >2 Connections (Confirmation Required)

```
Before Deletion:
        ┌─────┐
        │ R2  │
        └──┬──┘
           │
┌─────┐   ○ J1   ┌─────┐
│ R1  ├───┴───────┤ R3  │
└─────┘           └─────┘

Confirmation Dialog:
┌────────────────────────────────────┐
│ ⚠️  Delete Junction?               │
│                                    │
│ Deleting this junction will also  │
│ delete 3 connected edges.          │
│                                    │
│  [Cancel]  [Delete]                │
└────────────────────────────────────┘

After Deletion:
        ┌─────┐
        │ R2  │
        └─────┘
        
┌─────┐           ┌─────┐
│ R1  │           │ R3  │
└─────┘           └─────┘
(All edges deleted)
```

---

## Context Menu

Right-click junction to open menu:

```
┌────────────────────────┐
│ ✏️  Edit Properties    │
│ 🗑️  Delete Junction    │
└────────────────────────┘
```

---

## Properties Dialog

Edit junction label:

```
┌─────────────────────────────────┐
│ Junction Properties             │
├─────────────────────────────────┤
│                                 │
│ Label: [VCC____________]        │
│        e.g., VCC, GND, Node A   │
│                                 │
│        [Cancel]  [Save]         │
└─────────────────────────────────┘
```

---

## Analysis Behavior

### Circuit View (What You See)

```
┌─────┐                       ┌─────┐
│ R1  ├───────→ ○ J1 ─────────┤ R2  │
└─────┘           │           └─────┘
                  │
                  ↓
              ┌─────┐
              │ R3  │
              └─────┘
```

### Analysis View (What Analysis Sees)

```
Junctions are collapsed:

Electrical Node 1: {R1.right, J1, R2.left, R3.top}

Branches:
- R1: Node 0 → Node 1
- R2: Node 1 → Node 2
- R3: Node 1 → Node 3

(J1 is not a separate node in analysis)
```

---

## Waypoint Interaction

### Minimum Distance Rule

```
Valid:                    Invalid:
  ○ J1                      ○ J1
  │                         │×
  │                         ││ (too close)
  │ (>5px)                  │×
  ×                         ×
  │                         │
  waypoint                  waypoint
                            (skipped)
```

---

## Keyboard Shortcuts

```
┌────────────────────────────────────────────┐
│ Delete        Delete selected junction     │
│ Escape        Cancel connection mode       │
│ Double-click  Edit junction label          │
└────────────────────────────────────────────┘
```

---

## Common Patterns

### Power Rails

```
        VCC
         ○
    ┌────┼────┐
    │    │    │
┌───┴┐ ┌─┴──┐ ┌┴───┐
│ R1 │ │ R2 │ │ R3 │
└────┘ └────┘ └────┘
```

### Ground Network

```
┌────┐ ┌────┐ ┌────┐
│ R1 │ │ R2 │ │ R3 │
└─┬──┘ └──┬─┘ └──┬─┘
  │       │      │
  └───────○──────┘
         GND
          │
        ┌─┴─┐
        │ ⏚ │
        └───┘
```

### Node Labeling

```
    Node A
      ○
      │
  ┌───┴───┐
  │       │
┌─┴─┐   ┌─┴─┐
│R1 │   │R2 │
└───┘   └───┘
```

---

## Best Practices

### ✅ DO

```
Use junctions for connection points:
        ○ VCC
    ┌───┼───┐
    │   │   │
  [R1] [R2] [R3]

Label important junctions:
    ○ VCC
    ○ GND
    ○ Node A
```

### ❌ DON'T

```
Don't use junctions for simple connections:
[R1] ──○── [R2]
       ↑
   Unnecessary

Instead:
[R1] ────── [R2]
```

---

## Troubleshooting

### Junction Not Connecting?

```
Problem:                  Solution:
  ○ J1                      ○ J1
  │                         │
  │ (missed click)          │ (click junction)
  ↓                         ↓
  ×                         ✓
```

### Edge Not Splitting?

```
Problem:                  Solution:
Not in connection mode    Start connection first:
                          1. Click handle/junction
                          2. Then click edge
```

### Edges Not Merging?

```
Only works with 2 edges:

Will merge:              Won't merge:
  ○ J1                     ○ J1
  ├─                       ├─
  └─                       ├─
                           └─
(2 edges)                (3 edges - requires confirmation)
```

---

## Summary

Junctions enable:
- ✅ Complex circuit topologies
- ✅ Multiple wires meeting at one point
- ✅ Clear visual representation
- ✅ Proper electrical analysis
- ✅ Flexible circuit design

Key features:
- Always visible (outlined circles)
- Optional labels
- Automatic edge splitting
- Automatic edge merging
- Collapsed in analysis
- Context menu for editing
- Keyboard shortcuts
