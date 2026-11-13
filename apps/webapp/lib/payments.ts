/**
 * Instalment maths over the raw 1C contract list (`/v1/users/me` → `contract.ids`).
 *
 * Read docs/1c-contract-status.md before changing anything here. The rules it sets:
 *   - `contract.ids[].status` ("active" / "closed" / "returned") decides whether a contract still
 *     owes anything. Closed and returned contracts keep an unpaid-looking schedule forever.
 *   - `schedule[].status === true` means the instalment is NOT paid yet.
 *   - `schedule[].sumPayed` under-reports: an instalment settled in several transactions records
 *     only the first one, and the row stays `status: true`. `pays[]` holds every transaction, so
 *     money paid is summed from `pays[]`, not from `sumPayed`.
 *   - A down payment (`vznos`) is made when the contract is signed and is not part of the schedule.
 *     Whether 1C lists it in `pays[]` is not confirmed, so payments dated on or before the contract
 *     day are left out when `vznos` is set: counting them would mark a real instalment as paid and
 *     hide money that is due. Leaving them out when they are absent changes nothing.
 *   - The account-level `debt`, `remain`, `latePayment` and `contract.active` fields are never
 *     filled by 1C, so the Finance totals are derived from the contracts here instead.
 *
 * Days are counted in Tashkent calendar days, the same way the bot's reminder job does
 * (apps/bot/src/scheduler.ts), so "3 kun qoldi" here matches the day the bot sends its reminder.
 */

import { isActiveContract } from "@/lib/contract-status";
import { parse1CDate } from "@/lib/format1cDate";

export interface ScheduleItem {
	/** true = not paid yet. */
	status: boolean;
	step: number;
	date: string;
	sumToPay: number;
	sumPayed: number;
}

export interface ContractPay {
	id?: number;
	sum: number;
	comment?: string;
	date?: string;
}

export interface Contract1C {
	id?: string | number;
	contractId?: string | number;
	/** "active" | "closed" | "returned"; missing means active (see isActiveContract). */
	status?: string;
	sum?: number;
	months?: number;
	date?: string;
	/** Down payment at signing; not part of `schedule`. */
	vznos?: number;
	schedule?: ScheduleItem[];
	pays?: ContractPay[];
}

export interface UpcomingPayment {
	contractId: string | number;
	step: number;
	date: string;
	sumToPay: number;
	sumPayed: number;
	/** What is still owed on this instalment after the recorded payments. */
	left: number;
	/** Calendar days from today (Tashkent) to the due date; 0 is today, negative is overdue. */
	daysLeft: number;
}

