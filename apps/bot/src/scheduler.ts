/**
 * Payment reminder scheduler
 * - Domain: get upcoming payments from 1C/session
 * - Messaging: build message from templates (messages.ts)
 * - Job: daily cron at 10:00 Tashkent; idempotent (one per user per day)
 * - Logging: every send/failure written to reminder_logs collection
 */
import cron from "node-cron";
import type { Api } from "grammy";
import { users, reminderLogs } from "./db";
import { paymentReminderItem, paymentReminderText } from "./messages";
import type { I1CUserData, ReminderLogEntry } from "./types";
import { format1CDate } from "./format1cDate";

const TZ = "Asia/Tashkent";
const REMINDER_DAYS = new Set([0, 3, 5]);

// ——— Types ———

interface UpcomingPayment {
	contractId: string;
	step: number;
	date: string;
	sumToPay: number;
	daysUntil: number;
}

interface SessionWith1C {
	user1CData?: Partial<I1CUserData>;
}

// ——— Date helpers ———

function getTodayTashkent(): string {
	return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

function daysUntil(todayStr: string, paymentDateStr: string): number {
	const a = new Date(paymentDateStr.slice(0, 10) + "T12:00:00Z").getTime();
	const b = new Date(todayStr + "T12:00:00Z").getTime();
	return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

// ——— Domain: get upcoming payments (0, 3, 5 days before) ———

function getUpcomingPayments(session: SessionWith1C): UpcomingPayment[] {
	const contracts = session.user1CData?.contract?.ids;
	if (!Array.isArray(contracts)) return [];

	const today = getTodayTashkent();
	const out: UpcomingPayment[] = [];

	for (const contract of contracts) {
		const schedule = contract.schedule;
		if (!Array.isArray(schedule)) continue;
		const contractId = contract.id ?? "N/A";

		for (const item of schedule) {
			if (item.status === false) continue;

			const sumToPay = Number(item.sumToPay);
			const sumPayed = Number(item.sumPayed ?? 0);
			if (sumPayed >= sumToPay) continue;

			const dateStr = item.date?.slice?.(0, 10);
			if (!dateStr) continue;

			const d = daysUntil(today, dateStr);
			if (d < 0) continue;

			if (REMINDER_DAYS.has(d)) {
				out.push({
					contractId,
					step: item.step,
					date: item.date,
					sumToPay,
					daysUntil: d
				});
			}
		}
	}
	return out;
}

// ——— Messaging: build from templates ———

function buildReminderMessage(payments: UpcomingPayment[]): string {
	if (payments.length === 0) return "";

	const blocks = payments.map((p) => {
		const dateFormatted = format1CDate(p.date);
		const sumFormatted = p.sumToPay.toLocaleString("uz-UZ") + " so'm";
		return paymentReminderItem.replace("{contractId}", p.contractId).replace("{date}", dateFormatted).replace("{sum}", sumFormatted).trim();
	});

	const paymentList = blocks.join("\n\n");
	return paymentReminderText.replace("{paymentList}", paymentList).trim();
}

// ——— Logging: write to DB ———

async function logReminder(entry: ReminderLogEntry): Promise<void> {
	try {
		await reminderLogs.insertOne(entry);
	} catch (err) {
		console.error("[Payment reminder] Failed to write log:", err);
	}
}

/** True if we already sent a cron reminder to this user today (Tashkent). Used for idempotency. */
async function alreadySentReminderToday(telegramUserId: string): Promise<boolean> {
	const today = getTodayTashkent();
	const existing = await reminderLogs.findOne({
		telegramUserId,
		source: "cron",
		reminderDate: today,
		status: "sent"
	});
	return existing != null;
}

// ——— Job: send + log (idempotent: at most one reminder per user per day) ———

async function runDailyJob(api: Api): Promise<void> {
	const today = getTodayTashkent();
	const cursor = users.find({
		"value.phone_number": { $exists: true, $ne: "" },
		"value.user1CData": { $exists: true }
	});
	const docs = await cursor.toArray();
	const source: "cron" | "test" = "cron";

	for (const doc of docs) {
		const key = (doc as { key?: string }).key;
		const value = (doc as { value?: SessionWith1C }).value;
		if (!key || !value) continue;

		if (await alreadySentReminderToday(key)) continue;

		const payments = getUpcomingPayments(value);
		if (payments.length === 0) continue;

		const messageText = buildReminderMessage(payments);
		const contractIds = [...new Set(payments.map((p) => p.contractId))];
		const paymentDates = payments.map((p) => p.date);

		try {
			const result = await api.sendMessage(key, messageText);
			await logReminder({
				telegramUserId: key,
				sentAt: new Date(),
				status: "sent",
				messageText,
				paymentCount: payments.length,
				contractIds,
				paymentDates,
				telegramMessageId: result.message_id,
				source,
				reminderDate: today
			});
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			await logReminder({
				telegramUserId: key,
				sentAt: new Date(),
				status: "failed",
				messageText,
				paymentCount: payments.length,
				contractIds,
				paymentDates,
				error: errorMessage,
				source,
				reminderDate: today
			});
			console.error(`[Payment reminder] send failed for user ${key}:`, err);
		}
	}
}

// ——— Scheduler ———

export function startPaymentReminderScheduler(api: Api): void {
	cron.schedule("0 10 * * *", () => runDailyJob(api), { timezone: TZ });
	console.log(`[Payment reminder] cron scheduled: every day at 10:00 ${TZ}`);
}
