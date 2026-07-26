import { ReferralSettingsView } from "@/components/referral-settings";
import { AdminGuard } from "@/components/common/admin-guard";
import { Separator } from "@/components/ui/separator";
import { Share2 } from "lucide-react";

export default function ReferralPage() {
	return (
		<AdminGuard requiredPermission="users">
			<div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6 md:gap-6 md:py-6 lg:px-8">
				<div>
					<h1 className="flex items-center gap-2 text-2xl text-gray-800 font-semibold">
						<Share2 className="h-6 w-6" />
						Referal
					</h1>
					<p className="text-sm text-gray-600">Referal dasturi sozlamalari va umumiy statistika</p>
				</div>
				<Separator />
				<ReferralSettingsView />
			</div>
		</AdminGuard>
	);
}
