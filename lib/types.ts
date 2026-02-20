export type Currency = "CAD" | "USD" | "GBP" | "EUR";

export type AccountType = "bank" | "credit_card";

export type CryptoAsset = "ETH" | "USDC";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  isOutgoingsAccount: boolean;
  notes: string;
}

export interface Debt {
  id: string;
  creditor: string;
  currency: Currency;
  amount: number;
  notes: string;
}

export interface FamilyDebt {
  id: string;
  familyMember: string;
  description: string;
  amount: number;
  currency: Currency;
  notes: string;
}

export interface CryptoHolding {
  id: string;
  asset: CryptoAsset;
  amount: number;
}

export interface BudgetLineItem {
  id: string;
  label: string;
  amount: number;
  currency: Currency;
  category: "income" | "expense";
  dayOfMonth: number | null;
}

export interface MonthlyBudget {
  month: string;
  lineItems: BudgetLineItem[];
}

export type IncomingStatus = "pending" | "received";

export interface Incoming {
  id: string;
  source: string;
  amount: number;
  currency: Currency;
  status: IncomingStatus;
  notes: string;
}

export interface AnnualSubscription {
  id: string;
  label: string;
  amount: number;
  currency: Currency;
  nextRenewal: string;
  notes: string;
}

export interface ExchangeRates {
  CAD: 1;
  USD: number;
  GBP: number;
  EUR: number;
  ETH_USD: number;
  USDC_USD: number;
  lastUpdated: string;
}

export interface FinanceState {
  accounts: Account[];
  debts: Debt[];
  familyDebts: FamilyDebt[];
  crypto: CryptoHolding[];
  incomings: Incoming[];
  budgets: MonthlyBudget[];
  annualSubscriptions: AnnualSubscription[];
}

export interface TaxBreakdown {
  federalTax: number;
  federalByBracket: { bracket: string; taxableInBracket: number; tax: number }[];
  provincialTax: number;
  provincialByBracket: { bracket: string; taxableInBracket: number; tax: number }[];
  cpp: number;
  cpp2: number;
  ei: number;
  totalDeductions: number;
  netIncome: number;
  effectiveRate: number;
  monthlyNet: number;
}
