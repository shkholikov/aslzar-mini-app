import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
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
 * Acts as a lightweight "token exchange" endpoint for client-side uploads.
 * The actual file bytes are uploaded directly from the browser to Vercel Blob,
 * so we avoid the Vercel Function 4.5 MB body size limit.
 * Requires BLOB_READ_WRITE_TOKEN in env (set by Vercel when store is linked).
 */
export async function POST(request: NextRequest) {
	try {
		const ok = await isAuthenticatedRequest(request);
		if (!ok) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = (await request.json()) as HandleUploadBody;

		const jsonResponse = await handleUpload({
			request,
			body,
			onBeforeGenerateToken: async (pathname) => {
				// Enforce file type restrictions at the token level.
				// Max size is additionally checked on the client before upload.
				return {
					allowedContentTypes: ALLOWED_TYPES,
					addRandomSuffix: true,
				};
			},
			onUploadCompleted: async ({ blob }) => {
				console.log("Upload completed:", blob.url);
			},
		});

		return NextResponse.json(jsonResponse);
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
