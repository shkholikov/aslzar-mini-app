"use client";

import * as React from "react";
import { AdminGuard } from "@/components/common/admin-guard";
import { useAdminContext } from "@/components/common/admin-context";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCog, Trash2 } from "lucide-react";
import { ALL_PERMISSIONS, type AdminPermission, type AdminRole } from "@/lib/auth-utils";

interface AdminUserRow {
	_id: string;
	username: string;
	firstName?: string;
	lastName?: string;
	role?: AdminRole;
	permissions?: AdminPermission[];
	createdBy?: string;
	createdAt?: string;
}

function AdminUsersContent() {
	const { role, username: currentUsername } = useAdminContext();
	const router = useRouter();
	const isSuperadmin = role === "superadmin" || !role;

	const [users, setUsers] = React.useState<AdminUserRow[]>([]);
	const [loading, setLoading] = React.useState(true);

	const [newUsername, setNewUsername] = React.useState("");
	const [newPassword, setNewPassword] = React.useState("");
	const [newFirstName, setNewFirstName] = React.useState("");
	const [newLastName, setNewLastName] = React.useState("");
	const [newRole, setNewRole] = React.useState<AdminRole>("staff");
	const [newPermissions, setNewPermissions] = React.useState<AdminPermission[]>([]);
	const [creating, setCreating] = React.useState(false);
	const [createError, setCreateError] = React.useState("");

	React.useEffect(() => {
		if (!isSuperadmin) {
			router.replace("/");
			return;
		}
		fetchUsers();
	}, [isSuperadmin]); // eslint-disable-line react-hooks/exhaustive-deps

	async function fetchUsers() {
		setLoading(true);
		try {
			const res = await fetch("/api/admin/users");
			if (res.ok) {
				const data = await res.json();
				setUsers(data.users ?? []);
			}
		} finally {
			setLoading(false);
		}
	}

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault();
		setCreateError("");
		if (!newUsername.trim() || !newPassword) {
			setCreateError("Username va parol majburiy");
			return;
		}
		setCreating(true);
		try {
			const res = await fetch("/api/admin/users", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: newUsername.trim(),
					password: newPassword,
					firstName: newFirstName.trim() || undefined,
					lastName: newLastName.trim() || undefined,
					role: newRole,
					permissions: newRole === "staff" ? newPermissions : []
				})
			});
			const data = await res.json();
			if (!res.ok) {
				setCreateError(data.error ?? "Xatolik yuz berdi");
				return;
			}
			setNewUsername("");
			setNewPassword("");
			setNewFirstName("");
			setNewLastName("");
			setNewRole("staff");
			setNewPermissions([]);
			await fetchUsers();
		} finally {
			setCreating(false);
		}
	}

	async function handleDelete(id: string) {
		if (!confirm("Bu adminni o'chirishni tasdiqlaysizmi?")) return;
		const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
		if (res.ok) {
			await fetchUsers();
		} else {
			const data = await res.json();
			alert(data.error ?? "O'chirishda xatolik");
		}
	}

	function togglePermission(perm: AdminPermission) {
		setNewPermissions((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
	}

	if (!isSuperadmin) return null;

	return (
		<main className="flex min-h-screen w-full flex-col px-4 py-8 sm:px-6 lg:px-8">
			<div className="w-full">
				<div className="flex items-center gap-3 pb-4">
					<UserCog className="w-10 h-10 text-gray-800" />
					<div>
						<h1 className="text-2xl font-semibold text-gray-800">Admin foydalanuvchilar</h1>
						<p className="text-sm text-muted-foreground">Adminlarni boshqarish va ruxsatlarni sozlash</p>
					</div>
				</div>
				<Separator className="mb-6" />

				{/* Create form */}
				<div className="rounded-lg border border-border bg-card p-4 mb-6">
					<h2 className="text-base font-semibold mb-3">Yangi admin qo'shish</h2>
					<form onSubmit={handleCreate} className="flex flex-col gap-3">
						<div className="flex flex-wrap gap-3">
							<Input
								placeholder="Username *"
								value={newUsername}
								onChange={(e) => setNewUsername(e.target.value)}
								className="w-44"
								autoComplete="off"
							/>
							<Input
								placeholder="Parol (min 6 ta belgi) *"
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								className="w-48"
								autoComplete="new-password"
							/>
							<Input placeholder="Ism" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} className="w-36" />
							<Input placeholder="Familiya" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} className="w-36" />
							<select
								value={newRole}
								onChange={(e) => {
									setNewRole(e.target.value as AdminRole);
									if (e.target.value === "superadmin") setNewPermissions([]);
								}}
								className="h-9 rounded-md border border-input bg-background px-3 text-sm"
							>
								<option value="staff">Staff</option>
								<option value="superadmin">Superadmin</option>
							</select>
						</div>

						{newRole === "staff" && (
							<div>
								<p className="text-sm font-medium mb-2">Ruxsatlar:</p>
								<div className="flex flex-wrap gap-3">
									{ALL_PERMISSIONS.map(({ value, label }) => (
										<label key={value} className="flex items-center gap-1.5 cursor-pointer text-sm">
											<Checkbox checked={newPermissions.includes(value)} onCheckedChange={() => togglePermission(value)} />
											{label}
										</label>
									))}
								</div>
							</div>
						)}

						{createError && <p className="text-sm text-destructive">{createError}</p>}

						<div>
							<Button type="submit" disabled={creating} size="sm">
								{creating ? "Qo'shilmoqda..." : "Qo'shish"}
							</Button>
						</div>
					</form>
				</div>

				{/* Users table */}
				<div className="rounded-lg border border-border bg-card overflow-hidden">
					<table className="w-full text-sm">
						<thead className="bg-muted/50">
							<tr>
								<th className="text-left px-4 py-3 font-medium">Username</th>
								<th className="text-left px-4 py-3 font-medium">Ism Familiya</th>
								<th className="text-left px-4 py-3 font-medium">Rol</th>
								<th className="text-left px-4 py-3 font-medium">Ruxsatlar</th>
								<th className="text-left px-4 py-3 font-medium">Qo'shdi</th>
								<th className="text-left px-4 py-3 font-medium">Sana</th>
								<th className="px-4 py-3" />
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
										Yuklanmoqda...
									</td>
								</tr>
							) : users.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
										Adminlar yo'q
									</td>
								</tr>
							) : (
								users.map((user) => {
									const effectiveRole = user.role ?? "superadmin";
									const isSelf = user.username === currentUsername;
									const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
									return (
										<tr key={user._id} className="border-t border-border">
											<td className="px-4 py-3 font-medium">{user.username}</td>
											<td className="px-4 py-3 text-muted-foreground">{fullName || "—"}</td>
											<td className="px-4 py-3">
												<Badge variant={effectiveRole === "superadmin" ? "default" : "secondary"}>
													{effectiveRole === "superadmin" ? "Superadmin" : "Staff"}
												</Badge>
											</td>
											<td className="px-4 py-3">
												{effectiveRole === "superadmin" ? (
													<span className="text-muted-foreground text-xs">Barcha ruxsatlar</span>
												) : (user.permissions ?? []).length === 0 ? (
													<span className="text-muted-foreground text-xs">Ruxsat yo'q</span>
												) : (
													<div className="flex flex-wrap gap-1">
														{(user.permissions ?? []).map((p) => (
															<Badge key={p} variant="outline" className="text-xs">
																{ALL_PERMISSIONS.find((x) => x.value === p)?.label ?? p}
															</Badge>
														))}
													</div>
												)}
											</td>
											<td className="px-4 py-3 text-muted-foreground">{user.createdBy ?? "—"}</td>
											<td className="px-4 py-3 text-muted-foreground text-xs">
												{user.createdAt ? new Date(user.createdAt).toLocaleDateString("uz-UZ") : "—"}
											</td>
											<td className="px-4 py-3 text-right">
												<Button
													variant="ghost"
													size="icon"
													disabled={isSelf}
													title={isSelf ? "O'zingizni o'chira olmaysiz" : "O'chirish"}
													onClick={() => handleDelete(user._id)}
													className="h-8 w-8 text-destructive hover:text-destructive"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
		</main>
	);
}

export default function AdminUsersPage() {
	return (
		<AdminGuard>
			<AdminUsersContent />
		</AdminGuard>
	);
}
