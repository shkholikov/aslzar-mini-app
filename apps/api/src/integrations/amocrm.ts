import { config } from "../config";

/**
 * AmoCRM client — creates a lead with an embedded contact, then attaches a note
 * with product details. Mirrors the previous webapp /api/product-interest flow.
 *
 * Field IDs are hardcoded for the aslzar AmoCRM account (same as before).
 */

const AMOCRM_PHONE_FIELD_ID = 305861;
const AMOCRM_PHONE_ENUM_MOB = 179009;
const AMOCRM_TELEGRAM_USERNAME_FIELD_ID = 812873;
const AMOCRM_TELEGRAM_ID_FIELD_ID = 812875;

export class AmoCRMError extends Error {
	constructor(
		public readonly status: number,
		public readonly bodyText: string
	) {
		super(`AmoCRM error (${status}): ${bodyText.slice(0, 200)}`);
	}
}

function authHeaders(): Record<string, string> {
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${config.AMOCRM_API_TOKEN}`
	};
}

function baseUrl(): string {
	return config.AMOCRM_BASE_URL.replace(/\/$/, "");
}

function ensureConfigured(): void {
	if (!config.AMOCRM_BASE_URL || !config.AMOCRM_API_TOKEN || !config.AMOCRM_PIPELINE_ID) {
		throw new Error("AmoCRM not configured (AMOCRM_BASE_URL / AMOCRM_API_TOKEN / AMOCRM_PIPELINE_ID missing)");
	}
}

export type CreateProductInterestLeadInput = {
	telegramUserId: string;
	phone: string;
	firstName: string;
	lastName: string;
	username?: string;
	productTitle: string;
	productId: string;
	productDescription?: string;
	productPrice?: number;
	productUrl?: string;
};

/** Creates a lead + embedded contact, returns the new lead id (or null if AmoCRM didn't surface one). */
export async function createProductInterestLead(input: CreateProductInterestLeadInput): Promise<{ leadId: number | null }> {
	ensureConfigured();
	const pipelineId = Number(config.AMOCRM_PIPELINE_ID);
	if (!Number.isFinite(pipelineId)) throw new Error("Invalid AMOCRM_PIPELINE_ID");

	const phone = input.phone.startsWith("+") ? input.phone : `+${input.phone}`;
	const contactCustomFields: { field_id: number; values: { value: string; enum_id?: number }[] }[] = [
		{ field_id: AMOCRM_PHONE_FIELD_ID, values: [{ value: phone, enum_id: AMOCRM_PHONE_ENUM_MOB }] }
	];
	if (input.username) {
		contactCustomFields.push({ field_id: AMOCRM_TELEGRAM_USERNAME_FIELD_ID, values: [{ value: input.username }] });
	}
	contactCustomFields.push({ field_id: AMOCRM_TELEGRAM_ID_FIELD_ID, values: [{ value: input.telegramUserId }] });

	const payload = [
		{
			name: `Telegram Bot: ${input.productTitle}`,
			pipeline_id: pipelineId,
			created_by: 0,
			_embedded: {
				contacts: [
					{
						first_name: input.firstName,
						last_name: input.lastName,
						name: [input.firstName, input.lastName].filter(Boolean).join(" ") || phone,
						custom_fields_values: contactCustomFields
					}
				]
			}
		}
	];

	const res = await fetch(`${baseUrl()}/api/v4/leads/complex`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify(payload)
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new AmoCRMError(res.status, text);
	}

	const data = (await res.json()) as { _embedded?: { leads?: { id: number }[] } };
	const leadId = data._embedded?.leads?.[0]?.id ?? null;

	if (leadId) {
		const noteLines = [
			`Mahsulot: ${input.productTitle}`,
			input.productDescription ? `Tavsif: ${input.productDescription}` : null,
			input.productPrice != null && Number.isFinite(input.productPrice)
				? `Narxi: ${new Intl.NumberFormat("uz-UZ").format(input.productPrice)} so'm`
				: null,
			input.productUrl ? `URL: ${input.productUrl}` : null,
			`Product ID: ${input.productId}`
		].filter(Boolean);

		const notePayload = [
			{
				entity_id: leadId,
				note_type: "common",
				params: { text: noteLines.join("\n") }
			}
		];

		// Note attachment is best-effort — don't fail the request if notes don't land.
		fetch(`${baseUrl()}/api/v4/leads/notes`, {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify(notePayload)
		})
			.then(async (noteRes) => {
				if (!noteRes.ok) {
					console.warn("[amocrm] lead note failed:", noteRes.status, await noteRes.text().catch(() => ""));
				}
			})
			.catch((err) => console.warn("[amocrm] lead note threw:", err));
	}

	return { leadId };
}

