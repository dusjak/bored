/**
 * Mixpanel is used in JavaScript mode only (`useNative: false`).
 * Skipping the native projects keeps IDFA and ATT out of the binary.
 */
module.exports = {
  dependencies: {
    'mixpanel-react-native': {
      platforms: {
        ios: null,
        android: null,
      },
    },
  },
};
