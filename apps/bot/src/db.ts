// db.ts
import "./config";
import { Collection, MongoClient } from "mongodb";
import { ISession } from "@grammyjs/storage-mongodb";
import type { BroadcastJob, ReminderLogEntry } from "./types";

const dbUri = process.env.MONGO_DB_CONNECTION_STRING || "";
const dbName = process.env.MONGO_DB_NAME || "";
const usersCollection = process.env.MONGO_DB_COLLECTION_USERS || "";
const reminderLogsCollection = process.env.MONGO_DB_COLLECTION_REMINDER_LOGS || "reminder_logs";
const broadcastJobsCollection = process.env.MONGO_DB_COLLECTION_BROADCAST_JOBS || "broadcast_jobs";
const employeesCollection = process.env.MONGO_DB_COLLECTION_EMPLOYEES || "employees";
const settingsCollection = process.env.MONGO_DB_COLLECTION_SETTINGS || "settings";

if (!dbUri) throw new Error("The Mongodb connection string is empty!");

/** Employee document mirrored from admin side; used only to validate referral codes (emp1, emp2, ...) */
export interface EmployeeDoc {
	_id?: unknown;
	name: string;
	surname: string;
	filial: string;
	referralCode: string;
	createdAt: Date;
}

/**
 * Session document with our own top-level fields.
 *
 * `referralLimit` deliberately sits OUTSIDE `value`: the grammY MongoDBAdapter writes
 * `{ $set: { key, value } }` on every interaction, replacing `value` wholesale, so an
 * admin edit stored inside it could be silently clobbered by the next session write-back.
 * Sibling top-level fields are never touched by the adapter. Written only by apps/admin.
 */
export type UserSessionDoc = ISession & {
	/** Max referrals this user may add. Absent/null → DEFAULT_REFERRAL_LIMIT. */
	referralLimit?: number | null;
	referralLimitUpdatedBy?: string;
	referralLimitUpdatedAt?: Date;
};

let client: MongoClient;
export let users: Collection<UserSessionDoc>;
export let reminderLogs: Collection<ReminderLogEntry>;
export let broadcastJobs: Collection<BroadcastJob>;
export let employees: Collection<EmployeeDoc>;
/** Platform settings, one document per area (e.g. `_id: "referral"`). Written by apps/admin. */
export let settings: Collection<{ _id: string; defaultReferralLimit?: number }>;

export const connectToDb = async () => {
	try {
		client = new MongoClient(dbUri);
		console.log("Connecting to MongoDB Atlas cluster...");
		await client.connect();
		console.log("Successfully connected to MongoDB Atlas!");

		const db = client.db(dbName);
		users = db.collection<UserSessionDoc>(usersCollection);
		reminderLogs = db.collection<ReminderLogEntry>(reminderLogsCollection);
		broadcastJobs = db.collection<BroadcastJob>(broadcastJobsCollection);
		employees = db.collection<EmployeeDoc>(employeesCollection);
		settings = db.collection(settingsCollection);

		return client;
	} catch (error) {
		console.error("Connection to MongoDB Atlas failed!", error);
		process.exit();
	}
};
