"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useTelegram } from "./useTelegram";

interface UserContextType {
	data: any | null;
	loading: boolean;
	error: string | null;
	refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

interface UserProviderProps {
	children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
	const tg = useTelegram();
	const [data, setData] = useState<any | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchUserData = async () => {
		if (!tg) {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const userData = tg.initDataUnsafe?.user;
			const userId = userData?.id?.toString();

			if (!userId) {
				setLoading(false);
				return;
			}

			const response = await fetch(`/api/users?userId=${userId}`);
			if (!response.ok) {
				throw new Error(`Failed to fetch user data: ${response.status}`);
			}

			const responseData = await response.json();
			setData(responseData);
		} catch (err) {
			console.error("Error fetching 1C user data:", err);
			setError(err instanceof Error ? err.message : "Failed to fetch user data");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (tg) {
			fetchUserData();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tg]);

	return (
		<UserContext.Provider
			value={{
				data,
				loading,
				error,
				refreshUserData: fetchUserData
			}}
		>
			{children}
		</UserContext.Provider>
	);
}

export function useUser() {
	const context = useContext(UserContext);
	if (!context) {
		throw new Error("useUser must be used within a UserProvider");
	}
	return context;
}
