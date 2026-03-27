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

let client: MongoClient;
export let users: Collection<ISession>;
export let reminderLogs: Collection<ReminderLogEntry>;
export let broadcastJobs: Collection<BroadcastJob>;
export let employees: Collection<EmployeeDoc>;

export const connectToDb = async () => {
	try {
		client = new MongoClient(dbUri);
		console.log("Connecting to MongoDB Atlas cluster...");
		await client.connect();
		console.log("Successfully connected to MongoDB Atlas!");

		const db = client.db(dbName);
		users = db.collection(usersCollection);
		reminderLogs = db.collection<ReminderLogEntry>(reminderLogsCollection);
		broadcastJobs = db.collection<BroadcastJob>(broadcastJobsCollection);
		employees = db.collection<EmployeeDoc>(employeesCollection);

		return client;
	} catch (error) {
		console.error("Connection to MongoDB Atlas failed!", error);
		process.exit();
	}
};
