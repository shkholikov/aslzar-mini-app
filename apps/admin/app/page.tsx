import { Separator } from "@/components/ui/separator";
import { UsersList } from "@/components/users-list";
import { Shield } from "lucide-react";

export default function Home() {
	return (
		<main className="flex min-h-screen w-full container flex-col py-8 px-4">
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
					<UsersList />
				</div>
			</div>
		</main>
	);
}
