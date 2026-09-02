import "@/global.css";
import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function App() {
  return (
    <View className="flex-1 bg-background p-5">
      <Text className="text-7xl font-sans-extrabold">Home</Text>
      <Link
        href="/onboarding"
        className="mt-4 font-sans-bold rounded bg-primary p-4 text-white"
      >
        <Text>Go to Onboarding</Text>
      </Link>
      <Link
        href="/(auth)/sign-in"
        className="mt-4 font-sans-bold rounded bg-primary p-4 text-white"
      >
        <Text>Go to SignIn</Text>
      </Link>
      <Link
        href="/(auth)/sign-up"
        className="mt-4 font-sans-bold rounded bg-primary p-4 text-white"
      >
        <Text>Go to SignUp</Text>
      </Link>
    </View>
  );
}
