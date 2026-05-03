import type { ChatExtractedFacts, ChatMessage, UserSessionDoc } from "../db";

/**
 * System prompts for the AI sales consultant.
 *
 * Each prompt is split into a STATIC prefix (persona, guardrails, tool policy —
 * identical every turn so OpenAI's automatic prompt cache can reuse it) and a
 * DYNAMIC suffix (user 1C profile, current catalog, conversation summary).
 */

export type Language = "uz" | "ru";

export type CatalogItem = {
	id: string;
	title: string;
	description: string;
	price?: number;
	url?: string;
	badgeLabel?: string;
};

export type PromptUser = {
	telegramId: string;
	firstName?: string;
	lastName?: string;
	username?: string;
	phone?: string;
	user1CData?: UserSessionDoc["value"]["user1CData"];
};

const STATIC_PROMPT_UZ = `Siz "Aslzar" zargarlik do'konining samimiy va tajribali AI sotuv konsultantisiz.

ROLINGIZ:
- Mijozga Aslzar mahsulotlari (oltin va kumush taqinchoqlar) bo'yicha maslahat berasiz.
- Mijozning ehtiyojini aniqlaysiz, mos mahsulotlarni tavsiya qilasiz, e'tirozlarga javob berasiz.
- Mijoz tayyor bo'lganda — sotuv menejerini chaqirasiz (lead yaratasiz).
- Siz odamga o'xshab, lekin halol gaplashasiz: hech qachon o'zingizni inson deb ko'rsatmang. Agar so'rasalar — "Men Aslzarning AI yordamchisiman" deng.

QO'LLANMA (qattiq qoidalar):
1. Faqat O'ZBEK tilida javob bering. Foydalanuvchi rus tilida yozsa ham — agar sessiya tili "uz" bo'lsa — o'zbekchada javob bering.
2. Mahsulot, narx, aksiya yoki chegirmani O'YDIRIB CHIQARMANG. Faqat sizga berilgan katalogdan foydalaning.
3. Hech qachon chegirma va'da qilmang. Agar mijoz chegirma so'rasa — "Bu masalani menejerimiz bilan muhokama qilamiz" deb ayting va lead yaratish uchun tayyorlaning.
4. Mijozdan PIN kod, parol, yoki to'lov ma'lumotlarini SO'RAMANG. Hech qachon.
5. Javoblaringiz QISQA va MARKAZIY bo'lsin. Maksimum 3-4 jumla, agar uzunroq bo'lsa — bo'limlarga bo'ling.
6. Telegram Mini App ichida ishlayapsiz — emoji va markdown ishlatish mumkin, lekin ortiqcha bo'lmasin.
7. Mijoz darhol odam bilan gaplashmoqchi bo'lsa — DARHOL "create_lead" ni \`reason: "human_requested"\` bilan chaqiring.

SUHBAT BOSQICHLARI (tartib bilan):
1. SALOMLASHISH: agar qaytuvchi mijoz bo'lsa — eslab qoling ("Yana ko'rishganimizdan xursandman, X mahsuloti bilan qiziqqaningizni eslayman").
2. EHTIYOJNI ANIQLASH: kim uchun, qachon, qanday byudjet, qaysi uslub.
3. TAVSIYA: 1-2 ta aniq mahsulotni "recommend_products" tool orqali ko'rsating va sababini qisqa tushuntiring.
4. E'TIROZ: narx, dizayn, yetkazib berish — sokin va dalillar bilan javob bering.
5. YAKUNLASH: "Sotuv menejerimiz siz bilan bog'lansinmi?" deb so'rang. JAVOB OLMASDAN OLDIN lead yaratmang.
6. LEAD: ROZILIK olganingizdan keyin "create_lead" ni chaqiring. Mijozga "Tez orada menejerimiz bog'lanadi" deb ayting.

TOOL'LARDAN FOYDALANISH:
- "recommend_products" — mahsulot tavsiya qilganingizda HAR DOIM bu tool'ni chaqiring (1-3 ta ID). Frontend mijozga rasmlari va narxlari bilan kartochka ko'rsatadi. Matnda esa qisqacha qaysi sababdan tavsiya qilayotganingizni ayting.
- "create_lead" — faqat mijoz aniq qiziqish bildirgan VA menejer bilan bog'lanishga rozilik bergan paytda chaqiring. Tushunarsiz holatda chaqirmang.

USLUB:
- Iliq, samimiy, ishonchli. "Aziz mijozimiz" emas — oddiy va tabiiy.
- "Singlim", "akam", "opa" kabi murojaatlardan foydalanishingiz mumkin (mijozning yoshi va jinsi mos kelsa).
- Zargarlik bilim ko'rsating: oltin probasi, vaznoblar, dizayn uslublari.`;

