#!/bin/bash

# Wayback Machine Batch URL Submission Script
# Order: Manual Source → Manual PDF → Catalog Source → Catalog Images

set -e  # Exit on any error

# Configuration
DELAY_BETWEEN_REQUESTS=3  # seconds
DELAY_BETWEEN_CATEGORIES=30  # seconds between categories
DRY_RUN=false

# Check for dry run flag
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    echo "🧪 DRY RUN MODE - No actual submissions will be made"
fi

# Function to submit URLs from a file
submit_urls() {
    local url_file="$1"
    local category_name="$2"

    if [ ! -f "$url_file" ]; then
        echo "❌ File not found: $url_file"
        return 1
    fi

    local total=$(wc -l < "$url_file")
    echo "🎯 Submitting $category_name ($total URLs)..."

    local count=0
    local success=0
    local failed=0

    while IFS= read -r url; do
        count=$((count + 1))

        if [ "$DRY_RUN" = true ]; then
            echo "[$count/$total] Would submit: $url"
            success=$((success + 1))
        else
            echo "[$count/$total] Submitting: $url"

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

        # Rate limiting
        if [ "$DRY_RUN" != true ] && [ $count -lt $total ]; then
            sleep $DELAY_BETWEEN_REQUESTS
        fi

        # Progress report every 50 URLs
        if [ $((count % 50)) -eq 0 ]; then
            echo ""
            echo "📈 Progress: $success successful, $failed failed"
            echo ""
        fi

    done < "$url_file"

    echo "✅ $category_name complete: $success/$total successful"

    if [ $failed -gt 0 ]; then
        echo "❌ Failed: $failed/$total failed"
    fi

    return $failed
}

# Main execution
echo "🕸️  Wayback Machine Batch URL Submission"
echo "========================================"
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

echo "🎉 All URL submissions complete!"
echo "⏱️  Total time: ${hours}h ${minutes}m ${seconds}s"

# Final summary
echo ""
echo "📊 Final Summary:"
echo "   Manual Source URLs: $(wc -l < manualSourceUrls.txt)"
echo "   Manual PDF URLs: $(wc -l < manualPdfUrls.txt)"
echo "   Catalog Source URLs: $(wc -l < catalogSourceUrls.txt)"
if [ -f "catalogImageUrls.txt" ]; then
    echo "   Catalog Image URLs: $(wc -l < catalogImageUrls.txt)"
else
    echo "   Catalog Image URLs: 0"
fi
total_urls=$(($(wc -l < manualSourceUrls.txt) + $(wc -l < manualPdfUrls.txt) + $(wc -l < catalogSourceUrls.txt)))
echo "   Total: $total_urls URLs"

echo ""
echo "🌐 Check submissions at: https://web.archive.org/"