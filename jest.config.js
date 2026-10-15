module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/unit/**/*.test.js"],
  setupFiles: ["<rootDir>/tests/unit/setup.js"],
  moduleNameMapper: {
    "^better-sqlite3$": "<rootDir>/tests/unit/mocks/better-sqlite3.js",
  },
  collectCoverageFrom: ["src/main/**/*.js", "!src/main/index.js"],
  coverageDirectory: "coverage",
  verbose: true,
};
