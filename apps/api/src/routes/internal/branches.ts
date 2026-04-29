import type { Response } from "express";
import type { MiniAppAuthedRequest } from "../../auth-miniapp";
import { OneCError, listBranches } from "../../integrations/aslzar1c";

/** GET /v1/branches — proxies 1C `subofficeList` */
export async function listBranchesHandler(_req: MiniAppAuthedRequest, res: Response): Promise<void> {
	try {
		const data = await listBranches();
		res.status(200).json(data);
	} catch (err) {
		console.error("[branches] 1C call failed", err);
		if (err instanceof OneCError) {
			res.status(502).json({ error: "Failed to fetch branches from 1C API", details: err.bodyText });
			return;
		}
		res.status(500).json({ error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" });
	}
}
