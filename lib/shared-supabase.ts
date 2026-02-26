import { createClient } from "@supabase/supabase-js";
import type {
  SharedCategory,
  SharedCategoryMember,
  SharedItem,
  Currency,
} from "./types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Mapping helpers ---

function toSharedItem(row: Record<string, unknown>, usernameMap: Record<string, string>): SharedItem {
  return {
    id: row.id as string,
    categoryId: row.category_id as string,
    name: row.name as string,
    amount: Number(row.amount),
    currency: (row.currency as Currency) ?? "CAD",
    date: (row.date as string) ?? "",
    notes: (row.notes as string) ?? "",
    addedBy: row.added_by as string,
    addedByName: usernameMap[row.added_by as string] ?? "Unknown",
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function fromSharedItem(item: SharedItem) {
  return {
    id: item.id,
    category_id: item.categoryId,
    name: item.name,
    amount: item.amount,
    currency: item.currency,
    date: item.date || null,
    notes: item.notes,
    added_by: item.addedBy,
    sort_order: item.sortOrder,
  };
}

// --- Username lookup ---

async function getUsernameMap(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const unique = [...new Set(userIds)];
  const { data } = await supabase
    .from("finance_users")
    .select("id, username")
    .in("id", unique);
  const map: Record<string, string> = {};
  for (const u of data ?? []) {
    map[u.id] = u.username;
  }
  return map;
}

// --- Category fetching ---

export async function fetchSharedCategories(userId: string): Promise<SharedCategory[]> {
  // Fetch categories owned by this user
  const { data: owned } = await supabase
    .from("finance_shared_categories")
    .select("*")
    .eq("owner_id", userId);

  // Fetch categories shared with this user
  const { data: memberRows } = await supabase
    .from("finance_shared_category_members")
    .select("category_id")
    .eq("user_id", userId);

  const sharedCategoryIds = (memberRows ?? []).map((r) => r.category_id);

  let sharedCategories: Record<string, unknown>[] = [];
  if (sharedCategoryIds.length > 0) {
    const { data } = await supabase
      .from("finance_shared_categories")
      .select("*")
      .in("id", sharedCategoryIds);
    sharedCategories = data ?? [];
  }

  // Merge and deduplicate
  const allCategories = [...(owned ?? []), ...sharedCategories];
  const seen = new Set<string>();
  const unique = allCategories.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  if (unique.length === 0) return [];

  // Fetch all members for these categories
  const categoryIds = unique.map((c) => c.id);
  const { data: allMembers } = await supabase
    .from("finance_shared_category_members")
    .select("*")
    .in("category_id", categoryIds);

  // Fetch item counts and totals
  const { data: itemStats } = await supabase
    .from("finance_shared_items")
    .select("category_id, amount")
    .in("category_id", categoryIds);

  const countByCategory: Record<string, number> = {};
  const totalByCategory: Record<string, number> = {};
  for (const item of itemStats ?? []) {
    const cid = item.category_id as string;
    countByCategory[cid] = (countByCategory[cid] ?? 0) + 1;
    totalByCategory[cid] = (totalByCategory[cid] ?? 0) + Number(item.amount);
  }

  // Gather all user IDs for username lookup
  const allUserIds = new Set<string>();
  for (const c of unique) allUserIds.add(c.owner_id);
  for (const m of allMembers ?? []) allUserIds.add(m.user_id);

  const usernameMap = await getUsernameMap([...allUserIds]);

  // Build member lists per category
  const membersByCategory: Record<string, SharedCategoryMember[]> = {};
  for (const m of allMembers ?? []) {
    const cid = m.category_id as string;
    if (!membersByCategory[cid]) membersByCategory[cid] = [];
    membersByCategory[cid].push({
      id: m.id,
      userId: m.user_id,
      username: usernameMap[m.user_id] ?? "Unknown",
    });
  }

  return unique.map((c) => ({
    id: c.id as string,
    ownerId: c.owner_id as string,
    ownerName: usernameMap[c.owner_id] ?? "Unknown",
    name: c.name as string,
    description: (c.description as string) ?? "",
    currency: (c.currency as Currency) ?? "CAD",
    members: membersByCategory[c.id] ?? [],
    itemCount: countByCategory[c.id] ?? 0,
    totalSpent: totalByCategory[c.id] ?? 0,
  }));
}

// --- Category items ---

export async function fetchCategoryItems(categoryId: string): Promise<SharedItem[]> {
  const { data: items } = await supabase
    .from("finance_shared_items")
    .select("*")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true });

  if (!items || items.length === 0) return [];

  const userIds = [...new Set(items.map((i) => i.added_by as string))];
  const usernameMap = await getUsernameMap(userIds);

  return items.map((row) => toSharedItem(row as Record<string, unknown>, usernameMap));
}

// --- Category CRUD ---

export async function insertSharedCategory(
  name: string,
  description: string,
  currency: Currency,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("finance_shared_categories")
    .insert({ name, description, currency, owner_id: userId })
    .select("id")
    .single();
  if (error) {
    console.error("insertSharedCategory:", error.message);
    return null;
  }
  return data.id;
}

export async function updateSharedCategory(
  id: string,
  fields: { name?: string; description?: string; currency?: Currency }
) {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.name !== undefined) update.name = fields.name;
  if (fields.description !== undefined) update.description = fields.description;
  if (fields.currency !== undefined) update.currency = fields.currency;

  const { error } = await supabase
    .from("finance_shared_categories")
    .update(update)
    .eq("id", id);
  if (error) console.error("updateSharedCategory:", error.message);
}

export async function deleteSharedCategory(id: string) {
  const { error } = await supabase
    .from("finance_shared_categories")
    .delete()
    .eq("id", id);
  if (error) console.error("deleteSharedCategory:", error.message);
}

// --- Member management ---

export async function addCategoryMember(categoryId: string, userId: string) {
  const { error } = await supabase
    .from("finance_shared_category_members")
    .insert({ category_id: categoryId, user_id: userId });
  if (error) console.error("addCategoryMember:", error.message);
}

export async function removeCategoryMember(categoryId: string, membershipId: string) {
  const { error } = await supabase
    .from("finance_shared_category_members")
    .delete()
    .eq("id", membershipId);
  if (error) console.error("removeCategoryMember:", error.message);
}

// --- Item CRUD ---

export async function insertSharedItem(item: SharedItem) {
  const { error } = await supabase
    .from("finance_shared_items")
    .insert(fromSharedItem(item));
  if (error) console.error("insertSharedItem:", error.message);
}

export async function updateSharedItem(item: SharedItem) {
  const { error } = await supabase
    .from("finance_shared_items")
    .update(fromSharedItem(item))
    .eq("id", item.id);
  if (error) console.error("updateSharedItem:", error.message);
}

export async function deleteSharedItem(id: string) {
  const { error } = await supabase
    .from("finance_shared_items")
    .delete()
    .eq("id", id);
  if (error) console.error("deleteSharedItem:", error.message);
}

export async function bulkInsertSharedItems(items: SharedItem[]) {
  if (items.length === 0) return;
  const { error } = await supabase
    .from("finance_shared_items")
    .insert(items.map(fromSharedItem));
  if (error) console.error("bulkInsertSharedItems:", error.message);
}

// --- Item reordering ---

export async function updateSharedItemSortOrders(orderedIds: string[]) {
  const updates = orderedIds.map((id, i) =>
    supabase.from("finance_shared_items").update({ sort_order: i }).eq("id", id)
  );
  await Promise.all(updates);
}
