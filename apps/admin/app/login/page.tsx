"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
	const router = useRouter();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!username.trim() || !password) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/admin/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ username, password })
			});

			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data.error || "Kirishda xatolik yuz berdi");
			}

			router.push("/");
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Kutilmagan xatolik");
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="flex min-h-screen w-full container flex-col py-8 px-4">
			<div className="mx-auto w-full max-w-md">
				<div className="flex flex-items justify-center pb-4">
					<Shield className="w-12 h-12 text-gray-800" />
				</div>
				<div>
					<h1 className="text-2xl text-center text-gray-800 font-semibold">Admin paneliga kirish</h1>
					<p className="text-center mt-2 text-gray-600">
						Aslzar admin boshqaruv paneliga kirish uchun login va parolni kiriting.
					</p>
					<Separator className="mt-2" />
				</div>

				<div className="mt-6 rounded-lg border border-border bg-card p-6 text-card-foreground">
					<form onSubmit={handleSubmit} className="space-y-5">
						<div className="space-y-2">
							<label htmlFor="username" className="block text-sm font-medium text-gray-700">
								Login
							</label>
							<Input
								id="username"
								type="text"
								autoComplete="username"
								placeholder="admin"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<label htmlFor="password" className="block text-sm font-medium text-gray-700">
								Parol
							</label>
							<Input
								id="password"
								type="password"
								autoComplete="current-password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>

						{error && <p className="text-sm text-destructive">{error}</p>}

						<Button
							type="submit"
							disabled={loading || !username.trim() || !password}
							className="w-full"
						>
							{loading ? "Kirilmoqda..." : "Kirish"}
						</Button>
					</form>
				</div>
			</div>
		</main>
	);
}

