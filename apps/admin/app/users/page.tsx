import { UsersList } from "@/components/users-list";
import { AdminGuard } from "@/components/common/admin-guard";

export default function UsersPage() {
	return (
		<AdminGuard requiredPermission="users">
			<div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6 md:gap-6 md:py-6 lg:px-8">
				<UsersList />
			</div>
		</AdminGuard>
	);
}
