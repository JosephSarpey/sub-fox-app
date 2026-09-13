import images from "@/constants/images";
import { useAuth, useUser } from "@clerk/expo";
import dayjs from "dayjs";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

export default function Settings() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [signingOut, setSigningOut] = useState(false);

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;
  const email = user?.primaryEmailAddress?.emailAddress ?? "—";
  const avatarUrl = user?.imageUrl || null;
  const memberSince = user?.createdAt
    ? dayjs(user.createdAt).format("MMMM D, YYYY")
    : null;

  const handleSignOut = () => {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out of your account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            setSigningOut(true);
            try {
              await signOut();
              // Auth guard in _layout.tsx handles redirect to sign-in
            } catch {
              Alert.alert("Error", "Failed to sign out. Please try again.");
              setSigningOut(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="settings-content"
    >
      {/* Header */}
      <Text className="settings-page-title">Settings</Text>

      {/* Profile Card */}
      <View className="settings-profile-card">
        <Image
          source={avatarUrl ? { uri: avatarUrl } : images.avatar}
          className="settings-avatar"
          accessibilityLabel="Profile picture"
        />
        <View className="settings-profile-info">
          {fullName ? (
            <Text className="settings-name">{fullName}</Text>
          ) : null}
          <Text className="settings-email">{email}</Text>
          {memberSince ? (
            <Text className="settings-member-since">
              Member since {memberSince}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Account Section */}
      <View className="settings-section">
        <Text className="settings-section-title">Account</Text>
        <View className="settings-card">
          <View className="settings-row">
            <Text className="settings-row-label">Email</Text>
            <Text className="settings-row-value" numberOfLines={1}>
              {email}
            </Text>
          </View>

          <View className="settings-divider" />

          <View className="settings-row">
            <Text className="settings-row-label">Name</Text>
            <Text className="settings-row-value">
              {fullName ?? "Not set"}
            </Text>
          </View>

          <View className="settings-divider" />

          <View className="settings-row">
            <Text className="settings-row-label">User ID</Text>
            <Text
              className="settings-row-value-mono"
              numberOfLines={1}
              selectable
            >
              {user?.id ?? "—"}
            </Text>
          </View>
        </View>
      </View>

      {/* App Section */}
      <View className="settings-section">
        <Text className="settings-section-title">App</Text>
        <View className="settings-card">
          <View className="settings-row">
            <Text className="settings-row-label">Version</Text>
            <Text className="settings-row-value">1.0.0</Text>
          </View>
        </View>
      </View>

      {/* Sign Out */}
      <Pressable
        className={`settings-signout-button ${signingOut ? "settings-signout-disabled" : ""}`}
        onPress={handleSignOut}
        disabled={signingOut}
        accessibilityLabel="Sign out of your account"
        accessibilityRole="button"
      >
        {signingOut ? (
          <ActivityIndicator size="small" color="#dc2626" />
        ) : (
          <Text className="settings-signout-text">Sign out</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
