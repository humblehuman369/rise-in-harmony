const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Find the project root (monorepo root is 2 levels up from apps/mobile)
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo (so changes to packages/* hot-reload)
config.watchFolders = [monorepoRoot];

// Resolve modules from the app first, then the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// CRITICAL: force a single copy of React and other stateful singletons.
// The monorepo root's node_modules has its own react (19.2.x, for the web
// app) while this app is pinned to react 19.1.0 (Expo SDK 54). Because
// watchFolders includes the root, Metro can bundle a SECOND React — e.g.
// @react-native-community/slider resolved the root copy, making the hooks
// dispatcher null and crashing every screen that renders a Slider with
// "Cannot read property 'useState' of null".
//
// extraNodeModules alone isn't honored for all transitive/pnpm resolutions,
// so we hard-redirect these package roots to the app's own copy.
const singletons = [
  "react",
  "react-dom",
  "react-native",
  "react-native-audio-api",
  "react-native-reanimated",
  "react-native-worklets",
];
const singletonPaths = singletons.reduce((acc, name) => {
  acc[name] = path.resolve(projectRoot, "node_modules", name);
  return acc;
}, {});
config.resolver.extraNodeModules = singletonPaths;

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect bare imports of a singleton (e.g. "react", "react/jsx-runtime")
  // to the app's single copy, regardless of which package is importing.
  for (const name of singletons) {
    if (moduleName === name || moduleName.startsWith(name + "/")) {
      const rest = moduleName.slice(name.length); // "" or "/jsx-runtime"
      return context.resolveRequest(
        context,
        singletonPaths[name] + rest,
        platform
      );
    }
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
