import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();

  // Only block on first load — once Clerk has ever resolved,
  // let the _layout.tsx auth guard handle all redirects.
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff9e3", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#ea7a53" />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
