import { NextRequest, NextResponse } from "next/server";
import { getUserDataByUserId } from "@/lib/db";

const AMOCRM_BASE_URL = process.env.AMOCRM_BASE_URL || "";
const AMOCRM_API_TOKEN = process.env.AMOCRM_API_TOKEN || "";
const AMOCRM_PIPELINE_ID = process.env.AMOCRM_PIPELINE_ID || "";

/** Contact phone field in aslzar amoCRM */
const AMOCRM_PHONE_FIELD_ID = 305861;
/** MOB enum for phone type */
const AMOCRM_PHONE_ENUM_MOB = 179009;
const AMOCRM_TELEGRAM_USERNAME_FIELD_ID = 812873;
const AMOCRM_TELEGRAM_ID_FIELD_ID = 812875;

function authHeaders(): HeadersInit {
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${AMOCRM_API_TOKEN}`
	};
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json().catch(() => ({}));
		const { userId, productId, productTitle, productDescription, productPrice, productUrl } = body;

		if (!userId || typeof userId !== "string") {
			return NextResponse.json({ error: "userId is required" }, { status: 400 });
		}
		if (!productId || typeof productId !== "string") {
			return NextResponse.json({ error: "productId is required" }, { status: 400 });
		}
		if (!productTitle || typeof productTitle !== "string") {
			return NextResponse.json({ error: "productTitle is required" }, { status: 400 });
		}

		if (!AMOCRM_BASE_URL || !AMOCRM_API_TOKEN || !AMOCRM_PIPELINE_ID) {
			return NextResponse.json({ error: "AmoCRM configuration is missing (AMOCRM_BASE_URL, AMOCRM_API_TOKEN, AMOCRM_PIPELINE_ID)" }, { status: 500 });
		}

		const user = await getUserDataByUserId(userId);
		if (!user?.phone_number) {
			return NextResponse.json({ error: "User not found or phone number not available. Please register in the app first." }, { status: 404 });
		}

		const phone = user.phone_number.startsWith("+") ? user.phone_number : `+${user.phone_number}`;
		const firstName = user.first_name ?? "";
		const lastName = user.last_name ?? "";

		const contactCustomFields: { field_id: number; values: { value: string; enum_id?: number }[] }[] = [
			{ field_id: AMOCRM_PHONE_FIELD_ID, values: [{ value: phone, enum_id: AMOCRM_PHONE_ENUM_MOB }] }
		];
		if (user.username) {
			contactCustomFields.push({ field_id: AMOCRM_TELEGRAM_USERNAME_FIELD_ID, values: [{ value: user.username }] });
		}
		contactCustomFields.push({ field_id: AMOCRM_TELEGRAM_ID_FIELD_ID, values: [{ value: userId }] });

		const leadName = `Telegram Bot: ${productTitle}`;
		const pipelineId = Number(AMOCRM_PIPELINE_ID);
		if (!Number.isFinite(pipelineId)) {
			return NextResponse.json({ error: "Invalid AMOCRM_PIPELINE_ID" }, { status: 500 });
		}

		const complexPayload = [
			{
				name: leadName,
				pipeline_id: pipelineId,
				created_by: 0,
				_embedded: {
					contacts: [
						{
							first_name: firstName,
							last_name: lastName,
							name: [firstName, lastName].filter(Boolean).join(" ") || phone,
							custom_fields_values: contactCustomFields
						}
					]
				}
			}
		];

		const complexRes = await fetch(`${AMOCRM_BASE_URL.replace(/\/$/, "")}/api/v4/leads/complex`, {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify(complexPayload)
		});

		if (!complexRes.ok) {
			const errText = await complexRes.text();
			console.error("AmoCRM leads/complex error:", complexRes.status, errText);
			return NextResponse.json({ error: "Failed to create lead in AmoCRM", details: errText }, { status: complexRes.status >= 500 ? 502 : 400 });
		}

		const complexData = (await complexRes.json()) as { _embedded?: { leads?: { id: number }[] } };
		const leadId = complexData._embedded?.leads?.[0]?.id;

		if (leadId) {
			const noteLines = [
				`Mahsulot: ${productTitle}`,
				productDescription ? `Tavsif: ${productDescription}` : null,
				productPrice != null && Number.isFinite(Number(productPrice))
					? `Narxi: ${new Intl.NumberFormat("uz-UZ").format(Number(productPrice))} so'm`
					: null,
				productUrl ? `URL: ${productUrl}` : null,
				`Product ID: ${productId}`
			].filter(Boolean);
			const notePayload = [
				{
					entity_id: leadId,
					note_type: "common",
					params: { text: noteLines.join("\n") }
				}
			];

			const noteRes = await fetch(`${AMOCRM_BASE_URL.replace(/\/$/, "")}/api/v4/leads/notes`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify(notePayload)
			});
			if (!noteRes.ok) {
				console.warn("AmoCRM lead note failed:", await noteRes.text());
			}
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Product interest error:", error);
		return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
	}
}
