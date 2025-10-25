import { BadgeCheckIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

export function Profile({ photo_url, first_name }: { photo_url: string; first_name: string }) {
	return (
		<>
			<Avatar className="rounded-lg w-12 h-12">
				<AvatarImage src={photo_url} alt="profile_avatar" />
				<AvatarFallback className="w-24 h-24 text-xl">PH</AvatarFallback>
			</Avatar>
			<div>
				<h1 className="text-xl text-center text-gray-800 font-semibold">Salom, {first_name} 👋</h1>
				<span>
					<h4 className="text-center font-semibold tracking-tight">ASLZAR platformasiga xush kelibsiz!</h4>
				</span>
				<div className="flex justify-center my-2">
					<Badge variant="secondary" className="bg-blue-500 text-white dark:bg-blue-600">
						<BadgeCheckIcon />
						Tasdiqlangan
					</Badge>
				</div>
				<Separator className="my-2" />
				<div className="flex h-5 items-center space-x-4 text-sm">
					<Badge variant="outline">Level: Gold</Badge>
					<Separator orientation="vertical" />
					<Badge variant="outline">Cachback: 20.000</Badge>
					<Separator orientation="vertical" />
					<Badge variant="outline">To'lovlar: 2</Badge>
				</div>
			</div>
		</>
	);
}
