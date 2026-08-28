/**
 * Business analytics for the admin dashboard.
 *
 * Isolated from lib/db.ts to keep this feature self-contained. Reuses the same
 * env-driven collection names and the fresh-client-per-call pattern.
 *
 * Trend badges compare "now" vs a stored daily snapshot (~30 days ago) for
 * current-state metrics, and this-month vs last-month for time-based metrics.
 * Contract / schedule dates are ISO "YYYY-MM-DD..." strings, so date windows
 * use plain lexicographic string ranges (order matches chronological order).
 */
import { MongoClient, Db, Document } from "mongodb";

const dbUri = process.env.MONGO_DB_CONNECTION_STRING || "";
const dbName = process.env.MONGO_DB_NAME || "";
const usersCollection = process.env.MONGO_DB_COLLECTION_USERS || "";
const employeesCollection = process.env.MONGO_DB_COLLECTION_EMPLOYEES || "employees";
const reminderLogsCollection = process.env.MONGO_DB_COLLECTION_REMINDER_LOGS || "reminder_logs";
const snapshotsCollection = process.env.MONGO_DB_COLLECTION_DASHBOARD_SNAPSHOTS || "dashboard_snapshots";

const TZ = "Asia/Tashkent";
const MONTH_NAMES_UZ = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"] as const;

// ——— Shared helpers ———

async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
	if (!dbUri || !dbName || !usersCollection) throw new Error("MongoDB configuration is missing");
	const client = new MongoClient(dbUri);
	try {
		await client.connect();
		return await fn(client.db(dbName));
	} finally {
		await client.close();
	}
}

/** Defensive money accessor: coerces a (possibly string/missing) 1C field to a double, 0 on error/null. */
function money(path: string) {
	return { $convert: { input: `$value.user1CData.${path}`, to: "double", onError: 0, onNull: 0 } };
}

function n(arr: Document[] | undefined): number {
	return (arr && arr[0]?.n) ?? 0;
}

