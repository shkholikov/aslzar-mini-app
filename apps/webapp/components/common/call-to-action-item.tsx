"use client";

import { LucideIcon } from "lucide-react";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "../ui/item";
import { RippleButton } from "../ui/shadcn-io/ripple-button";
import Image from "next/image";

interface CallToActionItemProps {
	title: string;
	description: string;
	buttonText: string;
	onButtonClick: () => void;
	icon?: LucideIcon;
	iconImage?: string;
	variant?: "default" | "outline" | "muted";
}

type CallToActionItemPropsWithIcon = 
	| (CallToActionItemProps & { icon: LucideIcon; iconImage?: never })
	| (CallToActionItemProps & { iconImage: string; icon?: never });

export function CallToActionItem({
	title,
	description,
	buttonText,
	onButtonClick,
	icon: Icon,
	iconImage,
	variant = "outline"
}: CallToActionItemPropsWithIcon) {
	return (


		<Item variant={variant} className="m-2 backdrop-blur-[4px] bg-muted/50 bg-transparent rounded-4xl shadow-sm border-2">
			<ItemMedia>
				{iconImage ? (
					<Image src={iconImage} alt={title} width={35} height={35} className="object-contain" />
				) : Icon ? (
					<Icon className="size-5" />
				) : null}
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
