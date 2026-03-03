import type { Currency, FinanceState } from "./types";

export const CURRENCIES: Currency[] = ["CAD", "USD", "GBP", "EUR"];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  CAD: "C$",
  USD: "$",
  GBP: "\u00a3",
  EUR: "\u20ac",
};

export const FEDERAL_BRACKETS_2026 = [
  { min: 0, max: 57_375, rate: 0.15 },
  { min: 57_375, max: 114_750, rate: 0.205 },
  { min: 114_750, max: 158_468, rate: 0.26 },
  { min: 158_468, max: 221_708, rate: 0.29 },
  { min: 221_708, max: Infinity, rate: 0.33 },
];

export const FEDERAL_BASIC_PERSONAL_AMOUNT = 16_129;

export const BC_BRACKETS_2026 = [
  { min: 0, max: 47_937, rate: 0.0506 },
  { min: 47_937, max: 95_875, rate: 0.077 },
  { min: 95_875, max: 110_076, rate: 0.105 },
  { min: 110_076, max: 133_664, rate: 0.1229 },
  { min: 133_664, max: 181_232, rate: 0.147 },
  { min: 181_232, max: 252_752, rate: 0.168 },
  { min: 252_752, max: Infinity, rate: 0.205 },
];

export const BC_BASIC_PERSONAL_AMOUNT = 12_580;

// Spouse / common-law partner amount (line 30300 federal, line 58120 BC)
// Full credit when spouse has $0 net income; reduced dollar-for-dollar by spouse's income.
export const FEDERAL_SPOUSE_AMOUNT = 16_129;
export const BC_SPOUSE_AMOUNT = 12_580;

export const CPP_2026 = {
  rate: 0.0595,
  maxPensionableEarnings: 71_300,
  basicExemption: 3_500,
  get maxContribution() {
    return (this.maxPensionableEarnings - this.basicExemption) * this.rate;
  },
};

export const CPP2_2026 = {
  rate: 0.04,
  secondCeiling: 79_400,
  get maxContribution() {
    return (this.secondCeiling - CPP_2026.maxPensionableEarnings) * this.rate;
  },
};

export const EI_2026 = {
  rate: 0.0163,
  maxInsurableEarnings: 65_700,
  get maxPremium() {
    return this.maxInsurableEarnings * this.rate;
  },
};

export const DEFAULT_STATE: FinanceState = {
  accounts: [],
  debts: [],
  familyDebts: [],
  crypto: [],
  incomings: [],
  budgets: [],
  annualSubscriptions: [],
  petExpenses: [],
  sharedPetExpenses: [],
  familyOwed: [],
  walletAddresses: [],
};

export const NAV_ITEMS: { href: string; label: string; divider?: boolean }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/accounts", label: "Accounts", divider: true },
  { href: "/crypto", label: "Crypto" },
  { href: "/debts", label: "Debts", divider: true },
  { href: "/family-debts", label: "Family Debts" },
  { href: "/family-owed", label: "Family Owed" },
  { href: "/incoming", label: "Incoming", divider: true },
  { href: "/budget", label: "Monthly Budget" },
  { href: "/annual", label: "Subscriptions" },
  { href: "/pet", label: "Pet" },
  { href: "/shared", label: "Shared", divider: true },
  { href: "/settings", label: "Settings", divider: true },
  { href: "/tax", label: "Tax" },
  { href: "/reports", label: "Reports" },
];