function todayTashkent(): string {
	return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Adds `days` to an ISO "YYYY-MM-DD" string and returns the resulting "YYYY-MM-DD". */
function addDaysStr(dateStr: string, days: number): string {
	const d = new Date(dateStr + "T00:00:00Z");
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

function ymd(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

// ——— Types ———

export type Direction = "up" | "down" | "flat";
export interface Metric {
	value: number;
	deltaPct: number | null;
	direction: Direction;
}

export interface TierCounts {
	Silver: number;
	Gold: number;
	Diamond: number;
	other: number;
}

/** Current-state totals — also the shape persisted in `dashboard_snapshots`. */
export interface StateAggregates {
	customers: number;
	verified: number;
	receivables: number;
	overdue: number;
	overdueCount: number;
	bonusLiability: number;
	activeContracts: number;
	lastVisitTrue: number;
	contractFirstFalse: number;
	activeStatus: number;
	inactiveStatus: number;
	channelMembers: number;
	referred: number;
	tiers: TierCounts;
}

export interface DashboardData {
	cards: {
		customers: Metric & { verified: number };
		newThisMonth: Metric;
		salesThisMonth: Metric & { count: number };
		receivables: Metric;
		overdue: Metric & { count: number };
		activeContracts: Metric;
		lastVisitTrue: Metric;
		contractFirstFalse: Metric;
		bonusLiability: Metric;
	};
	monthlySales: { month: string; value: number; count: number }[];
	funnel: { registered: number; verified: number; purchased: number };
	tiers: TierCounts;
	engagement: { activeStatus: number; inactiveStatus: number; lastVisitTrue: number };
	payments: {
		overdue: { amount: number; count: number };
		due7: { amount: number; count: number };
		due30: { amount: number; count: number };
		reminders: { sent: number; failed: number };
	};
	referrals: { totalReferred: number; ratePct: number; top: { code: string; name: string; count: number }[] };
	/** ISO timestamp of when this payload was computed (used for the "last updated" label and cache freshness). */
	generatedAt: string;
	baselineDate: string | null;
}

// ——— Metric delta ———

function metric(value: number, baseline: number | null | undefined): Metric {
	if (baseline == null) return { value, deltaPct: null, direction: "flat" };
	if (baseline === 0) return { value, deltaPct: null, direction: value > 0 ? "up" : "flat" };
	const deltaPct = Math.round(((value - baseline) / baseline) * 1000) / 10;
	return { value, deltaPct, direction: deltaPct > 0 ? "up" : deltaPct < 0 ? "down" : "flat" };
}

// ——— Aggregations ———

async function computeStateAggregates(db: Db): Promise<StateAggregates> {
	const [res] = await db
		.collection(usersCollection)
		.aggregate([
			{
				$facet: {
					customers: [{ $count: "n" }],
					verified: [{ $match: { "value.isVerified": true } }, { $count: "n" }],
					lastVisitTrue: [{ $match: { "value.user1CData.lastVisit": true } }, { $count: "n" }],
					contractFirstFalse: [{ $match: { "value.user1CData.contractFirst": false } }, { $count: "n" }],
					activeStatus: [{ $match: { "value.user1CData.status": true } }, { $count: "n" }],
					inactiveStatus: [{ $match: { "value.user1CData.status": false } }, { $count: "n" }],
					channelMembers: [{ $match: { "value.isChannelMember": true } }, { $count: "n" }],
					referred: [{ $match: { "value.referredByEmployeeCode": { $type: "string" } } }, { $count: "n" }],
					money: [{ $group: { _id: null, bonusLiability: { $sum: money("bonusOstatok") } } }],
					tiers: [{ $group: { _id: "$value.user1CData.bonusInfo.uroven", n: { $sum: 1 } } }]
				}
			}
		])
		.toArray();

	const m = res?.money?.[0] ?? {};
	const tiers: TierCounts = { Silver: 0, Gold: 0, Diamond: 0, other: 0 };
	for (const t of res?.tiers ?? []) {
		if (t._id === "Silver" || t._id === "Gold" || t._id === "Diamond") tiers[t._id as keyof TierCounts] = t.n;
		else if (t._id != null) tiers.other += t.n;
	}

	return {
		customers: n(res?.customers),
		verified: n(res?.verified),
		// receivables / overdue / overdueCount / activeContracts are computed from the
		// contract schedule (see computeContracts) — the 1C top-level remain/latePayment/
		// contract.active fields are not populated. Placeholders here, filled by computeState().
		receivables: 0,
		overdue: 0,
		overdueCount: 0,
		bonusLiability: Math.round(m.bonusLiability ?? 0),
		activeContracts: 0,
		lastVisitTrue: n(res?.lastVisitTrue),
		contractFirstFalse: n(res?.contractFirstFalse),
		activeStatus: n(res?.activeStatus),
		inactiveStatus: n(res?.inactiveStatus),
		channelMembers: n(res?.channelMembers),
		referred: n(res?.referred),
		tiers
	};
}

async function computeNewUsers(db: Db): Promise<{ thisMonth: number; lastMonth: number }> {
	const now = new Date();
	const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const coll = db.collection(usersCollection);
	const [thisMonth, lastMonth] = await Promise.all([
		coll.countDocuments({ "value.createdAt": { $gte: curStart, $lt: nextStart } }),
		coll.countDocuments({ "value.createdAt": { $gte: lastStart, $lt: curStart } })
	]);
	return { thisMonth, lastMonth };
}

async function computeSales(db: Db): Promise<{
	thisMonth: { value: number; count: number };
	lastMonth: { value: number; count: number };
	monthly: { month: string; value: number; count: number }[];
}> {
	const now = new Date();
	const curStart = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
	const nextStart = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 1));
	const lastStart = ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1));
	const twelveStart = ymd(new Date(now.getFullYear(), now.getMonth() - 11, 1));

	const group = { _id: null, value: { $sum: "$sum" }, count: { $sum: 1 } };
	const [res] = await db
		.collection(usersCollection)
		.aggregate([
			{ $match: { "value.user1CData.contract.ids": { $type: "array" } } },
			{ $unwind: "$value.user1CData.contract.ids" },
			{
				$project: {
					date: "$value.user1CData.contract.ids.date",
					sum: { $convert: { input: "$value.user1CData.contract.ids.sum", to: "double", onError: 0, onNull: 0 } }
				}
			},
			{ $match: { date: { $type: "string" } } },
			{
				$facet: {
					thisMonth: [{ $match: { date: { $gte: curStart, $lt: nextStart } } }, { $group: group }],
					lastMonth: [{ $match: { date: { $gte: lastStart, $lt: curStart } } }, { $group: group }],
					monthly: [
						{ $match: { date: { $gte: twelveStart } } },
						{ $group: { _id: { $substrBytes: ["$date", 0, 7] }, value: { $sum: "$sum" }, count: { $sum: 1 } } },
						{ $sort: { _id: 1 } }
					]
				}
			}
		])
		.toArray();

	const byMonth = new Map<string, { value: number; count: number }>();
	for (const r of res?.monthly ?? []) byMonth.set(r._id, { value: r.value, count: r.count });

	const monthly: { month: string; value: number; count: number }[] = [];
	for (let i = 11; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
		const hit = byMonth.get(key);
		monthly.push({ month: MONTH_NAMES_UZ[d.getMonth()], value: Math.round(hit?.value ?? 0), count: hit?.count ?? 0 });
	}

	const pick = (arr: Document[] | undefined) => ({ value: Math.round(arr?.[0]?.value ?? 0), count: arr?.[0]?.count ?? 0 });
	return { thisMonth: pick(res?.thisMonth), lastMonth: pick(res?.lastMonth), monthly };
}