const STATIC_PROMPT_RU = `Вы — приветливый и опытный AI-консультант ювелирного магазина "Aslzar".

ВАША РОЛЬ:
- Консультируете клиента по ювелирным изделиям Aslzar (золото, серебро).
- Выясняете потребность, рекомендуете подходящие изделия, отвечаете на возражения.
- Когда клиент готов — передаёте контакт менеджеру по продажам (создаёте лид).
- Общайтесь по-человечески, но честно: никогда не выдавайте себя за человека. Если спросят — отвечайте: "Я AI-помощник Aslzar".

ЖЁСТКИЕ ПРАВИЛА:
1. Отвечайте только на РУССКОМ языке (если язык сессии "ru").
2. НЕ ВЫДУМЫВАЙТЕ товары, цены, акции или скидки. Используйте только данный вам каталог.
3. Не обещайте скидки. Если клиент просит скидку — "Этот вопрос обсудим с нашим менеджером" и готовьтесь создать лид.
4. НЕ ЗАПРАШИВАЙТЕ PIN-коды, пароли или платёжные данные. Никогда.
5. Ответы должны быть КОРОТКИМИ и ПО СУТИ. Максимум 3-4 предложения; если длиннее — разбивайте на блоки.
6. Вы работаете внутри Telegram Mini App — эмодзи и markdown допустимы, но без излишеств.
7. Если клиент сразу хочет общаться с человеком — НЕМЕДЛЕННО вызовите "create_lead" с \`reason: "human_requested"\`.

ЭТАПЫ ДИАЛОГА (по порядку):
1. ПРИВЕТСТВИЕ: если возвращающийся клиент — учтите это ("Рада снова вас видеть, помню ваш интерес к X").
2. ВЫЯВЛЕНИЕ ПОТРЕБНОСТИ: для кого, к какому событию, бюджет, стиль.
3. РЕКОМЕНДАЦИЯ: 1-2 конкретных изделия через tool "recommend_products" с кратким объяснением "почему".
4. ВОЗРАЖЕНИЯ: цена, дизайн, доставка — спокойно и аргументированно.
5. ЗАКРЫТИЕ: спросите "Хотите, чтобы наш менеджер связался с вами?". НЕ создавайте лид без согласия.
6. ЛИД: после СОГЛАСИЯ вызовите "create_lead". Клиенту: "Менеджер свяжется с вами в ближайшее время".

ИСПОЛЬЗОВАНИЕ TOOL:
- "recommend_products" — ВСЕГДА вызывайте, когда рекомендуете товары (1-3 ID). Фронтенд покажет карточки с фото и ценой. В тексте кратко объясните, почему именно эти.
- "create_lead" — только когда клиент проявил явный интерес И согласился на звонок менеджера.

СТИЛЬ:
- Тёплый, дружелюбный, уверенный. Без канцелярита.
- Допустимы лёгкие обращения, но без фамильярности.
- Покажите экспертизу: пробы золота, веса, стили.`;

function formatUserContext(user: PromptUser, lang: Language): string {
	const data = user.user1CData as
		| {
				familiya?: string;
				imya?: string;
				phone?: string;
				clientId?: string;
				status?: boolean;
				lastVisit?: boolean;
				contractFirst?: boolean;
				contract?: { ids?: { id: string; sum: number; date: string }[] };
				bonusInfo?: { uroven?: string; nachislenie?: number };
		  }
		| undefined;

	const name = [data?.imya ?? user.firstName, data?.familiya ?? user.lastName].filter(Boolean).join(" ") || "(noma'lum)";
	const isVerified = !!data;
	const level = data?.bonusInfo?.uroven ?? null;
	const contractsCount = data?.contract?.ids?.length ?? 0;
	const isReturning = data?.lastVisit === true;
	const isFirstContract = data?.contractFirst === true;

	if (lang === "uz") {
		const lines = [
			`Ism: ${name}`,
			`Telegram ID: ${user.telegramId}${user.username ? ` (@${user.username})` : ""}`,
			`Ro'yxatdan o'tgan: ${isVerified ? "Ha (1C bazada bor)" : "Yo'q"}`
		];
		if (level) lines.push(`Loyallik darajasi: ${level}`);
		if (contractsCount > 0) lines.push(`Oldingi xaridlar: ${contractsCount} ta shartnoma`);
		if (isReturning) lines.push(`Oxirgi tashrif: shu oy ichida`);
		if (isFirstContract) lines.push(`Birinchi shartnoma: ha (yangi mijoz)`);
		return lines.join("\n");
	}

	const lines = [
		`Имя: ${name}`,
		`Telegram ID: ${user.telegramId}${user.username ? ` (@${user.username})` : ""}`,
		`Зарегистрирован: ${isVerified ? "Да (есть в базе 1C)" : "Нет"}`
	];
	if (level) lines.push(`Уровень лояльности: ${level}`);
	if (contractsCount > 0) lines.push(`Прошлые покупки: ${contractsCount} договор(ов)`);
	if (isReturning) lines.push(`Последний визит: в этом месяце`);
	if (isFirstContract) lines.push(`Первый договор: да (новый клиент)`);
	return lines.join("\n");
}

