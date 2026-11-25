import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', setupFiles: ['src/tests/environment.ts'], fileParallelism: false, maxWorkers: 1, testTimeout: 30000, hookTimeout: 120000, include: ['src/tests/**/*.test.ts'] } });
