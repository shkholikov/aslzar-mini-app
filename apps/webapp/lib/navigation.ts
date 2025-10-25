import { Briefcase, Home, LayoutGrid, Settings, Users } from "lucide-react";

export const navigationItems = [
	{ label: "asosiy", icon: Home, path: "/" },
	{ label: "moliyaviy", icon: Briefcase, path: "/finance" },
	{ label: "referral", icon: Users, path: "/referral" },
	{ label: "boshqa", icon: LayoutGrid, path: "/other" },
	{ label: "sozlama", icon: Settings, path: "/settings" }
];
