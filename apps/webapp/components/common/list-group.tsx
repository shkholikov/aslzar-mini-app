"use client";

import { Fragment, type ElementType, type ReactNode } from "react";
import Image from "next/image";
import NextLink from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import { useTelegram } from "@/hooks/useTelegram";
import { cn } from "@/lib/utils";
import { GLASS_CARD } from "@/lib/styles";

export interface ListGroupRow {
	/** React key; defaults to the row index. */
	id?: string;
	title: ReactNode;
	subtitle?: ReactNode;
	/** 3D icon from /public/icons. */
	iconImage?: string;
	/** Lucide icon, for brands that have no 3D icon (Instagram, Telegram). */
	icon?: ElementType;
	/** Anything else on the left, e.g. a news thumbnail. Wins over iconImage and icon. */
	media?: ReactNode;
	/** Muted text on the right, e.g. "12 ta". */
	value?: ReactNode;
	/** Gold pill on the right, e.g. "Gold" or "7 kun qoldi". */
	badge?: ReactNode;
	/** Internal paths go through NextLink; anything else is a plain link with an external arrow. */
	href?: string;
	onClick?: () => void;
}

const GLASS = `${GLASS_CARD} overflow-hidden`;

/**
 * One glass card holding rows split by a thin divider: icon, title, optional subtitle, optional
 * value or badge, then a chevron (internal), an external arrow (outside link) or nothing (not
 * tappable). Built on shadcn's Item group; tap handling matches components/common/link.tsx —
 * a heavy haptic, and NextLink for in-app paths so Telegram's Back button keeps working.
 */
export function ListGroup({
	rows,
	title,
	titleIcon,
	className
}: {
	rows: ListGroupRow[];
	title?: string;
	/** 3D icon before the title, same size and spacing as SectionCard's heading. */
	titleIcon?: string;
	className?: string;
}) {
	if (rows.length === 0) return null;
	return (
		<div className={cn("mx-2 my-2", className)}>
			{title && (
				<h2 className={cn("flex items-center gap-2 font-bold mb-2 px-1", titleIcon ? "text-xl" : "text-base")}>
					{titleIcon && <Image src={titleIcon} alt="" width={35} height={35} className="object-contain" sizes="35px" />}
					{title}
				</h2>
			)}
			<ItemGroup className={GLASS}>
				{rows.map((row, i) => (
					<Fragment key={row.id ?? i}>
						{i > 0 && <ItemSeparator className="bg-border/80" />}
						<div role="listitem">
							<ListGroupItem row={row} />
						</div>
					</Fragment>
				))}
			</ItemGroup>
		</div>
	);
}

/** A single row in the same glass card, for places that need one row on its own. */
export function ListCard({ className, ...row }: ListGroupRow & { className?: string }) {
	return <ListGroup rows={[row]} className={className} />;
}

function ListGroupItem({ row }: { row: ListGroupRow }) {
	const tg = useTelegram();
	const { href, onClick } = row;
	const internal = Boolean(href?.startsWith("/"));
	const external = Boolean(href) && !internal;
	const tappable = Boolean(href || onClick);

	const handleClick = () => {
		tg?.HapticFeedback?.impactOccurred("heavy");
		onClick?.();
	};

	const content = <RowContent row={row} trailing={external ? "external" : tappable ? "chevron" : "none"} />;
	const itemClass = cn("rounded-none px-4 py-3 gap-3 w-full text-left", tappable && "active:bg-muted/70 transition-colors");

	if (href && internal) {
		return (
			<Item asChild size="sm" className={itemClass}>
				<NextLink href={href} onClick={handleClick}>
					{content}
				</NextLink>
			</Item>
		);
	}
	if (href) {
		return (
			<Item asChild size="sm" className={itemClass}>
				<a href={href} onClick={handleClick}>
					{content}
				</a>
			</Item>
		);
	}
	if (onClick) {
		return (
			<Item asChild size="sm" className={itemClass}>
				<button type="button" onClick={handleClick}>
					{content}
				</button>
			</Item>
		);
	}
	return (
		<Item size="sm" className={itemClass}>
			{content}
		</Item>
	);
}

function RowContent({ row, trailing }: { row: ListGroupRow; trailing: "chevron" | "external" | "none" }) {
	const { media, iconImage, icon: Icon, title, subtitle, value, badge } = row;
	return (
		<>
			{(media || iconImage || Icon) && (
				<ItemMedia>
					{media ??
						(iconImage ? (
							<Image src={iconImage} alt="" width={35} height={35} className="size-[35px] object-contain" />
						) : Icon ? (
							<span className="size-[35px] flex items-center justify-center">
								<Icon className="size-[22px]" />
							</span>
						) : null)}
				</ItemMedia>
			)}
			<ItemContent className="min-w-0 gap-0.5">
				<ItemTitle className="w-full text-[15px] font-semibold leading-snug">{title}</ItemTitle>
				{subtitle && <ItemDescription className="text-xs leading-snug">{subtitle}</ItemDescription>}
			</ItemContent>
			{(value || badge || trailing !== "none") && (
				<ItemActions className="shrink-0">
					{value && <span className="text-[13px] text-muted-foreground">{value}</span>}
					{badge && (
						<Badge variant="default" className="bg-[#be9941] text-white">
							{badge}
						</Badge>
					)}
					{trailing === "chevron" && <ChevronRight aria-hidden className="size-[18px] text-muted-foreground" />}
					{trailing === "external" && <ArrowUpRight aria-hidden className="size-[18px] text-muted-foreground" />}
				</ItemActions>
			)}
		</>
	);
}
