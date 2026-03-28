// metro.config.js — Metro bundler config for Conquer Card mobile (monorepo)
//
// WHY NOT watchFolders: [monorepoRoot]:
//   Watching the full root causes two fatal problems:
//   1. The root node_modules has npm workspace symlinks:
//        node_modules/@conquer-card/mobile → packages/mobile
//      Metro follows symlinks and registers mobile's modules TWICE in the
//      Haste map → getPackage() becomes ambiguous → undefined → crash.
//   2. Metro picks up the root-hoisted @expo/metro (a different/older version)
//      instead of the mobile-local one → wrong internal Metro code runs.
//
// FIX: only add the two sibling packages we actually import from.
//   Metro watches those directories for source files, and
//   nodeModulesPaths lets the resolver find hoisted deps (zustand,
//   socket.io-client, firebase, etc.) from the root node_modules without
//   scanning the root (and triggering the symlink loop).

const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// ── 1. Watch only the packages we import from ────────────────────────────────
config.watchFolders = [
  path.resolve(monorepoRoot, "packages/engine"),
  path.resolve(monorepoRoot, "packages/contracts"),
];

// ── 2. Resolve hoisted deps from root node_modules ───────────────────────────
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// ── 3. Block sibling packages' own node_modules from Haste crawling ──────────
//   When Metro watches packages/engine, it also walks into engine/node_modules.
//   Those deps (jest, ts-node etc.) are server/test-only and must not be
//   bundled or registered in the Haste map.
const escapePath = (p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

config.resolver.blockList = [
  new RegExp(`^${escapePath(path.resolve(monorepoRoot, "packages/engine/node_modules"))}/`),
  new RegExp(`^${escapePath(path.resolve(monorepoRoot, "packages/contracts/node_modules"))}/`),
];

module.exports = config;
