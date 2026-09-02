import dayjs from "dayjs";
import { icons } from "./icons";

/** Returns a future ISO date string that is `offsetDays` days from today. */
const futureDate = (offsetDays: number): string =>
  dayjs().startOf("day").add(offsetDays, "day").toISOString();

/** Returns the number of whole days remaining from today to `dateStr`. */
const daysUntil = (dateStr: string): number =>
  dayjs(dateStr).startOf("day").diff(dayjs().startOf("day"), "day");

export const tabs: AppTab[] = [
  { name: "index", title: "Home", icon: icons.home },
  { name: "subscriptions", title: "Subscriptions", icon: icons.wallet },
  { name: "insights", title: "Insights", icon: icons.activity },
  { name: "settings", title: "Settings", icon: icons.setting },
];

export const HOME_USER = {
  name: "Joseph | RareDevs",
};

const nextBalanceRenewal = futureDate(18);

export const HOME_BALANCE = {
  amount: 2489.48,
  nextRenewalDate: nextBalanceRenewal,
};

const upcomingRenewalDates = {
  spotify: futureDate(2),
  notion: futureDate(4),
  figma: futureDate(6),
};

export const UPCOMING_SUBSCRIPTIONS: UpcomingSubscription[] = [
  {
    id: "spotify",
    icon: icons.spotify,
    name: "Spotify",
    price: 5.99,
    currency: "USD",
    daysLeft: daysUntil(upcomingRenewalDates.spotify),
  },
  {
    id: "notion",
    icon: icons.notion,
    name: "Notion",
    price: 12.0,
    currency: "USD",
    daysLeft: daysUntil(upcomingRenewalDates.notion),
  },
  {
    id: "figma",
    icon: icons.figma,
    name: "Figma",
    price: 15.0,
    currency: "USD",
    daysLeft: daysUntil(upcomingRenewalDates.figma),
  },
];

export const HOME_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "adobe-creative-cloud",
    icon: icons.adobe,
    name: "Adobe Creative Cloud",
    plan: "Teams Plan",
    category: "Design",
    paymentMethod: "Visa ending in 8530",
    status: "active",
    startDate: "2025-03-20T10:00:00.000Z",
    price: 77.49,
    currency: "USD",
    billing: "Monthly",
    renewalDate: futureDate(18),
    color: "#f5c542",
  },
  {
    id: "github-pro",
    icon: icons.github,
    name: "GitHub Pro",
    plan: "Developer",
    category: "Developer Tools",
    paymentMethod: "Mastercard ending in 2408",
    status: "active",
    startDate: "2024-11-24T10:00:00.000Z",
    price: 9.99,
    currency: "USD",
    billing: "Monthly",
    renewalDate: futureDate(22),
    color: "#e8def8",
  },
  {
    id: "claude-pro",
    icon: icons.claude,
    name: "Claude Pro",
    plan: "Pro Plan",
    category: "AI Tools",
    paymentMethod: "Amex ending in 1010",
    status: "paused",
    startDate: "2025-06-27T10:00:00.000Z",
    price: 20.0,
    currency: "USD",
    billing: "Monthly",
    renewalDate: futureDate(25),
    color: "#b8d4e3",
  },
  {
    id: "canva-pro",
    icon: icons.canva,
    name: "Canva Pro",
    plan: "Yearly Access",
    category: "Design",
    paymentMethod: "Visa ending in 7784",
    status: "cancelled",
    startDate: "2024-04-02T10:00:00.000Z",
    price: 119.99,
    currency: "USD",
    billing: "Yearly",
    renewalDate: futureDate(31),
    color: "#b8e8d0",
  },
];

