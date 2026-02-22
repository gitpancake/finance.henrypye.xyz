"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  FinanceState,
  Account,
  Debt,
  FamilyDebt,
  CryptoHolding,
  Incoming,
  MonthlyBudget,
  BudgetLineItem,
  AnnualSubscription,
  PetExpense,
  FamilyOwed,
} from "@/lib/types";
import { DEFAULT_STATE } from "@/lib/constants";
import {
  fetchAllData,
  insertAccount,
  updateAccount,
  deleteAccount,
  insertDebt,
  updateDebt,
  deleteDebt,
  insertFamilyDebt,
  updateFamilyDebt,
  deleteFamilyDebt,
  insertCrypto,
  updateCrypto,
  deleteCrypto,
  insertIncoming,
  updateIncoming,
  deleteIncoming,
  insertBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  setBudgetItems,
  insertAnnualSub,
  updateAnnualSub,
  deleteAnnualSub,
  insertPetExpense,
  updatePetExpense,
  deletePetExpense,
  insertFamilyOwed,
  updateFamilyOwed,
  deleteFamilyOwed,
  updateSortOrders,
} from "@/lib/supabase";

type ReorderableKey = "accounts" | "debts" | "familyDebts" | "crypto" | "incomings" | "annualSubscriptions" | "petExpenses" | "familyOwed";

const STATE_KEY_TO_TABLE: Record<ReorderableKey, string> = {
  accounts: "finance_accounts",
  debts: "finance_debts",
  familyDebts: "finance_family_debts",
  crypto: "finance_crypto_holdings",
  incomings: "finance_incomings",
  annualSubscriptions: "finance_annual_subscriptions",
  petExpenses: "finance_pet_expenses",
  familyOwed: "finance_family_owed",
};

type Action =
  | { type: "ADD_ACCOUNT"; payload: Account }
  | { type: "UPDATE_ACCOUNT"; payload: Account }
  | { type: "DELETE_ACCOUNT"; payload: string }
  | { type: "ADD_DEBT"; payload: Debt }
  | { type: "UPDATE_DEBT"; payload: Debt }
  | { type: "DELETE_DEBT"; payload: string }
  | { type: "ADD_FAMILY_DEBT"; payload: FamilyDebt }
  | { type: "UPDATE_FAMILY_DEBT"; payload: FamilyDebt }
  | { type: "DELETE_FAMILY_DEBT"; payload: string }
  | { type: "ADD_CRYPTO"; payload: CryptoHolding }
  | { type: "UPDATE_CRYPTO"; payload: CryptoHolding }
  | { type: "DELETE_CRYPTO"; payload: string }
  | { type: "ADD_INCOMING"; payload: Incoming }
  | { type: "UPDATE_INCOMING"; payload: Incoming }
  | { type: "DELETE_INCOMING"; payload: string }
  | { type: "SET_BUDGET"; payload: MonthlyBudget }
  | { type: "ADD_BUDGET_ITEM"; payload: { month: string; item: BudgetLineItem } }
  | { type: "UPDATE_BUDGET_ITEM"; payload: { month: string; item: BudgetLineItem } }
  | { type: "DELETE_BUDGET_ITEM"; payload: { month: string; itemId: string } }
  | { type: "ADD_ANNUAL_SUB"; payload: AnnualSubscription }
  | { type: "UPDATE_ANNUAL_SUB"; payload: AnnualSubscription }
  | { type: "DELETE_ANNUAL_SUB"; payload: string }
  | { type: "ADD_PET_EXPENSE"; payload: PetExpense }
  | { type: "UPDATE_PET_EXPENSE"; payload: PetExpense }
  | { type: "DELETE_PET_EXPENSE"; payload: string }
  | { type: "ADD_FAMILY_OWED"; payload: FamilyOwed }
  | { type: "UPDATE_FAMILY_OWED"; payload: FamilyOwed }
  | { type: "DELETE_FAMILY_OWED"; payload: string }
  | { type: "REORDER"; payload: { stateKey: ReorderableKey; orderedIds: string[] } }
  | { type: "REORDER_BUDGET_ITEMS"; payload: { month: string; orderedIds: string[] } }
  | { type: "LOAD_STATE"; payload: FinanceState };