interface ContractMetrics {
	receivables: number;
	overdue: number;
	overdueCount: number;
	activeContracts: number;
	due7: { amount: number; count: number };
	due30: { amount: number; count: number };
}

/**
 * Contract-derived money metrics computed from the installment `schedule[]` (the 1C
 * top-level remain/latePayment/contract.active fields are not populated in real data).
 * Contracts 1C reports as `closed` or `returned` are excluded — their schedules stay
 * populated after the contract ends, so including them overstated every figure here.
 * Monthly sales (`computeSales`) deliberately still counts them: a contract that was
 * later returned was still a sale in the month it was signed. Metrics:
 * - receivables      = Σ unpaid installments (sumToPay − sumPayed) across all schedules
 * - overdue          = Σ unpaid installments whose due date is already past; count = distinct customers
 * - activeContracts  = contracts that still carry an unpaid balance
 * - due7 / due30      = unpaid installments due in the next 7 / 30 days
 */
async function computeContracts(db: Db): Promise<ContractMetrics> {
	const today = todayTashkent();
	const up7 = addDaysStr(today, 7);
	const up30 = addDaysStr(today, 30);
	const sched = "$value.user1CData.contract.ids.schedule";
	const statusPath = "$value.user1CData.contract.ids.status";
	// Same rule as isActiveContract() in the bot and webapp: trim + lowercase, and treat
	// anything that isn't a recognised terminal state as still owing money.
	const contractStatus = {
		$toLower: { $cond: [{ $eq: [{ $type: statusPath }, "string"] }, { $trim: { input: statusPath } }, "active"] }
	};
	const NON_PAYABLE_STATUSES = ["closed", "returned"];
	const dbl = (input: string) => ({ $convert: { input, to: "double", onError: 0, onNull: 0 } });
	const due = { $subtract: [dbl(`${sched}.sumToPay`), dbl(`${sched}.sumPayed`)] };
	const inWindow = (from: string, to: string) => ({ $and: [{ $gte: ["$date", from] }, { $lt: ["$date", to] }] });

	const [res] = await db
		.collection(usersCollection)
		.aggregate([
			{ $match: { "value.user1CData.contract.ids": { $type: "array" } } },
			{ $unwind: "$value.user1CData.contract.ids" },
			// Contracts 1C has closed or returned carry no obligation, but 1C leaves their
			// schedule populated with unpaid rows — counting them inflated every figure below.
			// The $type guard keeps a non-string status from throwing and taking the whole
			// dashboard down; anything missing or unrecognised counts as active, as before.
			{ $match: { $expr: { $not: [{ $in: [contractStatus, NON_PAYABLE_STATUSES] }] } } },
			{
				$facet: {
					// Active contracts = contracts still carrying an unpaid balance.
					contracts: [
						{
							$project: {
								outstanding: {
									$reduce: {
										input: { $ifNull: ["$value.user1CData.contract.ids.schedule", []] },
										initialValue: 0,
										in: {
											$add: [
												"$$value",
												{
													$cond: [
														{ $and: [{ $ne: ["$$this.status", false] }, { $lt: [dbl("$$this.sumPayed"), dbl("$$this.sumToPay")] }] },
														{ $subtract: [dbl("$$this.sumToPay"), dbl("$$this.sumPayed")] },
														0
													]
												}
											]
										}
									}
								}
							}
						},
						{ $group: { _id: null, active: { $sum: { $cond: [{ $gt: ["$outstanding", 0] }, 1, 0] } } } }
					],
					// Amounts across all unpaid installments.
					schedule: [
						{ $unwind: "$value.user1CData.contract.ids.schedule" },
						{ $project: { date: `${sched}.date`, status: `${sched}.status`, due } },
						{ $match: { status: { $ne: false }, date: { $type: "string" }, $expr: { $gt: ["$due", 0] } } },
						{
							$group: {
								_id: null,
								receivables: { $sum: "$due" },
								overdue: { $sum: { $cond: [{ $lt: ["$date", today] }, "$due", 0] } },
								due7Amount: { $sum: { $cond: [inWindow(today, up7), "$due", 0] } },
								due7Count: { $sum: { $cond: [inWindow(today, up7), 1, 0] } },
								due30Amount: { $sum: { $cond: [inWindow(today, up30), "$due", 0] } },
								due30Count: { $sum: { $cond: [inWindow(today, up30), 1, 0] } }
							}
						}
					],
					// Distinct customers with any overdue unpaid installment.
					overdueUsers: [
						{ $unwind: "$value.user1CData.contract.ids.schedule" },
						{ $project: { key: "$key", date: `${sched}.date`, status: `${sched}.status`, due } },
						{
							$match: {
								status: { $ne: false },
								date: { $type: "string" },
								$expr: { $and: [{ $gt: ["$due", 0] }, { $lt: ["$date", today] }] }
							}
						},
						{ $group: { _id: "$key" } },
						{ $count: "n" }
					]
				}
			}
		])
		.toArray();

	const s = res?.schedule?.[0] ?? {};
	return {
		receivables: Math.round(s.receivables ?? 0),
		overdue: Math.round(s.overdue ?? 0),
		overdueCount: res?.overdueUsers?.[0]?.n ?? 0,
		activeContracts: res?.contracts?.[0]?.active ?? 0,
		due7: { amount: Math.round(s.due7Amount ?? 0), count: s.due7Count ?? 0 },
		due30: { amount: Math.round(s.due30Amount ?? 0), count: s.due30Count ?? 0 }
	};
}

