import type { Metadata, Viewport } from "next";
import { Geist_Mono, Radley } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { Menu } from "@/components/common/menu";
import { TelegramProvider } from "@/hooks/useTelegram";
import { UserProvider } from "@/hooks/useUser";
import { Toaster } from "sonner";
import { TelegramGuard } from "@/components/common/telegram-guard";

const geistSans = Radley({
	variable: "--font-geist-sans",
	subsets: ["latin"],
	weight: "400"
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"]
});

export const metadata: Metadata = {
	title: "ASLZAR - Sodiqlik va zamonaviy to'lovlar markazi",
	description:
		"ASLZAR — Sizning sodiqlik va zamonaviy to'lovlar markazingiz! Platformamiz orqali ishonchli, tez va xavfsiz to'lovlar amalga oshirasiz. Har bir tranzaksiyada doimiy keshbek va eksklyuziv takliflar sizni kutmoqda.",
	keywords: ["ASLZAR", "sodiqlik tizimi", "to'lovlar", "keshbek", "bonus", "telegram", "loyalty program"],
	authors: [{ name: "ASLZAR" }],
	openGraph: {
		title: "ASLZAR - Sodiqlik va zamonaviy to'lovlar markazi",
		description:
			"ASLZAR — Sizning sodiqlik va zamonaviy to'lovlar markazingiz! Platformamiz orqali ishonchli, tez va xavfsiz to'lovlar amalga oshirasiz.",
		type: "website"
	},
	twitter: {
		card: "summary",
		title: "ASLZAR - Sodiqlik va zamonaviy to'lovlar markazi",
		description: "ASLZAR — Sizning sodiqlik va zamonaviy to'lovlar markazingiz!"
	}
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1.0,
	minimumScale: 1.0,
	maximumScale: 1.0,
	userScalable: false
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<Script src="https://telegram.org/js/telegram-web-app.js?59" strategy="beforeInteractive" />
				<Script async src="https://telegram.org/js/telegram-widget.js?22" strategy="afterInteractive" />
				<Script src="/scripts/disableZoom.js" strategy="afterInteractive" />
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
				style={{
					paddingTop: "var(--tg-content-safe-area-inset-top)",
					paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + var(--tg-content-safe-area-inset-bottom, 0px) + 100px)",
					paddingLeft: "env(safe-area-inset-left, 0px)",
					paddingRight: "env(safe-area-inset-right, 0px)"
				}}
			>
				<TelegramProvider>
					<TelegramGuard>
						<UserProvider>
							{children}
							<div className="flex justify-center">
								<Menu />
								<Toaster
									position="top-center"
									mobileOffset={{
										top: "calc(var(--tg-content-safe-area-inset-top, 0px) + 50px)"
									}}
									offset={{
										top: "calc(env(safe-area-inset-top, 0px) + 16px)"
									}}
								/>
							</div>
						</UserProvider>
					</TelegramGuard>
				</TelegramProvider>
			</body>
		</html>
	);
}
