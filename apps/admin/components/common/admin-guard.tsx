"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/common/loading";

interface AdminGuardProps {
	children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
	const router = useRouter();
	const [checking, setChecking] = useState(true);

	useEffect(() => {
		let cancelled = false;

		async function check() {
			try {
				const res = await fetch("/api/admin/check", { method: "GET" });
				if (!res.ok) {
					if (!cancelled) {
						router.replace("/login");
					}
					return;
				}
			} catch {
				if (!cancelled) {
					router.replace("/login");
				}
				return;
			} finally {
				if (!cancelled) {
					setChecking(false);
				}
			}
		}

		check();

		return () => {
			cancelled = true;
		};
	}, [router]);

	if (checking) {
		return (
			<main className="flex min-h-screen w-full items-center justify-center">
				<Loading />
			</main>
		);
	}

	return <>{children}</>;
}

