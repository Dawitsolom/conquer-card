// metro.config.js — Metro bundler config for Conquer Card mobile (monorepo)
//
// WHY THIS FILE EXISTS:
//   Metro by default only watches the package it starts in (packages/mobile).
//   Our imports reach outside that directory:
//     ../../engine/dist   → packages/engine/dist
//     ../../contracts/dist → packages/contracts/dist
//
//   Without watchFolders, Metro cannot find the package.json files for those
//   directories, getPackage() returns undefined, and the bundler crashes with:
//     "Cannot read properties of undefined (reading 'getPackage')"
//
// Java analogy: like adding extra source roots to a Gradle project so the
//   compiler can find classes from sibling modules.

const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Tell Metro to watch the entire monorepo, not just packages/mobile.
// This lets it resolve relative imports that go outside this package.
config.watchFolders = [monorepoRoot];

// When resolving node_modules, check the mobile package's node_modules first,
// then fall back to the root node_modules (where shared packages like zustand
// and socket.io-client are installed by npm workspaces).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
