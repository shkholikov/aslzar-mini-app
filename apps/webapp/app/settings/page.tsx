"use client";

import { Header } from "@/components/common/header";
import { Settings } from "lucide-react";

export default function SettingsPage() {
	return (
		<>
			<Header title="Sozlamalar" description="Profil va dastur sozlamalarini shu yerda o‘zgartirishingiz mumkin." icon={Settings} />
		</>
	);
}
