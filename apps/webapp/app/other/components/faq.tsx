"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useTelegram } from "@/hooks/useTelegram";

export interface FAQItem {
	id: string;
	question: string;
	answer: string;
}

interface FAQProps {
	items: FAQItem[];
}

export function FAQ({ items }: FAQProps) {
	const tg = useTelegram();

	const handleValueChange = (value: string | undefined) => {
		if (value) {
			tg?.HapticFeedback?.impactOccurred("heavy");
		}
	};

	return (
		<Accordion type="single" collapsible className="w-full" onValueChange={handleValueChange}>
			{items.map((item) => (
				<AccordionItem key={item.id} value={item.id}>
					<AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
					<AccordionContent>
						<p className="text-gray-700">{item.answer}</p>
					</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}
