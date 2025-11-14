import { Briefcase, Home, LayoutGrid, StoreIcon, Users } from "lucide-react";

export const navigationItems = [
	{ label: "asosiy", icon: Home, path: "/" },
	{ label: "moliyaviy", icon: Briefcase, path: "/finance" },
	{ label: "referral", icon: Users, path: "/referral" },
	{ label: "filiallar", icon: StoreIcon, path: "/branches" },
	{ label: "boshqa", icon: LayoutGrid, path: "/other" }
];
