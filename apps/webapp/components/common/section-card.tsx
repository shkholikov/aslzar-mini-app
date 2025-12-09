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
		<div className="m-2 border rounded-lg bg-muted/50 bg-transparent p-4">
			<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
				<Icon className="size-5" />
				{title}
			</h2>
			<div className="text-sm text-gray-700 mb-2">{children}</div>
		</div>
	);
}
