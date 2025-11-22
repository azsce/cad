# Logger Usage

A development-only logger that batches logs and sends them to the server for file storage.

## Features

- Only enabled in development mode (`import.meta.env.DEV`)
- Batches logs every 2 seconds to reduce network overhead
- Logs are written to `logs/client_[sessionId].log` with sequence numbers
- Colored console output with timestamps
- Type-safe with TypeScript

## Usage

```typescript
import { logger } from "@/utils/logger";

// In your component or function
function MyComponent() {
  // Info logging
  logger.info({ caller: "MyComponent" }, "User action", { userId: 123 });

  // Error logging
  try {
    // some operation
  } catch (error) {
    logger.error({ caller: "MyComponent" }, "Operation failed", error);
  }

  // Warning
  logger.warn({ caller: "MyComponent" }, "Deprecated API used");

  // Debug (verbose)
  logger.debug({ caller: "MyComponent" }, "Debug data", { state: someState });

  // General log
  logger.log({ caller: "MyComponent" }, "Something happened");
}
```

## Rules

- **NEVER use `console` methods directly** - ESLint will error
- **Always provide a `caller` identifier** to track the source of logs
- Use descriptive caller names (component/function name)
- Logs are automatically disabled in production builds

## Log Levels

- `debug`: Verbose debugging information
- `log`: General information
- `info`: Important informational messages
- `warn`: Warning messages
- `error`: Error messages (automatically flushed immediately)

## Log File Format

```
[2024-11-14 10:30:45.123] [INFO] [SEQ:1] [MyComponent] User action
[2024-11-14 10:30:46.456] [ERROR] [SEQ:2] [MyComponent] Operation failed
```

## Configuration

Logger configuration is in `src/utils/logger/ClientLogger.ts`:

- `batchInterval`: Time between batch sends (default: 2000ms)
- `apiEndpoint`: Server endpoint (default: '/api/logs')
- Session ID is auto-generated based on timestamp
