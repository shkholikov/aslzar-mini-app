import type { ElementType, ReactNode } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface AlertCreatorProps {
	icon: ElementType;
	title: ReactNode;
	description: ReactNode;
}

export function Message({ icon: Icon, title, description }: AlertCreatorProps) {
	return (
		<div className="m-2">
			<Alert>
				<Icon />
				<AlertTitle>{title}</AlertTitle>
				<AlertDescription>{description}</AlertDescription>
			</Alert>
		</div>
	);
}
