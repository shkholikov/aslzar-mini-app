"use client";

import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import type { ElementType, ReactNode } from "react";
import Image from "next/image";
import NextLink from "next/link";
import { ChevronRight } from "lucide-react";
import { useTelegram } from "@/hooks/useTelegram";

/** Props: title, href, and either icon (Lucide) or iconImage (path). Right icon defaults to ChevronRight; haptic feedback on click is always enabled. */
export type LinkProps = {
	title: ReactNode;
	href: string;
	/** Lucide icon component (use with icon, not iconImage) */
	icon?: ElementType;
	/** Image path for left icon (use with iconImage, not icon) */
	iconImage?: string;
	/** Right icon (default: ChevronRight) */
	rightIcon?: ElementType;
	rightIconImage?: string;
};

type LinkPropsWithIcon =
	| (LinkProps & { icon: ElementType; iconImage?: never })
	| (LinkProps & { iconImage: string; icon?: never });

const itemClassName = "backdrop-blur-[10px] bg-muted/50 bg-transparent rounded-4xl shadow-md border-2";

function LinkContent({
	icon: Icon,
	iconImage,
	title,
	rightIcon: RightIcon,
	rightIconImage
}: {
	icon?: ElementType;
	iconImage?: string;
	title: ReactNode;
	rightIcon?: ElementType;
	rightIconImage?: string;
}) {
	return (
		<>
			<ItemMedia>
				{iconImage ? <Image src={iconImage} alt="" width={35} height={35} className="object-contain" /> : Icon ? <Icon className="size-5" /> : null}
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
		</>
	);
}

export function Link({ title, href, icon: Icon, iconImage, rightIcon: RightIcon, rightIconImage }: LinkPropsWithIcon) {
	const tg = useTelegram();
	const isInternal = href.startsWith("/");
	const effectiveRightIcon = RightIcon ?? ChevronRight;
	const effectiveRightIconImage = rightIconImage;

	const handleClick = () => {
		tg?.HapticFeedback?.impactOccurred("heavy");
	};

	const content = (
		<LinkContent icon={Icon} iconImage={iconImage} title={title} rightIcon={effectiveRightIcon} rightIconImage={effectiveRightIconImage} />
	);

	const linkProps = { onClick: handleClick };
	const Wrapper = isInternal ? NextLink : "a";
	const wrapperProps = isInternal ? { href, ...linkProps } : { href, ...linkProps };

	return (
		<div className="m-2">
			<Item variant="outline" size="sm" asChild className={itemClassName}>
				<Wrapper {...wrapperProps}>{content}</Wrapper>
			</Item>
		</div>
	);
}
