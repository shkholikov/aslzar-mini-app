"use client";
import { QRCode } from "@/components/ui/shadcn-io/qr-code";

interface IQRCodeGenerator {
	href: string;
}

export function QRCodeGenerator({ href }: IQRCodeGenerator) {
	return <QRCode className="size-48 rounded border bg-white p-4 shadow-xs" data={href} />;
}

