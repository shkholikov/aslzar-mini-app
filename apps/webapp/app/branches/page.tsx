"use client";

import { Header } from "@/components/common/header";
import { SectionCard } from "@/components/common/section-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { useTelegram } from "@/hooks/useTelegram";
import { CopyCheck, MapPinned, Phone, Store, StoreIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loading } from "@/components/common/loading";

export default function BranchesPage() {
	const tg = useTelegram();
	const [loading, setLoading] = useState(true);
	const [branches, setBranches] = useState<{ id: number; name: string; address: string; phone1?: string; phone2?: string }[]>([]);

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
													<ItemActions onClick={() => handleCopyPhone(branch.phone1)}>
														<CopyCheck className="size-4" />
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
													<ItemActions onClick={() => handleCopyPhone(branch.phone2)}>
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
