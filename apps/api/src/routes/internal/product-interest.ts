import type { Response } from "express";
import { z } from "zod";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import { getUserSession } from "../../db";
import { AmoCRMError, createProductInterestLead } from "../../integrations/amocrm";

const ProductInterestSchema = z.object({
	productId: z.string().min(1),
	productTitle: z.string().min(1),
	productDescription: z.string().optional(),
	productPrice: z.number().optional(),
	productUrl: z.string().optional()
});

/**
 * POST /v1/product-interest
 *
 * Caller (Mini App user) signals interest in a product. We resolve their phone
 * + name from the session and push a lead to AmoCRM. Same response shape as before.
 */
export async function productInterestHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const parsed = ProductInterestSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
		return;
	}
	const userId = String(req.miniAppUser!.id);
	const session = await getUserSession(userId);
	if (!session?.phone_number) {
		res.status(404).json({ error: "User not found or phone number not available. Please register in the app first." });
		return;
	}

	try {
		await createProductInterestLead({
			telegramUserId: userId,
			phone: session.phone_number,
			firstName: session.first_name ?? "",
			lastName: session.last_name ?? "",
			username: session.username,
			productId: parsed.data.productId,
			productTitle: parsed.data.productTitle,
			productDescription: parsed.data.productDescription,
			productPrice: parsed.data.productPrice,
			productUrl: parsed.data.productUrl
		});
		res.status(200).json({ success: true });
	} catch (err) {
		console.error("[product-interest] AmoCRM call failed", err);
		if (err instanceof AmoCRMError) {
			const status = err.status >= 500 ? 502 : 400;
			res.status(status).json({ error: "Failed to create lead in AmoCRM", details: err.bodyText });
			return;
		}
		res.status(500).json({ error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" });
	}
}
