import { load } from "cheerio";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
	userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	locale: "en-US",
});
const page = await context.newPage();

// Pick an item we know has a global page (RG Epyon)
await page.goto("https://global.bandai-hobby.net/en-us/item/01_4923/", { waitUntil: "domcontentloaded" });

const html = await page.content();
const $ = load(html);

console.log("=== Title ===");
console.log($("h1").first().text().trim());

console.log("\n=== All Links with href ===");
$("a[href]").each((_, el) => {
	const text = $(el).text().trim();
	const href = $(el).attr("href") ?? "";
	if (href.includes("/brand/") || href.includes("/series/") || href.includes("/category/")) {
		console.log(`  ${text} -> ${href}`);
	}
});

console.log("\n=== Navigation / Breadcrumb classes ===");
$('nav, [class*="breadcrumb"], [class*="Breadcrumb"]').each((_, el) => {
	const className = $(el).attr("class") ?? "(no class)";
	console.log(`  Found: ${el.tagName} class=${className}`);
	$(el).find("a").each((_, a) => {
		const linkHref = $(a).attr("href") ?? "(no href)";
		console.log(`    ${$(a).text().trim()} -> ${linkHref}`);
	});
});

console.log("\n=== Card/Tag links ===");
$('[class*="card"], [class*="tag"], [class*="label"]').find("a").each((_, el) => {
	const text = $(el).text().trim();
	const href = $(el).attr("href");
	if (text && href) {
		console.log(`  ${text} -> ${href}`);
	}
});

await browser.close();
