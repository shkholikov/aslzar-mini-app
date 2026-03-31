import { Separator } from "@/components/ui/separator";
import { UsersList } from "@/components/users-list";
import { StatsCards } from "@/components/stats-cards";
import { Shield } from "lucide-react";
import { AdminGuard } from "@/components/common/admin-guard";

export default function Home() {
	return (
		<AdminGuard requiredPermission="users">
			<main className="flex min-h-screen w-full flex-col px-4 py-8 sm:px-6 lg:px-8">
				<div>
					<div className="flex flex-items justify-center pb-4">
						<Shield className="w-12 h-12 text-gray-800" />
					</div>
					<div>
						<h1 className="text-2xl text-center text-gray-800 font-semibold">Admin Dashboard</h1>
						<span>
							<p className="text-center mt-2">Aslzar Telegram boti foydalanuvchilarini boshqarish</p>
						</span>
						<Separator className="mt-2" />
						<h2 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Foydalanuvchilar</h2>
						<StatsCards />
						<UsersList />
					</div>
				</div>
			</main>
		</AdminGuard>
	);
}
