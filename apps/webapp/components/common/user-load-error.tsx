"use client";

import { CatalogState } from "@/components/common/catalog-state";
import { useUser } from "@/hooks/useUser";

/**
 * Shown when /v1/users/me failed (1C slow or down, network). Never the register card: a failed
 * call says nothing about whether the person is a customer (incidents.md, 2026-10-15).
 */
export function UserLoadError() {
	const { refreshUserData } = useUser();
	return (
		<div className="mx-2 my-2">
			<CatalogState
				kind="error"
				title="Ma'lumotlarni yuklab bo'lmadi"
				description="Ulanishda muammo bo'ldi. Birozdan so'ng qayta urinib ko'ring."
				onAction={refreshUserData}
			/>
		</div>
	);
}
