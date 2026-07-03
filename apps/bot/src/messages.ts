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

// ——— Referral added notification (sent to the inviter, MarkdownV2). Placeholder: {name} — pre-escaped invited user's name ———

export const referralAddedText = `
🎉 *ASLZAR💎 — Yangi referal\\!*

👤 Siz taklif qilgan *{name}* referal sifatida ro'yxatga olindi\\.

⏳ Agar u *10 kun ichida* xarid qilsa — xarid summasidan sizga *bonus* beriladi\\.

📱 Referallaringiz holatini ilovadagi *Referal* bo'limida kuzatishingiz mumkin\\.
`;
