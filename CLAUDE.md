# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a monorepo containing two main packages:
- `packages/waveform-renderer/` - Main TypeScript library for audio waveform visualization
- `packages/docs/` - Astro-based documentation website with interactive demos

## Development Commands

### Library Development
```bash
# Build the library
pnpm build:lib

# Watch mode for library development
pnpm dev:lib

# Run library tests
pnpm --filter waveform-renderer test

# Run tests with coverage
pnpm --filter waveform-renderer test:coverage

# Type check library
pnpm --filter waveform-renderer type-check
```

### Documentation Development  
```bash
# Start docs development server
pnpm dev:docs

# Build documentation site
pnpm build:docs
```

### Root Commands
```bash
# Build everything (library + docs)
pnpm build

# Run all tests across packages
pnpm test

# Type check all packages
pnpm type-check

# Lint all code (uses oxlint)
pnpm lint

# Format code
pnpm format

# Run test coverage for all packages
pnpm test:coverage

# Release library to npm (interactive)
pnpm release:lib

# Preview release without making changes
pnpm release:lib --dry-run
```

## Architecture Overview

The waveform-renderer library follows a modular architecture:

- **Renderer** (`renderer.ts`) - Main class that orchestrates the rendering process
- **RenderingEngine** (`rendering-engine.ts`) - Core drawing operations and canvas management
- **CacheManager** (`cache-manager.ts`) - Intelligent caching system for performance optimization
- **EventHandler** (`event-handler.ts`) - Handles user interactions and canvas events
- **DebugSystem** (`debug-system.ts`) - Performance monitoring and logging utilities

The library is built with TypeScript-first approach and has comprehensive test coverage (231 tests).

## Key Files

- `packages/waveform-renderer/src/index.ts` - Main export file
- `packages/waveform-renderer/src/types/types.ts` - TypeScript type definitions
- `packages/waveform-renderer/src/constants/default.ts` - Default configuration values
- `packages/waveform-renderer/vitest.config.ts` - Test configuration
- `packages/waveform-renderer/tsdown.config.ts` - Build configuration

## Testing

The project uses Vitest for testing with comprehensive coverage. Tests are located in:
- `packages/waveform-renderer/test/` - Unit tests for all modules
- Coverage reports available via `pnpm test:coverage`

## Build System

- Uses `tsdown` for building the library with multiple output formats (ESM, CJS, IIFE)
- Uses `pnpm` workspaces for monorepo management
- Supports TypeScript strict mode
- Configured for tree-shaking and modern bundlers

## Code Standards and Conventions

### TypeScript Standards
- **Strict mode enabled** - All TypeScript strict checks are enforced
- **Type-first approach** - Explicit interfaces and types defined before implementation
- **Path aliases** - Use `@/*` imports for internal modules (e.g., `import { DEFAULT_OPTIONS } from "@/constants"`)
- **Required types** - All function parameters, return types, and class properties must be typed
- **Union types** - Use union types for constrained values (e.g., `RenderMode = "bottom" | "center" | "top"`)

### Naming Conventions
- **Classes**: PascalCase with descriptive names (`WaveformRenderer`, `CacheManager`, `EventHandlerManager`)
- **Interfaces**: PascalCase with descriptive names (`WaveformOptions`, `ProgressLineOptions`, `RenderCache`)
- **Functions**: camelCase with verb-noun pattern (`getPeaksFromAudioBuffer`, `calculateBarDimensions`, `normalizePeaks`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_OPTIONS`)
- **Private members**: Prefix with underscore or use TypeScript private keyword
- **Event handlers**: Prefix with `handle` (`handleSeek`, `handleResize`, `handleError`)

### Code Structure Patterns
- **Modular architecture**: Each class has a single responsibility
- **Dependency injection**: Pass dependencies through constructors
- **Event-driven architecture**: Use EventEmitter for component communication
- **Immutable updates**: Always create new objects instead of mutating state
- **Error boundaries**: Comprehensive error handling with try-catch blocks
- **Resource cleanup**: Proper cleanup in `destroy()` methods

### Function Organization
- **Public API first**: Public methods at top of classes
- **Private helpers last**: Private methods grouped at bottom
- **Pure functions**: Utility functions are pure and testable
- **Single responsibility**: Each function has one clear purpose

### Comment Standards
- **JSDoc for public APIs**: All exported functions and classes need JSDoc comments
- **Inline comments**: Only for complex logic, not obvious code
- **Type documentation**: Complex type definitions include explanatory comments
- **Architecture comments**: Section dividers in large files (e.g., `// ====================================`)

### Testing Standards  
- **Vitest framework**: All tests use Vitest with comprehensive mocking
- **File naming**: `*.test.ts` for all test files
- **Test structure**: `describe` blocks for modules, `it` blocks for individual tests
- **Mock strategy**: Mock DOM APIs and external dependencies completely
- **Coverage requirement**: Comprehensive test coverage (231+ tests)

### Formatting and Linting
- **Prettier configuration**: 120 char line width, 2 spaces, double quotes, trailing commas
- **oxlint**: Used for linting instead of ESLint
- **Import organization**: Type imports separated from value imports
- **No semicolons**: Follow the project's preference for automatic semicolon insertion

### Performance Patterns
- **Caching strategy**: Intelligent caching with invalidation logic
- **RAF scheduling**: Use `requestAnimationFrame` for rendering operations
- **Event throttling**: Debounce expensive operations (16ms minimum render interval)
- **Memory management**: Proper cleanup of event listeners and resources

## Release Process

The project includes a custom release script (`scripts/release.js`) that emulates the best features of `np` but is optimized for this monorepo structure.

### Release Commands
```bash
# Interactive release process
pnpm release:lib

# Preview release without making changes (recommended first)
pnpm release:lib --dry-run
```

### Release Flow
1. **Repository checks** - Ensures clean working directory and correct branch
2. **Tests and linting** - Runs full test suite and lint checks
3. **Build** - Compiles the library
4. **Package preview** - Shows table of files to be published with status indicators:
   - ✨ **NEW** - Files added since last release
   - 📝 **MODIFIED** - Files changed since last release  
   - 🔄 **UNCHANGED** - Files with no changes
   - ⚠️ **INCLUDED** - Potentially unnecessary files (src/, test/)
5. **Version selection** - Interactive choice of version bump (patch/minor/major/custom)
6. **Confirmation** - Final approval before publishing
7. **Version update** - Updates package.json
8. **Git operations** - Creates commit and tag
9. **NPM publish** - Publishes to npm registry
10. **GitHub push** - Pushes changes and tags
11. **Release notes** - Optional GitHub release creation

### File Status Indicators
The package preview shows file status compared to the last git tag:
- 📦 `dist/` files - Distribution/build outputs
- 📝 `.d.ts` files - TypeScript definitions
- 📋 `.json` files - Configuration files
- 📖 `.md` files - Documentation
- ⚠️ `src/` files - Source code (usually shouldn't be published)

### Dry Run Mode
Always test releases first with `--dry-run` mode:
- Shows all commands that would be executed
- Previews package contents without publishing
- No changes made to git or npm
- Perfect for verifying release configuration

## Documentation

The documentation is built with Astro and Starlight, featuring:
- Interactive waveform demos (`packages/docs/src/components/WaveformDemo/`)
- MDX-based content (`packages/docs/src/content/docs/`)
- Custom renderers for advanced examples