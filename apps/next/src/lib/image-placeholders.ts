// UTF-8 safe Base64 encoding function
const utf8ToBase64 = (str: string): string => {
	try {
		// Use TextEncoder for proper UTF-8 encoding
		const encoder = new TextEncoder();
		const uint8Array = encoder.encode(str);
		// Convert binary string to base64
		let binary = '';
		for (let i = 0; i < uint8Array.length; i++) {
			binary += String.fromCharCode(uint8Array[i]);
		}
		return btoa(binary);
	} catch (error) {
		// Fallback to URL-encoding for problematic characters
		return btoa(unescape(encodeURIComponent(str)));
	}
};

// Escape SVG text content to handle special characters
const escapeSvgText = (text: string): string => {
	return text
		.slice(0, 20) // Limit text length
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
};

export const createPlaceholderSvg = (text: string, width = 280, height = 200): string => {
	const escapedText = escapeSvgText(text);
	const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f5f5f5"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14"
            text-anchor="middle" dominant-baseline="middle" fill="#666666">
        ${escapedText}
      </text>
    </svg>
  `.trim();

	return `data:image/svg+xml;base64,${utf8ToBase64(svg)}`;
};

export const createErrorPlaceholderSvg = (width = 280, height = 200): string => {
	return createPlaceholderSvg("Image Not Available", width, height);
};