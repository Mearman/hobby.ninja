import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import React from "react";

import { theme } from "../lib/theme";

interface MantineThemeProviderProps {
	children: React.ReactNode;
}

export function MantineThemeProvider({ children }: MantineThemeProviderProps) {
	return (
		<MantineProvider theme={theme}>
			<ModalsProvider>
				<Notifications
					position="top-right"
					limit={5}
					zIndex={9999}
					containerWidth={400}
				/>
				{children}
			</ModalsProvider>
		</MantineProvider>
	);
}