import type { Response } from "express";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import { OneCError, listBonusPrograms } from "../../integrations/aslzar1c";

/** GET /v1/bonus-programs — proxies 1C `bonusProgram` */
export async function listBonusProgramsHandler(_req: MiniAppAuthedRequest, res: Response): Promise<void> {
	try {
		const data = await listBonusPrograms();
		res.status(200).json(data);
	} catch (err) {
		console.error("[bonus-programs] 1C call failed", err);
		if (err instanceof OneCError) {
			res.status(502).json({ error: "Failed to fetch bonus programs from 1C API", details: err.bodyText });
			return;
		}
		res.status(500).json({ error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" });
	}
}
