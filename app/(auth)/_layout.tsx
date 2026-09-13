import "@/global.css";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff9e3' }}>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}
