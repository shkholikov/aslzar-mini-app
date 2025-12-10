"use client";

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface SectionCardProps {
	icon: LucideIcon;
	title: string;
	children: ReactNode;
}

export function SectionCard({ icon: Icon, title, children }: SectionCardProps) {
	return (
		<div className="border rounded-lg bg-muted/50 bg-transparent m-2 p-4">
			<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
				<Icon className="size-5" />
				{title}
			</h2>
			<div className="mb-2">{children}</div>
		</div>
	);
}
