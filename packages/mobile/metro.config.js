const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.extraNodeModules = {
  react: path.resolve(monorepoRoot, 'node_modules/react'),
  'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
  'react-native-safe-area-context': path.resolve(
    monorepoRoot,
    'node_modules/react-native-safe-area-context'
  ),
  'react-native-screens': path.resolve(
    monorepoRoot,
    'node_modules/react-native-screens'
  ),
  '@expo/metro-runtime': path.resolve(monorepoRoot, 'node_modules/@expo/metro-runtime'),
};

module.exports = config;
