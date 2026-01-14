"use client";

import { Separator } from "../ui/separator";
import type { ElementType } from "react";

interface HeaderProps {
	title: string;
	description: string;
	icon: ElementType;
}

export function Header({ title, description, icon: Icon }: HeaderProps) {
	return (
		<div>
			<div className="flex flex-items justify-center pb-4">
				<Icon className="w-14 h-14 text-primary" strokeWidth={3} />
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
