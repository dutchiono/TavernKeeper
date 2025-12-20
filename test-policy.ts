/**
 * Test Policy Configuration
 *
 * This file defines the test requirements and coverage thresholds for the repository.
 * It serves as the single source of truth for test governance and is used by:
 * - Meta-tests (repo-health.test.ts)
 * - Vitest coverage configuration
 * - Architecture analysis scripts
 */

export const TEST_POLICY = {
  // Files that MUST have at least one test
  mustBeTestedGlobs: [
    "apps/web/lib/**/*.ts",
    "apps/web/app/api/**/*.ts",
    "apps/web/workers/**/*.ts",
    "packages/*/src/**/*.ts",
    "packages/*/__tests__/**/*.ts"
  ],

  // Files that are allowed to be untested
  allowedUntestedGlobs: [
    "**/*.d.ts",
    "**/index.ts",
    "**/types.ts",
    "**/constants.ts",
    "**/__generated__/**",
    "**/dist/**",
    "**/node_modules/**",
    "**/vitest.config.ts",
    "**/vitest.setup.ts",
    "**/vitest.config.*.ts",
    "apps/web/app/**/page.tsx", // Next.js pages
    "apps/web/app/**/layout.tsx",
    "apps/web/app/**/loading.tsx",
    "apps/web/app/**/error.tsx",
    "apps/web/app/**/not-found.tsx",
    "apps/web/app/**/template.tsx",
    "apps/web/app/**/opengraph-image.*",
    "apps/web/app/**/icon.*",
    "apps/web/app/**/apple-icon.*",
    "apps/web/app/**/favicon.*",
    "apps/web/app/**/robots.txt",
    "apps/web/app/**/sitemap.*",
    "apps/web/app/**/route.ts", // API routes are tested via their handlers
    "**/test-policy.ts", // This file itself
    "**/scripts/**/*.ts", // Scripts are not unit tested
    "**/game-engine/**/*.ts", // Game engine code may have its own test structure
    // UI/Client-side code (tested via E2E or integration tests)
    "apps/web/lib/hooks/**/*.ts",
    "apps/web/lib/stores/**/*.ts",
    "apps/web/lib/chains.ts", // Chain configuration
    "apps/web/lib/docs.ts", // Documentation utilities
    "apps/web/lib/wagmi-*.ts", // Wagmi configuration files
    // Services that are UI-focused or have complex dependencies
    "apps/web/lib/services/docSearchService.ts",
    "apps/web/lib/services/dungeonRunService.ts", // Tested via integration
    "apps/web/lib/services/dungeonStateService.ts", // Tested via integration
    "apps/web/lib/services/eventParser.ts",
    "apps/web/lib/services/farcasterWallet.ts",
    "apps/web/lib/services/gameLoggingService.ts",
    "apps/web/lib/services/gasEstimator.ts",
    "apps/web/lib/services/heroAdventurerInit.ts",
    "apps/web/lib/services/mcapService.ts",
    "apps/web/lib/services/monPriceService.ts",
    "apps/web/lib/services/neynarService.ts",
    "apps/web/lib/services/notifications.ts",
    "apps/web/lib/services/pseudoswap.ts",
    "apps/web/lib/services/rpgService.ts", // Large service, tested via integration
    "apps/web/lib/services/simulationRunner.ts",
    "apps/web/lib/services/spriteService.ts",
    "apps/web/lib/services/tavernRegularsService.ts",
    "apps/web/lib/services/townPosseService.ts",
    "apps/web/lib/services/tutorialService.ts",
    "apps/web/lib/services/uniswapV4SwapService.ts",
    "apps/web/lib/services/v3PoolService.ts",
    "apps/web/lib/services/worldInitializationService.ts",
    // Game mechanics (tested via integration)
    "apps/web/lib/game-mechanics/simulation.ts",
    "apps/web/lib/game-mechanics/loot/LootManager.ts",
    "apps/web/lib/game-mechanics/monsters/MonsterFactory.ts",
    "apps/web/lib/game-mechanics/prompts/**/*.ts",
    // World/Content
    "apps/web/lib/world/**/*.ts",
    // Utilities
    "apps/web/lib/utils/farcasterDetection.ts",
    "apps/web/lib/utils/rpcErrorLogger.ts",
    "apps/web/lib/utils/seededRNG.ts",
    // Legacy/Unused files (may be removed in future)
    "apps/web/lib/supabase-worker.ts",
    "apps/web/lib/wagmi-miniapp.ts",
    "apps/web/lib/world/demo-content.ts",
    "apps/web/lib/game-mechanics/items/test-generator.ts",
    // Workers (tested via integration)
    "apps/web/workers/replayWorker.ts",
    "apps/web/workers/stakingTrackerWorker.ts",
    "apps/web/workers/timerWorker.ts",
    "apps/web/workers/autoHarvestWorker.ts",
    // Packages
    "packages/engine/src/dm-manager.ts",
    "packages/engine/src/room-context.ts",
    "packages/agents/src/plugins/dm-plugin.ts",
    "packages/agents/src/types/eliza.ts",
    "packages/discord-bot/**/*.ts", // Discord bot has separate test structure
  ],

  // Directories that should never contain orphans
  noOrphansIn: [
    "apps/web/lib",
    "apps/web/app/api",
    "apps/web/workers",
    "packages/*/src"
  ],

  // Minimum global coverage thresholds
  coverage: {
    statements: 70,
    branches: 60,
    functions: 65,
    lines: 70
  },

  // Architectural zones with different requirements
  zones: {
    "api": {
      coverage: 80,
      description: "API routes need higher coverage due to external interface"
    },
    "workers": {
      coverage: 75,
      description: "Workers need good coverage due to background processing"
    },
    "services": {
      coverage: 75,
      description: "Services need good coverage due to business logic"
    },
    "lib": {
      coverage: 70,
      description: "Library code needs solid coverage"
    }
  },

  // Test file naming patterns
  testFilePatterns: [
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "**/__tests__/**/*.ts",
    "**/__tests__/**/*.tsx"
  ],

  // Files that should be excluded from coverage reports
  coverageExclude: [
    "**/*.d.ts",
    "**/index.ts",
    "**/types.ts",
    "**/constants.ts",
    "**/__generated__/**",
    "**/dist/**",
    "**/node_modules/**",
    "**/vitest.config.ts",
    "**/vitest.setup.ts",
    "**/test-policy.ts",
    "apps/web/app/**/page.tsx",
    "apps/web/app/**/layout.tsx",
    "apps/web/app/**/loading.tsx",
    "apps/web/app/**/error.tsx",
    "apps/web/app/**/not-found.tsx",
    "apps/web/app/**/template.tsx"
  ]
};

