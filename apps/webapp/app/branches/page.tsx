"use client";

import { Header } from "@/components/common/header";
import { SectionCard } from "@/components/common/section-card";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { useTelegram } from "@/hooks/useTelegram";
import { Copy, Map, Phone, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loading } from "@/components/common/loading";

export default function BranchesPage() {
	const tg = useTelegram();
	const [loading, setLoading] = useState(true);
	const [branches, setBranches] = useState<
		{
			id: string;
			name: string;
			address: string;
			phone1?: string;
			phone2?: string;
			worktime?: string;
			yandexMaps?: string;
			googleMaps?: string;
			orientir?: string;
		}[]
	>([]);

	const fetchBranchData = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/branches");
			console.log(response);

			if (!response.ok) {
				throw new Error(`Failed to fetch branch data: ${response.status}`);
			}

			const responseData = await response.json();
			setBranches(responseData);
		} catch (error) {
			console.error("Error fetching branch data:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBranchData();
	}, []);

	function buildBranchShareText(branch: {
		name: string;
		address: string;
		phone1?: string;
		phone2?: string;
		worktime?: string;
		yandexMaps?: string;
		googleMaps?: string;
		orientir?: string;
	}) {
		const lines = [
			`ASLZAR filiali: ${branch.name}`,
			branch.address && `🗺️ Manzil: ${branch.address}`,
			branch.orientir && `📍 Mo'ljal: ${branch.orientir}`,
			branch.worktime && `🕒 Ish vaqti: ${branch.worktime.replace("|", " - ")}`,
			branch.phone1 && `📞 Telefon 1: ${branch.phone1}`,
			branch.phone2 && `📞 Telefon 2: ${branch.phone2}`,
			branch.yandexMaps && `🟡 Yandex xarita: ${branch.yandexMaps}`,
			branch.googleMaps && `🔵 Google xarita: ${branch.googleMaps}`
		].filter(Boolean) as string[];

		return lines.join("\n");
	}

	function handleCopyBranchInfo(branch: {
		name: string;
		address: string;
		phone1?: string;
		phone2?: string;
		worktime?: string;
		yandexMaps?: string;
		googleMaps?: string;
		orientir?: string;
	}) {
		tg?.HapticFeedback?.impactOccurred("heavy");

		const shareText = buildBranchShareText(branch);
		navigator.clipboard.writeText(shareText);
		toast.success("Filial maʼlumotlari nusxalandi!");
	}

	function handleShareBranchInfo(branch: {
		name: string;
		address: string;
		phone1?: string;
		phone2?: string;
		worktime?: string;
		yandexMaps?: string;
		googleMaps?: string;
		orientir?: string;
	}) {
		const shareText = buildBranchShareText(branch);
		tg?.HapticFeedback?.impactOccurred("heavy");

		// Prefer native Telegram share via link
		const shareUrl = `https://t.me/share/url?url=&text=${encodeURIComponent(shareText)}`;

		if (tg?.openTelegramLink) {
			tg.openTelegramLink(shareUrl);
		} else {
			// Fallback: copy to clipboard
			navigator.clipboard.writeText(shareText);
			toast.success("Filial maʼlumotlari nusxalandi! Ulashish uchun chatga joylashtiring.");
		}
	}

	function handleCopyPhone(phone?: string) {
		tg?.HapticFeedback?.impactOccurred("heavy");
		if (phone) {
			navigator.clipboard.writeText(phone);
			toast.success("Raqam nusxasi olindi!");
		}
	}

	function handleOpenMap(url?: string) {
		if (!url) return;
		tg?.HapticFeedback?.impactOccurred("heavy");
		tg?.openLink(url, { try_instant_view: true });
	}

	return (
		<div className="pt-12">
			<Header title="Filiallar" description="Filiallar va manzillar ro'yhati" iconImage="/icons/location.png" />
			{loading ? (
				<Loading />
			) : (
				<SectionCard iconImage="/icons/bank.png" title="Bizning Filiallar">
					<div className="flex flex-col gap-3">
						{branches?.map((branch) => {
							const primaryPhone = branch.phone1 || branch.phone2;
							const primaryMap = branch.yandexMaps || branch.googleMaps;

							return (
								<Item key={branch.id} variant="outline" className="border-2 backdrop-blur-[10px] rounded-3xl bg-muted/50 shadow-md px-4 py-3">
									<ItemContent>
										<div className="flex items-center justify-between gap-2">
											<ItemTitle className="font-semibold text-base">{branch.name}</ItemTitle>
											<div className="flex items-center gap-1.5">
												<button
													type="button"
													onClick={() => handleCopyBranchInfo(branch)}
													className="inline-flex items-center justify-center rounded-full border border-border bg-background/60 p-1.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground active:bg-[#be9941]/15 active:scale-95 transition-colors transition-transform"
													aria-label="Filial ma'lumotlarini nusxalash"
												>
													<Copy className="size-4" />
												</button>
												<button
													type="button"
													onClick={() => handleShareBranchInfo(branch)}
													className="inline-flex items-center justify-center rounded-full border border-border bg-background/60 p-1.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground active:bg-[#be9941]/15 active:scale-95 transition-colors transition-transform"
													aria-label="Filial ma'lumotlarini yuborish"
												>
													<Send className="size-4" />
												</button>
											</div>
										</div>
										<p className="text-sm text-muted-foreground mt-1 line-clamp-2">
											{branch.address ? `🗺️ ${branch.address}` : "Manzil ko'rsatilmagan"}
										</p>

										{(branch.orientir || branch.worktime) && (
											<div className="mt-2 space-y-1 text-xs text-muted-foreground">
												{branch.orientir && <p>📍 {branch.orientir}</p>}
												{branch.worktime && <p>🕒 {branch.worktime.replace("|", " - ")}</p>}
											</div>
										)}

										{primaryMap || primaryPhone ? (
											<div className="mt-3 flex gap-2">
												{primaryMap && (
													<button
														type="button"
														onClick={() => handleOpenMap(primaryMap)}
														className="flex-1 inline-flex items-center justify-center rounded-2xl bg-[#be9941] text-white text-sm py-2 active:scale-[0.97] active:bg-[#a88436] transition-transform transition-colors"
													>
														<Map className="size-4 mr-1" />
														Xarita
													</button>
												)}
												{primaryPhone && (
													<a
														href={`tel:${primaryPhone}`}
														onClick={() => handleCopyPhone(primaryPhone)}
														className="flex-1 inline-flex items-center justify-center rounded-2xl border border-[#be9941] text-[#be9941] text-sm py-2 active:scale-[0.97] active:bg-[#be9941]/10 transition-transform transition-colors"
													>
														<Phone className="size-4 mr-1" />
														Qoʻngʻiroq
													</a>
												)}
											</div>
										) : (
											<p className="mt-3 text-xs text-muted-foreground">Aloqa maʼlumotlari mavjud emas</p>
										)}
									</ItemContent>
								</Item>
							);
						})}
					</div>
				</SectionCard>
			)}
		</div>
	);
}
