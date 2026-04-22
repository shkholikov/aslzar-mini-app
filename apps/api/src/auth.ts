import { createHash } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { getApiKeysCollection } from "./db";

export type AuthenticatedApiKey = {
	id: string;
	name: string;
};

/**
 * Extended request type exposing the authenticated API key.
 * Route handlers can cast to this to access `req.apiKey`.
 */
export interface AuthedRequest extends Request {
	apiKey?: AuthenticatedApiKey;
}

function hashKey(key: string): string {
	return createHash("sha256").update(key).digest("hex");
}

function extractBearerToken(headerValue: string | undefined): string | null {
	if (!headerValue) return null;
	const match = /^Bearer\s+(\S+)\s*$/i.exec(headerValue);
	return match ? match[1] : null;
}

export async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
	const auth = req.header("authorization");
	const key = extractBearerToken(auth);

	if (!auth) {
		res.status(401).json({
			ok: false,
			error: {
				code: "missing_authorization",
				message: "Authorization header required. Use `Authorization: Bearer <your-api-key>`."
			}
		});
		return;
	}
	if (!key) {
		res.status(401).json({
			ok: false,
			error: {
				code: "invalid_authorization_scheme",
				message: "Authorization header must use the Bearer scheme: `Authorization: Bearer <your-api-key>`."
			}
		});
		return;
	}

	try {
		const col = await getApiKeysCollection();
		const doc = await col.findOne({ keyHash: hashKey(key) });

		if (!doc) {
			res.status(401).json({
				ok: false,
				error: { code: "invalid_api_key", message: "API key not recognized" }
			});
			return;
		}

		if (doc.disabled) {
			res.status(403).json({
				ok: false,
				error: { code: "disabled_api_key", message: "API key has been disabled" }
			});
			return;
		}

		col.updateOne({ _id: doc._id }, { $set: { lastUsedAt: new Date() } }).catch((err) => {
			console.error("[auth] lastUsedAt update failed", err);
		});

		(req as AuthedRequest).apiKey = { id: doc._id.toString(), name: doc.name };
		next();
	} catch (err) {
		console.error("[auth] lookup failed", err);
		res.status(500).json({
			ok: false,
			error: { code: "internal_error", message: "Unable to validate API key" }
		});
	}
}
