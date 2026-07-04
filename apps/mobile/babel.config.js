module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated 4 (SDK 54) moved its Babel plugin into react-native-worklets.
    // This plugin must remain the LAST entry in the list.
    plugins: [
      "react-native-worklets/plugin",
    ],
  };
};
