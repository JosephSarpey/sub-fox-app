import { useAuth } from "@clerk/expo";
import { Link, Redirect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SubscriptionDetails = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff9e3", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#ea7a53" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <Text>Subscription Details: {id}</Text>
      <Link href="/(tabs)/index">
        <Text>Go Back</Text>
      </Link>
    </SafeAreaView>
  );
};

export default SubscriptionDetails;
