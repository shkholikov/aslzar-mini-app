"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import useSWR from "swr";
import { apiRequest, ApiError } from "@/lib/api-client";
import { useTelegram } from "./useTelegram";

interface UserContextType {
	data: any | null;
	loading: boolean;
	error: string | null;
	refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

const userFetcher = async (path: string) => {
	try {
		return await apiRequest(path);
	} catch (err) {
		if (err instanceof ApiError && err.status === 404) return null;
		throw err;
	}
};

export function UserProvider({ children }: { children: ReactNode }) {
	const tg = useTelegram();
	// Only fetch once Telegram WebApp is ready and we have initData (the API requires it).
	const swrKey = tg && typeof window !== "undefined" && window.Telegram?.WebApp?.initData ? "/v1/users/me" : null;

	const { data, error, isLoading, mutate } = useSWR(swrKey, userFetcher, {
		revalidateOnFocus: false,
		dedupingInterval: 60_000,
		keepPreviousData: true,
		errorRetryCount: 2
	});

	const value = useMemo<UserContextType>(
		() => ({
			data: data ?? null,
			loading: !tg || (swrKey !== null && isLoading && data === undefined),
			error: error ? (error instanceof Error ? error.message : String(error)) : null,
			refreshUserData: async () => {
				await mutate();
			}
		}),
		[tg, swrKey, data, isLoading, error, mutate]
	);

	return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
	const context = useContext(UserContext);
	if (!context) {
		throw new Error("useUser must be used within a UserProvider");
	}
	return context;
}
