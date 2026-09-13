import "@/global.css";
import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useFonts } from "expo-font";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { PostHogErrorBoundary, PostHogProvider } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { posthog } from "@/lib/posthog";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

SplashScreen.preventAutoHideAsync();

const InitialLayout = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const segments = useSegments();
  const router = useRouter();

  // Track whether we've done the initial auth check so we can distinguish
  // "first load" (show spinner) from "signing out" (don't block navigation).
  const hasInitialized = useRef(false);
  const identifiedUserId = useRef<string | null>(null);
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (!isLoaded || (isSignedIn && !isUserLoaded)) return;

    if (isSignedIn && user?.id && identifiedUserId.current !== user.id) {
      posthog?.identify(user.id, {
        $set: {
          ...(user.primaryEmailAddress?.emailAddress
            ? { email: user.primaryEmailAddress.emailAddress }
            : {}),
          ...(user.firstName ? { first_name: user.firstName } : {}),
          ...(user.lastName ? { last_name: user.lastName } : {}),
        },
      });
      identifiedUserId.current = user.id;
    } else if (!isSignedIn && wasSignedIn.current) {
      posthog?.reset();
      identifiedUserId.current = null;
    }

    wasSignedIn.current = isSignedIn;
  }, [isLoaded, isSignedIn, isUserLoaded, user]);

  useEffect(() => {
    if (!isLoaded) return;

    // Mark that Clerk has loaded at least once
    hasInitialized.current = true;

    const inAuthGroup = segments[0] === "(auth)";

    if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    } else if (!isSignedIn && !inAuthGroup && segments[0] !== "onboarding") {
      router.replace("/(auth)/sign-in");
    }
  }, [isSignedIn, isLoaded, segments, router]);

  // Only show the full-screen spinner on the very first load before Clerk
  // has ever resolved — NOT during sign-out, which would cause a stuck screen.
  if (!isLoaded && !hasInitialized.current) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff9e3", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#ea7a53" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "sans-regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "sans-bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "sans-medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "sans-semibold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "sans-extrabold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "sans-light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  const content = <InitialLayout />;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        {posthog ? (
          <PostHogProvider client={posthog}>
            <PostHogErrorBoundary fallback={() => null}>
              {content}
            </PostHogErrorBoundary>
          </PostHogProvider>
        ) : (
          content
        )}
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
