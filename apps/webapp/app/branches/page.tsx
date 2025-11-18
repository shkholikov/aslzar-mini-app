"use client";

import { Header } from "@/components/common/header";
import { Loading } from "@/components/common/loading";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { useTelegram } from "@/hooks/useTelegram";
import { ChevronRightIcon, MapPinned, Phone, Store, StoreIcon } from "lucide-react";
import { useEffect, useState } from "react";

export default function SettingsPage() {
	const tg = useTelegram();
	const [dataLoaded, setDataLoaded] = useState(false);
	const [branches, setBranches] = useState<{ id: number; name: string; address: string; phone1?: string; phone2?: string }[]>([]);

	const fetchBranchData = async () => {
		try {
			const response = await fetch("/api/branches");
			console.log(response);

			if (!response.ok) {
				throw new Error(`Failed to fetch branch data: ${response.status}`);
			}

			const responseData = await response.json();
			setBranches(responseData);
			setDataLoaded(true);
		} catch (error) {
			console.error("Error fetching 1C user data:", error);
		}
	};

	useEffect(() => {
		fetchBranchData();
	}, []);

	return (
		<div className="pt-12">
			<Header title="Filiallar" description="Filiallar va manzillar ro‘yhati shu yerda ko‘rsatiladi." icon={StoreIcon} />
			{dataLoaded ? (
				<div className="m-2 border rounded-lg bg-muted/50 bg-transparent p-4">
					<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
						<MapPinned className="size-5" />
						Bizning Filiallar
					</h2>
					<div className="text-sm text-gray-700 mb-2">
						<p>
							<strong>Bizning filiallar manzillari va telefon raqamlari:</strong>
						</p>
					</div>
					{branches?.map((branch) => {
						return (
							<Accordion key={branch.id} type="single" collapsible>
								<AccordionItem value="item-1">
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
									{branch.phone1 && (
										<AccordionContent>
											<Item asChild>
												<a href={`tel:${branch.phone1}`}>
													<ItemMedia>
														<Phone className="size-5" />
													</ItemMedia>
													<ItemContent>
														<ItemTitle>{branch.phone1}</ItemTitle>
													</ItemContent>
													<ItemActions>
														<ChevronRightIcon className="size-4" />
													</ItemActions>
												</a>
											</Item>
										</AccordionContent>
									)}
									{branch.phone2 && (
										<AccordionContent>
											<Item asChild>
												<a href={`tel:${branch.phone2}`}>
													<ItemMedia>
														<Phone className="size-5" />
													</ItemMedia>
													<ItemContent>
														<ItemTitle>{branch.phone2}</ItemTitle>
													</ItemContent>
													<ItemActions>
														<ChevronRightIcon className="size-4" />
													</ItemActions>
												</a>
											</Item>
										</AccordionContent>
									)}
									<Separator />
								</AccordionItem>
							</Accordion>
						);
					})}
				</div>
			) : (
				<div className="flex flex-col items-center">
					<Loading />
				</div>
			)}
		</div>
	);
}
