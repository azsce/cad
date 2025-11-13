# Cursor IDE Rules for Bun Package Manager

## Package Manager Configuration

- Always use Bun as the package manager instead of npm, yarn, or pnpm
- Use the specific Bun binary path: ~/.bun/bin/bun
- When installing packages, use: ~/.bun/bin/bun install
- When adding packages, use: ~/.bun/bin/bun add <package-name>
- When removing packages, use: ~/.bun/bin/bun remove <package-name>
- When running scripts, use: ~/.bun/bin/bun run <script-name>
- When executing files directly, use: ~/.bun/bin/bun <file-path>

## Scripts and Commands

- Prefer Bun's built-in commands over npm equivalents
- Use `~/.bun/bin/bun create` for scaffolding new projects
- Use `~/.bun/bin/bun test` for running tests
- Use `~/.bun/bin/bun build` for building projects

## File Operations

- When creating package.json files, ensure they're compatible with Bun
- When suggesting package installations, always use Bun syntax
- When providing terminal commands, use the full path to Bun binary

## Development Workflow

- Always assume Bun is the preferred runtime and package manager
- Suggest Bun-specific optimizations and features when relevant
- Use Bun's faster installation and execution capabilities

## Code Quality Checks

- After making any code modifications, ALWAYS run `~/.bun/bin/bun lint` to check for linting issues
- After making any code modifications, ALWAYS run `~/.bun/bin/bun tsgo` to check for TypeScript compilation errors
- Fix any linting or TypeScript errors before considering the task complete
- If linting or TypeScript errors are found, address them immediately and re-run the checks
- These checks should be run automatically after any file modifications or code changes

## Commit Message Rules

- Write concise, descriptive commit messages that clearly explain what was changed
- Focus on the actual changes made, not on compliance statements
- NEVER include repetitive endings like "- Ensured all changes comply with Bun package manager rules and maintain code quality standards."
- Use imperative mood (e.g., "Add feature" not "Added feature" or "Adding feature")

## Translation System

### Creating New Translation Component (6 steps):

1. Create type in `client/locale/components/MyFeature.ts` with `[key: string]: string;` as first property
2. Export from `client/locale/components/index.ts`: `export * from "./MyFeature";`
3. Create AR translation in `client/locale/ar/myFeature.ts`: `export const myFeature: MyFeatureTranslations = {...}`
4. Create EN translation in `client/locale/en/enMyFeature.ts`: `export const enMyFeature: MyFeatureTranslations = {...}`
5. Export from `client/locale/ar/index.ts` and `client/locale/en/index.ts`
6. Register in `client/locale/translations.ts`: Add to `Translations` type, `ar` object (use `AR.myFeature`), and `en` object (use `EN.enMyFeature`)

### Using Translations:

- Import: `import { useAppTranslation } from "@/client/locale";`
- Use hook: `const {myFeatureTranslations: strings} = useAppTranslation();`
- Access: `{strings.title}`, `{strings.submitButton}` - NO fallbacks like `{strings.title || "Fallback"}`
- NEVER use hardcoded strings for user-facing text
- NEVER use fallback strings (e.g., `|| "Default"`, `?? "Fallback"`)
- Can use multiple namespaces: `const {errorTranslations: errorStrings} = useAppTranslation();`
- Naming: AR files are camelCase (e.g., `myFeature.ts`), EN files have `en` prefix (e.g., `enMyFeature.ts`)