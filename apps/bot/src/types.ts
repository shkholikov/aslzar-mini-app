import { Context, SessionFlavor } from "grammy";

export interface ISessionData {
	id: number;
	username: string;
	first_name: string;
	last_name: string;
	phone_number?: string;
	createdAt: Date;
}

export type MyContext = Context & SessionFlavor<Partial<ISessionData>>;
