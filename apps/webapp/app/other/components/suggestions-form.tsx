"use client";

import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { useTelegram } from "@/hooks/useTelegram";
import { cn } from "@/lib/utils";
import { SendHorizontal } from "lucide-react";
import { goldButtonClass } from "@/components/common/button-variants";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const suggestionsSchema = z.object({
	text: z.string().min(3, "Matn kamida 3 ta belgidan iborat bo‘lishi kerak")
});

type SuggestionsSchema = z.infer<typeof suggestionsSchema>;

export function SuggestionsForm() {
	const tg = useTelegram();

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		reset
	} = useForm<SuggestionsSchema>({
		resolver: zodResolver(suggestionsSchema),
		defaultValues: { text: "" }
	});

	const onSubmit = async (formData: SuggestionsSchema) => {
		tg?.HapticFeedback?.impactOccurred("heavy");

		try {
			const user = tg?.initDataUnsafe?.user;
			const payload: { text: string; userId?: string; firstName?: string; lastName?: string; username?: string } = {
				text: formData.text.trim()
			};
			if (user?.id) payload.userId = user.id.toString();
			if (user?.first_name) payload.firstName = user.first_name;
			if (user?.last_name) payload.lastName = user.last_name;
			if (user?.username) payload.username = user.username;

			const response = await fetch("/api/suggestions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Yuborishda xatolik yuz berdi");
				return;
			}

			toast.success("Taklifingiz yoki shikoyatingiz qabul qilindi. Rahmat!");
			reset();
		} catch (error) {
			console.error("Suggestions submit error:", error);
			toast.error("Yuborishda xatolik yuz berdi");
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="m-2">
			<div className="border-2 backdrop-blur-[10px] rounded-4xl bg-muted/50 bg-transparent p-4 shadow-md">
				<FieldGroup>
					<FieldSet>
						<FieldLegend>Takliflar va shikoyatlar</FieldLegend>
						<FieldDescription>Taklif yoki shikoyatingizni yozing, biz tez orada ko‘rib chiqamiz</FieldDescription>

						<FieldGroup>
							<Field>
								<FieldLabel>Matn</FieldLabel>
								<textarea
									placeholder="Taklif yoki shikoyatingizni kiriting..."
									rows={4}
									{...register("text")}
									className={cn(
										"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none resize-y min-h-[80px] md:text-sm",
										"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
										"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
									)}
								/>
								{errors.text && <p className="text-red-500 text-sm">{errors.text.message}</p>}
							</Field>
						</FieldGroup>
						<Field orientation="vertical" className="mt-4 space-y-2">
							<RippleButton type="submit" variant="outline" className={goldButtonClass} disabled={isSubmitting}>
								<SendHorizontal className="size-4" />
								{isSubmitting ? "Yuborilmoqda..." : "Yuborish"}
							</RippleButton>
						</Field>
					</FieldSet>
				</FieldGroup>
			</div>
		</form>
	);
}
