"use client";

import { Separator } from "../ui/separator";
import type { ElementType, ReactNode } from "react";
import Image from "next/image";

// Use Next.js Image Optimization so text-bg is served as WebP/AVIF and cached
const TEXT_BG_OPTIMIZED = "/_next/image?url=" + encodeURIComponent("/images/text-bg.png") + "&w=828&q=100";

interface HeaderProps {
	title: string;
	description: string;
	icon?: ElementType;
	iconImage?: string;
	/**
	 * Dense variant: a small icon inline with the title, no description, no separator.
	 * The full treatment costs ~214px before any content, which is half the viewport on a
	 * phone — too much for a page that has to show a product grid, a search field and
	 * category chips above the fold. Right-hand `actions` sit on the same row.
	 */
	compact?: boolean;
	actions?: ReactNode;
}

type HeaderPropsWithIcon = (HeaderProps & { icon: ElementType; iconImage?: never }) | (HeaderProps & { iconImage: string; icon?: never });

export function Header({ title, description, icon: Icon, iconImage, compact = false, actions }: HeaderPropsWithIcon) {
	if (compact) {
		return (
			<div className="flex items-center gap-2.5 px-4 pb-3">
				{iconImage ? (
					<Image src={iconImage} alt="" width={44} height={44} className="object-contain shrink-0" priority sizes="44px" />
				) : Icon ? (
					<Icon className="w-7 h-7 text-primary shrink-0" strokeWidth={3} />
				) : null}
				<h1 className="text-2xl font-bold tracking-tight grow">{title}</h1>
				{actions}
			</div>
		);
	}

	return (
		<div>
			<div className="flex flex-items justify-center pb-4">
				{iconImage ? (
					<Image src={iconImage} alt={title} width={110} height={110} className="object-contain" priority sizes="110px" />
				) : Icon ? (
					<Icon className="w-14 h-14 text-primary" strokeWidth={3} />
				) : null}
			</div>
			<div>
				<h1
					className="text-4xl text-center font-bold uppercase"
					style={{
						backgroundImage: `url('${TEXT_BG_OPTIMIZED}')`,
						backgroundSize: "cover",
						backgroundPosition: "center",
						backgroundClip: "text",
						WebkitBackgroundClip: "text",
						WebkitTextFillColor: "transparent",
						textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
						filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))"
					}}
				>
					{title}
				</h1>
				<span>
					<p className="text-center text-md font-semibold mt-2">{description}</p>
				</span>
				<Separator className="my-2" />
			</div>
		</div>
	);
}
