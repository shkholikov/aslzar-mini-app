"use client";

import { LucideIcon, BadgeInfo } from "lucide-react";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "../ui/item";
import { RippleButton } from "../ui/shadcn-io/ripple-button";

interface CallToActionItemProps {
	title: string;
	description: string;
	buttonText: string;
	onButtonClick: () => void;
	icon?: LucideIcon;
	variant?: "default" | "outline" | "muted";
}

export function CallToActionItem({
	title,
	description,
	buttonText,
	onButtonClick,
	icon: Icon = BadgeInfo,
	variant = "outline"
}: CallToActionItemProps) {
	return (
		<Item variant={variant} className="m-2 rounded-3xl shadow-sm">
			<ItemMedia>
				<Icon className="size-5" />
			</ItemMedia>
			<ItemContent>
				<ItemTitle>{title}</ItemTitle>
				<ItemDescription>{description}</ItemDescription>
			</ItemContent>
			<ItemActions>
				<RippleButton variant="outline" onClick={onButtonClick}>
					{buttonText}
				</RippleButton>
			</ItemActions>
		</Item>
	);
}
