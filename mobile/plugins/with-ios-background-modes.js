const { withInfoPlist } = require("expo/config-plugins");

/**
 * expo-audio defaults enableBackgroundPlayback, which injects UIBackgroundModes
 * "audio". App Review rejects that (guideline 2.5.4): Rfacto plays voice notes
 * and calls in the foreground, not as a background music / streaming player.
 */
module.exports = function withIosBackgroundModes(config) {
  return withInfoPlist(config, (cfg) => {
    const modes = Array.isArray(cfg.modResults.UIBackgroundModes)
      ? cfg.modResults.UIBackgroundModes
      : [];
    cfg.modResults.UIBackgroundModes = [
      ...new Set(
        modes.filter((mode) => mode !== "audio").concat("remote-notification")
      ),
    ];
    return cfg;
  });
};
