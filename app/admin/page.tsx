"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

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
      <h1 className="text-lg font-semibold mb-1">Admin</h1>
      <p className="text-xs text-muted-foreground mb-6">Manage users</p>

      {/* Add user form */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
            Add User
          </div>
          <form onSubmit={handleCreate} className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-username">Username</Label>
              <Input
                id="new-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={creating || !username || !password}
            >
              {creating ? "Creating..." : "Create"}
            </Button>
          </form>
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardContent className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
            Users
          </div>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Username</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Role</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Created</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>
                      <Badge variant={u.is_admin ? "default" : "secondary"}>
                        {u.is_admin ? "admin" : "user"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.id !== user.userId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(u.id, u.username)}
                          className="text-xs text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
