/**
 * Progressive Web App (PWA) Type Definitions
 *
 * This file contains TypeScript type definitions for PWA-related APIs
 * including Service Worker, Cache, Push Notifications, and Background Sync.
 *
 * Note: Many standard Web APIs (ServiceWorker, Cache, Notification, etc.) are
 * already defined in lib.dom.d.ts and should not be redefined here.
 */

// Background Sync API (experimental, not in lib.dom.d.ts yet)
export interface SyncManager {
	register(tag: string): Promise<void>;
	getTags(): Promise<string[]>;
}

// Extend global ServiceWorkerRegistration to include experimental sync API
declare global {
	interface ServiceWorkerRegistration {
		readonly sync?: SyncManager;
	}
}

// PWA Configuration Types
export interface PWAConfig {
	version: string;
	cache: {
		precache: string[];
		runtime: CacheConfig[];
	};
	offline: {
		enabled: boolean;
		fallbackRoute: string;
		networkOnlyRoutes: string[];
	};
	push: {
		enabled: boolean;
		vapidPublicKey: string;
	};
	sync: {
		enabled: boolean;
		syncTasks: string[];
	};
}

export interface CacheConfig {
	name: string;
	strategy: CacheStrategy;
	maxAge: number;
	maxEntries: number;
	networkTimeout?: number;
}

export type CacheStrategy = "cacheFirst" | "networkFirst" | "staleWhileRevalidate" | "networkOnly" | "cacheOnly";

// Service Worker Event Types
export interface ExtendableEvent extends Event {
	waitUntil(promise: Promise<unknown>): void;
}

export interface FetchEvent extends ExtendableEvent {
	readonly request: Request;
	readonly clientId: string;
	readonly isReload: boolean;
	readonly preloadResponse: Promise<Response | undefined>;
	respondWith(response: Promise<Response> | Response): void;
}

export interface PushEvent extends ExtendableEvent {
	readonly data: PushMessageData | null;
}

export interface PushMessageData {
	arrayBuffer(): ArrayBuffer;
	blob(): Blob;
	json(): unknown;
	text(): string;
}

export interface NotificationEvent extends ExtendableEvent {
	readonly notification: Notification;
	readonly action: string;
	readonly reply: string | null;
}

export interface SyncEvent extends ExtendableEvent {
	readonly tag: string;
	readonly lastChance: boolean;
}

// Cache Metrics
export interface CacheMetrics {
	hits: number;
	misses: number;
	puts: number;
	deletes: number;
	totalSize: number;
}

// PWA Analytics
export interface PWAAnalytics {
	serviceWorkerInstalls: number;
	serviceWorkerUpdates: number;
	offlinePageViews: number;
	cacheHitRate: number;
	pushNotificationsSent: number;
	pushNotificationsClicked: number;
	offlineUsage: number;
	backgroundSyncSuccess: number;
	serviceWorkerUptime: number;
	pushNotificationEngagement: number;
}

// PWA Events
export interface PWAEvents {
	onInstall?: (event: Event) => void;
	onInstalled?: () => void;
	onActivate?: (event: Event) => void;
	onUpdate?: (event: Event) => void;
	onUpdateFound?: (registration: ServiceWorkerRegistration) => void;
	onUpdated?: () => void;
	onServiceWorkerReady?: (registration: ServiceWorkerRegistration) => void;
	onPush?: (event: PushEvent) => void;
	onSync?: (event: SyncEvent) => void;
	onNotificationClick?: (event: NotificationEvent) => void;
	onOffline?: () => void;
	onOnline?: () => void;
	onError?: (error: any) => void;
}

// Sync Task
export interface SyncTask {
	id: string;
	url: string;
	method?: string;
	body?: string;
	headers?: Record<string, string>;
	priority?: number;
	retryCount?: number;
	lastAttempt?: number;
}

// Sync Registration
export interface SyncRegistration {
	tag: string;
	task: SyncTask;
	registered: boolean;
	lastSync?: number;
}

// Web App Manifest Types
export interface WebAppManifest {
	name: string;
	short_name: string;
	description: string;
	start_url: string;
	scope: string;
	display: "fullscreen" | "standalone" | "minimal-ui" | "browser";
	orientation?: "portrait" | "landscape" | "any";
	theme_color: string;
	background_color: string;
	icons: WebAppManifestIcon[];
	screenshots?: WebAppManifestScreenshot[];
	shortcuts?: ManifestShortcut[];
	related_applications?: ManifestRelatedApplication[];
	prefer_related_applications?: boolean;
}

export interface WebAppManifestIcon {
	src: string;
	sizes: string;
	type: string;
	purpose?: "any" | "maskable" | "monochrome" | string;
}

export interface WebAppManifestScreenshot {
	src: string;
	sizes: string;
	type: string;
	label?: string;
}

export interface ManifestRelatedApplication {
	platform: string;
	url: string;
	id?: string;
}

export interface ManifestShortcut {
	name: string;
	short_name?: string;
	description?: string;
	url: string;
	icons?: WebAppManifestIcon[];
}
