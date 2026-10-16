const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
// Upload/telemetry tooling is opt-in future server/build infrastructure.
const config = getDefaultConfig(__dirname);

// Add custom configuration
config.resolver.extraNodeModules = {
  '@': path.resolve(__dirname),
};

// Ensure these extensions are resolved
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx'];

// Optionally add watchFolders if you have linked packages
config.watchFolders = [path.resolve(__dirname)];

module.exports = config;
