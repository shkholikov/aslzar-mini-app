"use client";

import { Header } from "@/components/common/header";
import { SuggestionsForm } from "../other/components/suggestions-form";

export default function SuggestionsPage() {
	return (
		<div className="pt-12">
			<Header
				title="Taklif va shikoyatlar"
				description="Taklif yoki shikoyatlaringizni yuborish sahifasi"
				iconImage="/icons/discussion.png"
			/>
			<SuggestionsForm />
		</div>
	);
}

