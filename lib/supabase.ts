import { createClient } from "@supabase/supabase-js";
import type {
  Account,
  Debt,
  FamilyDebt,
  CryptoHolding,
  Incoming,
  BudgetLineItem,
  AnnualSubscription,
  FinanceState,
  MonthlyBudget,
} from "./types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Mapping helpers (snake_case DB <-> camelCase TS) ---

function toAccount(row: Record<string, unknown>): Account {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as Account["type"],
    currency: row.currency as Account["currency"],
    balance: Number(row.balance),
    isOutgoingsAccount: row.is_outgoings_account as boolean,
    notes: (row.notes as string) ?? "",
  };
}

function fromAccount(a: Account) {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    currency: a.currency,
    balance: a.balance,
    is_outgoings_account: a.isOutgoingsAccount,
    notes: a.notes,
  };
}

function toDebt(row: Record<string, unknown>): Debt {
  return {
    id: row.id as string,
    creditor: row.creditor as string,
    currency: row.currency as Debt["currency"],
    amount: Number(row.amount),
    notes: (row.notes as string) ?? "",
  };
}

function fromDebt(d: Debt) {
  return { id: d.id, creditor: d.creditor, currency: d.currency, amount: d.amount, notes: d.notes };
}

function toFamilyDebt(row: Record<string, unknown>): FamilyDebt {
  return {
    id: row.id as string,
    familyMember: row.family_member as string,
    description: (row.description as string) ?? "",
    amount: Number(row.amount),
    currency: row.currency as FamilyDebt["currency"],
    notes: (row.notes as string) ?? "",
  };
}

function fromFamilyDebt(d: FamilyDebt) {
  return { id: d.id, family_member: d.familyMember, description: d.description, amount: d.amount, currency: d.currency, notes: d.notes };
}

function toCrypto(row: Record<string, unknown>): CryptoHolding {
  return {
    id: row.id as string,
    asset: row.asset as CryptoHolding["asset"],
    amount: Number(row.amount),
  };
}

function fromCrypto(c: CryptoHolding) {
  return { id: c.id, asset: c.asset, amount: c.amount };
}

function toIncoming(row: Record<string, unknown>): Incoming {
  return {
    id: row.id as string,
    source: row.source as string,
    amount: Number(row.amount),
    currency: row.currency as Incoming["currency"],
    status: row.status as Incoming["status"],
    notes: (row.notes as string) ?? "",
  };
}

function fromIncoming(i: Incoming) {
  return {
    id: i.id,
    source: i.source,
    amount: i.amount,
    currency: i.currency,
    status: i.status,
    notes: i.notes,
  };
}

function toBudgetItem(row: Record<string, unknown>): BudgetLineItem & { month: string } {
  return {
    id: row.id as string,
    label: row.label as string,
    amount: Number(row.amount),
    currency: row.currency as BudgetLineItem["currency"],
    category: row.category as BudgetLineItem["category"],
    dayOfMonth: row.day_of_month != null ? Number(row.day_of_month) : null,
    month: row.month as string,
  };
}

function fromBudgetItem(month: string, item: BudgetLineItem) {
  return {
    id: item.id,
    month,
    label: item.label,
    amount: item.amount,
    currency: item.currency,
    category: item.category,
    day_of_month: item.dayOfMonth ?? null,
  };
}

function toAnnualSub(row: Record<string, unknown>): AnnualSubscription {
  return {
    id: row.id as string,
    label: row.label as string,
    amount: Number(row.amount),
    currency: row.currency as AnnualSubscription["currency"],
    nextRenewal: (row.next_renewal as string) ?? "",
    notes: (row.notes as string) ?? "",
  };
}

function fromAnnualSub(s: AnnualSubscription) {
  return { id: s.id, label: s.label, amount: s.amount, currency: s.currency, next_renewal: s.nextRenewal || null, notes: s.notes };
}

// --- Fetch all ---

export async function fetchAllData(): Promise<FinanceState> {
  const [accountsRes, debtsRes, familyDebtsRes, cryptoRes, incomingsRes, budgetRes, annualSubsRes] = await Promise.all([
    supabase.from("finance_accounts").select("*"),
    supabase.from("finance_debts").select("*"),
    supabase.from("finance_family_debts").select("*"),
    supabase.from("finance_crypto_holdings").select("*"),
    supabase.from("finance_incomings").select("*"),
    supabase.from("finance_budget_line_items").select("*"),
    supabase.from("finance_annual_subscriptions").select("*"),
  ]);

  const accounts = (accountsRes.data ?? []).map(toAccount);
  const debts = (debtsRes.data ?? []).map(toDebt);
  const familyDebts = (familyDebtsRes.data ?? []).map(toFamilyDebt);
  const crypto = (cryptoRes.data ?? []).map(toCrypto);
  const incomings = (incomingsRes.data ?? []).map(toIncoming);
  const annualSubscriptions = (annualSubsRes.data ?? []).map(toAnnualSub);

  // Group budget items by month
  const budgetItems = (budgetRes.data ?? []).map(toBudgetItem);
  const budgetsByMonth = new Map<string, BudgetLineItem[]>();
  for (const item of budgetItems) {
    const { month, ...lineItem } = item;
    if (!budgetsByMonth.has(month)) budgetsByMonth.set(month, []);
    budgetsByMonth.get(month)!.push(lineItem);
  }
  const budgets: MonthlyBudget[] = Array.from(budgetsByMonth.entries()).map(
    ([month, lineItems]) => ({ month, lineItems })
  );

  return { accounts, debts, familyDebts, crypto, incomings, budgets, annualSubscriptions };
}

