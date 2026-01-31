export const greetingText = `
*Assalomu alaykum, \${name}\\! 👋*

*ASLZAR💎* Telegram botiga xush kelibsiz\\.

Iltimos, o'zingizni tasdiqlash uchun telefon raqamingizni yuboring\\.

Telefon raqamingizni yuborish uchun pastdagi tugmani bosing\\.
`;

export const infoText = `
*ASLZAR💎* — Sizning sodiqlik va zamonaviy to'lovlar markazingiz\\.

📲 Tez, xavfsiz va ishonchli to'lovlar, doimiy keshbek va maxsus takliflar aynan shu platformada\\.

*Platformada imkoniyatlar:*
\\- Qulay interfeys va tez ro'yxatdan o'tish\\.
\\- Avtomatik keshbek va sodiqlik bonusi\\.
\\- Yuqori darajadagi ma'lumot xavfsizligi\\.
\\- 24\\/7 yordam xizmati\\.

⬇️ ASLZAR imkoniyatlaridan foydalanish uchun pastdagi tugmani bosing\\.
`;

export const subscribeRequestText = `
Iltimos, *ASLZAR💎* Rasmiy telegram kanaliga a'zo bo'ling\\.

✅ A'zo bo'lgach, "🔎 A'zolikni tekshirish" tugmasini bosing\\.
`;

// ——— Payment reminder. Replace {paymentList} with one or more blocks (each block: {contractId}, {date}, {sum}) ———

export const paymentReminderText = `
ASLZAR💎 To'lov eslatmasi

⏰ Hurmatli mijoz, yaqinlashib kelayotgan to'lovlaringiz haqida eslatamiz:

{paymentList}

To'lovlaringizni o'z vaqtida amalga oshirishingizni so'rab qolamiz!

Hurmat bilan, ASLZAR💎
`;

/** One payment block (repeat for each payment). Placeholders: {contractId}, {date}, {sum} */
export const paymentReminderItem = `
📑 Shartnoma raqami: {contractId}
📅 To'lov sanasi: {date}
🧾 Miqdor: {sum}
`;
