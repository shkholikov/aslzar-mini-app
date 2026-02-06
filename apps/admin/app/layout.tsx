import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminNav } from "@/components/admin-nav";
import "./globals.css";

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
				<div className="flex min-h-screen flex-col">
					<AdminNav />
					<div className="flex flex-1 justify-center">{children}</div>
				</div>
			</body>
		</html>
	);
}
