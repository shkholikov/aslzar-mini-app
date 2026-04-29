import type { Response } from "express";
import { z } from "zod";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import { getSuggestionsCollection } from "../../db";

const SuggestionSchema = z.object({
	text: z.string().min(1)
});

/**
 * POST /v1/suggestions
 *
 * Stores a suggestion/complaint with the authenticated Telegram user info attached.
 */
export async function createSuggestionHandler(req: MiniAppAuthedRequest, res: Response): Promise<void> {
	const parsed = SuggestionSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
		return;
	}
	const text = parsed.data.text.trim();
	if (!text) {
		res.status(400).json({ error: "text cannot be empty" });
		return;
	}

	const user = req.miniAppUser!;
	try {
		const col = await getSuggestionsCollection();
		await col.insertOne({
			text,
			userId: String(user.id),
			...(user.first_name && { firstName: user.first_name }),
			...(user.last_name && { lastName: user.last_name }),
			...(user.username && { username: user.username }),
			createdAt: new Date()
		});
		res.status(200).json({ success: true });
	} catch (err) {
		console.error("[suggestions] insert failed", err);
		res.status(500).json({ error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" });
	}
}
