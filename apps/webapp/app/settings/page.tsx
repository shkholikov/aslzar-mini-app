"use client";

import { Header } from "@/components/common/header";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/hooks/useUser";
import { Settings, UserCog } from "lucide-react";

export default function SettingsPage() {
	const { data, loading: dataLoading } = useUser();

	return (
		<div className="pt-12">
			<Header title="Sozlamalar" description="Profil va dastur sozlamalarini shu yerda o‘zgartirishingiz mumkin." icon={Settings} />
			<div className="m-2 border rounded-lg bg-muted/50 bg-transparent p-4">
				<h2 className="flex items-center gap-2 font-semibold text-xl mb-2">
					<UserCog className="size-5" />
					Akkaunt Sozlamalari
				</h2>

				{data?.code === 0 ? (
					<div>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="name">F.I.O</FieldLabel>
								<Input id="fio" autoComplete="off" disabled placeholder={`${data.familiya} ${data.imya} ${data.otchestvo}`} />
							</Field>
							<Field>
								<FieldLabel htmlFor="name">Mijoz ID</FieldLabel>
								<Input id="mijozId" autoComplete="off" disabled placeholder={data.clientId} />
							</Field>
						</FieldGroup>
					</div>
				) : (
					""
				)}

				<Separator className="my-4" />

				<div className="flex flex-col gap-3">
					<Label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950">
						<Checkbox
							id="toggle-2"
							defaultChecked
							className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
						/>
						<div className="grid gap-1.5 font-normal">
							<p className="text-sm leading-none font-medium">Kunlik yangiliklar</p>
							<p className="text-muted-foreground text-sm">
								Kunlik yangiliklar va yangilanishlar haqida xabarnoma olishni yoqish yoki o‘chirish mumkin.
							</p>
						</div>
					</Label>
					<Label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950">
						<Checkbox
							id="toggle-2"
							className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
						/>
						<div className="grid gap-1.5 font-normal">
							<p className="text-sm leading-none font-medium">To'lovlar eslatmasi</p>
							<p className="text-muted-foreground text-sm">
								To'lov sanasi yaqinlashganda yoki to'lov faoliyati bilan bog'liq eslatmalarni olish uchun ushbu xususiyatni yoqishingiz yoki
								o'chirishingiz mumkin.
							</p>
						</div>
					</Label>
					<Label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950">
						<Checkbox
							id="toggle-2"
							className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
						/>
						<div className="grid gap-1.5 font-normal">
							<p className="text-sm leading-none font-medium">Taklif qilinganlar</p>
							<p className="text-muted-foreground text-sm">
								Taklif qilgan odamingiz platformaga muvaffaqiyatli qo‘shilganida yoki faoliyat boshlaganida xabarnoma olishni yoqish yoki o‘chirish
								mumkin.
							</p>
						</div>
					</Label>
				</div>
			</div>
		</div>
	);
}
