---
inclusion: always
---

# Project Structure

## Root Directory

```
/
├── src/                    # Application source code
├── public/                 # Static assets (served as-is)
├── scripts/                # Build and utility scripts
├── .devcontainer/          # Dev container configuration
├── .kiro/                  # Kiro AI assistant configuration
│   ├── steering/           # AI guidance documents
│   └── specs/              # Feature specifications
├── dist/                   # Production build output (gitignored)
└── node_modules/           # Dependencies (gitignored)
```

## Source Code Organization

```
src/
├── main.tsx               # Application entry point
├── App.tsx                # Root component
├── App.css                # Root component styles
├── index.css              # Global styles
└── assets/                # Images, icons, fonts
```

## Expected Architecture (from requirements)

The application should follow this structure as it's built:

```
src/
├── components/            # React components
│   ├── CircuitManager/    # Left pane: circuit list
│   ├── CircuitEditor/     # Center pane: visual editor
│   └── AnalysisPane/      # Right pane: results display
├── store/                 # Zustand state management
│   └── circuitStore.ts    # Centralized circuit data
├── contexts/              # React Context providers
│   ├── ValidationContext.tsx
│   ├── CalculationContext.tsx
│   └── PresentationContext.tsx
├── analysis/              # Circuit analysis logic
│   ├── validation.ts      # Circuit validation
│   ├── nodal.ts          # Nodal analysis (cut-set)
│   ├── loop.ts           # Loop analysis (tie-set)
│   └── graph.ts          # Graph theory utilities
├── types/                 # TypeScript type definitions
└── utils/                 # Helper functions
```

## Configuration Files

- `vite.config.ts` - Vite build configuration with React plugin and React Compiler
- `tsconfig.json` - TypeScript project references
- `tsconfig.app.json` - App-specific TypeScript config
- `tsconfig.node.json` - Build tool TypeScript config
- `eslint.config.ts` - ESLint rules (strict type-checked)
- `.prettierrc` - Code formatting rules
- `cspell.config.yaml` - Spell checking dictionary

## Key Patterns

- **Single Source of Truth**: All circuit data lives in Zustand store, not React Flow state
- **Pipeline Architecture**: Validation → Calculation → Presentation layers using React Context
- **Component Isolation**: Each major UI section is a separate component tree
- **Type Safety**: Strict TypeScript with no `any` or non-null assertions
