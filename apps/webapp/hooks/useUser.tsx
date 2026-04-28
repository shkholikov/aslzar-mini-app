"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import useSWR from "swr";
import { useTelegram } from "./useTelegram";

interface UserContextType {
	data: any | null;
	loading: boolean;
	error: string | null;
	refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

const userFetcher = async (url: string) => {
	const response = await fetch(url);
	if (response.status === 404) return null;
	if (!response.ok) throw new Error(`Failed to fetch user data: ${response.status}`);
	return response.json();
};

export function UserProvider({ children }: { children: ReactNode }) {
	const tg = useTelegram();
	const userId = tg?.initDataUnsafe?.user?.id?.toString();
	const swrKey = userId ? `/api/users?userId=${userId}` : null;

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
