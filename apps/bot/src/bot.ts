import { config } from "dotenv";
import { Bot } from "grammy";

config();

// Get bot token and webapp url from environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || "https://aslzar.uz"; // fallback

if (!BOT_TOKEN) {
	throw new Error("BOT_TOKEN environment variable is required!");
}

const bot = new Bot(BOT_TOKEN);

bot.command("start", async (ctx) => {
	const name = ctx.from?.first_name || "hurmatli Mijoz";
	await ctx.reply(`Salom, ${name}! 👋\nASLZAR Telegram ilovasiga hush kelibsiz.`, {
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: "Open ASLZAR App",
						web_app: { url: "https://google.com" }
					}
				]
			]
		}
	});
});

bot.on("message", (ctx) => ctx.reply("Got another message!"));

// Start the bot.
bot.start();
