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
  sortOrder: number;
}

export interface Debt {
  id: string;
  creditor: string;
  currency: Currency;
  amount: number;
  notes: string;
  sortOrder: number;
}

export interface FamilyDebt {
  id: string;
  familyMember: string;
  description: string;
  amount: number;
  currency: Currency;
  notes: string;
  linkedOwedId: string | null;
  paid: number | null;
  paidOff: boolean | null;
  sortOrder: number;
}

export interface CryptoHolding {
  id: string;
  asset: CryptoAsset;
  amount: number;
  sortOrder: number;
}

export interface BudgetLineItem {
  id: string;
  label: string;
  amount: number;
  currency: Currency;
  category: "income" | "expense";
  dayOfMonth: number | null;
  recurring: boolean;
  accountId: string | null;
  sortOrder: number;
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
  sortOrder: number;
}

export interface AnnualSubscription {
  id: string;
  label: string;
  amount: number;
  currency: Currency;
  nextRenewal: string;
  notes: string;
  accountId: string | null;
  sortOrder: number;
}

export interface PetExpense {
  id: string;
  description: string;
  amount: number;
  currency: Currency;
  date: string;
  notes: string;
  sharedWithUserId: string | null;
  sortOrder: number;
}

export interface FamilyOwed {
  id: string;
  person: string;
  description: string;
  amount: number;
  paid: number;
  currency: Currency;
  paidOff: boolean;
  notes: string;
  linkedUserId: string | null;
  sortOrder: number;
}

export interface WalletAddress {
  id: string;
  address: string;
  label: string;
  chain: string;
}

export interface CollectionOffer {
  price: number;
  paymentToken: string;
  remainingQuantity: number;
}

export interface OfferInfo {
  price: number;
  paymentToken: string;
  isItemOffer?: boolean;
}

export interface NFTItem {
  identifier: string;
  collection: string;
  collectionName: string;
  name: string;
  imageUrl: string;
  chain: string;
  contractAddress: string;
  floorPrice: number | null;
  bestOffer?: OfferInfo | null;
}

export interface CollectionInfo {
  slug: string;
  name: string;
  floorPrice: number | null;
  offers: CollectionOffer[];
  bestOfferPrice: number | null;
}

export interface NFTPortfolio {
  nfts: NFTItem[];
  /** Collection slug -> info (name + floor price). Populated progressively. */
  collections: Record<string, CollectionInfo>;
  lastUpdated: string;
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

export interface SharedPetExpense extends PetExpense {
  ownerName: string;
}

// Shared categories (independent from FinanceState)

export interface SharedCategoryMember {
  id: string;
  userId: string;
  username: string;
}

export interface SharedCategory {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  description: string;
  currency: Currency;
  members: SharedCategoryMember[];
  itemCount: number;
  totalSpent: number;
}

export interface SharedItem {
  id: string;
  categoryId: string;
  name: string;
  amount: number;
  currency: Currency;
  date: string;
  notes: string;
  addedBy: string;
  addedByName: string;
  sortOrder: number;
}

export interface SharedState {
  categories: SharedCategory[];
  itemsByCategory: Record<string, SharedItem[]>;
}

export interface FinanceState {
  accounts: Account[];
  debts: Debt[];
  familyDebts: FamilyDebt[];
  crypto: CryptoHolding[];
  incomings: Incoming[];
  budgets: MonthlyBudget[];
  annualSubscriptions: AnnualSubscription[];
  petExpenses: PetExpense[];
  sharedPetExpenses: SharedPetExpense[];
  familyOwed: FamilyOwed[];
  walletAddresses: WalletAddress[];
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
