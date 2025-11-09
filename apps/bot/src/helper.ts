import { MyContext, ISessionData } from "./types";

export function initializeSession(ctx: MyContext): void {
	if (!ctx.from) return;

	ctx.session = {
		id: ctx.from.id,
		username: ctx.from.username,
		first_name: ctx.from.first_name,
		last_name: ctx.from.last_name,
		createdAt: new Date()
	} as ISessionData;
}
