const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Expo Go has no WebRTC. Alias LiveKit during local `expo start`.
// EAS production sets EAS_BUILD and keeps the real packages.
if (!process.env.EAS_BUILD) {
  config.resolver.extraNodeModules = {
    ...(config.resolver.extraNodeModules || {}),
    "@livekit/react-native": path.resolve(__dirname, "metro-stubs/livekit.js"),
    "@livekit/react-native-webrtc": path.resolve(
      __dirname,
      "metro-stubs/webrtc.js"
    ),
  };
}

module.exports = config;
