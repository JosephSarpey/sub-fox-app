import { icons } from "@/constants/icons";
import clsx from "clsx";
import dayjs from "dayjs";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

const CATEGORIES = [
  "Entertainment",
  "AI Tools",
  "Developer Tools",
  "Design",
  "Productivity",
  "Cloud",
  "Music",
  "Other",
];

const CATEGORY_COLORS: Record<string, string> = {
  Entertainment: "#ea7a53",
  "AI Tools": "#b8d4e3",
  "Developer Tools": "#e8def8",
  Design: "#f5c542",
  Productivity: "#b8e8d0",
  Cloud: "#8fd1bd",
  Music: "#f5c542",
  Other: "#f6eecf",
};

interface CreateSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (subscription: Subscription) => void;
}

export default function CreateSubscriptionModal({
  visible,
  onClose,
  onCreate,
}: CreateSubscriptionModalProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [frequency, setFrequency] = useState<"Monthly" | "Yearly">("Monthly");
  const [category, setCategory] = useState("Other");

  const priceNum = parseFloat(price);
  const isValid = name.trim().length > 0 && !isNaN(priceNum) && priceNum > 0;

  const handleSubmit = () => {
    if (!isValid) return;

    const startDate = dayjs().toISOString();
    const renewalDate =
      frequency === "Monthly"
        ? dayjs().add(1, "month").toISOString()
        : dayjs().add(1, "year").toISOString();

    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const generatedIcon = cleanName 
      ? { uri: `https://www.google.com/s2/favicons?domain=${cleanName}.com&sz=128` } 
      : icons.wallet;

    const newSub: Subscription = {
      id: Date.now().toString(),
      name: name.trim(),
      price: priceNum,
      billing: frequency,
      category,
      status: "active",
      startDate,
      renewalDate,
      icon: generatedIcon,
      currency: "USD",
      color: CATEGORY_COLORS[category] || "#f6eecf",
    };

    onCreate(newSub);
    
    // Reset form
    setName("");
    setPrice("");
    setFrequency("Monthly");
    setCategory("Other");
    onClose();
  };

  const handleClose = () => {
    setName("");
    setPrice("");
    setFrequency("Monthly");
    setCategory("Other");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View className="modal-overlay">
        <View className="modal-container">
          <View className="modal-header">
            <Text className="modal-title">New Subscription</Text>
            <Pressable onPress={handleClose} className="modal-close">
              <Text className="modal-close-text">✕</Text>
            </Pressable>
          </View>

          <FlatList
            data={[{ key: "form" }]}
            keyboardShouldPersistTaps="handled"
            renderItem={() => (
              <View className="modal-body">
              <View className="auth-field">
                <Text className="auth-label">Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Netflix"
                  placeholderTextColor="rgba(0,0,0,0.4)"
                  className="auth-input"
                />
              </View>

              <View className="auth-field">
                <Text className="auth-label">Price</Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  placeholderTextColor="rgba(0,0,0,0.4)"
                  keyboardType="decimal-pad"
                  className="auth-input"
                />
              </View>

              <View className="auth-field">
                <Text className="auth-label">Frequency</Text>
                <View className="picker-row">
                  <Pressable
                    onPress={() => setFrequency("Monthly")}
                    className={clsx(
                      "picker-option",
                      frequency === "Monthly" && "picker-option-active"
                    )}
                  >
                    <Text
                      className={clsx(
                        "picker-option-text",
                        frequency === "Monthly" && "picker-option-text-active"
                      )}
                    >
                      Monthly
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setFrequency("Yearly")}
                    className={clsx(
                      "picker-option",
                      frequency === "Yearly" && "picker-option-active"
                    )}
                  >
                    <Text
                      className={clsx(
                        "picker-option-text",
                        frequency === "Yearly" && "picker-option-text-active"
                      )}
                    >
                      Yearly
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View className="auth-field">
                <Text className="auth-label">Category</Text>
                <View className="category-scroll">
                  {CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setCategory(cat)}
                      className={clsx(
                        "category-chip",
                        category === cat && "category-chip-active"
                      )}
                    >
                      <Text
                        className={clsx(
                          "category-chip-text",
                          category === cat && "category-chip-text-active"
                        )}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={!isValid}
                className={clsx(
                  "auth-button mt-4",
                  !isValid && "auth-button-disabled"
                )}
              >
                <Text className="auth-button-text">Create</Text>
              </Pressable>
            </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}
