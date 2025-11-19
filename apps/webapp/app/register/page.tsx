"use client";

import { Header } from "@/components/common/header";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RippleButton } from "@/components/ui/shadcn-io/ripple-button";
import { FileCheck, FileXIcon, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";

export default function RegisterPage() {
	const form = useForm();
	return (
		<div className="pt-12">
			<Header title="Ro‘yxatdan o‘tish" description="ASLZAR platformasida ro‘yxatdan o‘ting va mijozimizga aylaning." icon={UserPlus} />
			<div className="m-2 border rounded-lg bg-muted/50 bg-transparent p-4">
				<FieldGroup>
					<FieldSet>
						<FieldLegend>Ro‘yxatdan o‘tish ma’lumotlari</FieldLegend>
						<FieldDescription>Iltimos, quyidagi ma’lumotlarni to‘ldiring</FieldDescription>
						<Separator />
						<FieldGroup>
							<Field>
								<FieldLabel>Ismingiz</FieldLabel>
								<Input placeholder="Faqat ismingizni kiriting" required />
							</Field>
							<Field>
								<FieldLabel>Familiyangiz</FieldLabel>
								<Input placeholder="Faqat familiyangizni kiriting" required />
							</Field>
							<Field>
								<FieldLabel>Telefon raqamingiz</FieldLabel>
								<Input placeholder="+998XXXXXXXXX" type="tel" required />
							</Field>
						</FieldGroup>
					</FieldSet>
					<Field orientation="vertical">
						<RippleButton type="submit" variant="outline">
							<FileCheck />
							Tasdiqlash
						</RippleButton>
						<RippleButton variant="outline" type="button">
							<FileXIcon />
							Tozalash
						</RippleButton>
					</Field>
				</FieldGroup>
			</div>
		</div>
	);
}
