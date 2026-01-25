"use client";

import { Header } from "@/components/common/header";
import { SectionCard } from "@/components/common/section-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { useTelegram } from "@/hooks/useTelegram";
import { CopyCheck, MapPinned, Phone, Store, Map, Clock, Navigation, ChevronRightIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loading } from "@/components/common/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

	// Convert Yandex Maps URL to embed URL
	// Format: https://yandex.ru/map-widget/v1/?orgid=235434378453&z=16
	function getYandexEmbedUrl(url?: string): string | null {
		if (!url) return null;
		const orgIdMatch = url.match(/org\/(\d+)/);
		if (orgIdMatch) {
			return `https://yandex.ru/map-widget/v1/?orgid=${orgIdMatch[1]}&z=16`;
		}
		return null;
	}

	// Simple Google Maps embed using address (no API key needed)
	function getGoogleEmbedUrlSimple(address?: string): string | null {
		if (!address) return null;
		const encodedAddress = encodeURIComponent(address);
		return `https://www.google.com/maps?q=${encodedAddress}&output=embed`;
	}

	return (
		<div className="pt-12">
			<Header title="Filiallar" description="Filiallar va manzillar ro'yhati shu yerda ko'rsatiladi." iconImage="/icons/location.png" />
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
									{(branch.yandexMaps || branch.googleMaps || branch.address) && (
										<AccordionContent>
											<div className="w-full rounded-lg overflow-hidden border border-border">
												{(() => {
													const hasYandex = branch.yandexMaps && getYandexEmbedUrl(branch.yandexMaps);
													const hasGoogle = (branch.googleMaps || branch.address) && getGoogleEmbedUrlSimple(branch.address);
													
													// Show tabs if both maps are available
													if (hasYandex && hasGoogle) {
														return (
															<Tabs defaultValue="yandex" className="w-full">
																<TabsList className="w-full grid grid-cols-2">
																	<TabsTrigger value="yandex">Yandex</TabsTrigger>
																	<TabsTrigger value="google">Google</TabsTrigger>
																</TabsList>
																<TabsContent value="yandex" className="mt-0">
																	<iframe
																		src={getYandexEmbedUrl(branch.yandexMaps)!}
																		width="100%"
																		height="300"
																		style={{ border: 0 }}
																		allowFullScreen
																		loading="lazy"
																		referrerPolicy="no-referrer-when-downgrade"
																		className="w-full"
																	/>
																</TabsContent>
																<TabsContent value="google" className="mt-0">
																	<iframe
																		src={getGoogleEmbedUrlSimple(branch.address)!}
																		width="100%"
																		height="300"
																		style={{ border: 0 }}
																		allowFullScreen
																		loading="lazy"
																		referrerPolicy="no-referrer-when-downgrade"
																		className="w-full"
																	/>
																</TabsContent>
															</Tabs>
														);
													}
													
													// Show single Yandex map
													if (hasYandex) {
														return (
															<iframe
																src={getYandexEmbedUrl(branch.yandexMaps)!}
																width="100%"
																height="300"
																style={{ border: 0 }}
																allowFullScreen
																loading="lazy"
																referrerPolicy="no-referrer-when-downgrade"
																className="w-full"
															/>
														);
													}
													
													// Show single Google map
													if (hasGoogle) {
														return (
															<iframe
																src={getGoogleEmbedUrlSimple(branch.address)!}
																width="100%"
																height="300"
																style={{ border: 0 }}
																allowFullScreen
																loading="lazy"
																referrerPolicy="no-referrer-when-downgrade"
																className="w-full"
															/>
														);
													}
													
													return null;
												})()}
											</div>
										</AccordionContent>
									)}
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
