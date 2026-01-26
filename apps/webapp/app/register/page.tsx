"use client";

import { Header } from "@/components/common/header";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { useTelegram } from "@/hooks/useTelegram";
import { FileCheck, FileXIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useEffect } from "react";
import { Loading } from "@/components/common/loading";

const registerSchema = z.object({
	firstName: z.string().min(3, "Ism kamida 3 ta harf bo‘lishi kerak"),
	lastName: z.string().min(3, "Familiya kamida 3 ta harf bo‘lishi kerak"),
	phone: z.string().regex(/^(\+998)(\d{9})$/, "Telefon raqami noto‘g‘ri: +998XXXXXXXXX formatida bo'lishi shart!")
});

type RegisterSchema = z.infer<typeof registerSchema>;

export default function RegisterPage() {
	const tg = useTelegram();
	const { data, loading } = useUser();
	const router = useRouter();

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		setValue
	} = useForm<RegisterSchema>({
		resolver: zodResolver(registerSchema),
		defaultValues: { phone: "+998" }
	});

	// Set phone number from Telegram user data
	useEffect(() => {
		if (data?.tgData?.phone_number) {
			const phone = data.tgData.phone_number.startsWith("+") ? data.tgData.phone_number : `+${data.tgData.phone_number}`;
			setValue("phone", phone);
		}
	}, [data, setValue]);

	const onSubmit = async (data: RegisterSchema) => {
		tg?.HapticFeedback?.impactOccurred("light");

		try {
			const response = await fetch("/api/users", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(data)
			});

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Ro'yxatdan o'tishda xatolik yuz berdi");
				return;
			}

			toast.success("Ro'yxatdan o'tish muvaffaqiyatli yakunlandi! Xush kelibsiz!");
			router.push("/");
		} catch (error) {
			console.error("Registration error:", error);
			toast.error("Ro'yxatdan o'tishda xatolik yuz berdi");
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="pt-12">
			<Header title="Ro‘yxatdan o‘tish" description="ASLZAR platformasida ro‘yxatdan o‘ting va mijozimizga aylaning." iconImage="/icons/paper.png" />

			{loading ? (
				<div className="flex flex-col items-center">
					<Loading />
				</div>
			) : (
				<div className="border-2 backdrop-blur-[4px] rounded-4xl bg-muted/50 bg-transparent m-2 p-4 shadow-sm">
					<FieldGroup>
						<FieldSet>
							<FieldLegend>Ro‘yxatdan o‘tish ma’lumotlari</FieldLegend>
							<FieldDescription>Iltimos, quyidagi ma’lumotlarni to‘ldiring</FieldDescription>
							<Separator />

							<FieldGroup>
								{/* FIRST NAME */}
								<Field>
									<FieldLabel>Ismingiz</FieldLabel>
									<Input placeholder="Faqat ismingizni kiriting" {...register("firstName")} />
									{errors.firstName && <p className="text-red-500 text-sm">{errors.firstName.message}</p>}
								</Field>

								{/* LAST NAME */}
								<Field>
									<FieldLabel>Familiyangiz</FieldLabel>
									<Input placeholder="Faqat familiyangizni kiriting" {...register("lastName")} />
									{errors.lastName && <p className="text-red-500 text-sm">{errors.lastName.message}</p>}
								</Field>

								{/* PHONE */}
								<Field>
									<FieldLabel>Telefon raqamingiz</FieldLabel>
									<Input placeholder="+998XXXXXXXXX" type="tel" {...register("phone")} disabled />
									{errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
								</Field>
							</FieldGroup>
						</FieldSet>

						<Field orientation="vertical" className="mt-4 space-y-2">
							<RippleButton type="submit" variant="outline">
								<FileCheck className="size-4 text-[#be9941]" />
								Tasdiqlash
							</RippleButton>

							<RippleButton
								variant="outline"
								type="button"
								onClick={() => {
									reset();
									// Restore phone number after reset
									if (data?.tgData?.phone_number) {
										const phone = data.tgData.phone_number.startsWith("+") ? data.tgData.phone_number : `+${data.tgData.phone_number}`;
										setValue("phone", phone);
									}
									tg?.HapticFeedback?.impactOccurred("light");
									toast.success("Barcha maydonlar tozalandi. Qaytadan maʼlumot kiriting.");
								}}
							>
								<FileXIcon className="size-4 text-[#be9941]" />
								Tozalash
							</RippleButton>
						</Field>
					</FieldGroup>
				</div>
			)}
		</form>
	);
}
