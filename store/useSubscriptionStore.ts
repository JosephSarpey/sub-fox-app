import { HOME_SUBSCRIPTIONS } from "@/constants/data";
import { create } from "zustand";

interface SubscriptionState {
  subscriptions: Subscription[];
  addSubscription: (sub: Subscription) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  subscriptions: HOME_SUBSCRIPTIONS,
  addSubscription: (sub) =>
    set((state) => ({
      subscriptions: [sub, ...state.subscriptions],
    })),
}));
