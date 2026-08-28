const React = require("react");

function LiveKitRoom({ children }) {
  return children ?? null;
}

function useLocalParticipant() {
  return {
    localParticipant: { setMicrophoneEnabled: async () => {} },
    isMicrophoneEnabled: true,
  };
}

module.exports = {
  registerGlobals() {},
  LiveKitRoom,
  useLocalParticipant,
  AudioSession: {
    configureAudio: async () => {},
    startAudioSession: async () => {},
    stopAudioSession: async () => {},
  },
  AndroidAudioTypePresets: { communication: {} },
};
