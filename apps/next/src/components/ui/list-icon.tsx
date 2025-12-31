import {
	IconStar,
	IconPackage,
	IconHammer,
	IconSparkles,
	IconClipboardList,
	IconList,
	IconFolder,
	IconHeart,
	IconBookmark,
	IconTag,
	IconBox,
	IconChecklist,
	type Icon,
} from "@tabler/icons-react";

/** Map of icon names to Tabler icon components */
const iconMap: Record<string, Icon> = {
	star: IconStar,
	package: IconPackage,
	hammer: IconHammer,
	sparkles: IconSparkles,
	"clipboard-list": IconClipboardList,
	list: IconList,
	folder: IconFolder,
	heart: IconHeart,
	bookmark: IconBookmark,
	tag: IconTag,
	box: IconBox,
	checklist: IconChecklist,
};

interface ListIconProps {
	/** Icon name (e.g., "star", "package", "hammer") */
	icon?: string;
	/** Icon size in pixels */
	size?: number;
	/** Additional className */
	className?: string;
}

/**
 * Renders a Tabler icon based on its name.
 * Falls back to IconList if the icon name is not recognized.
 */
export function ListIcon({ icon, size = 20, className }: ListIconProps) {
	if (!icon) {
		return <IconList size={size} className={className} />;
	}

	const IconComponent = iconMap[icon] ?? IconList;
	return <IconComponent size={size} className={className} />;
}
