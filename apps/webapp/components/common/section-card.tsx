"use client";

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import Image from "next/image";

interface SectionCardProps {
	icon?: LucideIcon;
	iconImage?: string;
	title: string;
	children: ReactNode;
}

type SectionCardPropsWithIcon =
	| (SectionCardProps & { icon: LucideIcon; iconImage?: never })
	| (SectionCardProps & { iconImage: string; icon?: never });

export function SectionCard({ icon: Icon, iconImage, title, children }: SectionCardPropsWithIcon) {
	return (
		<div className="border-2 backdrop-blur-[10px] rounded-4xl bg-muted/50 bg-transparent m-2 p-4 shadow-md">
			<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
				{iconImage ? (
					<Image src={iconImage} alt={title} width={35} height={35} className="object-contain" />
				) : Icon ? (
					<Icon className="size-5" />
				) : null}
				{title}
			</h2>
			<div className="mb-2">{children}</div>
		</div>
	);
}
