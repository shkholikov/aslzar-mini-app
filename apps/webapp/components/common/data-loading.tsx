import { Skeleton } from "../ui/skeleton";

export function DataLoading() {
	return (
		<div className="flex flex-col space-y-3 w-full px-4">
			<Skeleton className="h-[125px] rounded-xl w-full" />
			<div className="space-y-2 w-full">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-3/4" />
			</div>
		</div>
	);
}
