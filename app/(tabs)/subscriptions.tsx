import SubscriptionCard from "@/components/SubscriptionCard";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

function ItemSeparator() {
  return <View className="h-4" />;
}

function EmptyState({ query }: { query: string }) {
  return (
    <View className="subs-empty">
      <Ionicons name="search" size={40} color="rgba(0,0,0,0.25)" />
      <Text className="subs-empty-title">No results found</Text>
      <Text className="subs-empty-subtitle">
        Nothing matched &quot;{query}&quot;
      </Text>
    </View>
  );
}

const Subscriptions = () => {
  const { subscriptions } = useSubscriptionStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredSubscriptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return subscriptions;

    return subscriptions.filter((sub) => {
      const haystack = [sub.name, sub.category, sub.plan]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [searchQuery, subscriptions]);

  const handleClear = () => {
    setSearchQuery("");
  };

  const listHeader = (
    <>
      <Text className="subs-page-title">Subscriptions</Text>

      {/* Search bar */}
      <View className="subs-search-wrapper">
        <Ionicons
          name="search-outline"
          size={20}
          color="rgba(0,0,0,0.4)"
          style={{ marginRight: 8 }}
        />
        <TextInput
          className="subs-search-input"
          placeholder="Search by name, category, or plan…"
          placeholderTextColor="rgba(0,0,0,0.4)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={handleClear} className="subs-search-clear">
            <Ionicons name="close" size={16} color="rgba(0,0,0,0.5)" />
          </Pressable>
        )}
      </View>

      {/* Result count */}
      <Text className="subs-count">
        {filteredSubscriptions.length}{" "}
        {filteredSubscriptions.length === 1
          ? "subscription"
          : "subscriptions"}
        {searchQuery.trim() ? ` matching "${searchQuery.trim()}"` : ""}
      </Text>
    </>
  );

  return (
    <View className="flex-1 bg-background p-5">
      <FlatList
        ListHeaderComponent={listHeader}
        data={filteredSubscriptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionCard
            {...item}
            expanded={expandedId === item.id}
            onPress={() =>
              setExpandedId((current) =>
                current === item.id ? null : item.id,
              )
            }
          />
        )}
        extraData={expandedId}
        ItemSeparatorComponent={ItemSeparator}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={Keyboard.dismiss}
        ListEmptyComponent={
          searchQuery.trim() ? (
            <EmptyState query={searchQuery.trim()} />
          ) : (
            <Text className="home-empty-state">No Subscriptions yet.</Text>
          )
        }
        contentContainerClassName="pb-30"
      />
    </View>
  );
};

export default Subscriptions;
