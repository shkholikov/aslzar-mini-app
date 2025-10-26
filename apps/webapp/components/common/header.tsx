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
		<div className="m-2">
			<div className="flex flex-items justify-center pb-4">
				<Icon className="w-12 h-12 text-gray-800" />
			</div>
			<div>
				<h1 className="text-xl text-center text-gray-800 font-semibold">{title}</h1>
				<span>
					<p className="text-center text-sm text-muted-foreground mt-2">{description}</p>
				</span>
				<Separator className="my-2" />
			</div>
		</div>
	);
}
