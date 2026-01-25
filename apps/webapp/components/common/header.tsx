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
					<Image src={iconImage} alt={title} width={100} height={100} className="object-contain" />
				) : Icon ? (
					<Icon className="w-14 h-14 text-primary" strokeWidth={3} />
				) : null}
			</div>
			<div>
				<h1 className="text-3xl text-center text-primary font-bold uppercase">{title}</h1>
				<span>
					<p className="text-center text-sm text-muted-foreground mt-2">{description}</p>
				</span>
				<Separator className="my-2" />
			</div>
		</div>
	);
}
