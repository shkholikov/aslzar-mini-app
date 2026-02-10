import { MongoClient } from "mongodb";
import crypto from "crypto";
import { cookies } from "next/headers";

// MongoDB configuration (reuse same DB, separate collection for admin users)
const dbUri = process.env.MONGO_DB_CONNECTION_STRING || "";
const dbName = process.env.MONGO_DB_NAME || "";
const adminUsersCollection = process.env.MONGO_DB_COLLECTION_ADMIN_USERS || "admin_users";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

type AdminUser = {
	_id?: string;
	username: string;
	passwordHash: string;
};

function getMongoClient() {
	if (!dbUri || !dbName) {
		throw new Error("MongoDB configuration is missing for admin auth");
	}
	return new MongoClient(dbUri);
}

export async function findAdminByUsername(username: string): Promise<AdminUser | null> {
	const client = getMongoClient();
	try {
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<AdminUser>(adminUsersCollection);
		const user = await coll.findOne({ username });
		return user;
	} finally {
		await client.close();
	}
}

// Password hashing using bcryptjs. This module is lightweight and works well in Next.js.
// Make sure to add `bcryptjs` (and optionally `@types/bcryptjs`) to dependencies.
// We keep the import dynamic to avoid issues in edge runtimes.
async function getBcrypt() {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const bcrypt = require("bcryptjs") as typeof import("bcryptjs");
	return bcrypt;
}

export async function hashPassword(plain: string): Promise<string> {
	const bcrypt = await getBcrypt();
	const saltRounds = 10;
	return bcrypt.hash(plain, saltRounds);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
	const bcrypt = await getBcrypt();
	return bcrypt.compare(plain, hash);
}

// Simple HMAC-signed session token: value.expires.signature
function getSessionSecret() {
	const secret = process.env.ADMIN_SESSION_SECRET;
	if (!secret) {
		throw new Error("ADMIN_SESSION_SECRET env var is required for admin sessions");
	}
	return secret;
}

export function createSessionToken(userId: string) {
	const secret = getSessionSecret();
	const expires = Date.now() + SESSION_DURATION_MS;
	const value = `${userId}.${expires}`;
	const signature = crypto.createHmac("sha256", secret).update(value).digest("hex");
	return `${value}.${signature}`;
}

export function parseSessionToken(token: string | undefined): { userId: string; expires: number } | null {
	if (!token) return null;
	const [userId, expiresStr, signature] = token.split(".");
	if (!userId || !expiresStr || !signature) return null;
	const expires = Number(expiresStr);
	if (!Number.isFinite(expires) || expires < Date.now()) return null;

	const secret = getSessionSecret();
	const value = `${userId}.${expires}`;
	const expectedSig = crypto.createHmac("sha256", secret).update(value).digest("hex");
	if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
		return null;
	}

	return { userId, expires };
}

export async function setAdminSessionCookie(userId: string) {
	const token = createSessionToken(userId);
	const cookieStore = await cookies();
	cookieStore.set(SESSION_COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: SESSION_DURATION_MS / 1000
	});
}

export async function clearAdminSessionCookie() {
	const cookieStore = await cookies();
	cookieStore.set(SESSION_COOKIE_NAME, "", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 0
	});
}

export async function isAuthenticatedRequest(req: Request): Promise<boolean> {
	// In route handlers we need to read cookies from the Request, not from next/headers
	// but we still re-use the same token verification logic.
	const cookieHeader = req.headers.get("cookie") ?? "";
	const cookiesMap = Object.fromEntries(
		cookieHeader.split(";").map((c) => {
			const [k, ...rest] = c.split("=");
			return [k?.trim(), rest.join("=").trim()];
		})
	);
	const raw = cookiesMap[SESSION_COOKIE_NAME];
	const parsed = parseSessionToken(raw);
	return !!parsed;
}

export async function getCurrentAdminIdFromCookies(): Promise<string | null> {
	const cookieStore = await cookies();
	const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
	const parsed = parseSessionToken(raw);
	return parsed?.userId ?? null;
}

