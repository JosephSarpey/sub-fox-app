import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import { HOME_BALANCE } from "@/constants/data";
import { icons } from "@/constants/icons";
import images from "@/constants/images";
import "@/global.css";
import { posthog } from "@/lib/posthog";
import { formatCurrency } from "@/lib/utils";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { useUser } from "@clerk/expo";
import dayjs from "dayjs";
import { BlurView } from "expo-blur";
import { useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";

function HomeListHeader({
  userName,
  avatarUrl,
  onAddPress,
  upcomingSubscriptions,
}: {
  userName: string;
  avatarUrl: string | null;
  onAddPress: () => void;
  upcomingSubscriptions: UpcomingSubscription[];
}) {
  return (
    <>
      <View className="home-header">
        <View className="home-user">
          <Image
            source={avatarUrl ? { uri: avatarUrl } : images.avatar}
            className="home-avatar"
          />
          <Text className="home-user-name">{userName}</Text>
        </View>

        <Pressable onPress={onAddPress} className="glass-icon-wrapper">
          <BlurView intensity={40} tint="light" className="glass-icon-blur">
            <Image source={icons.add} className="home-add-icon" />
          </BlurView>
        </Pressable>
      </View>

      <View className="home-balance-card">
        <Text className="home-balance-label">Balance</Text>
        <View className="home-balance-row">
          <Text className="home-balance-amount">
            {formatCurrency(HOME_BALANCE.amount)}
          </Text>
          <Text className="home-balance-date">
            {dayjs(HOME_BALANCE.nextRenewalDate).format("DD MMM")}
          </Text>
        </View>
      </View>

      <View className="mb-5">
        <ListHeading title="Upcoming" />

        <FlatList
          data={upcomingSubscriptions}
          renderItem={({ item }) => <UpcomingSubscriptionCard {...item} />}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          ListEmptyComponent={
            <Text className="home-empty-state">No Upcoming renewals</Text>
          }
        />
      </View>

      <ListHeading title="All Subscriptions" />
    </>
  );
}

function ItemSeparator() {
  return <View className="h-4" />;
}

export default function App() {
  const { user } = useUser();
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<
    string | null
  >(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { subscriptions, addSubscription } = useSubscriptionStore();

  const userName =
    user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User";
  const avatarUrl = user?.imageUrl || null;

  const handleCreateSubscription = (newSub: Subscription) => {
    addSubscription(newSub);
  };

  const upcomingSubscriptions = subscriptions
    .filter((sub) => sub.renewalDate && sub.status === "active")
    .map((sub) => {
      const daysLeft = dayjs(sub.renewalDate)
        .startOf("day")
        .diff(dayjs().startOf("day"), "day");
      return {
        id: sub.id,
        icon: sub.icon,
        name: sub.name,
        price: sub.price,
        currency: sub.currency,
        daysLeft,
      };
    })
    .filter((sub) => sub.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <View className="flex-1 bg-background p-5">
      <FlatList
        ListHeaderComponent={
          <HomeListHeader
            userName={userName}
            avatarUrl={avatarUrl}
            onAddPress={() => setIsModalVisible(true)}
            upcomingSubscriptions={upcomingSubscriptions}
          />
        }
        data={subscriptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionCard
            {...item}
            expanded={expandedSubscriptionId === item.id}
            onPress={() =>
              setExpandedSubscriptionId((currentId) => {
                if (currentId !== item.id) {
                  posthog?.capture("subscription_expanded", {
                    subscription_id: item.id,
                    billing_interval: item.billing ?? null,
                    subscription_status: item.status ?? null,
                  });
                }
                return currentId === item.id ? null : item.id;
              })
            }
          />
        )}
        extraData={expandedSubscriptionId}
        ItemSeparatorComponent={ItemSeparator}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text className="home-empty-state">No Subscriptions yet.</Text>
        }
        contentContainerClassName="pb-30"
      />
      <CreateSubscriptionModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onCreate={handleCreateSubscription}
      />
    </View>
  );
}
