---
inclusion: always
---

# Technology Stack

## Core Technologies

- **Runtime**: Bun (package manager and runtime)
- **Build Tool**: Vite (using rolldown-vite@7.2.2 override)
- **Framework**: React 19.2.0 with TypeScript 6.0.0-dev
- **Language**: TypeScript with strict type checking enabled
- **State Management**: Zustand (for centralized circuit data)
- **Visual Editor**: React Flow (for circuit diagram canvas)
- **Math Rendering**: KaTeX (for LaTeX equation formatting)

## Development Tools

- **Linting**: ESLint 9 with typescript-eslint strict type-checked rules
- **Formatting**: Prettier with lint-staged for pre-commit hooks
- **Spell Checking**: CSpell ESLint plugin
- **Code Quality**: SonarJS plugin for code smell detection
- **React Compiler**: Enabled for optimized builds

## Common Commands

```bash
# Development server with HMR
bun run dev

# Type checking (without emitting files)
bun run tsgo

# Linting
bun run lint          # Check for issues
bun run lint:fix      # Auto-fix issues

# Formatting
bun run format        # Format all files
bun run format:check  # Check formatting

# Production build
bun run build         # Compiles TypeScript then builds with Vite

# Preview production build
bun run preview
```

## TypeScript Configuration

- Uses project references (tsconfig.app.json for app code, tsconfig.node.json for build config)
- Strict type checking enabled with `strictTypeChecked` rules
- Extended diagnostics available via `tsc` script

## Code Quality Standards

- No `any` types allowed (use `unknown` instead)
- No non-null assertions (`!`) allowed
- Unused variables must be prefixed with `_`
- Type-aware linting enabled for maximum safety
- Spell checking enforced with auto-fix
