const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  "react-native-safe-area-context": path.resolve(
    projectRoot,
    "node_modules/react-native-safe-area-context"
  ),
  "react-native-screens": path.resolve(
    projectRoot,
    "node_modules/react-native-screens"
  ),
  "@expo/metro-runtime": path.resolve(
    projectRoot,
    "node_modules/@expo/metro-runtime"
  ),
};

module.exports = config;
