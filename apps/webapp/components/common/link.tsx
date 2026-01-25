import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import type { ElementType, ReactNode } from "react";
import Image from "next/image";

type LinkItemProps = {
	title: ReactNode;
	href: string;
	icon?: ElementType;
	iconImage?: string;
	rightIcon?: ElementType;
	rightIconImage?: string;
};

type LinkItemPropsWithIcon = 
	| (LinkItemProps & { icon: ElementType; iconImage?: never })
	| (LinkItemProps & { iconImage: string; icon?: never });

export function Link({ title, href, icon: Icon, iconImage, rightIcon: RightIcon, rightIconImage }: LinkItemPropsWithIcon) {
	return (
		<div className="m-2">
			<Item variant="outline" size="sm" asChild className="backdrop-blur-[4px] bg-muted/50 bg-transparent rounded-4xl shadow-sm">
				<a href={href}>
					<ItemMedia>
						{iconImage ? (
							<Image src={iconImage} alt="" width={35} height={35} className="object-contain" />
						) : Icon ? (
							<Icon className="size-5" />
						) : null}
					</ItemMedia>
					<ItemContent>
						<ItemTitle>{title}</ItemTitle>
					</ItemContent>
					<ItemActions>
						{rightIconImage ? (
							<Image src={rightIconImage} alt="" width={35} height={35} className="object-contain" />
						) : RightIcon ? (
							<RightIcon className="size-4" />
						) : null}
					</ItemActions>
				</a>
			</Item>
		</div>
	);
}
