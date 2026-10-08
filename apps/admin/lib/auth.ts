import { MongoClient, ObjectId } from "mongodb";
import crypto from "crypto";
import { cookies } from "next/headers";
import type { AdminRole, AdminPermission } from "./auth-utils";
import { normalizePermissions } from "./auth-utils";

// Re-export pure utilities so callers only need one import
export type { AdminRole, AdminPermission } from "./auth-utils";
export { isSuperAdmin, hasPermission, getFirstAllowedPath, normalizePermissions } from "./auth-utils";

// MongoDB configuration (reuse same DB, separate collection for admin users)
const dbUri = process.env.MONGO_DB_CONNECTION_STRING || "";
const dbName = process.env.MONGO_DB_NAME || "";
const adminUsersCollection = process.env.MONGO_DB_COLLECTION_ADMIN_USERS || "admin_users";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export type AdminUser = {
	_id?: string;
	username: string;
	passwordHash: string;
	firstName?: string;
	lastName?: string;
	role?: AdminRole; // undefined = treat as superadmin (backwards compat)
	permissions?: AdminPermission[]; // only relevant when role === "staff"
	createdBy?: string; // username of the superadmin who created this account
	createdAt?: Date;
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

export async function findAdminById(id: string): Promise<AdminUser | null> {
	const client = getMongoClient();
	try {
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<AdminUser>(adminUsersCollection);
		const user = await coll.findOne({ _id: new ObjectId(id) as unknown as string });
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

function parseCookieHeader(req: Request): Record<string, string> {
	const cookieHeader = req.headers.get("cookie") ?? "";
	return Object.fromEntries(
		cookieHeader.split(";").map((c) => {
			const [k, ...rest] = c.split("=");
			return [k?.trim(), rest.join("=").trim()];
		})
	);
}

/** Parses session cookie from request, fetches full admin from DB. Returns null if unauthenticated. */
export async function getAuthenticatedAdmin(req: Request): Promise<AdminUser | null> {
	const cookiesMap = parseCookieHeader(req);
	const raw = cookiesMap[SESSION_COOKIE_NAME];
	const parsed = parseSessionToken(raw);
	if (!parsed) return null;
	return findAdminById(parsed.userId);
}

export async function getCurrentAdminIdFromCookies(): Promise<string | null> {
	const cookieStore = await cookies();
	const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
	const parsed = parseSessionToken(raw);
	return parsed?.userId ?? null;
}

// ─── Admin user management (superadmin only) ───────────────────────────────

export async function getAllAdminUsers(): Promise<Omit<AdminUser, "passwordHash">[]> {
	const client = getMongoClient();
	try {
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<AdminUser>(adminUsersCollection);
		const users = await coll
			.find({}, { projection: { passwordHash: 0 } })
			.sort({ createdAt: 1 })
			.toArray();
		// Retired permission keys (e.g. "products") are dropped here, so the Adminlar page never shows them.
		return (users as Omit<AdminUser, "passwordHash">[]).map((u) =>
			u.permissions ? { ...u, permissions: normalizePermissions(u.permissions) } : u
		);
	} finally {
		await client.close();
	}
}

export async function createAdminUser(input: {
	username: string;
	password: string;
	firstName?: string;
	lastName?: string;
	role: AdminRole;
	permissions?: AdminPermission[];
	createdBy: string;
}): Promise<Omit<AdminUser, "passwordHash">> {
	const passwordHash = await hashPassword(input.password);
	const client = getMongoClient();
	try {
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<AdminUser>(adminUsersCollection);

		const existing = await coll.findOne({ username: input.username });
		if (existing) {
			throw new Error("Bu username allaqachon mavjud");
		}

		const doc: AdminUser = {
			username: input.username,
			passwordHash,
			...(input.firstName ? { firstName: input.firstName } : {}),
			...(input.lastName ? { lastName: input.lastName } : {}),
			role: input.role,
			permissions: input.role === "staff" ? (input.permissions ?? []) : undefined,
			createdBy: input.createdBy,
			createdAt: new Date()
		};

		const result = await coll.insertOne(doc as Parameters<typeof coll.insertOne>[0]);
		const { passwordHash: _ph, ...safe } = { ...doc, _id: result.insertedId.toString() };
		return safe;
	} finally {
		await client.close();
	}
}

/**
 * Changes an admin's role and/or permissions. Permissions are kept only for staff: becoming
 * superadmin clears them, and a permissions-only update applies to the admin's current role
 * rather than wiping the list when `role` is omitted.
 */
export async function updateAdminUser(id: string, input: { role?: AdminRole; permissions?: AdminPermission[] }): Promise<boolean> {
	const client = getMongoClient();
	try {
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<AdminUser>(adminUsersCollection);
		const filter = { _id: new ObjectId(id) as unknown as string };

		const current = await coll.findOne(filter, { projection: { role: 1 } });
		if (!current) return false;
		const role: AdminRole = input.role ?? (current.role === "staff" ? "staff" : "superadmin");

		const set: Partial<AdminUser> = { role };
		if (role === "staff" && input.permissions !== undefined) set.permissions = normalizePermissions(input.permissions);

		const result = await coll.updateOne(filter, role === "superadmin" ? { $set: set, $unset: { permissions: "" } } : { $set: set });
		return result.matchedCount > 0;
	} finally {
		await client.close();
	}
}

export async function deleteAdminUser(id: string): Promise<boolean> {
	const client = getMongoClient();
	try {
		await client.connect();
		const db = client.db(dbName);
		const coll = db.collection<AdminUser>(adminUsersCollection);
		const result = await coll.deleteOne({ _id: new ObjectId(id) as unknown as string });
		return result.deletedCount > 0;
	} finally {
		await client.close();
	}
}
