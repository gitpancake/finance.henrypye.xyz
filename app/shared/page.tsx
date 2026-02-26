"use client";

import { useState, useEffect } from "react";
import { useShared } from "@/contexts/SharedContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditableTable, { type Column, type UserOption } from "@/components/EditableTable";
import ReceiptUpload from "@/components/ReceiptUpload";
import { formatMoney } from "@/lib/format";
import type { Currency, SharedItem } from "@/lib/types";

const itemColumns: Column[] = [
  { key: "name", label: "Item", type: "text" },
  { key: "amount", label: "Amount", type: "number" },
  { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD", "GBP", "EUR"] },
  { key: "date", label: "Date", type: "date" },
  { key: "notes", label: "Notes", type: "text" },
];

export default function SharedPage() {
  const { state, dispatch, isLoaded, loadCategoryItems, refreshCategories } = useShared();
  const { user } = useAuth();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  if (!isLoaded) return <div className="text-sm text-zinc-400">Loading...</div>;

  if (selectedCategoryId) {
    const category = state.categories.find((c) => c.id === selectedCategoryId);
    if (!category) {
      setSelectedCategoryId(null);
      return null;
    }
    return (
      <CategoryDetail
        categoryId={selectedCategoryId}
        onBack={() => setSelectedCategoryId(null)}
      />
    );
  }

  return (
    <CategoryList
      onSelect={(id) => {
        loadCategoryItems(id);
        setSelectedCategoryId(id);
      }}
    />
  );
}

// --- Category List View ---

function CategoryList({ onSelect }: { onSelect: (id: string) => void }) {
  const { state, dispatch, refreshCategories } = useShared();
  const { user } = useAuth();
  const { displayCurrency, convert } = useCurrency();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCurrency, setNewCurrency] = useState<Currency>("CAD");

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = crypto.randomUUID();
    dispatch({
      type: "ADD_CATEGORY",
      payload: {
        id,
        ownerId: user.userId,
        ownerName: user.username,
        name: newName.trim(),
        description: newDescription.trim(),
        currency: newCurrency,
        members: [],
        itemCount: 0,
        totalSpent: 0,
      },
    });
    setNewName("");
    setNewDescription("");
    setNewCurrency("CAD");
    setShowForm(false);
    // Refresh to get the server-assigned ID
    setTimeout(() => refreshCategories(), 500);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold text-zinc-900">Shared</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
        >
          {showForm ? "Cancel" : "New Category"}
        </button>
      </div>
      <p className="text-xs text-zinc-400 mb-6">
        Collaborative expense categories. Share with other users for read/write access.
      </p>

      {showForm && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 mb-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Apartment"
                autoFocus
                className="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm outline-none focus:border-zinc-400"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Description</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm outline-none focus:border-zinc-400"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Currency</label>
              <div className="flex gap-2">
                <select
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value as Currency)}
                  className="flex-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm outline-none focus:border-zinc-400"
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {state.categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center">
          <p className="text-sm text-zinc-400">No shared categories yet.</p>
          <p className="text-xs text-zinc-300 mt-1">Create one to start tracking expenses together.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {state.categories.map((cat) => {
            const isOwner = cat.ownerId === user.userId;
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                className="group rounded-lg border border-zinc-200 bg-white p-4 text-left hover:border-zinc-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900">{cat.name}</span>
                      {!isOwner && (
                        <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">
                          shared by {cat.ownerName}
                        </span>
                      )}
                      {cat.members.length > 0 && isOwner && (
                        <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">
                          shared with {cat.members.length}
                        </span>
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-xs text-zinc-400 mt-0.5">{cat.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold text-zinc-900">
                      {formatMoney(cat.totalSpent, cat.currency)}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {cat.itemCount} item{cat.itemCount !== 1 && "s"}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Category Detail View ---

function CategoryDetail({ categoryId, onBack }: { categoryId: string; onBack: () => void }) {
  const { state, dispatch, loadCategoryItems } = useShared();
  const { user } = useAuth();
  const { displayCurrency, convert } = useCurrency();
  const [platformUsers, setPlatformUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const category = state.categories.find((c) => c.id === categoryId);
  const items = state.itemsByCategory[categoryId] ?? [];
  const isOwner = category?.ownerId === user.userId;

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPlatformUsers(data.map((u: { id: string; username: string }) => ({ value: u.id, label: u.username })));
        }
      })
      .catch(() => {});
  }, []);

  if (!category) return null;

  const totalInDisplay = items.reduce((sum, i) => sum + convert(i.amount, i.currency), 0);

  const handleAddItem = (row: Record<string, unknown>) => {
    const item: SharedItem = {
      id: crypto.randomUUID(),
      categoryId,
      name: String(row.name || ""),
      amount: Math.abs(Number(row.amount) || 0),
      currency: (row.currency as Currency) || category.currency,
      date: String(row.date || ""),
      notes: String(row.notes || ""),
      addedBy: user.userId,
      addedByName: user.username,
      sortOrder: Math.max(0, ...items.map((i) => i.sortOrder), 0) + 1,
    };
    dispatch({ type: "ADD_ITEM", payload: item });
  };

  const handleUpdateItem = (row: Record<string, unknown>) => {
    const existing = items.find((i) => i.id === row.id);
    if (!existing) return;
    const updated: SharedItem = {
      ...existing,
      name: String(row.name || ""),
      amount: Math.abs(Number(row.amount) || 0),
      currency: (row.currency as Currency) || existing.currency,
      date: String(row.date || ""),
      notes: String(row.notes || ""),
    };
    dispatch({ type: "UPDATE_ITEM", payload: updated });
  };

  const handleReceiptItems = (extracted: { name: string; amount: number }[]) => {
    const newItems: SharedItem[] = extracted.map((e, i) => ({
      id: crypto.randomUUID(),
      categoryId,
      name: e.name,
      amount: Math.abs(e.amount),
      currency: category.currency,
      date: new Date().toISOString().slice(0, 10),
      notes: "",
      addedBy: user.userId,
      addedByName: user.username,
      sortOrder: Math.max(0, ...items.map((it) => it.sortOrder), 0) + 1 + i,
    }));
    dispatch({ type: "ADD_ITEMS", payload: { categoryId, items: newItems } });
  };

  const handleAddMember = () => {
    if (!selectedUser) return;
    const userInfo = platformUsers.find((u) => u.value === selectedUser);
    if (!userInfo) return;
    if (category.members.some((m) => m.userId === selectedUser)) return;
    dispatch({
      type: "ADD_MEMBER",
      payload: {
        categoryId,
        member: {
          id: crypto.randomUUID(),
          userId: selectedUser,
          username: userInfo.label,
        },
      },
    });
    setSelectedUser("");
  };

  const handleRemoveMember = (userId: string) => {
    dispatch({ type: "REMOVE_MEMBER", payload: { categoryId, userId } });
  };

  const handleDeleteCategory = () => {
    dispatch({ type: "DELETE_CATEGORY", payload: categoryId });
    onBack();
  };

  // Users available to share with (exclude owner and existing members)
  const availableUsers = platformUsers.filter(
    (u) => u.value !== category.ownerId && !category.members.some((m) => m.userId === u.value)
  );

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 text-xs text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
      >
        &larr; Back to categories
      </button>

      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">{category.name}</h1>
          {category.description && (
            <p className="text-xs text-zinc-400">{category.description}</p>
          )}
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-semibold text-zinc-900">
            {formatMoney(totalInDisplay, displayCurrency)}
          </div>
          <div className="text-xs text-zinc-400">
            {items.length} item{items.length !== 1 && "s"}
          </div>
        </div>
      </div>

      {/* Sharing controls (owner only) */}
      {isOwner && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 mb-4 mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
            Sharing
          </div>
          {category.members.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {category.members.map((m) => (
                <span
                  key={m.userId}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600"
                >
                  {m.username}
                  <button
                    onClick={() => handleRemoveMember(m.userId)}
                    className="text-zinc-400 hover:text-red-500 cursor-pointer"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
          {availableUsers.length > 0 && (
            <div className="flex gap-2">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="flex-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm outline-none focus:border-zinc-400"
              >
                <option value="">Add a user...</option>
                {availableUsers.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!selectedUser}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
              >
                Share
              </button>
            </div>
          )}
          {availableUsers.length === 0 && category.members.length === 0 && (
            <p className="text-xs text-zinc-400">No other users to share with.</p>
          )}
        </div>
      )}

      {/* Receipt upload */}
      <div className="mb-4 mt-4">
        <ReceiptUpload
          onAddItems={handleReceiptItems}
          defaultCurrency={category.currency}
        />
      </div>

      {/* Items table */}
      <EditableTable
        title="Items"
        columns={itemColumns}
        rows={items}
        onAdd={handleAddItem}
        onUpdate={handleUpdateItem}
        onDelete={(id) => dispatch({ type: "DELETE_ITEM", payload: { categoryId, itemId: id } })}
        defaultValues={{ currency: category.currency, notes: "", date: "" }}
        onReorder={(ids) => dispatch({ type: "REORDER_ITEMS", payload: { categoryId, orderedIds: ids } })}
      />

      {/* Delete category (owner only) */}
      {isOwner && (
        <div className="mt-8 pt-4 border-t border-zinc-100">
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-red-500">Delete this category and all its items?</span>
              <button
                onClick={handleDeleteCategory}
                className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-zinc-400 hover:text-red-500 cursor-pointer transition-colors"
            >
              Delete category
            </button>
          )}
        </div>
      )}
    </div>
  );
}
