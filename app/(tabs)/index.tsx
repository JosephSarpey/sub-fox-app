import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import {
  HOME_BALANCE,
  HOME_SUBSCRIPTIONS,
  HOME_USER,
  UPCOMING_SUBSCRIPTIONS,
} from "@/constants/data";
import { icons } from "@/constants/icons";
import images from "@/constants/images";
import "@/global.css";
import { formatCurrency } from "@/lib/utils";
import dayjs from "dayjs";
import { BlurView } from "expo-blur";
import { useState } from "react";
import { FlatList, Image, Text, View } from "react-native";

function HomeListHeader() {
  return (
    <>
      <View className="home-header">
        <View className="home-user">
          <Image source={images.avatar} className="home-avatar" />
          <Text className="home-user-name">{HOME_USER.name}</Text>
        </View>

        <View className="glass-icon-wrapper">
          <BlurView intensity={40} tint="light" className="glass-icon-blur">
            <Image source={icons.add} className="home-add-icon" />
          </BlurView>
        </View>
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
          data={UPCOMING_SUBSCRIPTIONS}
          renderItem={({ item }) => (
            <UpcomingSubscriptionCard {...item} />
          )}
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
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<
    string | null
  >(null);

  return (
    <View className="flex-1 bg-background p-5">
      <FlatList
        ListHeaderComponent={HomeListHeader}
        data={HOME_SUBSCRIPTIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionCard
            {...item}
            expanded={expandedSubscriptionId === item.id}
            onPress={() =>
              setExpandedSubscriptionId((currentId) =>
                currentId === item.id ? null : item.id,
              )
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
    </View>
  );
}
