"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  username: string;
  is_admin: boolean;
  created_at: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user.isAdmin) {
      router.replace("/");
      return;
    }
    fetchUsers();
  }, [user.isAdmin, router]);

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      setUsers(await res.json());
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      setUsername("");
      setPassword("");
      await fetchUsers();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create user");
    }
    setCreating(false);
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;

    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (res.ok) {
      await fetchUsers();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete user");
    }
  };

  if (!user.isAdmin) return null;

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 mb-1">Admin</h1>
      <p className="text-xs text-zinc-400 mb-6">Manage users</p>

      {/* Add user form */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 mb-6">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
          Add User
        </div>
        <form onSubmit={handleCreate} className="flex items-end gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
          </div>
          <button
            type="submit"
            disabled={creating || !username || !password}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      {/* Users table */}
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="px-5 pt-4 pb-2">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Users
          </div>
        </div>
        {loading ? (
          <div className="px-5 py-4 text-sm text-zinc-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-zinc-100">
                <th className="px-5 py-2 text-left text-xs font-medium text-zinc-400">Username</th>
                <th className="px-5 py-2 text-left text-xs font-medium text-zinc-400">Role</th>
                <th className="px-5 py-2 text-left text-xs font-medium text-zinc-400">Created</th>
                <th className="px-5 py-2 text-right text-xs font-medium text-zinc-400"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-zinc-100">
                  <td className="px-5 py-3 text-zinc-900">{u.username}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      u.is_admin
                        ? "bg-amber-50 text-amber-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}>
                      {u.is_admin ? "admin" : "user"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.id !== user.userId && (
                      <button
                        onClick={() => handleDelete(u.id, u.username)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
