"use client";

import { useUser } from "@/hooks/useUser";
import { User } from "lucide-react";
import { SectionCard } from "@/components/common/section-card";

export function UserInfo() {
	const { data } = useUser();

	if (!data || data.code !== 0) return null;

	return (
		<SectionCard icon={User} title="Asosiy Maʼlumotlar">
			<p>
				<strong>FIO:</strong> {data.familiya} {data.imya} {data.otchestvo}
			</p>
			<p>
				<strong>Mijoz ID:</strong> {data.clientId}
			</p>
			<p>
				<strong>Raqam:</strong> {data.phone}
			</p>
		</SectionCard>
	);
}