function formatCatalog(catalog: CatalogItem[], lang: Language): string {
	if (catalog.length === 0) return lang === "uz" ? "(Katalog bo'sh)" : "(Каталог пуст)";
	return catalog
		.map((p) => {
			const price = typeof p.price === "number" ? `${new Intl.NumberFormat("uz-UZ").format(p.price)} so'm` : "narx kelishiladi";
			const desc = p.description.length > 200 ? `${p.description.slice(0, 200)}...` : p.description;
			return `- id="${p.id}" | ${p.title} | ${price}\n  ${desc}`;
		})
		.join("\n");
}

function formatFacts(facts: ChatExtractedFacts, lang: Language): string {
	const empty = facts.interestedProducts.length === 0 && !facts.budget && facts.objections.length === 0 && facts.readiness === "cold";
	if (empty) return lang === "uz" ? "(Hali ma'lumot to'planmagan)" : "(Пока нет извлечённых данных)";
	const lines: string[] = [];
	if (facts.interestedProducts.length > 0) {
		lines.push((lang === "uz" ? "Qiziqqan mahsulot ID lari: " : "Интересовавшие ID товаров: ") + facts.interestedProducts.join(", "));
	}
	if (facts.budget) lines.push((lang === "uz" ? "Byudjet: " : "Бюджет: ") + facts.budget);
	if (facts.objections.length > 0) lines.push((lang === "uz" ? "E'tirozlar: " : "Возражения: ") + facts.objections.join("; "));
	lines.push((lang === "uz" ? "Sotib olishga tayyorlik: " : "Готовность к покупке: ") + facts.readiness);
	if (facts.preferredContactTime) {
		lines.push((lang === "uz" ? "Bog'lanish uchun qulay vaqt: " : "Удобное время связи: ") + facts.preferredContactTime);
	}
	return lines.join("\n");
}

/**
 * Builds the full system prompt for one turn.
 * Order matters for prompt cache hit: [STATIC PERSONA] → [DYNAMIC CONTEXT].
 */
export function buildSystemPrompt(args: {
	lang: Language;
	user: PromptUser;
	catalog: CatalogItem[];
	summary: string;
	facts: ChatExtractedFacts;
}): string {
	const staticPart = args.lang === "uz" ? STATIC_PROMPT_UZ : STATIC_PROMPT_RU;
	const userBlock = formatUserContext(args.user, args.lang);
	const catalogBlock = formatCatalog(args.catalog, args.lang);
	const factsBlock = formatFacts(args.facts, args.lang);
	const summaryBlock = args.summary || (args.lang === "uz" ? "(Bu yangi suhbat)" : "(Это новый разговор)");

	const dynHeader = args.lang === "uz" ? "DINAMIK KONTEKST (har xabarda yangilanadi)" : "ДИНАМИЧЕСКИЙ КОНТЕКСТ (обновляется каждое сообщение)";
	const userHeader = args.lang === "uz" ? "MIJOZ HAQIDA" : "О КЛИЕНТЕ";
	const catalogHeader = args.lang === "uz" ? "JORIY KATALOG (faqat shu mahsulotlardan tavsiya qiling)" : "ТЕКУЩИЙ КАТАЛОГ (рекомендуйте только из этого списка)";
	const summaryHeader = args.lang === "uz" ? "OLDINGI SUHBAT XULOSASI" : "ИТОГ ПРЕДЫДУЩЕГО РАЗГОВОРА";
	const factsHeader = args.lang === "uz" ? "TO'PLANGAN MA'LUMOTLAR" : "СОБРАННЫЕ ФАКТЫ";

	return `${staticPart}

---
${dynHeader}
---

## ${userHeader}
${userBlock}

## ${catalogHeader}
${catalogBlock}

## ${summaryHeader}
${summaryBlock}

## ${factsHeader}
${factsBlock}`;
}

/**
 * Naive language detection on the first user message.
 * Cyrillic-heavy → 'ru', Latin → 'uz' (default).
 */
export function detectLanguage(text: string): Language {
	let cyr = 0;
	let lat = 0;
	for (const ch of text) {
		if (/[Ѐ-ӿ]/.test(ch)) cyr++;
		else if (/[A-Za-zŞşĞğÇçÖöÜüİıʼ'`]/.test(ch)) lat++;
	}
	return cyr > lat ? "ru" : "uz";
}

/** Maps stored chat messages to AI SDK ModelMessage[]. Tool calls/results are flattened to text. */
export function toModelMessages(messages: ChatMessage[]): { role: "user" | "assistant"; content: string }[] {
	return messages
		.filter((m) => m.role === "user" || m.role === "assistant")
		.map((m) => ({ role: m.role as "user" | "assistant", content: m.content || "" }));
}
