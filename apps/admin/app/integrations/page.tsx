"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plug, Clock } from "lucide-react";
import { AdminGuard } from "@/components/common/admin-guard";
import { useAdminContext } from "@/components/common/admin-context";
import { Separator } from "@/components/ui/separator";
import { Loading } from "@/components/common/loading";
import { Sync1CHistoryTable, Sync1CLatestCard, useSync1CState } from "@/components/integrations/sync-1c";

function IntegrationsContent() {
	const { role } = useAdminContext();
	const router = useRouter();
	const isSuperadmin = role === "superadmin" || !role;

	React.useEffect(() => {
		if (!isSuperadmin) router.replace("/");
	}, [isSuperadmin, router]);

	const sync1C = useSync1CState();

	if (!isSuperadmin) return null;

	return (
		<main className="flex min-h-screen w-full flex-col px-4 py-8 sm:px-6 lg:px-8">
			<div className="flex items-center justify-center pb-4">
				<Plug className="h-12 w-12 text-gray-800" />
			</div>
			<h1 className="text-center text-2xl font-semibold text-gray-800">Integratsiyalar</h1>
			<p className="mt-2 text-center text-sm text-muted-foreground">Tashqi tizimlar bilan sinxronlash va integratsiyalar</p>
			<Separator className="mt-2" />

			<section className="mt-8">
				<h2 className="text-lg font-semibold text-gray-800">1C Sinxronlash</h2>
				<p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
					<Clock className="h-3.5 w-3.5" />
					Avtomatik sinxronlash: har kuni 02:00 Toshkent vaqti
				</p>

				<div className="mt-4">
					<Sync1CLatestCard latest={sync1C.latest} isRunning={sync1C.isRunning} onSync={sync1C.startSync} />
				</div>

				<h3 className="mt-8 mb-3 text-base font-medium text-gray-800">Tarix</h3>
				{!sync1C.loaded ? <Loading /> : <Sync1CHistoryTable jobs={sync1C.jobs} />}
			</section>
		</main>
	);
}

export default function IntegrationsPage() {
	return (
		<AdminGuard>
			<IntegrationsContent />
		</AdminGuard>
	);
}