/** Full current-state totals = counts/tiers + contract-derived money, merged. */
async function computeState(db: Db): Promise<StateAggregates> {
	const [core, contracts] = await Promise.all([computeStateAggregates(db), computeContracts(db)]);
	return {
		...core,
		receivables: contracts.receivables,
		overdue: contracts.overdue,
		overdueCount: contracts.overdueCount,
		activeContracts: contracts.activeContracts
	};
}

async function computeReminderHealth(db: Db): Promise<{ sent: number; failed: number }> {
	const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	try {
		const rows = await db
			.collection(reminderLogsCollection)
			.aggregate([{ $match: { sentAt: { $gte: since } } }, { $group: { _id: "$status", n: { $sum: 1 } } }])
			.toArray();
		let sent = 0;
		let failed = 0;
		for (const r of rows) {
			if (r._id === "sent") sent = r.n;
			else if (r._id === "failed") failed = r.n;
		}
		return { sent, failed };
	} catch {
		return { sent: 0, failed: 0 };
	}
}

async function computeFunnel(db: Db): Promise<{ registered: number; verified: number; purchased: number }> {
	const coll = db.collection(usersCollection);
	const [registered, verified, purchased] = await Promise.all([
		coll.countDocuments({ "value.phone_number": { $exists: true, $nin: [null, ""] } }),
		coll.countDocuments({ "value.isVerified": true }),
		coll.countDocuments({ "value.user1CData.contractFirst": true })
	]);
	return { registered, verified, purchased };
}