export type CreateChatLeadInput = {
	telegramUserId: string;
	phone: string;
	firstName: string;
	lastName: string;
	username?: string;
	language: "uz" | "ru";
	summary: string;
	readiness: "warm" | "hot";
	reason: "ready_to_buy" | "human_requested" | "wants_more_info";
	budget?: string;
	preferredContactTime?: string;
	interestedProducts: { id: string; title: string; price?: number; url?: string }[];
	objections: string[];
};

/**
 * Creates an AmoCRM lead originating from the AI sales chat.
 * Same lead/contact pattern as `createProductInterestLead`, but the attached
 * note is much richer: chat summary, all interested products, objections,
 * readiness signal, preferred contact time. This is what the human sales
 * manager sees when they pick up the lead.
 */
export async function createChatLead(input: CreateChatLeadInput): Promise<{ leadId: number | null }> {
	ensureConfigured();
	const pipelineId = Number(config.AMOCRM_PIPELINE_ID);
	if (!Number.isFinite(pipelineId)) throw new Error("Invalid AMOCRM_PIPELINE_ID");

	const phone = input.phone.startsWith("+") ? input.phone : `+${input.phone}`;
	const contactCustomFields: { field_id: number; values: { value: string; enum_id?: number }[] }[] = [
		{ field_id: AMOCRM_PHONE_FIELD_ID, values: [{ value: phone, enum_id: AMOCRM_PHONE_ENUM_MOB }] }
	];
	if (input.username) {
		contactCustomFields.push({ field_id: AMOCRM_TELEGRAM_USERNAME_FIELD_ID, values: [{ value: input.username }] });
	}
	contactCustomFields.push({ field_id: AMOCRM_TELEGRAM_ID_FIELD_ID, values: [{ value: input.telegramUserId }] });

	const headlineProduct = input.interestedProducts[0]?.title ?? (input.language === "uz" ? "Maslahat suhbati" : "Консультация");
	const leadName = `AI Chat: ${headlineProduct}${input.readiness === "hot" ? " (HOT)" : ""}`;

	const payload = [
		{
			name: leadName,
			pipeline_id: pipelineId,
			created_by: 0,
			_embedded: {
				contacts: [
					{
						first_name: input.firstName,
						last_name: input.lastName,
						name: [input.firstName, input.lastName].filter(Boolean).join(" ") || phone,
						custom_fields_values: contactCustomFields
					}
				]
			}
		}
	];

	const res = await fetch(`${baseUrl()}/api/v4/leads/complex`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify(payload)
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new AmoCRMError(res.status, text);
	}

	const data = (await res.json()) as { _embedded?: { leads?: { id: number }[] } };
	const leadId = data._embedded?.leads?.[0]?.id ?? null;

	if (leadId) {
		const fmtPrice = (p?: number) => (typeof p === "number" && isFinite(p) ? `${new Intl.NumberFormat("uz-UZ").format(p)} so'm` : "");

		const productLines =
			input.interestedProducts.length > 0
				? input.interestedProducts
						.map((p, i) => `  ${i + 1}. ${p.title}${p.price ? ` — ${fmtPrice(p.price)}` : ""}${p.url ? `\n     ${p.url}` : ""}`)
						.join("\n")
				: "  —";

		const reasonText: Record<typeof input.reason, string> = {
			ready_to_buy: "Sotib olishga tayyor",
			human_requested: "Mijoz menejer bilan gaplashishni so'radi",
			wants_more_info: "Qo'shimcha ma'lumot kerak"
		};

		const sections = [
			`AI sales chat lead [${input.language.toUpperCase()}]`,
			`Tilladalik: ${input.readiness.toUpperCase()}`,
			`Sabab: ${reasonText[input.reason]}`,
			"",
			"SUHBAT XULOSASI:",
			input.summary,
			"",
			"QIZIQQAN MAHSULOTLAR:",
			productLines
		];

		if (input.budget) sections.push("", `Byudjet: ${input.budget}`);
		if (input.preferredContactTime) sections.push(`Bog'lanish vaqti: ${input.preferredContactTime}`);
		if (input.objections.length > 0) {
			sections.push("", "E'TIROZLAR:", ...input.objections.map((o) => `  - ${o}`));
		}
		sections.push("", `Telegram: ${input.username ? `@${input.username} ` : ""}(id: ${input.telegramUserId})`);

		const notePayload = [
			{
				entity_id: leadId,
				note_type: "common",
				params: { text: sections.join("\n") }
			}
		];

		fetch(`${baseUrl()}/api/v4/leads/notes`, {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify(notePayload)
		})
			.then(async (noteRes) => {
				if (!noteRes.ok) {
					console.warn("[amocrm] chat lead note failed:", noteRes.status, await noteRes.text().catch(() => ""));
				}
			})
			.catch((err) => console.warn("[amocrm] chat lead note threw:", err));
	}

	return { leadId };
}
