const appJson = require("./app.json");

/** iOS OAuth client ID → reversed URL scheme (Google Cloud → Identifiants → client iOS). */
function iosUrlSchemeFromClientId(clientId) {
  const suffix = ".apps.googleusercontent.com";
  const id = String(clientId || "").trim();
  if (!id.endsWith(suffix)) return null;
  return `com.googleusercontent.apps.${id.slice(0, -suffix.length)}`;
}

const iosUrlScheme = iosUrlSchemeFromClientId(
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
);

const plugins = (appJson.expo.plugins || []).filter((plugin) => {
  const name = Array.isArray(plugin) ? plugin[0] : plugin;
  return name !== "@react-native-google-signin/google-signin";
});

if (iosUrlScheme) {
  plugins.push([
    "@react-native-google-signin/google-signin",
    { iosUrlScheme },
  ]);
}

module.exports = {
  expo: {
    ...appJson.expo,
    plugins,
  },
};