function reducer(state: FinanceState, action: Action): FinanceState {
  switch (action.type) {
    case "LOAD_STATE":
      return action.payload;

    case "ADD_ACCOUNT":
      return { ...state, accounts: [...state.accounts, action.payload] };
    case "UPDATE_ACCOUNT":
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    case "DELETE_ACCOUNT":
      return {
        ...state,
        accounts: state.accounts.filter((a) => a.id !== action.payload),
      };

    case "ADD_DEBT":
      return { ...state, debts: [...state.debts, action.payload] };
    case "UPDATE_DEBT":
      return {
        ...state,
        debts: state.debts.map((d) =>
          d.id === action.payload.id ? action.payload : d
        ),
      };
    case "DELETE_DEBT":
      return {
        ...state,
        debts: state.debts.filter((d) => d.id !== action.payload),
      };

    case "ADD_FAMILY_DEBT":
      return { ...state, familyDebts: [...state.familyDebts, action.payload] };
    case "UPDATE_FAMILY_DEBT":
      return {
        ...state,
        familyDebts: state.familyDebts.map((d) =>
          d.id === action.payload.id ? action.payload : d
        ),
      };
    case "DELETE_FAMILY_DEBT":
      return {
        ...state,
        familyDebts: state.familyDebts.filter((d) => d.id !== action.payload),
      };

    case "ADD_CRYPTO":
      return { ...state, crypto: [...state.crypto, action.payload] };
    case "UPDATE_CRYPTO":
      return {
        ...state,
        crypto: state.crypto.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case "DELETE_CRYPTO":
      return {
        ...state,
        crypto: state.crypto.filter((c) => c.id !== action.payload),
      };

    case "ADD_INCOMING":
      return { ...state, incomings: [...state.incomings, action.payload] };
    case "UPDATE_INCOMING":
      return {
        ...state,
        incomings: state.incomings.map((i) =>
          i.id === action.payload.id ? action.payload : i
        ),
      };
    case "DELETE_INCOMING":
      return {
        ...state,
        incomings: state.incomings.filter((i) => i.id !== action.payload),
      };

    case "SET_BUDGET":
      return {
        ...state,
        budgets: state.budgets.some((b) => b.month === action.payload.month)
          ? state.budgets.map((b) =>
              b.month === action.payload.month ? action.payload : b
            )
          : [...state.budgets, action.payload],
      };
    case "ADD_BUDGET_ITEM": {
      const existing = state.budgets.find(
        (b) => b.month === action.payload.month
      );
      if (existing) {
        return {
          ...state,
          budgets: state.budgets.map((b) =>
            b.month === action.payload.month
              ? { ...b, lineItems: [...b.lineItems, action.payload.item] }
              : b
          ),
        };
      }
      return {
        ...state,
        budgets: [
          ...state.budgets,
          { month: action.payload.month, lineItems: [action.payload.item] },
        ],
      };
    }
    case "UPDATE_BUDGET_ITEM":
      return {
        ...state,
        budgets: state.budgets.map((b) =>
          b.month === action.payload.month
            ? {
                ...b,
                lineItems: b.lineItems.map((li) =>
                  li.id === action.payload.item.id ? action.payload.item : li
                ),
              }
            : b
        ),
      };
    case "DELETE_BUDGET_ITEM":
      return {
        ...state,
        budgets: state.budgets.map((b) =>
          b.month === action.payload.month
            ? {
                ...b,
                lineItems: b.lineItems.filter(
                  (li) => li.id !== action.payload.itemId
                ),
              }
            : b
        ),
      };

    case "ADD_ANNUAL_SUB":
      return { ...state, annualSubscriptions: [...state.annualSubscriptions, action.payload] };
    case "UPDATE_ANNUAL_SUB":
      return {
        ...state,
        annualSubscriptions: state.annualSubscriptions.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      };
    case "DELETE_ANNUAL_SUB":
      return {
        ...state,
        annualSubscriptions: state.annualSubscriptions.filter((s) => s.id !== action.payload),
      };

    case "ADD_PET_EXPENSE":
      return { ...state, petExpenses: [...state.petExpenses, action.payload] };
    case "UPDATE_PET_EXPENSE":
      return {
        ...state,
        petExpenses: state.petExpenses.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };
    case "DELETE_PET_EXPENSE":
      return {
        ...state,
        petExpenses: state.petExpenses.filter((e) => e.id !== action.payload),
      };

    case "ADD_FAMILY_OWED":
      return { ...state, familyOwed: [...state.familyOwed, action.payload] };
    case "UPDATE_FAMILY_OWED":
      return {
        ...state,
        familyOwed: state.familyOwed.map((o) =>
          o.id === action.payload.id ? action.payload : o
        ),
      };
    case "DELETE_FAMILY_OWED":
      return {
        ...state,
        familyOwed: state.familyOwed.filter((o) => o.id !== action.payload),
      };

    case "REORDER": {
      const { stateKey, orderedIds } = action.payload;
      const arr = [...(state[stateKey] as { id: string; sortOrder: number }[])];
      const idToIndex = new Map(orderedIds.map((id, i) => [id, i]));
      for (const item of arr) {
        const newIndex = idToIndex.get(item.id);
        if (newIndex !== undefined) item.sortOrder = newIndex;
      }
      arr.sort((a, b) => a.sortOrder - b.sortOrder);
      return { ...state, [stateKey]: arr };
    }

    case "REORDER_BUDGET_ITEMS": {
      const { month, orderedIds } = action.payload;
      return {
        ...state,
        budgets: state.budgets.map((b) => {
          if (b.month !== month) return b;
          const items = [...b.lineItems];
          const idToIndex = new Map(orderedIds.map((id, i) => [id, i]));
          for (const item of items) {
            const newIndex = idToIndex.get(item.id);
            if (newIndex !== undefined) item.sortOrder = newIndex;
          }
          items.sort((a, b) => a.sortOrder - b.sortOrder);
          return { ...b, lineItems: items };
        }),
      };
    }

    default:
      return state;
  }
}

// Persist action to Supabase (fire-and-forget, optimistic)
function persistAction(action: Action, userId: string) {
  switch (action.type) {
    case "ADD_ACCOUNT":
      insertAccount(action.payload, userId);
      break;
    case "UPDATE_ACCOUNT":
      updateAccount(action.payload, userId);
      break;
    case "DELETE_ACCOUNT":
      deleteAccount(action.payload, userId);
      break;
    case "ADD_DEBT":
      insertDebt(action.payload, userId);
      break;
    case "UPDATE_DEBT":
      updateDebt(action.payload, userId);
      break;
    case "DELETE_DEBT":
      deleteDebt(action.payload, userId);
      break;
    case "ADD_FAMILY_DEBT":
      insertFamilyDebt(action.payload, userId);
      break;
    case "UPDATE_FAMILY_DEBT":
      updateFamilyDebt(action.payload, userId);
      break;
    case "DELETE_FAMILY_DEBT":
      deleteFamilyDebt(action.payload, userId);
      break;
    case "ADD_CRYPTO":
      insertCrypto(action.payload, userId);
      break;
    case "UPDATE_CRYPTO":
      updateCrypto(action.payload, userId);
      break;
    case "DELETE_CRYPTO":
      deleteCrypto(action.payload, userId);
      break;
    case "ADD_INCOMING":
      insertIncoming(action.payload, userId);
      break;
    case "UPDATE_INCOMING":
      updateIncoming(action.payload, userId);
      break;
    case "DELETE_INCOMING":
      deleteIncoming(action.payload, userId);
      break;
    case "ADD_BUDGET_ITEM":
      insertBudgetItem(action.payload.month, action.payload.item, userId);
      break;
    case "UPDATE_BUDGET_ITEM":
      updateBudgetItem(action.payload.month, action.payload.item, userId);
      break;
    case "DELETE_BUDGET_ITEM":
      deleteBudgetItem(action.payload.itemId, userId);
      break;
    case "SET_BUDGET":
      setBudgetItems(action.payload.month, action.payload.lineItems, userId);
      break;
    case "ADD_ANNUAL_SUB":
      insertAnnualSub(action.payload, userId);
      break;
    case "UPDATE_ANNUAL_SUB":
      updateAnnualSub(action.payload, userId);
      break;
    case "DELETE_ANNUAL_SUB":
      deleteAnnualSub(action.payload, userId);
      break;
    case "ADD_PET_EXPENSE":
      insertPetExpense(action.payload, userId);
      break;
    case "UPDATE_PET_EXPENSE":
      updatePetExpense(action.payload, userId);
      break;
    case "DELETE_PET_EXPENSE":
      deletePetExpense(action.payload, userId);
      break;
    case "ADD_FAMILY_OWED":
      insertFamilyOwed(action.payload, userId);
      break;
    case "UPDATE_FAMILY_OWED":
      updateFamilyOwed(action.payload, userId);
      break;
    case "DELETE_FAMILY_OWED":
      deleteFamilyOwed(action.payload, userId);
      break;
    case "REORDER": {
      const table = STATE_KEY_TO_TABLE[action.payload.stateKey];
      const items = action.payload.orderedIds.map((id, i) => ({ id, sortOrder: i }));
      updateSortOrders(table, items, userId);
      break;
    }
    case "REORDER_BUDGET_ITEMS": {
      const items = action.payload.orderedIds.map((id, i) => ({ id, sortOrder: i }));
      updateSortOrders("finance_budget_line_items", items, userId);
      break;
    }
  }
}

interface FinanceContextValue {
  state: FinanceState;
  dispatch: React.Dispatch<Action>;
  isLoaded: boolean;
}

const FinanceContext = createContext<FinanceContextValue>({
  state: DEFAULT_STATE,
  dispatch: () => {},
  isLoaded: false,
});

export function FinanceProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const initialized = useRef(false);

  // Wrapped dispatch: update reducer (instant) + persist to Supabase (background)
  const dispatch = (action: Action) => {
    rawDispatch(action);
    if (action.type !== "LOAD_STATE") {
      persistAction(action, userId);
    }
  };

  // Load from Supabase on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    fetchAllData(userId)
      .then((data) => {
        rawDispatch({ type: "LOAD_STATE", payload: data });
      })
      .catch((err) => {
        console.error("Failed to load from Supabase:", err);
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, [userId]);

  return (
    <FinanceContext.Provider value={{ state, dispatch, isLoaded }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  return useContext(FinanceContext);
}
