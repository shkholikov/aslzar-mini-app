"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Old address of the personal-data page; everything it showed now lives on /profile. */
export default function SettingsPage() {
	const router = useRouter();
	useEffect(() => {
		router.replace("/profile");
	}, [router]);
	return null;
}
