"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface FAQItem {
	id: string;
	question: string;
	answer: string;
}

interface FAQProps {
	items: FAQItem[];
}

export function FAQ({ items }: FAQProps) {
	return (
		<Accordion type="single" collapsible className="w-full">
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