async function computeReferralLeaderboard(
	db: Db
): Promise<{ totalReferred: number; top: { code: string; name: string; count: number }[] }> {
	const rows = await db
		.collection(usersCollection)
		.aggregate([
			{ $match: { "value.referredByEmployeeCode": { $type: "string" } } },
			{ $group: { _id: "$value.referredByEmployeeCode", n: { $sum: 1 } } },
			{ $sort: { n: -1 } }
		])
		.toArray();

	const totalReferred = rows.reduce((a, r) => a + r.n, 0);
	const emps = await db.collection(employeesCollection).find({}).toArray();
	const nameByCode = new Map(emps.map((e) => [e.referralCode, `${e.name ?? ""} ${e.surname ?? ""}`.trim()]));
	const top = rows.slice(0, 8).map((r) => ({ code: r._id as string, name: nameByCode.get(r._id) || (r._id as string), count: r.n }));
	return { totalReferred, top };
}

// ——— Snapshot (daily) ———

/** Computes current state totals and upserts today's snapshot row (idempotent per Tashkent day). */
export async function storeDailySnapshot(): Promise<{ date: string }> {
	return withDb(async (db) => {
		const state = await computeState(db);
		const date = todayTashkent();
		await db.collection(snapshotsCollection).updateOne({ date }, { $set: { date, createdAt: new Date(), ...state } }, { upsert: true });
		return { date };
	});
}

/** Most recent snapshot that is at least `daysAgo` old (the trend baseline). Null until history exists. */
async function getBaselineSnapshot(db: Db, daysAgo: number): Promise<Document | null> {
	const cutoff = addDaysStr(todayTashkent(), -daysAgo);
	return db
		.collection(snapshotsCollection)
		.find({ date: { $lte: cutoff } })
		.sort({ date: -1 })
		.limit(1)
		.next();
}

// ——— Orchestrator ———

