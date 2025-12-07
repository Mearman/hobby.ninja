#!/bin/bash

# Wayback Machine Batch URL Submission Script with Archive Check
# Checks if URL is already archived before submitting
# Order: Manual Source → Manual PDF → Catalog Source → Catalog Images

set -e  # Exit on any error

# Configuration
DELAY_BETWEEN_REQUESTS=2  # seconds (reduced since we'll skip many)
DELAY_BETWEEN_CATEGORIES=30  # seconds between categories
DRY_RUN=false

# Check for dry run flag
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    echo "🧪 DRY RUN MODE - No actual submissions will be made"
fi

# Function to check if URL is already archived
check_archive_status() {
    local url="$1"

    if [ "$DRY_RUN" = true ]; then
        return 1  # Pretend it's not archived in dry run
    fi

    # Check Wayback Machine availability API
    # This is faster than the save endpoint and tells us if it's already archived
    if RESULT=$(curl -s "https://archive.org/wayback/available?url=$url" 2>/dev/null); then
        # Check if the result contains archived snapshots
        if echo "$RESULT" | grep -q '"archived_snapshots": {"closest": {'; then
            # Check if there's actually a snapshot available
            if echo "$RESULT" | grep -q '"available": true'; then
                return 0  # URL is already archived
            fi
        fi
    fi

    return 1  # URL is not archived or check failed
}

# Function to submit URLs from a file
submit_urls() {
    local url_file="$1"
    local category_name="$2"

    if [ ! -f "$url_file" ]; then
        echo "❌ File not found: $url_file"
        return 1
    fi

    local total=$(wc -l < "$url_file")
    echo "🎯 Processing $category_name ($total URLs)..."
    echo "🔍 Checking for existing archives first..."

    local count=0
    local already_archived=0
    local success=0
    local failed=0
    local skipped=0

    while IFS= read -r url; do
        count=$((count + 1))

        if [ "$DRY_RUN" = true ]; then
            echo "[$count/$total] Would check and submit: $url"
            success=$((success + 1))
        else
            echo -n "[$count/$total] Checking: $url - "

            # Check if already archived
            if check_archive_status "$url"; then
                echo "📦 Already archived"
                already_archived=$((already_archived + 1))
                skipped=$((skipped + 1))
            else
                echo "🆕 Submitting to Wayback Machine..."

                # Submit to Wayback Machine
                if RESULT=$(curl -s "https://web.archive.org/save/$url" 2>&1); then
                    if echo "$RESULT" | grep -q "<!DOCTYPE html\|Job queued\|web.archive.org"; then
                        echo "✅"
                        success=$((success + 1))
                    else
                        echo "❌"
                        failed=$((failed + 1))
                    fi
                else
                    echo "❌"
                    failed=$((failed + 1))
                fi
            fi
        fi

        # Rate limiting - only for actual submissions, not archive checks
        if [ "$DRY_RUN" != true ] && [ $count -lt $total ] && [ $skipped -eq 0 ]; then
            sleep $DELAY_BETWEEN_REQUESTS
        fi

        # Faster rate limiting when we're just checking (most will be archived)
        if [ "$DRY_RUN" != true ] && [ $count -lt $total ] && [ $skipped -gt 0 ]; then
            sleep 0.5  # Minimal delay for archive checks
        fi

        # Progress report every 50 URLs
        if [ $((count % 50)) -eq 0 ]; then
            echo ""
            echo "📈 Progress: $success submitted, $already_archived already archived, $failed failed"
            echo ""
        fi

    done < "$url_file"

    echo "✅ $category_name complete:"
    echo "   📦 Already archived: $already_archived"
    echo "   ✅ Successfully submitted: $success"
    if [ $failed -gt 0 ]; then
        echo "   ❌ Failed submissions: $failed"
    fi

    return $failed
}

# Main execution
echo "🕸️  Wayback Machine Smart URL Submission"
echo "======================================="
echo "🔍 Checks for existing archives before submitting"
echo ""

# Start time
start_time=$(date +%s)

# 1. Manual Source URLs
echo "📋 Step 1: Manual Source URLs"
submit_urls "manualSourceUrls.txt" "Manual Source URLs"
if [ $? -ne 0 ]; then
    echo "❌ Manual Source URLs had failures"
fi

if [ "$DRY_RUN" != true ]; then
    echo ""
    echo "⏳ Waiting $DELAY_BETWEEN_CATEGORIES seconds before next category..."
    sleep $DELAY_BETWEEN_CATEGORIES
fi
echo ""

# 2. Manual PDF URLs
echo "📋 Step 2: Manual PDF URLs"
submit_urls "manualPdfUrls.txt" "Manual PDF URLs"
if [ $? -ne 0 ]; then
    echo "❌ Manual PDF URLs had failures"
fi

if [ "$DRY_RUN" != true ]; then
    echo ""
    echo "⏳ Waiting $DELAY_BETWEEN_CATEGORIES seconds before next category..."
    sleep $DELAY_BETWEEN_CATEGORIES
fi
echo ""

# 3. Catalog Source URLs
echo "📋 Step 3: Catalog Source URLs"
submit_urls "catalogSourceUrls.txt" "Catalog Source URLs"
if [ $? -ne 0 ]; then
    echo "❌ Catalog Source URLs had failures"
fi

if [ "$DRY_RUN" != true ]; then
    echo ""
    echo "⏳ Waiting $DELAY_BETWEEN_CATEGORIES seconds before next category..."
    sleep $DELAY_BETWEEN_CATEGORIES
fi
echo ""

# 4. Catalog Image URLs (if any exist)
echo "📋 Step 4: Catalog Image URLs"
submit_urls "catalogImageUrls.txt" "Catalog Image URLs" || echo "ℹ️  No catalog image URLs found"
echo ""

# Calculate total time
end_time=$(date +%s)
duration=$((end_time - start_time))
hours=$((duration / 3600))
minutes=$(((duration % 3600) / 60))
seconds=$((duration % 60))

echo "🎉 Smart URL submission complete!"
echo "⏱️  Total time: ${hours}h ${minutes}m ${seconds}s"

# Final summary
echo ""
echo "📊 Files processed:"
echo "   Manual Source URLs: $(wc -l < manualSourceUrls.txt)"
echo "   Manual PDF URLs: $(wc -l < manualPdfUrls.txt)"
echo "   Catalog Source URLs: $(wc -l < catalogSourceUrls.txt)"
if [ -f "catalogImageUrls.txt" ]; then
    echo "   Catalog Image URLs: $(wc -l < catalogImageUrls.txt)"
else
    echo "   Catalog Image URLs: 0"
fi
total_urls=$(($(wc -l < manualSourceUrls.txt) + $(wc -l < manualPdfUrls.txt) + $(wc -l < catalogSourceUrls.txt)))
if [ -f "catalogImageUrls.txt" ]; then
    total_urls=$((total_urls + $(wc -l < catalogImageUrls.txt)))
fi
echo "   Total: $total_urls URLs"

echo ""
echo "🌐 Check submissions at: https://web.archive.org/"
echo ""
echo "💡 Tips:"
echo "   - 📦 Already archived URLs were skipped to save time"
echo "   - 🆕 Only new URLs were submitted to Wayback Machine"
echo "   - This approach is much faster for large URL sets"