import { ChevronRightIcon } from "lucide-react";
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import type { ElementType, ReactNode } from "react";

type LinkItemProps = {
	title: ReactNode;
	href: string;
	icon: ElementType;
	rightIcon?: ElementType;
};

export function Link({ title, href, icon: Icon, rightIcon: RightIcon = ChevronRightIcon }: LinkItemProps) {
	return (
		<div className="m-2">
			<Item variant="outline" size="sm" asChild className="backdrop-blur-[4px] bg-muted/50 bg-transparent rounded-4xl shadow-sm">
				<a href={href}>
					<ItemMedia>
						<Icon className="size-5" />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>{title}</ItemTitle>
					</ItemContent>
					<ItemActions>
						<RightIcon className="size-4" />
					</ItemActions>
				</a>
			</Item>
		</div>
	);
}
