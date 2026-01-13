"use client";

import { Header } from "@/components/common/header";
import { SectionCard } from "@/components/common/section-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { useTelegram } from "@/hooks/useTelegram";
import { CopyCheck, MapPinned, Phone, Store, StoreIcon, Map, Clock, Navigation, ChevronRightIcon } from "lucide-react";
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

	function handleCopyPhone(phone?: string) {
		tg?.HapticFeedback?.impactOccurred("light");
		if (phone) {
			navigator.clipboard.writeText(phone);
			toast.success("Raqam nusxasi olindi!");
		}
	}

	function handleOpenMap(url?: string) {
		if (!url) return;
		tg?.HapticFeedback?.impactOccurred("light");
		tg?.openLink(url, { try_instant_view: true });
	}

	return (
		<div className="pt-12">
			<Header title="Filiallar" description="Filiallar va manzillar ro'yhati shu yerda ko'rsatiladi." icon={StoreIcon} />
			{loading ? (
				<Loading />
			) : (
				<SectionCard icon={MapPinned} title="Bizning Filiallar">
					<p className="mb-2">
						<strong>Bizning filiallar manzillari va telefon raqamlari:</strong>
					</p>
					<Accordion type="single" collapsible>
						{branches?.map((branch) => {
							return (
								<AccordionItem key={branch.id} value={`branch-${branch.id}`}>
									<AccordionTrigger>{branch.name}</AccordionTrigger>
									<AccordionContent>
										<Item>
											<ItemMedia>
												<Store className="size-5" />
											</ItemMedia>
											<ItemContent>
												<ItemTitle>{branch.address || "nomaʼlum"}</ItemTitle>
											</ItemContent>
										</Item>
									</AccordionContent>
									{branch.orientir && (
										<AccordionContent>
											<Item>
												<ItemMedia>
													<Navigation className="size-5" />
												</ItemMedia>
												<ItemContent>
													<ItemTitle>{branch.orientir}</ItemTitle>
												</ItemContent>
											</Item>
										</AccordionContent>
									)}
									{branch.worktime && (
										<AccordionContent>
											<Item>
												<ItemMedia>
													<Clock className="size-5" />
												</ItemMedia>
												<ItemContent>
													<ItemTitle>{branch.worktime.replace("|", " - ")}</ItemTitle>
												</ItemContent>
											</Item>
										</AccordionContent>
									)}
									{branch.googleMaps && (
										<AccordionContent>
											<Item asChild variant="outline">
												<a type="button" onClick={() => handleOpenMap(branch.googleMaps)} className="w-full text-left cursor-pointer">
													<ItemMedia>
														<Map className="size-5" />
													</ItemMedia>
													<ItemContent>
														<ItemTitle>Google xaritada koʻrish</ItemTitle>
													</ItemContent>
													<ItemActions>
														<ChevronRightIcon className="size-4" />
													</ItemActions>
												</a>
											</Item>
										</AccordionContent>
									)}
									{branch.yandexMaps && (
										<AccordionContent>
											<Item asChild variant="outline">
												<a type="button" onClick={() => handleOpenMap(branch.yandexMaps)} className="w-full text-left cursor-pointer">
													<ItemMedia>
														<Map className="size-5" />
													</ItemMedia>
													<ItemContent>
														<ItemTitle>Yandex xaritada koʻrish</ItemTitle>
													</ItemContent>
													<ItemActions>
														<ChevronRightIcon className="size-4" />
													</ItemActions>
												</a>
											</Item>
										</AccordionContent>
									)}
									{branch.phone1 && (
										<AccordionContent>
											<Item asChild variant="outline">
												<a href={`tel:${branch.phone1}`} onClick={() => handleCopyPhone(branch.phone1)}>
													<ItemMedia>
														<Phone className="size-5" />
													</ItemMedia>
													<ItemContent>
														<ItemTitle>{branch.phone1}</ItemTitle>
													</ItemContent>
													<ItemActions>
														<CopyCheck className="size-4" />
													</ItemActions>
												</a>
											</Item>
										</AccordionContent>
									)}
									{branch.phone2 && (
										<AccordionContent>
											<Item asChild variant="outline">
												<a href={`tel:${branch.phone2}`} onClick={() => handleCopyPhone(branch.phone2)}>
													<ItemMedia>
														<Phone className="size-5" />
													</ItemMedia>
													<ItemContent>
														<ItemTitle>{branch.phone2}</ItemTitle>
													</ItemContent>
													<ItemActions>
														<CopyCheck className="size-4" />
													</ItemActions>
												</a>
											</Item>
										</AccordionContent>
									)}
								</AccordionItem>
							);
						})}
					</Accordion>
				</SectionCard>
			)}
		</div>
	);
}
