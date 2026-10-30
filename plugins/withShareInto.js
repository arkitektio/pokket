// Puts the app in the system's share menu, by expo-sharing's own plugin.
//
// That plugin takes `scheme` to be one string, and ours is a list (app.json: the
// app answers to the desktop's scheme too). It would write the list into the
// iOS extension's Info.plist, where reading it as a string fails and the
// extension crashes on every share, and into Android's `share_into_scheme`,
// where it makes a broken link. So it is shown the one scheme the extension
// should open the app by. It reads `scheme` when applied, so the list is back
// before anything else looks at it.
const { default: withSharing } = require("expo-sharing/app.plugin");

const SCHEME = "pokket";

/** Files only: what the share screen can upload. How many at once is the extension's limit. */
const MAX_FILES = 20;

const OPTIONS = {
  ios: {
    enabled: true,
    activationRule: {
      supportsImageWithMaxCount: MAX_FILES,
      supportsMovieWithMaxCount: MAX_FILES,
      supportsFileWithMaxCount: MAX_FILES,
    },
  },
  android: {
    enabled: true,
    singleShareMimeTypes: ["*/*"],
    multipleShareMimeTypes: ["*/*"],
  },
};

module.exports = (config) => {
  const { scheme } = config;
  return { ...withSharing({ ...config, scheme: SCHEME }, OPTIONS), scheme };
};
