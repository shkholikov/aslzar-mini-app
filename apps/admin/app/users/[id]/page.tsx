import { UserProfile } from "@/components/user-profile";
import { AdminGuard } from "@/components/common/admin-guard";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	return (
		<AdminGuard requiredPermission="users">
			<div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6 md:gap-6 md:py-6 lg:px-8">
				<UserProfile userKey={id} />
			</div>
		</AdminGuard>
	);
}