async function computeDashboardData(): Promise<DashboardData> {
	return withDb(async (db) => {
		const [core, contracts, newUsers, sales, reminders, funnel, referrals, baseline] = await Promise.all([
			computeStateAggregates(db),
			computeContracts(db),
			computeNewUsers(db),
			computeSales(db),
			computeReminderHealth(db),
			computeFunnel(db),
			computeReferralLeaderboard(db),
			getBaselineSnapshot(db, 30)
		]);

		const state: StateAggregates = {
			...core,
			receivables: contracts.receivables,
			overdue: contracts.overdue,
			overdueCount: contracts.overdueCount,
			activeContracts: contracts.activeContracts
		};
		const upcoming = { due7: contracts.due7, due30: contracts.due30 };

		const b = baseline as (StateAggregates & { date?: string; createdAt?: Date }) | null;

		// Dev-only trend preview: when DASHBOARD_MOCK_TRENDS=1 (never in production), fabricate
		// sample deltas for any card that lacks a real baseline, so the trend badges render for
		// local design review. Real baselines (snapshot / last month) always take priority.
		const mockTrends = process.env.NODE_ENV !== "production" && process.env.DASHBOARD_MOCK_TRENDS === "1";
		const MOCK_SAMPLES = [12.5, -20, 8.3, 4.5, -9.1, 15.2, 6.7, -4.2, 11];
		let mockSeed = 0;
		const t = (m: Metric): Metric => {
			if (!mockTrends || m.deltaPct != null) return m;
			const d = MOCK_SAMPLES[mockSeed++ % MOCK_SAMPLES.length];
			return { value: m.value, deltaPct: d, direction: d > 0 ? "up" : d < 0 ? "down" : "flat" };
		};

		// Dev-only sample data so the referral bar chart and activity split are visible locally.
		const mockReferrals = mockTrends && referrals.top.length === 0;
		const referralTop = mockReferrals
			? [
					{ code: "emp3", name: "Aziz Karimov", count: 42 },
					{ code: "emp1", name: "Dilnoza Yusupova", count: 31 },
					{ code: "emp7", name: "Bekzod Rahimov", count: 27 },
					{ code: "emp2", name: "Gulnora Sobirova", count: 19 },
					{ code: "emp5", name: "Sardor Aliyev", count: 12 }
				]
			: referrals.top;
		const referralTotal = mockReferrals ? 131 : referrals.totalReferred;
		const referralRate = mockReferrals
			? 18.4
			: state.customers > 0
				? Math.round((referrals.totalReferred / state.customers) * 1000) / 10
				: 0;

		return {
			cards: {
				customers: { ...t(metric(state.customers, b?.customers)), verified: state.verified },
				newThisMonth: t(metric(newUsers.thisMonth, newUsers.lastMonth)),
				salesThisMonth: { ...t(metric(sales.thisMonth.value, sales.lastMonth.value)), count: sales.thisMonth.count },
				receivables: t(metric(state.receivables, b?.receivables)),
				overdue: { ...t(metric(state.overdue, b?.overdue)), count: state.overdueCount },
				activeContracts: t(metric(state.activeContracts, b?.activeContracts)),
				lastVisitTrue: t(metric(state.lastVisitTrue, b?.lastVisitTrue)),
				contractFirstFalse: t(metric(state.contractFirstFalse, b?.contractFirstFalse)),
				bonusLiability: t(metric(state.bonusLiability, b?.bonusLiability))
			},
			monthlySales: sales.monthly,
			funnel,
			tiers: state.tiers,
			engagement: {
				activeStatus: mockTrends ? Math.max(state.activeStatus, 5) : state.activeStatus,
				inactiveStatus: mockTrends ? Math.max(state.inactiveStatus, 3) : state.inactiveStatus,
				lastVisitTrue: mockTrends ? Math.max(state.lastVisitTrue, 4) : state.lastVisitTrue
			},
			payments: {
				overdue: { amount: state.overdue, count: state.overdueCount },
				due7: upcoming.due7,
				due30: upcoming.due30,
				reminders
			},
			referrals: {
				totalReferred: referralTotal,
				ratePct: referralRate,
				top: referralTop
			},
			generatedAt: new Date().toISOString(),
			baselineDate: b?.date ?? null
		};
	});
}

// The dashboard doesn't need to be real-time; cache the computed payload so repeat/
// concurrent admin loads don't re-run the heavy aggregations. The "Yangilash" button
// passes force=true to recompute on demand.
let cache: { at: number; data: DashboardData } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getDashboardData(force = false): Promise<DashboardData> {
	if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
	const data = await computeDashboardData();
	cache = { at: Date.now(), data };
	return data;
}
