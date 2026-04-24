import { config } from "./config";

export type TelegramParseMode = "HTML" | "MarkdownV2" | "Markdown";

export type SendMessageParams = {
	chat_id: string | number;
	text: string;
	parse_mode?: TelegramParseMode;
};

export type TelegramMessage = {
	message_id: number;
	date: number;
	chat: { id: number; type: string };
	text?: string;
	[key: string]: unknown;
};

export class TelegramApiError extends Error {
	constructor(
		public description: string,
		public errorCode: number,
		public retryAfter?: number
	) {
		super(description);
		this.name = "TelegramApiError";
	}
}

/**
 * Calls Telegram Bot API `sendMessage` with just chat_id + text.
 * Other fields are intentionally omitted — this endpoint is scoped
 * to sending plain-text confirmation codes for external integrations.
 */
export async function sendTelegramMessage(params: SendMessageParams): Promise<TelegramMessage> {
	const url = `https://api.telegram.org/bot${config.BOT_TOKEN}/sendMessage`;
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(params)
	});
	const data = (await res.json()) as {
		ok: boolean;
		result?: TelegramMessage;
		error_code?: number;
		description?: string;
		parameters?: { retry_after?: number };
	};

	if (!data.ok || !data.result) {
		throw new TelegramApiError(data.description || "Telegram API error", data.error_code ?? res.status, data.parameters?.retry_after);
	}
	return data.result;
}
