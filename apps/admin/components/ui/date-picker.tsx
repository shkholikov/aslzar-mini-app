"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
	value: string; // YYYY-MM-DD or ""
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
}

function toDate(iso: string): Date | undefined {
	if (!iso) return undefined;
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(y, m - 1, d);
}

function toIso(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function formatDisplay(iso: string): string {
	const [y, m, d] = iso.split("-");
	return `${d}.${m}.${y}`;
}

export function DatePicker({ value, onChange, placeholder = "KK.OO.YYYY", disabled }: DatePickerProps) {
	const [open, setOpen] = React.useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					disabled={disabled}
					className={cn("w-[140px] justify-start text-left font-normal", !value && "text-muted-foreground")}
				>
					<CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
					{value ? formatDisplay(value) : placeholder}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={toDate(value)}
					onSelect={(date) => {
						onChange(date ? toIso(date) : "");
						setOpen(false);
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}
