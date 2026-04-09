import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminNav } from "@/components/admin-nav";
import { AdminContextProvider } from "@/components/common/admin-context";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import pkg from "../package.json";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"]
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"]
});

export const metadata: Metadata = {
	title: "Admin Dashboard - ASLZAR",
	description: "Aslzar Telegram boti foydalanuvchilarini boshqarish",
	keywords: ["ASLZAR", "admin", "dashboard", "telegram bot", "user management"],
	authors: [{ name: "ASLZAR" }],
	icons: {
		icon: "/images/aslzar-logo.png",
		apple: "/images/aslzar-logo.png"
	},
	robots: {
		index: false,
		follow: false
	}
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<AdminContextProvider>
					<div className="flex min-h-screen flex-col">
						<AdminNav />
						<div className="flex flex-1 w-full">
							<TooltipProvider>{children}</TooltipProvider>
						</div>
						<footer className="border-t border-border py-3 text-center text-xs text-muted-foreground">
							v{pkg.version}
						</footer>
					</div>
				</AdminContextProvider>
			</body>
		</html>
	);
}
