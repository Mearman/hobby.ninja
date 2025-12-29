"use client";

import { ActionIcon, Affix, Transition, rem } from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

/**
 * Scroll-to-top button that appears when scrolled past the top of the page.
 * Positioned above the PWA install button.
 */
export function ScrollToTop() {
	const [showButton, setShowButton] = useState(false);

	useEffect(() => {
		let ticking = false;

		const handleScroll = () => {
			if (!ticking) {
				requestAnimationFrame(() => {
					setShowButton(window.scrollY > 0);
					ticking = false;
				});
				ticking = true;
			}
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		// Check initial position
		handleScroll();

		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	const scrollToTop = useCallback(() => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, []);

	return (
		<Affix position={{ bottom: rem(70), right: rem(20) }} style={{ zIndex: 1000 }}>
			<Transition transition="slide-up" mounted={showButton}>
				{(transitionStyles) => (
					<ActionIcon
						size="lg"
						radius="xl"
						variant="filled"
						color="gray"
						onClick={scrollToTop}
						style={transitionStyles}
						aria-label="Scroll to top"
					>
						<IconArrowUp size={20} />
					</ActionIcon>
				)}
			</Transition>
		</Affix>
	);
}
