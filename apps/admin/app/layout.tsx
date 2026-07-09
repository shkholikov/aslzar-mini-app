import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminShell } from "@/components/admin-shell";
import { AdminContextProvider } from "@/components/common/admin-context";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

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
					<TooltipProvider>
						<AdminShell>{children}</AdminShell>
					</TooltipProvider>
				</AdminContextProvider>
			</body>
		</html>
	);
}
