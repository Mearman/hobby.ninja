#!/bin/bash

# Wayback Machine URL submission script
# Usage: ./submit-wayback.sh [--dry-run]

URLS_FILE="source-urls.txt"
DRY_RUN="$1"

if [ "$DRY_RUN" = "--dry-run" ]; then
    echo "🧪 DRY RUN MODE - No actual submissions"
    SUBMIT_CMD="echo Would submit:"
else
    echo "🕸️  Submitting URLs to Wayback Machine..."
    SUBMIT_CMD="curl -s"
fi

# Count total URLs
TOTAL=$(wc -l < "$URLS_FILE")
echo "📊 Found $TOTAL URLs to submit"
echo ""

# Counter
COUNT=0
SUCCESS=0
FAILED=0

# Process each URL
while IFS= read -r url; do
    COUNT=$((COUNT + 1))

    if [ "$DRY_RUN" = "--dry-run" ]; then
        echo "[$COUNT/$TOTAL] $SUBMIT_CMD $url"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -n "[$COUNT/$TOTAL] Submitting: $(echo $url | cut -c1-60)... "

        # Submit to Wayback Machine
        if RESULT=$($SUBMIT_CMD "https://web.archive.org/save/$url" 2>&1); then
            # Check if successful (contains HTML response)
            if echo "$RESULT" | grep -q "<!DOCTYPE html\|Job queued\|web.archive.org"; then
                echo "✅"
                SUCCESS=$((SUCCESS + 1))
            else
                echo "❌"
                FAILED=$((FAILED + 1))
                echo "   Error: $RESULT" | head -1
            fi
        else
            echo "❌"
            FAILED=$((FAILED + 1))
        fi
    fi

    # Rate limiting - wait between requests
    if [ "$DRY_RUN" != "--dry-run" ] && [ $COUNT -lt $TOTAL ]; then
        sleep 2
    fi

    # Progress every 100 URLs
    if [ $((COUNT % 100)) -eq 0 ]; then
        echo ""
        echo "📈 Progress: $SUCCESS successful, $FAILED failed"
        echo ""
    fi

done < "$URLS_FILE"

echo ""
echo "🎉 Wayback Machine submission complete!"
echo "✅ Successfully submitted: $SUCCESS URLs"
if [ $FAILED -gt 0 ]; then
    echo "❌ Failed submissions: $FAILED URLs"
fi
echo "📊 Total processed: $COUNT URLs"