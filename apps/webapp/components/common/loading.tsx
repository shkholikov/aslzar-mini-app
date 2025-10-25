import { Badge } from "../ui/badge";
import { Spinner } from "../ui/spinner";

export function Loading() {
	return (
		<>
			<Badge variant="outline">
				<Spinner />
				Yuklanmoqda...
			</Badge>
		</>
	);
}
