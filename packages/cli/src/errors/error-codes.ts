/**
 * Standardized error codes for the Gundam scraper CLI
 * Provides consistent error classification and user-friendly messaging
 */

export enum ErrorCategory {
  CONFIGURATION = "CONFIG",
  NETWORK = "NETWORK",
  SCRAPING = "SCRAPE",
  DATA = "DATA",
  FILESYSTEM = "FS",
  VALIDATION = "VALIDATE",
  RATE_LIMIT = "RATE",
  AUTHENTICATION = "AUTH",
  PERMISSION = "PERM",
  SYSTEM = "SYSTEM"
}

export enum ErrorCode {
  // Configuration errors (CONFIG_XXX)
  CONFIG_FILE_NOT_FOUND = "CONFIG_001",
  CONFIG_INVALID_FORMAT = "CONFIG_002",
  CONFIG_VALIDATION_FAILED = "CONFIG_003",
  CONFIG_MISSING_REQUIRED = "CONFIG_004",
  CONFIG_ENV_OVERRIDE_INVALID = "CONFIG_005",

  // Network errors (NETWORK_XXX)
  NETWORK_CONNECTION_FAILED = "NETWORK_001",
  NETWORK_TIMEOUT = "NETWORK_002",
  NETWORK_DNS_RESOLUTION = "NETWORK_003",
  NETWORK_SSL_ERROR = "NETWORK_004",
  NETWORK_PROXY_ERROR = "NETWORK_005",

  // Scraping errors (SCRAPE_XXX)
  SCRAPE_PAGE_NOT_FOUND = "SCRAPE_001",
  SCRAPE_ACCESS_DENIED = "SCRAPE_002",
  SCRAPE_RATE_LIMITED = "SCRAPE_003",
  SCRAPE_BLOCKED = "SCRAPE_004",
  SCRAPE_STRUCTURE_CHANGED = "SCRAPE_005",
  SCRAPE_NO_DATA_FOUND = "SCRAPE_006",
  SCRAPE_PARTIAL_SUCCESS = "SCRAPE_007",

  // Data errors (DATA_XXX)
  DATA_EXTRACTION_FAILED = "DATA_001",
  DATA_VALIDATION_FAILED = "DATA_002",
  DATA_TRANSFORMATION_ERROR = "DATA_003",
  DATA_EXPORT_FAILED = "DATA_004",
  DATA_IMPORT_FAILED = "DATA_005",
  DATA_CORRUPTION = "DATA_006",

  // Filesystem errors (FS_XXX)
  FS_FILE_NOT_FOUND = "FS_001",
  FS_PERMISSION_DENIED = "FS_002",
  FS_DISK_FULL = "FS_003",
  FS_INVALID_PATH = "FS_004",
  FS_CREATE_FAILED = "FS_005",
  FS_WRITE_FAILED = "FS_006",
  FS_READ_FAILED = "FS_007",

  // Validation errors (VALIDATE_XXX)
  VALIDATE_SCHEMA_FAILED = "VALIDATE_001",
  VALIDATE_TYPE_MISMATCH = "VALIDATE_002",
  VALIDATE_RANGE_VIOLATION = "VALIDATE_003",
  VALIDATE_REQUIRED_MISSING = "VALIDATE_004",
  VALIDATE_FORMAT_INVALID = "VALIDATE_005",

  // Rate limiting errors (RATE_XXX)
  RATE_LIMIT_EXCEEDED = "RATE_001",
  RATE_BACKOFF_REQUIRED = "RATE_002",
  RATE_QUOTA_EXCEEDED = "RATE_003",

  // Authentication errors (AUTH_XXX)
  AUTH_CREDENTIALS_MISSING = "AUTH_001",
  AUTH_CREDENTIALS_INVALID = "AUTH_002",
  AUTH_TOKEN_EXPIRED = "AUTH_003",
  AUTH_UNAUTHORIZED = "AUTH_004",

  // Permission errors (PERM_XXX)
  PERM_FILE_ACCESS_DENIED = "PERM_001",
  PERM_NETWORK_ACCESS_DENIED = "PERM_002",
  PERM_ADMIN_REQUIRED = "PERM_003",