const TZ = "Asia/Tashkent";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Today in Tashkent as YYYY-MM-DD. */
function todayKey(): string {
	return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

/** YYYY-MM-DD of a 1C date string, or null. ISO strings are read as a calendar day, never shifted. */
function dayKey(dateStr: string): string | null {
	if (typeof dateStr !== "string") return null;
	const trimmed = dateStr.trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
	const d = parse1CDate(trimmed);
	if (!d) return null;
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysBetween(fromKey: string, toKey: string): number {
	const a = new Date(`${fromKey}T12:00:00Z`).getTime();
	const b = new Date(`${toKey}T12:00:00Z`).getTime();
	return Math.round((b - a) / DAY_MS);
}

function num(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

export function contractIdOf(contract: Contract1C): string | number {
	return contract.contractId || contract.id || "N/A";
}

function activeSchedules(contracts: Contract1C[] | null | undefined): { contract: Contract1C; schedule: ScheduleItem[] }[] {
	if (!Array.isArray(contracts)) return [];
	return contracts
		.filter((c) => c && isActiveContract(c.status) && Array.isArray(c.schedule))
		.map((c) => ({ contract: c, schedule: c.schedule as ScheduleItem[] }));
}

/** Same test as the bot: marked unpaid and not fully covered by `sumPayed`. */
function isUnpaid(item: ScheduleItem): boolean {
	return item.status === true && num(item.sumPayed) < num(item.sumToPay);
}

/** Total money recorded against a contract's schedule: `pays[]`, or `sumPayed` if that is larger. */
function paidOn(contract: Contract1C, schedule: ScheduleItem[]): number {
	const signedOn = num(contract.vznos) > 0 && contract.date ? dayKey(contract.date) : null;
	const fromPays = Array.isArray(contract.pays)
		? contract.pays.reduce((s, p) => {
				// Down payment (see the header comment): paid at signing, not against an instalment.
				const paidOnKey = signedOn && p?.date ? dayKey(p.date) : null;
				if (signedOn && paidOnKey && paidOnKey <= signedOn) return s;
				return s + num(p?.sum);
			}, 0)
		: 0;
	const fromSchedule = schedule.reduce((s, i) => s + num(i.sumPayed), 0);
	return Math.max(fromPays, fromSchedule);
}

/**
 * What is left to pay on each instalment once the recorded payments are applied in step order.
 * A row can still read `status: true` when 1C split the payment (see the header comment); if the
 * payments cover it, its amount left is 0 and it is not shown as due.
 */
function amountsLeft(contract: Contract1C, schedule: ScheduleItem[]): Map<ScheduleItem, number> {
	let pool = paidOn(contract, schedule);
	const left = new Map<ScheduleItem, number>();
	for (const item of [...schedule].sort((a, b) => num(a.step) - num(b.step))) {
		const due = num(item.sumToPay);
		const applied = Math.min(due, Math.max(0, pool));
		pool -= applied;
		// 1 so'm of slack: 1C amounts carry fractions.
		const rest = due - applied;
		left.set(item, rest <= 1 ? 0 : rest);
	}
	return left;
}

/** Instalments still owed: the bot's test (status) and not covered by the recorded payments. */
function owedItems(contract: Contract1C, schedule: ScheduleItem[]): { item: ScheduleItem; left: number }[] {
	const left = amountsLeft(contract, schedule);
	return schedule.filter((item) => isUnpaid(item) && (left.get(item) ?? 0) > 0).map((item) => ({ item, left: left.get(item) ?? 0 }));
}

/** Unpaid instalments of active contracts due this calendar month (Tashkent), earliest first. */
export function getUpcomingPayments(contracts: Contract1C[] | null | undefined): UpcomingPayment[] {
	const today = todayKey();
	const month = today.slice(0, 7);
	const out: UpcomingPayment[] = [];

	for (const { contract, schedule } of activeSchedules(contracts)) {
		for (const { item, left } of owedItems(contract, schedule)) {
			const key = dayKey(item.date);
			if (!key || key.slice(0, 7) !== month) continue;
			out.push({
				contractId: contractIdOf(contract),
				step: item.step,
				date: item.date,
				sumToPay: num(item.sumToPay),
				sumPayed: num(item.sumPayed),
				left,
				daysLeft: daysBetween(today, key)
			});
		}
	}

	return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

/**
 * The earliest unpaid instalment of any active contract that is due today or later, or null.
 * Overdue rows are left out on purpose: the home card says "next payment", and overdue money is
 * shown on Finance under «Kechikkan to'lovlar».
 */
export function nextPayment(contracts: Contract1C[] | null | undefined): UpcomingPayment | null {
	const today = todayKey();
	let best: UpcomingPayment | null = null;

	for (const { contract, schedule } of activeSchedules(contracts)) {
		for (const { item, left } of owedItems(contract, schedule)) {
			const key = dayKey(item.date);
			if (!key) continue;
			const daysLeft = daysBetween(today, key);
			if (daysLeft < 0) continue;
			if (!best || daysLeft < best.daysLeft) {
				best = {
					contractId: contractIdOf(contract),
					step: item.step,
					date: item.date,
					sumToPay: num(item.sumToPay),
					sumPayed: num(item.sumPayed),
					left,
					daysLeft
				};
			}
		}
	}

	return best;
}

/** "Bugun", "3 kun qoldi" or "2 kun kechikdi". */
export function daysLeftLabel(daysLeft: number): string {
	if (daysLeft === 0) return "Bugun";
	if (daysLeft > 0) return `${daysLeft} kun qoldi`;
	return `${Math.abs(daysLeft)} kun kechikdi`;
}

export interface ContractProgress {
	/** Sum of the schedule. */
	total: number;
	/** Money paid, from `pays[]` (or `sumPayed` if larger), never above `total`. */
	paid: number;
	steps: number;
	paidSteps: number;
}

/**
 * Paid amount and paid instalments of one contract.
 *
 * Paid steps: the larger of the rows 1C marked paid and the rows the recorded payments cover in
 * order. The second count corrects the case where 1C left a fully paid row as `status: true`.
 */
export function contractProgress(contract: Contract1C): ContractProgress {
	const schedule = Array.isArray(contract.schedule) ? contract.schedule : [];
	const total = schedule.reduce((s, i) => s + num(i.sumToPay), 0);
	const paid = Math.min(total, paidOn(contract, schedule));
	const markedPaid = schedule.filter((i) => i.status === false).length;
	const left = amountsLeft(contract, schedule);
	const covered = schedule.filter((i) => (left.get(i) ?? 0) === 0).length;

	return { total, paid, steps: schedule.length, paidSteps: Math.max(markedPaid, covered) };
}

export interface FinanceSummary {
	/** Sum of all active schedules. */
	total: number;
	paid: number;
	/** total − paid: what is still owed on active contracts. */
	debt: number;
	/** Unpaid instalments due this month. */
	thisMonth: number;
	/** Money due before today that the recorded payments do not cover. */
	overdue: number;
	activeCount: number;
}

export function financeSummary(contracts: Contract1C[] | null | undefined): FinanceSummary {
	const today = todayKey();
	let total = 0;
	let paid = 0;
	let overdue = 0;

	const active = activeSchedules(contracts);
	for (const { contract, schedule } of active) {
		const progress = contractProgress(contract);
		total += progress.total;
		paid += progress.paid;

		// Per contract: due so far minus paid so far. Reading `status` row by row would count
		// instalments paid in several transactions as overdue (see the header comment).
		const dueSoFar = schedule.reduce((s, item) => {
			const key = dayKey(item.date);
			return key && key < today ? s + num(item.sumToPay) : s;
		}, 0);
		overdue += Math.max(0, dueSoFar - progress.paid);
	}

	const thisMonth = getUpcomingPayments(contracts).reduce((s, p) => s + p.left, 0);
	const activeCount = Array.isArray(contracts) ? contracts.filter((c) => c && isActiveContract(c.status)).length : 0;

	return { total, paid, debt: Math.max(0, total - paid), thisMonth, overdue, activeCount };
}
