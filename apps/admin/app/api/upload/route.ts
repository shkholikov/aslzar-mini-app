import { NextResponse, type NextRequest } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { isAuthenticatedRequest } from "@/lib/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const r2 = new S3Client({
	region: "auto",
	endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY_ID!,
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
	}
});

export async function POST(request: NextRequest) {
	try {
		const ok = await isAuthenticatedRequest(request);
		if (!ok) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get("file") as File | null;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json({ error: "Fayl hajmi juda katta. Maksimal 100 MB." }, { status: 400 });
		}

		if (!ALLOWED_TYPES.includes(file.type)) {
			return NextResponse.json(
				{
					error: "Noto'g'ri fayl turi. Ruxsat etilgan: JPEG, PNG, WebP, GIF, MP4, WebM, MOV."
				},
				{ status: 400 }
			);
		}

		const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80) || "file";
		const key = `products/${Date.now()}-${safeName}`;

		const buffer = Buffer.from(await file.arrayBuffer());

		await r2.send(
			new PutObjectCommand({
				Bucket: process.env.R2_BUCKET_NAME!,
				Key: key,
				Body: buffer,
				ContentType: file.type
			})
		);

		const url = `${process.env.R2_PUBLIC_URL}/${key}`;

		return NextResponse.json({ url });
	} catch (error) {
		console.error("Upload error:", error);
		return NextResponse.json(
			{
				error: "Upload failed",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
