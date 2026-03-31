"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AdminPermission, AdminRole } from "@/lib/auth-utils";

interface AdminContextValue {
	checking: boolean;
	authenticated: boolean;
	role: AdminRole | null;
	permissions: AdminPermission[];
	username: string | null;
	firstName: string | null;
	lastName: string | null;
}

const UNAUTHENTICATED: AdminContextValue = {
	checking: false,
	authenticated: false,
	role: null,
	permissions: [],
	username: null,
	firstName: null,
	lastName: null
};

const AdminContext = createContext<AdminContextValue>({ ...UNAUTHENTICATED, checking: true });

export function useAdminContext() {
	return useContext(AdminContext);
}

export function AdminContextProvider({ children }: { children: React.ReactNode }) {
	const [state, setState] = useState<AdminContextValue>({ ...UNAUTHENTICATED, checking: true });

	useEffect(() => {
		let cancelled = false;

		async function fetchSession() {
			try {
				const res = await fetch("/api/admin/check", { method: "GET" });
				if (cancelled) return;
				if (!res.ok) {
					setState(UNAUTHENTICATED);
					return;
				}
				const data = await res.json();
				setState({
					checking: false,
					authenticated: true,
					role: data.role ?? "superadmin",
					permissions: data.permissions ?? [],
					username: data.username ?? null,
					firstName: data.firstName ?? null,
					lastName: data.lastName ?? null
				});
			} catch {
				if (!cancelled) setState(UNAUTHENTICATED);
			}
		}

		fetchSession();
		return () => {
			cancelled = true;
		};
	}, []);

	return <AdminContext.Provider value={state}>{children}</AdminContext.Provider>;
}
