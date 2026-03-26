/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@conquer-card/engine$": "<rootDir>/../engine/dist/index.js",
    "^@conquer-card/contracts$": "<rootDir>/../contracts/src/index.ts",
  },
};
