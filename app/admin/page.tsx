"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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

  useEffect(() => {
    if (!user.isAdmin) {
      router.replace("/");
      return;
    }
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setUsers(data))
      .finally(() => setLoading(false));
  }, [user.isAdmin, router]);

  if (!user.isAdmin) return null;

  return (
    <div>
      <h1 className="text-lg font-semibold mb-1">Admin</h1>
      <p className="text-xs text-muted-foreground mb-6">
        Users are managed via Firebase Console
      </p>

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
