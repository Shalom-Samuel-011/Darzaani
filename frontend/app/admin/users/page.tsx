"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api";
import StyledFilterDropdown from "@/components/admin/StyledFilterDropdown";

type AdminRole = "master-admin" | "branch-manager" | "tailor" | "customer";

interface BranchOption {
  _id: string;
  name: string;
  code: string;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: AdminRole;
  branch?: string | { _id: string; name: string; code: string } | null;
}

const roleLabels: Record<AdminRole, string> = {
  "master-admin": "Master admin",
  "branch-manager": "Branch manager",
  tailor: "Tailor",
  customer: "Customer",
};

export default function AdminUsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [usersSearch, setUsersSearch] = useState("");
  const [usersSearchQuery, setUsersSearchQuery] = useState("");
  const [usersRole, setUsersRole] = useState<"all" | AdminRole>("all");
  const [usersBranch, setUsersBranch] = useState("all");
  const [usersPage, setUsersPage] = useState(1);
  const [usersPages, setUsersPages] = useState(0);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersRetry, setUsersRetry] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/admin/users");
      return;
    }
    if (user.role !== "master-admin") return;

    let isCurrent = true;
    API.get("/branches")
      .then((response) => {
        if (isCurrent) setBranches(response.data.data?.branches || []);
      })
      .catch(() => {
        if (isCurrent) setBranches([]);
      });

    return () => {
      isCurrent = false;
    };
  }, [authLoading, user, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setUsersSearchQuery(usersSearch.trim());
      setUsersPage(1);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [usersSearch]);

  useEffect(() => {
    if (authLoading || user?.role !== "master-admin") return;

    let isCurrent = true;
    const loadUsers = async () => {
      setUsersLoading(true);
      setUsersError("");
      try {
        const response = await API.get("/admin/users", {
          params: {
            page: usersPage,
            limit: 10,
            ...(usersRole !== "all" ? { role: usersRole } : {}),
            ...(usersBranch !== "all" ? { branch: usersBranch } : {}),
            ...(usersSearchQuery ? { search: usersSearchQuery } : {}),
          },
        });

        if (!isCurrent) return;
        setAdminUsers(response.data.data?.users || []);
        setUsersTotal(response.data.results || 0);
        setUsersPages(response.data.pages || 0);
      } catch (err) {
        if (!isCurrent) return;
        const apiError = err as { response?: { data?: { message?: string } } };
        setUsersError(apiError.response?.data?.message || "Could not load users. Please try again.");
      } finally {
        if (isCurrent) setUsersLoading(false);
      }
    };

    void loadUsers();
    return () => {
      isCurrent = false;
    };
  }, [authLoading, user, usersRetry, usersPage, usersRole, usersBranch, usersSearchQuery]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfcf8]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-orange-700" />
          <p className="text-sm text-stone-500">Verifying admin credentials...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "master-admin") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#fdfcf8] p-6">
        <div className="w-full max-w-md rounded-3xl border border-[#e8dcc8] bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-2xl font-semibold text-stone-900">Access restricted</h1>
          <p className="mt-3 text-sm text-stone-600">User management is available to Master Administrators only.</p>
          <Link href={user ? "/admin" : "/login"} className="mt-6 inline-flex rounded-xl bg-[#873b20] px-5 py-3 text-sm font-medium text-white transition hover:bg-orange-800">
            {user ? "Return to dashboard" : "Log in"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcf8] px-5 py-8 text-stone-900 sm:px-8">
      <main className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm font-medium text-orange-800 hover:underline">← Admin dashboard</Link>
            <h1 className="mt-3 font-serif text-3xl font-semibold">Users &amp; Team</h1>
            <p className="mt-1 text-sm text-stone-500">Customers, tailors, branch managers, and administrators</p>
          </div>
          <span className="text-sm text-stone-500" aria-live="polite">
            {usersTotal} {usersTotal === 1 ? "account" : "accounts"}
          </span>
        </div>

        <section className="relative rounded-2xl border border-[#e8dcc8] bg-white shadow-sm">
          <div className="grid gap-3 rounded-t-2xl border-b border-[#eee5d7] bg-[#fffdf8] p-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_200px_220px]">
            <label className="flex items-center gap-2 rounded-xl border border-[#e8dcc8] bg-white px-3.5 py-2.5 text-stone-500">
              <Search className="h-4 w-4 shrink-0" />
              <span className="sr-only">Search users by name, email, or phone</span>
              <input
                value={usersSearch}
                onChange={(event) => setUsersSearch(event.target.value)}
                placeholder="Search name, email, phone"
                className="w-full bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
              />
            </label>
            <StyledFilterDropdown
              label="Filter by user role"
              value={usersRole}
              options={[
                { value: "all", label: "All roles" },
                ...Object.entries(roleLabels).map(([role, label]) => ({ value: role, label })),
              ]}
              onChange={(value) => {
                setUsersRole(value as "all" | AdminRole);
                setUsersPage(1);
              }}
            />
            <StyledFilterDropdown
              label="Filter by branch"
              value={usersBranch}
              options={[
                { value: "all", label: "All branches" },
                ...branches.map((branch) => ({ value: branch._id, label: branch.name })),
              ]}
              onChange={(value) => {
                setUsersBranch(value);
                setUsersPage(1);
              }}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-[#fdfcf8]">
                <tr>
                  {["Name", "Email", "Phone", "Role", "Branch"].map((heading) => (
                    <th key={heading} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee5d7]">
                {usersLoading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-stone-500">Loading accounts...</td></tr>
                ) : usersError ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <p role="alert" className="text-sm text-red-700">{usersError}</p>
                      <button type="button" onClick={() => setUsersRetry((count) => count + 1)} className="mt-3 rounded-lg border border-[#e8dcc8] px-4 py-2 text-sm font-medium text-stone-700 hover:bg-[#fdfcf8]">Try again</button>
                    </td>
                  </tr>
                ) : adminUsers.length ? (
                  adminUsers.map((adminUser) => {
                    const assignedBranch = typeof adminUser.branch === "object" ? adminUser.branch : null;
                    return (
                      <tr key={adminUser._id} className="transition-colors hover:bg-[#fdfcf8]">
                        <td className="px-6 py-4 text-sm font-medium text-stone-900">{adminUser.name}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{adminUser.email}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{adminUser.phone || "—"}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-900">{roleLabels[adminUser.role]}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">{assignedBranch ? `${assignedBranch.name} (${assignedBranch.code})` : "Unassigned"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-stone-500">No accounts match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {!usersLoading && !usersError && usersPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#eee5d7] px-5 py-3">
              <p className="text-xs text-stone-500">Page {usersPage} of {usersPages} · 10 accounts per page</p>
              <div className="flex gap-2">
                <button type="button" aria-label="Previous users page" disabled={usersPage <= 1} onClick={() => setUsersPage((page) => Math.max(1, page - 1))} className="rounded-lg border border-[#e8dcc8] p-2 text-stone-600 hover:bg-[#fdfcf8] disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Next users page" disabled={usersPage >= usersPages} onClick={() => setUsersPage((page) => Math.min(usersPages, page + 1))} className="rounded-lg border border-[#e8dcc8] p-2 text-stone-600 hover:bg-[#fdfcf8] disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
