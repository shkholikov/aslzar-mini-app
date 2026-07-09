import { SectionCards } from "@/components/section-cards";
import { UserGrowthChart } from "@/components/user-growth-chart";
import { AdminGuard } from "@/components/common/admin-guard";

export default function Home() {
	return (
		<AdminGuard requiredPermission="users">
			<div className="@container/main flex flex-1 flex-col gap-2">
				<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
					<SectionCards />
					<div className="px-4 lg:px-6">
						<UserGrowthChart />
					</div>
				</div>
			</div>
		</AdminGuard>
	);
}
