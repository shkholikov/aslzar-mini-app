import { Badge } from "../ui/badge";
import { Spinner } from "../ui/spinner";

export function Loading() {
	return (
		<div className="flex justify-center my-2">
			<Badge variant="outline">
				<Spinner />
				Yuklanmoqda...
			</Badge>
		</div>
	);
}
