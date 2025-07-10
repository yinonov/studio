import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@functions/(.*)$": "<rootDir>/functions/src/$1",
  },
  testMatch: [
    "<rootDir>/tests/unit/**/*.test.{js,jsx,ts,tsx}",
    "<rootDir>/src/**/*.test.{js,jsx,ts,tsx}",
  ],
  collectCoverageFrom: [
    "src/components/ui/button.tsx",
    "src/components/ui/input.tsx", 
    "src/components/ui/label.tsx",
    "src/components/ui/textarea.tsx",
    "src/components/shared/FormInput.tsx",
    "src/lib/utils.ts",
    // TODO: Add more files as tests are written
    // "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/**/layout.tsx",
    "!src/app/**/loading.tsx",
    "!src/app/**/not-found.tsx",
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
