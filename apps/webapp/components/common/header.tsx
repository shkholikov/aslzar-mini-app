"use client";

import { Separator } from "../ui/separator";
import type { ElementType } from "react";
import Image from "next/image";

interface HeaderProps {
	title: string;
	description: string;
	icon?: ElementType;
	iconImage?: string;
}

type HeaderPropsWithIcon = 
	| (HeaderProps & { icon: ElementType; iconImage?: never })
	| (HeaderProps & { iconImage: string; icon?: never });

export function Header({ title, description, icon: Icon, iconImage }: HeaderPropsWithIcon) {
	return (
		<div>
			<div className="flex flex-items justify-center pb-4">
				{iconImage ? (
					<Image src={iconImage} alt={title} width={110} height={110} className="object-contain" />
				) : Icon ? (
					<Icon className="w-14 h-14 text-primary" strokeWidth={3} />
				) : null}
			</div>
			<div>
				<h1 
					className="text-4xl text-center font-bold uppercase"
					style={{
						backgroundImage: "url('/images/text-bg.png')",
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
					<p className="text-center text-sm mt-2">{description}</p>
				</span>
				<Separator className="my-2" />
			</div>
		</div>
	);
}
