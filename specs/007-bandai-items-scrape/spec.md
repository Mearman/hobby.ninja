# Feature Specification: Bandai Hobby Catalog Discovery

**Feature Branch**: `007-bandai-items-scrape`
**Created**: 2025-12-06
**Status**: Draft
**Input**: User description: "create spec 7 now we have the scraper for data/bandai/manuals/ I want to build a scraper to increment through all the values in https://bandai-hobby.net/item/01_1000/ and output them to data/bandai/items/"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Catalog URL Discovery (Priority: P1)

As a data collector, I want to discover all item URLs from the Bandai hobby catalog pages so that I can scrape them with the existing scraper.

**Why this priority**: This enables bulk collection of all catalog items without manual URL gathering.

**Independent Test**: Can be tested by running discovery on one catalog range and verifying it generates valid item URLs.

**Acceptance Scenarios**:

1. **Given** the catalog page "https://bandai-hobby.net/item/01_1000/", **When** processed, **Then** it extracts all individual item page URLs
2. **Given** discovered item URLs, **When** passed to the existing scraper, **Then** they process correctly and save to `data/bandai/items/`
3. **Given** no URLs found on a catalog page, **When** this happens, **Then** it logs the issue and continues to next range

---

### User Story 2 - CLI Command Integration (Priority: P2)

As a user, I want a simple CLI command to discover and scrape all catalog items so that I can use existing patterns.

**Why this priority**: Leverages existing CLI infrastructure and user familiarity.

**Independent Test**: Can be tested by running the new CLI option and verifying it works end-to-end.

**Acceptance Scenarios**:

1. **Given** the CLI, **When** I run the new catalog discovery command, **Then** it discovers and scrapes all items
2. **Given** standard options like `--resume` and `--cache`, **When** used, **Then** they work as expected
3. **Given** completion, **When** finished, **Then** it shows standard statistics for discovered and processed items

---

### Edge Cases

- Catalog pages change structure or have different pagination
- Invalid or empty catalog ranges
- Network errors during discovery

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Add catalog discovery logic to find item URLs from pages like `/item/01_1000/`
- **FR-002**: Extend existing CLI to support catalog discovery mode
- **FR-003**: Pass discovered URLs to existing `BandaiHobbyScraper` for processing
- **FR-004**: Use existing infrastructure for rate limiting, caching, and resuming
- **FR-005**: Support all catalog ranges (01_1000, 02_1000, etc.)
- **FR-006**: Log discovery progress and errors using existing patterns

### Key Entities *(include if feature involves data)*

- **Catalog Page**: Pages like `/item/01_1000/` that contain lists of item URLs
- **Item URL**: Individual product page URLs discovered and passed to existing scraper

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Catalog discovery successfully finds item URLs from target pages
- **SC-002**: Discovered URLs process correctly through existing scraper pipeline
- **SC-003**: CLI integration works with existing options and patterns
- **SC-004**: Output format matches existing `data/bandai/items/` structure
- **SC-005**: Error handling follows existing patterns for logging and recovery