// --- Accounts ---

export async function insertAccount(a: Account) {
  const { error } = await supabase.from("finance_accounts").insert(fromAccount(a));
  if (error) console.error("insertAccount:", error.message);
}

export async function updateAccount(a: Account) {
  const { error } = await supabase
    .from("finance_accounts")
    .update(fromAccount(a))
    .eq("id", a.id);
  if (error) console.error("updateAccount:", error.message);
}

export async function deleteAccount(id: string) {
  const { error } = await supabase.from("finance_accounts").delete().eq("id", id);
  if (error) console.error("deleteAccount:", error.message);
}

// --- Debts ---

export async function insertDebt(d: Debt) {
  const { error } = await supabase.from("finance_debts").insert(fromDebt(d));
  if (error) console.error("insertDebt:", error.message);
}

export async function updateDebt(d: Debt) {
  const { error } = await supabase.from("finance_debts").update(fromDebt(d)).eq("id", d.id);
  if (error) console.error("updateDebt:", error.message);
}

export async function deleteDebt(id: string) {
  const { error } = await supabase.from("finance_debts").delete().eq("id", id);
  if (error) console.error("deleteDebt:", error.message);
}

// --- Family Debts ---

export async function insertFamilyDebt(d: FamilyDebt) {
  const { error } = await supabase.from("finance_family_debts").insert(fromFamilyDebt(d));
  if (error) console.error("insertFamilyDebt:", error.message);
}

export async function updateFamilyDebt(d: FamilyDebt) {
  const { error } = await supabase.from("finance_family_debts").update(fromFamilyDebt(d)).eq("id", d.id);
  if (error) console.error("updateFamilyDebt:", error.message);
}

export async function deleteFamilyDebt(id: string) {
  const { error } = await supabase.from("finance_family_debts").delete().eq("id", id);
  if (error) console.error("deleteFamilyDebt:", error.message);
}

// --- Crypto ---

export async function insertCrypto(c: CryptoHolding) {
  const { error } = await supabase.from("finance_crypto_holdings").insert(fromCrypto(c));
  if (error) console.error("insertCrypto:", error.message);
}

export async function updateCrypto(c: CryptoHolding) {
  const { error } = await supabase
    .from("finance_crypto_holdings")
    .update(fromCrypto(c))
    .eq("id", c.id);
  if (error) console.error("updateCrypto:", error.message);
}

export async function deleteCrypto(id: string) {
  const { error } = await supabase.from("finance_crypto_holdings").delete().eq("id", id);
  if (error) console.error("deleteCrypto:", error.message);
}

// --- Incomings ---

export async function insertIncoming(i: Incoming) {
  const { error } = await supabase.from("finance_incomings").insert(fromIncoming(i));
  if (error) console.error("insertIncoming:", error.message);
}

export async function updateIncoming(i: Incoming) {
  const { error } = await supabase
    .from("finance_incomings")
    .update(fromIncoming(i))
    .eq("id", i.id);
  if (error) console.error("updateIncoming:", error.message);
}

export async function deleteIncoming(id: string) {
  const { error } = await supabase.from("finance_incomings").delete().eq("id", id);
  if (error) console.error("deleteIncoming:", error.message);
}

// --- Budget items ---

export async function insertBudgetItem(month: string, item: BudgetLineItem) {
  const { error } = await supabase
    .from("finance_budget_line_items")
    .insert(fromBudgetItem(month, item));
  if (error) console.error("insertBudgetItem:", error.message);
}

export async function updateBudgetItem(month: string, item: BudgetLineItem) {
  const { error } = await supabase
    .from("finance_budget_line_items")
    .update(fromBudgetItem(month, item))
    .eq("id", item.id);
  if (error) console.error("updateBudgetItem:", error.message);
}

export async function deleteBudgetItem(itemId: string) {
  const { error } = await supabase
    .from("finance_budget_line_items")
    .delete()
    .eq("id", itemId);
  if (error) console.error("deleteBudgetItem:", error.message);
}

export async function setBudgetItems(month: string, items: BudgetLineItem[]) {
  // Delete all existing items for this month, then insert new ones
  const { error: delError } = await supabase
    .from("finance_budget_line_items")
    .delete()
    .eq("month", month);
  if (delError) {
    console.error("setBudgetItems delete:", delError.message);
    return;
  }
  if (items.length === 0) return;
  const rows = items.map((item) => fromBudgetItem(month, item));
  const { error: insError } = await supabase
    .from("finance_budget_line_items")
    .insert(rows);
  if (insError) console.error("setBudgetItems insert:", insError.message);
}

// --- Annual subscriptions ---

export async function insertAnnualSub(s: AnnualSubscription) {
  const { error } = await supabase.from("finance_annual_subscriptions").insert(fromAnnualSub(s));
  if (error) console.error("insertAnnualSub:", error.message);
}

export async function updateAnnualSub(s: AnnualSubscription) {
  const { error } = await supabase
    .from("finance_annual_subscriptions")
    .update(fromAnnualSub(s))
    .eq("id", s.id);
  if (error) console.error("updateAnnualSub:", error.message);
}

export async function deleteAnnualSub(id: string) {
  const { error } = await supabase.from("finance_annual_subscriptions").delete().eq("id", id);
  if (error) console.error("deleteAnnualSub:", error.message);
}

