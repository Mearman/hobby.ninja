export const createPlaceholderSvg = (text: string, width = 280, height = 200): string => {
	const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f5f5f5"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14"
            text-anchor="middle" dominant-baseline="middle" fill="#666666">
        ${text}
      </text>
    </svg>
  `.trim();

	return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

export const createErrorPlaceholderSvg = (width = 280, height = 200): string => {
	return createPlaceholderSvg("Image Not Available", width, height);
};