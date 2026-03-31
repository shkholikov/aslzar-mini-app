"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/common/loading";
import { useAdminContext } from "@/components/common/admin-context";
import type { AdminPermission } from "@/lib/auth-utils";
import { getFirstAllowedPath, hasPermission } from "@/lib/auth-utils";

interface AdminGuardProps {
	children: React.ReactNode;
	requiredPermission?: AdminPermission;
}

export function AdminGuard({ children, requiredPermission }: AdminGuardProps) {
	const router = useRouter();
	const { checking, authenticated, role, permissions, username } = useAdminContext();

	useEffect(() => {
		if (checking) return;

		if (!authenticated) {
			router.replace("/login");
			return;
		}

		if (requiredPermission) {
			const admin = { username: username ?? "", role: role ?? undefined, permissions };
			if (!hasPermission(admin, requiredPermission)) {
				router.replace(getFirstAllowedPath(admin));
			}
		}
	}, [checking, authenticated, role, permissions, username, requiredPermission, router]);

	if (checking) {
		return (
			<main className="flex min-h-screen w-full items-center justify-center">
				<Loading />
			</main>
		);
	}

	if (!authenticated) {
		return null;
	}

	if (requiredPermission) {
		const admin = { username: username ?? "", role: role ?? undefined, permissions };
		if (!hasPermission(admin, requiredPermission)) {
			return null;
		}
	}

	return <>{children}</>;
}
