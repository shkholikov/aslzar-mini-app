import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { isAuthenticatedRequest } from "@/lib/auth";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB for videos
const ALLOWED_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"video/mp4",
	"video/webm",
	"video/quicktime", // .mov
];

/**
 * POST /api/upload
 * Accepts multipart/form-data with field "file" (image or video).
 * Uploads to Vercel Blob (public store) and returns { url }.
 * Requires BLOB_READ_WRITE_TOKEN in env (set by Vercel when store is linked).
 */
export async function POST(request: NextRequest) {
	try {
		const ok = await isAuthenticatedRequest(request);
		if (!ok) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get("file");

		if (!file || !(file instanceof File)) {
			return NextResponse.json(
				{ error: "Missing or invalid file. Send a single file in the 'file' field." },
				{ status: 400 }
			);
		}

		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json(
				{ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
				{ status: 400 }
			);
		}

		const type = (file.type || "").toLowerCase();
		const allowed =
			ALLOWED_TYPES.includes(type) ||
			ALLOWED_TYPES.some((t) => type.startsWith(t.split("/")[0] + "/"));
		if (!allowed) {
			return NextResponse.json(
				{ error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
				{ status: 400 }
			);
		}

		const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
		const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80) || "file";
		const pathname = `products/${Date.now()}-${safeName}`;

		const blob = await put(pathname, file, {
			access: "public",
			addRandomSuffix: true,
			contentType: file.type || undefined,
			multipart: file.size > 5 * 1024 * 1024, // 5 MB+: use multipart for large files
		});

		return NextResponse.json({ url: blob.url }, { status: 200 });
	} catch (error) {
		console.error("Upload error:", error);
		return NextResponse.json(
			{
				error: "Upload failed",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
