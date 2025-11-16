"use client";

import { Header } from "@/components/common/header";
import { Link } from "@/components/common/link";
import { Loading } from "@/components/common/loading";
import { MapIcon, MapPinned, StoreIcon } from "lucide-react";
import { useEffect, useState } from "react";

export default function SettingsPage() {
	const [dataLoaded, setDataLoaded] = useState(false);
	const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

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
							<strong>Bizning filiallar ro’yhati:</strong>
						</p>
					</div>
					{branches?.map((branch) => {
						return (
							<div key={branch.id} className="my-2">
								<Link title={branch.name} href={""} icon={MapIcon} />
							</div>
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
