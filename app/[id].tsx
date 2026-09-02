import { Link, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SubscriptionDetails = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
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

