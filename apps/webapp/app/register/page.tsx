"use client";

import { Header } from "@/components/common/header";
import { SectionCard } from "@/components/common/section-card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { goldButtonClass } from "@/components/common/button-variants";
import { useTelegram } from "@/hooks/useTelegram";
import { FileCheck, Home, Loader2, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useCallback, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import confetti from "canvas-confetti";

const registerSchema = z.object({
	firstName: z.string().min(3, "Ism kamida 3 ta harf bo'lishi kerak"),
	lastName: z.string().min(3, "Familiya kamida 3 ta harf bo'lishi kerak"),
	phone: z.string().regex(/^(\+998)(\d{9})$/, "Telefon raqami noto'g'ri: +998XXXXXXXXX formatida bo'lishi shart!")
});

type RegisterSchema = z.infer<typeof registerSchema>;

type Step = "share_phone" | "form" | "verification_success" | "registration_success";

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 40;

export default function RegisterPage() {
	const tg = useTelegram();
	const { loading: userLoading, refreshUserData } = useUser();
	const router = useRouter();

	const [step, setStep] = useState<Step>("share_phone");
	const [contactLoading, setContactLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const contactHandledRef = useRef(false);
	const contactRequestedOffRef = useRef<(() => void) | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue
	} = useForm<RegisterSchema>({
		resolver: zodResolver(registerSchema),
		defaultValues: { phone: "+998" }
	});

	const userId = tg?.initDataUnsafe?.user?.id?.toString();

	const fetchUserAfterContact = useCallback(async (): Promise<{
		code?: number;
		tgData?: { phone_number?: string };
	} | null> => {
		if (!userId) return null;
		try {
			const response = await fetch(`/api/users?userId=${userId}`);
			if (!response.ok) return null;
			const data = await response.json();
			return data;
		} catch {
			return null;
		}
	}, [userId]);

	const pollUntilUserLoaded = useCallback(() => {
		let attempts = 0;

		const poll = async () => {
			const result = await fetchUserAfterContact();
			if (result != null) {
				setContactLoading(false);
				const phone = result.tgData?.phone_number;
				const normalized = phone ? (phone.startsWith("+") ? phone : `+${phone}`) : null;
				if (result.code === 0) {
					setStep("verification_success");
				} else {
					setValue("phone", normalized ?? "+998");
					setStep("form");
				}
				if (pollTimeoutRef.current) {
					clearTimeout(pollTimeoutRef.current);
					pollTimeoutRef.current = null;
				}
				return;
			}
			attempts++;
			if (attempts < POLL_MAX_ATTEMPTS) {
				pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
			} else {
				setContactLoading(false);
				toast.error("Vaqt tugadi. Iltimos, qaytadan urinib ko'ring.");
			}
		};

		poll();
	}, [fetchUserAfterContact, setValue]);

	const requestContact = useCallback(() => {
		const webApp = tg as unknown as {
			requestContact?: (callback?: (shared: boolean) => void) => void;
			onEvent?: (event: string, handler: (payload: { status?: string }) => void) => (() => void) | void;
		};
		if (!webApp?.requestContact) {
			toast.error("Telefon raqamini ulashish ushbu qurilmada qo'llab-quvvatlanmaydi.");
			return;
		}

		contactHandledRef.current = false;
		setContactLoading(true);

		// Bot API 6.9+: contactRequested event with status "sent" | "cancelled"
		const off = webApp.onEvent?.("contactRequested", (payload) => {
			if (contactHandledRef.current) return;
			contactHandledRef.current = true;
			contactRequestedOffRef.current?.();

			if (payload.status === "sent") {
				pollUntilUserLoaded();
			} else if (payload.status === "cancelled") {
				setContactLoading(false);
			}
		});
		contactRequestedOffRef.current = off ?? null;

		webApp.requestContact((shared) => {
			// Fallback when contactRequested event is not supported
			if (contactHandledRef.current) return;
			contactHandledRef.current = true;
			contactRequestedOffRef.current?.();

			if (shared) {
				pollUntilUserLoaded();
			} else {
				setContactLoading(false);
			}
		});
	}, [tg, pollUntilUserLoaded]);

	useEffect(() => {
		return () => {
			if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
			contactRequestedOffRef.current?.();
		};
	}, []);

	// Confetti on success (verification or registration)
	useEffect(() => {
		if (step !== "verification_success" && step !== "registration_success") return;
		const opts = { particleCount: 80, spread: 70, origin: { y: 0.6 } };
		confetti(opts);
		const t = setTimeout(() => confetti({ ...opts, particleCount: 40, scalar: 0.8 }), 200);
		return () => clearTimeout(t);
	}, [step]);

	const onSubmit = async (formData: RegisterSchema) => {
		setIsSubmitting(true);
		try {
			const response = await fetch("/api/users", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...formData, ...(userId && { userId }) })
			});

			if (!response.ok) {
				const errorData = await response.json();
				toast.error(errorData.error || "Ro'yxatdan o'tishda xatolik yuz berdi");
				return;
			}

			await refreshUserData();
			setStep("registration_success");
		} catch (error) {
			console.error("Registration error:", error);
			toast.error("Ro'yxatdan o'tishda xatolik yuz berdi");
		} finally {
			setIsSubmitting(false);
		}
	};

	const goHome = () => {
		tg?.HapticFeedback?.impactOccurred("heavy");
		refreshUserData();
		router.push("/");
	};

	if (userLoading && step === "share_phone") {
		return (
			<div className="pt-12">
				<Header title="Ro'yxatdan o'tish" description="ASLZAR platformasida ro'yxatdan o'ting" iconImage="/icons/paper.png" />
				<SectionCard iconImage="/icons/user.png" title="Ro'yxatdan o'tish">
					<Skeleton className="h-3 w-full mb-1" />
					<Skeleton className="h-3 w-3/4 mb-4" />
					<Skeleton className="h-10 w-full rounded-md" />
				</SectionCard>
			</div>
		);
	}

	return (
		<div className="pt-12">
			<Header title="Ro'yxatdan o'tish" description="ASLZAR platformasida ro'yxatdan o'ting va mijozimizga aylaning" iconImage="/icons/paper.png" />

			{step === "share_phone" && (
				<SectionCard iconImage="/icons/user.png" title="Ro'yxatdan o'tish">
					{contactLoading ? (
						<div className="flex flex-col items-center py-6 gap-3">
							<Loader2 className="size-8 animate-spin text-muted-foreground" />
							<p className="text-muted-foreground text-sm">Telefon raqamingiz qabul qilinmoqda...</p>
						</div>
					) : (
						<>
							<p className="text-muted-foreground mb-4">Ro&apos;yxatdan o&apos;tish uchun avval telefon raqamingizni ulashing.</p>
							<RippleButton
								variant="outline"
								size="default"
								className={`w-full sm:w-auto ${goldButtonClass}`}
								onClick={() => {
									tg?.HapticFeedback?.impactOccurred("heavy");
									requestContact();
								}}
							>
								<Phone className="size-4 shrink-0" />
								Telefon raqamini ulashish
							</RippleButton>
						</>
					)}
				</SectionCard>
			)}

			{step === "form" && (
				<form onSubmit={handleSubmit(onSubmit)}>
					<SectionCard iconImage="/icons/user.png" title="Ro'yxatdan o'tish ma'lumotlari">
						<FieldGroup>
							<FieldSet>
								<FieldDescription>Iltimos, ism va familiyangizni kiriting</FieldDescription>
								<Separator />
								<FieldGroup>
									<Field>
										<FieldLabel>Ismingiz</FieldLabel>
										<Input placeholder="Faqat ismingizni kiriting" {...register("firstName")} />
										{errors.firstName && <p className="text-red-500 text-sm">{errors.firstName.message}</p>}
									</Field>
									<Field>
										<FieldLabel>Familiyangiz</FieldLabel>
										<Input placeholder="Faqat familiyangizni kiriting" {...register("lastName")} />
										{errors.lastName && <p className="text-red-500 text-sm">{errors.lastName.message}</p>}
									</Field>
									<Field>
										<FieldLabel>Telefon raqamingiz</FieldLabel>
										<Input placeholder="+998XXXXXXXXX" type="tel" {...register("phone")} disabled />
										{errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
									</Field>
								</FieldGroup>
							</FieldSet>
							<Field orientation="vertical" className="mt-4">
								<RippleButton
									type="submit"
									variant="outline"
									className={goldButtonClass}
									disabled={isSubmitting}
									onClick={() => tg?.HapticFeedback?.impactOccurred("heavy")}
								>
									{isSubmitting ? (
										<>
											<Loader2 className="size-4 shrink-0 animate-spin" />
											Yuklanmoqda...
										</>
									) : (
										<>
											<FileCheck className="size-4" />
											Tasdiqlash
										</>
									)}
								</RippleButton>
							</Field>
						</FieldGroup>
					</SectionCard>
				</form>
			)}

			{step === "verification_success" && (
				<SectionCard iconImage="/icons/user.png" title="Hisobingiz tasdiqlandi">
					<div className="text-center">
						<p className="text-muted-foreground text-sm mb-4">Endi platformaning barcha imkoniyatlaridan foydalanishingiz mumkin.</p>
						<div className="flex justify-center">
							<RippleButton variant="outline" className={goldButtonClass} onClick={goHome}>
								<Home className="size-4" />
								Bosh sahifaga o&apos;tish
							</RippleButton>
						</div>
					</div>
				</SectionCard>
			)}

			{step === "registration_success" && (
				<SectionCard iconImage="/icons/user.png" title="Muvaffaqiyatli tasdiqlandi">
					<div className="text-center">
						<p className="text-muted-foreground text-sm mb-4">
							Siz muvaffaqiyatli tasdiqlandingiz! Xush kelibsiz! Endi platformaning barcha imkoniyatlaridan foydalanishingiz mumkin.
						</p>
						<div className="flex justify-center">
							<RippleButton variant="outline" className={goldButtonClass} onClick={goHome}>
								<Home className="size-4" />
								Bosh sahifaga o&apos;tish
							</RippleButton>
						</div>
					</div>
				</SectionCard>
			)}
		</div>
	);
}
