import { DashboardView } from "@/components/dashboard/dashboard-view";
import { AdminGuard } from "@/components/common/admin-guard";

export default function Home() {
	return (
		<AdminGuard requiredPermission="users">
			<DashboardView />
		</AdminGuard>
	);
}
