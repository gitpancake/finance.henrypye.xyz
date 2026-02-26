"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  SharedState,
  SharedCategory,
  SharedCategoryMember,
  SharedItem,
} from "@/lib/types";
import {
  fetchSharedCategories,
  fetchCategoryItems,
  insertSharedCategory as dbInsertCategory,
  updateSharedCategory as dbUpdateCategory,
  deleteSharedCategory as dbDeleteCategory,
  addCategoryMember as dbAddMember,
  removeCategoryMember as dbRemoveMember,
  insertSharedItem as dbInsertItem,
  updateSharedItem as dbUpdateItem,
  deleteSharedItem as dbDeleteItem,
  bulkInsertSharedItems as dbBulkInsertItems,
  updateSharedItemSortOrders,
} from "@/lib/shared-supabase";

const DEFAULT_SHARED_STATE: SharedState = {
  categories: [],
  itemsByCategory: {},
};

type Action =
  | { type: "LOAD_CATEGORIES"; payload: SharedCategory[] }
  | { type: "ADD_CATEGORY"; payload: SharedCategory }
  | { type: "UPDATE_CATEGORY"; payload: { id: string; name?: string; description?: string; currency?: SharedCategory["currency"] } }
  | { type: "DELETE_CATEGORY"; payload: string }
  | { type: "ADD_MEMBER"; payload: { categoryId: string; member: SharedCategoryMember } }
  | { type: "REMOVE_MEMBER"; payload: { categoryId: string; userId: string } }
  | { type: "LOAD_ITEMS"; payload: { categoryId: string; items: SharedItem[] } }
  | { type: "ADD_ITEM"; payload: SharedItem }
  | { type: "ADD_ITEMS"; payload: { categoryId: string; items: SharedItem[] } }
  | { type: "UPDATE_ITEM"; payload: SharedItem }
  | { type: "DELETE_ITEM"; payload: { categoryId: string; itemId: string } }
  | { type: "REORDER_ITEMS"; payload: { categoryId: string; orderedIds: string[] } };

function reducer(state: SharedState, action: Action): SharedState {
  switch (action.type) {
    case "LOAD_CATEGORIES":
      return { ...state, categories: action.payload };

    case "ADD_CATEGORY":
      return { ...state, categories: [...state.categories, action.payload] };

    case "UPDATE_CATEGORY":
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.payload.id
            ? {
                ...c,
                ...(action.payload.name !== undefined && { name: action.payload.name }),
                ...(action.payload.description !== undefined && { description: action.payload.description }),
                ...(action.payload.currency !== undefined && { currency: action.payload.currency }),
              }
            : c
        ),
      };

    case "DELETE_CATEGORY": {
      const { [action.payload]: _, ...restItems } = state.itemsByCategory;
      void _;
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload),
        itemsByCategory: restItems,
      };
    }

    case "ADD_MEMBER":
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.payload.categoryId
            ? { ...c, members: [...c.members, action.payload.member] }
            : c
        ),
      };

    case "REMOVE_MEMBER":
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.payload.categoryId
            ? { ...c, members: c.members.filter((m) => m.userId !== action.payload.userId) }
            : c
        ),
      };

    case "LOAD_ITEMS":
      return {
        ...state,
        itemsByCategory: { ...state.itemsByCategory, [action.payload.categoryId]: action.payload.items },
      };

    case "ADD_ITEM": {
      const cid = action.payload.categoryId;
      const existing = state.itemsByCategory[cid] ?? [];
      return {
        ...state,
        itemsByCategory: { ...state.itemsByCategory, [cid]: [...existing, action.payload] },
        categories: state.categories.map((c) =>
          c.id === cid
            ? { ...c, itemCount: c.itemCount + 1, totalSpent: c.totalSpent + action.payload.amount }
            : c
        ),
      };
    }

    case "ADD_ITEMS": {
      const { categoryId, items } = action.payload;
      const existing = state.itemsByCategory[categoryId] ?? [];
      const addedTotal = items.reduce((s, i) => s + i.amount, 0);
      return {
        ...state,
        itemsByCategory: { ...state.itemsByCategory, [categoryId]: [...existing, ...items] },
        categories: state.categories.map((c) =>
          c.id === categoryId
            ? { ...c, itemCount: c.itemCount + items.length, totalSpent: c.totalSpent + addedTotal }
            : c
        ),
      };
    }

    case "UPDATE_ITEM": {
      const cid = action.payload.categoryId;
      const oldItems = state.itemsByCategory[cid] ?? [];
      const oldItem = oldItems.find((i) => i.id === action.payload.id);
      const amountDiff = oldItem ? action.payload.amount - oldItem.amount : 0;
      return {
        ...state,
        itemsByCategory: {
          ...state.itemsByCategory,
          [cid]: oldItems.map((i) => (i.id === action.payload.id ? action.payload : i)),
        },
        categories: state.categories.map((c) =>
          c.id === cid ? { ...c, totalSpent: c.totalSpent + amountDiff } : c
        ),
      };
    }

    case "DELETE_ITEM": {
      const { categoryId, itemId } = action.payload;
      const items = state.itemsByCategory[categoryId] ?? [];
      const removed = items.find((i) => i.id === itemId);
      return {
        ...state,
        itemsByCategory: {
          ...state.itemsByCategory,
          [categoryId]: items.filter((i) => i.id !== itemId),
        },
        categories: state.categories.map((c) =>
          c.id === categoryId
            ? { ...c, itemCount: c.itemCount - 1, totalSpent: c.totalSpent - (removed?.amount ?? 0) }
            : c
        ),
      };
    }

    case "REORDER_ITEMS": {
      const { categoryId, orderedIds } = action.payload;
      const items = [...(state.itemsByCategory[categoryId] ?? [])];
      const idToIndex = new Map(orderedIds.map((id, i) => [id, i]));
      for (const item of items) {
        const idx = idToIndex.get(item.id);
        if (idx !== undefined) item.sortOrder = idx;
      }
      items.sort((a, b) => a.sortOrder - b.sortOrder);
      return { ...state, itemsByCategory: { ...state.itemsByCategory, [categoryId]: items } };
    }

    default:
      return state;
  }
}

