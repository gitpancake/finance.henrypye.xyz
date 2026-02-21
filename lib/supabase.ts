import { createClient } from "@supabase/supabase-js";
import type {
  Account,
  Debt,
  FamilyDebt,
  PetExpense,
  FamilyOwed,
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

function fromAccount(a: Account, userId: string) {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    currency: a.currency,
    balance: a.balance,
    is_outgoings_account: a.isOutgoingsAccount,
    notes: a.notes,
    user_id: userId,
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

function fromDebt(d: Debt, userId: string) {
  return { id: d.id, creditor: d.creditor, currency: d.currency, amount: d.amount, notes: d.notes, user_id: userId };
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

function fromFamilyDebt(d: FamilyDebt, userId: string) {
  return { id: d.id, family_member: d.familyMember, description: d.description, amount: d.amount, currency: d.currency, notes: d.notes, user_id: userId };
}

function toCrypto(row: Record<string, unknown>): CryptoHolding {
  return {
    id: row.id as string,
    asset: row.asset as CryptoHolding["asset"],
    amount: Number(row.amount),
  };
}

function fromCrypto(c: CryptoHolding, userId: string) {
  return { id: c.id, asset: c.asset, amount: c.amount, user_id: userId };
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

function fromIncoming(i: Incoming, userId: string) {
  return {
    id: i.id,
    source: i.source,
    amount: i.amount,
    currency: i.currency,
    status: i.status,
    notes: i.notes,
    user_id: userId,
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

function fromBudgetItem(month: string, item: BudgetLineItem, userId: string) {
  return {
    id: item.id,
    month,
    label: item.label,
    amount: item.amount,
    currency: item.currency,
    category: item.category,
    day_of_month: item.dayOfMonth ?? null,
    user_id: userId,
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

function fromAnnualSub(s: AnnualSubscription, userId: string) {
  return { id: s.id, label: s.label, amount: s.amount, currency: s.currency, next_renewal: s.nextRenewal || null, notes: s.notes, user_id: userId };
}

function toPetExpense(row: Record<string, unknown>): PetExpense {
  return {
    id: row.id as string,
    description: (row.description as string) ?? "",
    amount: Number(row.amount),
    currency: row.currency as PetExpense["currency"],
    date: (row.date as string) ?? "",
    notes: (row.notes as string) ?? "",
  };
}

function fromPetExpense(e: PetExpense, userId: string) {
  return { id: e.id, description: e.description, amount: e.amount, currency: e.currency, date: e.date || null, notes: e.notes, user_id: userId };
}

function toFamilyOwed(row: Record<string, unknown>): FamilyOwed {
  return {
    id: row.id as string,
    person: (row.person as string) ?? "",
    description: (row.description as string) ?? "",
    amount: Number(row.amount),
    paid: Number(row.paid ?? 0),
    currency: row.currency as FamilyOwed["currency"],
    paidOff: (row.paid_off as boolean) ?? false,
    notes: (row.notes as string) ?? "",
  };
}

function fromFamilyOwed(o: FamilyOwed, userId: string) {
  return { id: o.id, person: o.person, description: o.description, amount: o.amount, paid: o.paid, currency: o.currency, paid_off: o.paidOff, notes: o.notes, user_id: userId };
}

// --- Fetch all ---

export async function fetchAllData(userId: string): Promise<FinanceState> {
  const [accountsRes, debtsRes, familyDebtsRes, cryptoRes, incomingsRes, budgetRes, annualSubsRes, petRes, familyOwedRes] = await Promise.all([
    supabase.from("finance_accounts").select("*").eq("user_id", userId),
    supabase.from("finance_debts").select("*").eq("user_id", userId),
    supabase.from("finance_family_debts").select("*").eq("user_id", userId),
    supabase.from("finance_crypto_holdings").select("*").eq("user_id", userId),
    supabase.from("finance_incomings").select("*").eq("user_id", userId),
    supabase.from("finance_budget_line_items").select("*").eq("user_id", userId),
    supabase.from("finance_annual_subscriptions").select("*").eq("user_id", userId),
    supabase.from("finance_pet_expenses").select("*").eq("user_id", userId),
    supabase.from("finance_family_owed").select("*").eq("user_id", userId),
  ]);

  const accounts = (accountsRes.data ?? []).map(toAccount);
  const debts = (debtsRes.data ?? []).map(toDebt);
  const familyDebts = (familyDebtsRes.data ?? []).map(toFamilyDebt);
  const crypto = (cryptoRes.data ?? []).map(toCrypto);
  const incomings = (incomingsRes.data ?? []).map(toIncoming);
  const annualSubscriptions = (annualSubsRes.data ?? []).map(toAnnualSub);
  const petExpenses = (petRes.data ?? []).map(toPetExpense);
  const familyOwed = (familyOwedRes.data ?? []).map(toFamilyOwed);

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

  return { accounts, debts, familyDebts, crypto, incomings, budgets, annualSubscriptions, petExpenses, familyOwed };
}

// --- Accounts ---

export async function insertAccount(a: Account, userId: string) {
  const { error } = await supabase.from("finance_accounts").insert(fromAccount(a, userId));
  if (error) console.error("insertAccount:", error.message);
}

export async function updateAccount(a: Account, userId: string) {
  const { error } = await supabase
    .from("finance_accounts")
    .update(fromAccount(a, userId))
    .eq("id", a.id)
    .eq("user_id", userId);
  if (error) console.error("updateAccount:", error.message);
}

export async function deleteAccount(id: string, userId: string) {
  const { error } = await supabase.from("finance_accounts").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("deleteAccount:", error.message);
}

// --- Debts ---

export async function insertDebt(d: Debt, userId: string) {
  const { error } = await supabase.from("finance_debts").insert(fromDebt(d, userId));
  if (error) console.error("insertDebt:", error.message);
}

export async function updateDebt(d: Debt, userId: string) {
  const { error } = await supabase.from("finance_debts").update(fromDebt(d, userId)).eq("id", d.id).eq("user_id", userId);
  if (error) console.error("updateDebt:", error.message);
}

export async function deleteDebt(id: string, userId: string) {
  const { error } = await supabase.from("finance_debts").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("deleteDebt:", error.message);
}

// --- Family Debts ---

export async function insertFamilyDebt(d: FamilyDebt, userId: string) {
  const { error } = await supabase.from("finance_family_debts").insert(fromFamilyDebt(d, userId));
  if (error) console.error("insertFamilyDebt:", error.message);
}

export async function updateFamilyDebt(d: FamilyDebt, userId: string) {
  const { error } = await supabase.from("finance_family_debts").update(fromFamilyDebt(d, userId)).eq("id", d.id).eq("user_id", userId);
  if (error) console.error("updateFamilyDebt:", error.message);
}

export async function deleteFamilyDebt(id: string, userId: string) {
  const { error } = await supabase.from("finance_family_debts").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("deleteFamilyDebt:", error.message);
}

// --- Crypto ---

export async function insertCrypto(c: CryptoHolding, userId: string) {
  const { error } = await supabase.from("finance_crypto_holdings").insert(fromCrypto(c, userId));
  if (error) console.error("insertCrypto:", error.message);
}

export async function updateCrypto(c: CryptoHolding, userId: string) {
  const { error } = await supabase
    .from("finance_crypto_holdings")
    .update(fromCrypto(c, userId))
    .eq("id", c.id)
    .eq("user_id", userId);
  if (error) console.error("updateCrypto:", error.message);
}

export async function deleteCrypto(id: string, userId: string) {
  const { error } = await supabase.from("finance_crypto_holdings").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("deleteCrypto:", error.message);
}

// --- Incomings ---

export async function insertIncoming(i: Incoming, userId: string) {
  const { error } = await supabase.from("finance_incomings").insert(fromIncoming(i, userId));
  if (error) console.error("insertIncoming:", error.message);
}

export async function updateIncoming(i: Incoming, userId: string) {
  const { error } = await supabase
    .from("finance_incomings")
    .update(fromIncoming(i, userId))
    .eq("id", i.id)
    .eq("user_id", userId);
  if (error) console.error("updateIncoming:", error.message);
}

export async function deleteIncoming(id: string, userId: string) {
  const { error } = await supabase.from("finance_incomings").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("deleteIncoming:", error.message);
}

// --- Budget items ---

export async function insertBudgetItem(month: string, item: BudgetLineItem, userId: string) {
  const { error } = await supabase
    .from("finance_budget_line_items")
    .insert(fromBudgetItem(month, item, userId));
  if (error) console.error("insertBudgetItem:", error.message);
}

export async function updateBudgetItem(month: string, item: BudgetLineItem, userId: string) {
  const { error } = await supabase
    .from("finance_budget_line_items")
    .update(fromBudgetItem(month, item, userId))
    .eq("id", item.id)
    .eq("user_id", userId);
  if (error) console.error("updateBudgetItem:", error.message);
}

export async function deleteBudgetItem(itemId: string, userId: string) {
  const { error } = await supabase
    .from("finance_budget_line_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);
  if (error) console.error("deleteBudgetItem:", error.message);
}

export async function setBudgetItems(month: string, items: BudgetLineItem[], userId: string) {
  // Delete all existing items for this month for this user, then insert new ones
  const { error: delError } = await supabase
    .from("finance_budget_line_items")
    .delete()
    .eq("month", month)
    .eq("user_id", userId);
  if (delError) {
    console.error("setBudgetItems delete:", delError.message);
    return;
  }
  if (items.length === 0) return;
  const rows = items.map((item) => fromBudgetItem(month, item, userId));
  const { error: insError } = await supabase
    .from("finance_budget_line_items")
    .insert(rows);
  if (insError) console.error("setBudgetItems insert:", insError.message);
}

// --- Annual subscriptions ---

export async function insertAnnualSub(s: AnnualSubscription, userId: string) {
  const { error } = await supabase.from("finance_annual_subscriptions").insert(fromAnnualSub(s, userId));
  if (error) console.error("insertAnnualSub:", error.message);
}

export async function updateAnnualSub(s: AnnualSubscription, userId: string) {
  const { error } = await supabase
    .from("finance_annual_subscriptions")
    .update(fromAnnualSub(s, userId))
    .eq("id", s.id)
    .eq("user_id", userId);
  if (error) console.error("updateAnnualSub:", error.message);
}

export async function deleteAnnualSub(id: string, userId: string) {
  const { error } = await supabase.from("finance_annual_subscriptions").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("deleteAnnualSub:", error.message);
}

// --- Pet Expenses ---

export async function insertPetExpense(e: PetExpense, userId: string) {
  const { error } = await supabase.from("finance_pet_expenses").insert(fromPetExpense(e, userId));
  if (error) console.error("insertPetExpense:", error.message);
}

export async function updatePetExpense(e: PetExpense, userId: string) {
  const { error } = await supabase.from("finance_pet_expenses").update(fromPetExpense(e, userId)).eq("id", e.id).eq("user_id", userId);
  if (error) console.error("updatePetExpense:", error.message);
}

export async function deletePetExpense(id: string, userId: string) {
  const { error } = await supabase.from("finance_pet_expenses").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("deletePetExpense:", error.message);
}

// --- Family Owed ---

export async function insertFamilyOwed(o: FamilyOwed, userId: string) {
  const { error } = await supabase.from("finance_family_owed").insert(fromFamilyOwed(o, userId));
  if (error) console.error("insertFamilyOwed:", error.message);
}

export async function updateFamilyOwed(o: FamilyOwed, userId: string) {
  const { error } = await supabase.from("finance_family_owed").update(fromFamilyOwed(o, userId)).eq("id", o.id).eq("user_id", userId);
  if (error) console.error("updateFamilyOwed:", error.message);
}

export async function deleteFamilyOwed(id: string, userId: string) {
  const { error } = await supabase.from("finance_family_owed").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("deleteFamilyOwed:", error.message);
}