  // System errors (SYSTEM_XXX)
  SYSTEM_MEMORY_INSUFFICIENT = "SYSTEM_001",
  SYSTEM_PROCESS_LIMIT = "SYSTEM_002",
  SYSTEM_TEMPORARY_FAILURE = "SYSTEM_003",
  SYSTEM_UNKNOWN_ERROR = "SYSTEM_999"
}

export interface ErrorInfo {
  code: ErrorCode;
  category: ErrorCategory;
  message: string;
  userMessage: string;
  suggestions: string[];
  technicalDetails?: string;
  retryable: boolean;
  severity: "low" | "medium" | "high" | "critical";
}

export class ErrorRegistry {
	private static errorMap = new Map<ErrorCode, ErrorInfo>();

	static {
		this.registerDefaultErrors();
	}

	private static registerDefaultErrors(): void {
		// Configuration errors
		this.register(ErrorCode.CONFIG_FILE_NOT_FOUND, ErrorCategory.CONFIGURATION,
			"Configuration file not found at specified path",
			"The configuration file could not be found. Please check the file path and ensure the file exists.",
			[
				"Verify the configuration file path is correct",
				"Create a new configuration file with default settings",
				"Use the --init flag to generate a default configuration file",
			],
			true,
			"medium",
		);

		this.register(ErrorCode.CONFIG_INVALID_FORMAT, ErrorCategory.CONFIGURATION,
			"Configuration file contains invalid JSON or YAML",
			"The configuration file format is invalid. Please check for syntax errors.",
			[
				"Validate the configuration file syntax using a linter",
				"Ensure proper JSON/YAML formatting",
				"Check for missing commas, brackets, or quotes",
			],
			true,
			"medium",
		);

		this.register(ErrorCode.CONFIG_VALIDATION_FAILED, ErrorCategory.CONFIGURATION,
			"Configuration values failed validation",
			"One or more configuration values are invalid. Please review the error details.",
			[
				"Check configuration against the schema",
				"Verify numeric values are within allowed ranges",
				"Ensure required fields are present",
			],
			true,
			"medium",
		);

		// Network errors
		this.register(ErrorCode.NETWORK_CONNECTION_FAILED, ErrorCategory.NETWORK,
			"Failed to establish network connection",
			"Unable to connect to the target website. Please check your internet connection.",
			[
				"Verify internet connectivity",
				"Check if the website is accessible in a browser",
				"Try again in a few minutes",
				"Check firewall or proxy settings",
			],
			true,
			"high",
		);

		this.register(ErrorCode.NETWORK_TIMEOUT, ErrorCategory.NETWORK,
			"Network request timed out",
			"The request took too long to complete. The website may be slow or unresponsive.",
			[
				"Increase the timeout setting in configuration",
				"Check internet connection speed",
				"Try again during off-peak hours",
				"Reduce concurrency settings",
			],
			true,
			"medium",
		);

		this.register(ErrorCode.NETWORK_DNS_RESOLUTION, ErrorCategory.NETWORK,
			"DNS resolution failed",
			"Unable to resolve the website address. The domain may be incorrect or DNS servers are unreachable.",
			[
				"Verify the website URL is correct",
				"Check DNS configuration",
				"Try using different DNS servers",
				"Flush DNS cache",
			],
			false,
			"high",
		);

		// Scraping errors
		this.register(ErrorCode.SCRAPE_PAGE_NOT_FOUND, ErrorCategory.SCRAPING,
			"Web page not found (404)",
			"The requested page could not be found on the website.",
			[
				"Verify the URL is correct",
				"Check if the page structure has changed",
				"Look for redirects or updated URLs",
				"Contact website administrator if needed",
			],
			false,
			"medium",
		);

		this.register(ErrorCode.SCRAPE_ACCESS_DENIED, ErrorCategory.SCRAPING,
			"Access denied (403)",
			"Access to the requested page is denied. The website may block automated requests.",
			[
				"Check if robots.txt allows scraping",
				"Add appropriate user-agent headers",
				"Respect rate limiting guidelines",
				"Consider using official API if available",
			],
			false,
			"high",
		);

		this.register(ErrorCode.SCRAPE_RATE_LIMITED, ErrorCategory.SCRAPING,
			"Rate limited by website",
			"The website has temporarily blocked requests due to excessive activity.",
			[
				"Reduce request frequency",
				"Increase delay between requests",
				"Wait before retrying",
				"Implement exponential backoff",
			],
			true,
			"medium",
		);

		this.register(ErrorCode.SCRAPE_STRUCTURE_CHANGED, ErrorCategory.SCRAPING,
			"Website structure has changed",
			"The website HTML structure has changed and the scraper needs updating.",
			[
				"Report this issue to the development team",
				"Check for website redesign or updates",
				"Temporarily use alternative data source",
				"Update scraper selectors and logic",
			],
			false,
			"critical",
		);

		// Data errors
		this.register(ErrorCode.DATA_EXTRACTION_FAILED, ErrorCategory.DATA,
			"Failed to extract data from page",
			"Unable to extract required data from the webpage content.",
			[
				"Check if page content loaded properly",
				"Verify data still exists on the page",
				"Update extraction logic if structure changed",
				"Enable debug logging for more details",
			],
			true,
			"medium",
		);

		this.register(ErrorCode.DATA_VALIDATION_FAILED, ErrorCategory.DATA,
			"Extracted data failed validation",
			"The extracted data does not meet expected format or quality standards.",
			[
				"Check data quality requirements",
				"Update validation rules if needed",
				"Enable partial data extraction",
				"Review data transformation logic",
			],
			true,
			"medium",
		);

		// Filesystem errors
		this.register(ErrorCode.FS_FILE_NOT_FOUND, ErrorCategory.FILESYSTEM,
			"File or directory not found",
			"The specified file or directory could not be found.",
			[
				"Verify the file path is correct",
				"Check if the file has been moved or deleted",
				"Ensure directory exists before writing",
				"Use absolute paths for reliability",
			],
			false,
			"medium",
		);

		this.register(ErrorCode.FS_PERMISSION_DENIED, ErrorCategory.FILESYSTEM,
			"Permission denied for file operation",
			"Insufficient permissions to access or modify the file or directory.",
			[
				"Check file and directory permissions",
				"Run with appropriate user privileges",
				"Ensure output directory is writable",
				"Choose different output location",
			],
			false,
			"high",
		);

		this.register(ErrorCode.FS_DISK_FULL, ErrorCategory.FILESYSTEM,
			"Insufficient disk space",
			"Not enough disk space available to write the output file.",
			[
				"Free up disk space",
				"Choose different output location with more space",
				"Enable compression to reduce file size",
				"Process data in smaller batches",
			],
			false,
			"critical",
		);

		// Rate limiting errors
		this.register(ErrorCode.RATE_LIMIT_EXCEEDED, ErrorCategory.RATE_LIMIT,
			"Internal rate limit exceeded",
			"Too many requests were made in a short period.",
			[
				"Reduce concurrency settings",
				"Increase delay between requests",
				"Enable automatic rate limiting",
				"Process data in smaller batches",
			],
			true,
			"low",
		);
	}

	private static register(
		code: ErrorCode,
		category: ErrorCategory,
		message: string,
		userMessage: string,
		suggestions: string[],
		retryable: boolean,
		severity: "low" | "medium" | "high" | "critical",
	): void {
		this.errorMap.set(code, {
			code,
			category,
			message,
			userMessage,
			suggestions,
			retryable,
			severity,
		});
	}

	static getErrorInfo(code: ErrorCode): ErrorInfo | undefined {
		return this.errorMap.get(code);
	}

	static getAllErrors(): ErrorInfo[] {
		return [...this.errorMap.values()];
	}

	static getErrorsByCategory(category: ErrorCategory): ErrorInfo[] {
		return this.getAllErrors().filter(error => error.category === category);
	}

	static registerCustom(errorInfo: ErrorInfo): void {
		this.errorMap.set(errorInfo.code, errorInfo);
	}
}