interface SharedContextValue {
  state: SharedState;
  dispatch: React.Dispatch<Action>;
  isLoaded: boolean;
  loadCategoryItems: (categoryId: string) => Promise<void>;
  refreshCategories: () => Promise<void>;
}

const SharedContext = createContext<SharedContextValue>({
  state: DEFAULT_SHARED_STATE,
  dispatch: () => {},
  isLoaded: false,
  loadCategoryItems: async () => {},
  refreshCategories: async () => {},
});

export function SharedProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, DEFAULT_SHARED_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const initialized = useRef(false);

  // Wrapped dispatch: update reducer (instant) + persist to Supabase (background)
  const dispatch = useCallback((action: Action) => {
    rawDispatch(action);

    switch (action.type) {
      case "ADD_CATEGORY":
        dbInsertCategory(
          action.payload.name,
          action.payload.description,
          action.payload.currency,
          userId
        );
        break;
      case "UPDATE_CATEGORY":
        dbUpdateCategory(action.payload.id, {
          name: action.payload.name,
          description: action.payload.description,
          currency: action.payload.currency,
        });
        break;
      case "DELETE_CATEGORY":
        dbDeleteCategory(action.payload);
        break;
      case "ADD_MEMBER": {
        dbAddMember(action.payload.categoryId, action.payload.member.userId);
        break;
      }
      case "REMOVE_MEMBER": {
        const cat = state.categories.find((c) => c.id === action.payload.categoryId);
        const membership = cat?.members.find((m) => m.userId === action.payload.userId);
        if (membership) dbRemoveMember(action.payload.categoryId, membership.id);
        break;
      }
      case "ADD_ITEM":
        dbInsertItem(action.payload);
        break;
      case "ADD_ITEMS":
        dbBulkInsertItems(action.payload.items);
        break;
      case "UPDATE_ITEM":
        dbUpdateItem(action.payload);
        break;
      case "DELETE_ITEM":
        dbDeleteItem(action.payload.itemId);
        break;
      case "REORDER_ITEMS":
        updateSharedItemSortOrders(action.payload.orderedIds);
        break;
    }
  }, [userId, state.categories]);

  const loadCategoryItems = useCallback(async (categoryId: string) => {
    const items = await fetchCategoryItems(categoryId);
    rawDispatch({ type: "LOAD_ITEMS", payload: { categoryId, items } });
  }, []);

  const refreshCategories = useCallback(async () => {
    const categories = await fetchSharedCategories(userId);
    rawDispatch({ type: "LOAD_CATEGORIES", payload: categories });
  }, [userId]);

  // Load categories on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    fetchSharedCategories(userId)
      .then((categories) => {
        rawDispatch({ type: "LOAD_CATEGORIES", payload: categories });
      })
      .catch((err) => {
        console.error("Failed to load shared categories:", err);
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, [userId]);

  return (
    <SharedContext.Provider value={{ state, dispatch, isLoaded, loadCategoryItems, refreshCategories }}>
      {children}
    </SharedContext.Provider>
  );
}

export function useShared() {
  return useContext(SharedContext);
}
