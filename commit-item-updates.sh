#!/bin/bash

# Script to commit and push item updates in batches
# Usage: ./commit-item-updates.sh [start_id] [end_id] [batch_size]
# Defaults: start_id=1000, end_id=2000, batch_size=100

set -e  # Exit on any error

# Default values
DEFAULT_START_ID=1000
DEFAULT_END_ID=2000
DEFAULT_BATCH_SIZE=100

# Parse arguments
START_ID=${1:-$DEFAULT_START_ID}
END_ID=${2:-$DEFAULT_END_ID}
BATCH_SIZE=${3:-$DEFAULT_BATCH_SIZE}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to process a single batch
process_batch() {
    local batch_start=$1
    local batch_end=$2
    local batch_num=$3

    print_status "Processing batch $batch_num: IDs $batch_start-$batch_end"

    # Stage changes for this batch
    local staged=false
    local added_files=0
    local deleted_files=0

    # Process each ID in the batch
    for ((id=batch_start; id<=batch_end; id++)); do
        # Pad ID with leading zeros
        local padded_id=$(printf "%04d" $id)
        local item_dir="01_${padded_id}"

        # Stage deletion of old flat image files (01_1000_0.jpg, 01_1000_1.jpg, etc.)
        for suffix in {0..20}; do
            local old_image="apps/next/public/images/items/${item_dir}_${suffix}.jpg"

            # Check if file exists and delete it
            if [[ -f "$old_image" ]]; then
                git rm "$old_image" 2>/dev/null || true
                ((deleted_files++))
                staged=true
            # Check if file is already deleted but not staged
            elif git ls-files --deleted 2>/dev/null | grep -q "$old_image"; then
                git rm "$old_image" 2>/dev/null || true
                ((deleted_files++))
                staged=true
            fi
        done

        # Stage addition of new directory structure (01_1000/ directory)
        local new_dir="apps/next/public/images/items/${item_dir}"
        if [[ -d "$new_dir" ]]; then
            git add "$new_dir" 2>/dev/null || true
            staged=true

            # Count files in directory for logging
            local file_count=$(find "$new_dir" -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" 2>/dev/null | wc -l)
            if ((file_count > 0)); then
                ((added_files += file_count))
                print_status "  - Added ${item_dir}/ with $file_count image files"
            fi
        fi

        # Check for JSON files in multiple possible locations
        local json_locations=(
            "data/src/items/01_${padded_id}.json"
            "apps/next/src/data/items/01_${padded_id}.json"
            "packages/data/src/data/items/01_${padded_id}.json"
            "data/src/items/${padded_id}.json"
        )

        for json_file in "${json_locations[@]}"; do
            if [[ -f "$json_file" ]]; then
                git add "$json_file" 2>/dev/null || true
                staged=true
                print_status "  - Added JSON data for ${padded_id} from $(dirname "$json_file")"
                break
            fi
        done
    done

    # Log summary for this batch
    if ((deleted_files > 0)); then
        print_status "  - Deleted $deleted_files old image files in this batch"
    fi

    # Commit if there are staged changes
    if $staged; then
        local commit_msg="feat: update items $batch_start-$batch_end

- Add new images and JSON data
- Remove old images for updated items
- Batch $batch_num of $(( (END_ID - START_ID + BATCH_SIZE - 1) / BATCH_SIZE ))
- Added $added_files new image files"

        git commit --no-verify -m "$commit_msg"
        print_success "Committed batch $batch_num (IDs $batch_start-$batch_end)"
        return 0
    else
        print_warning "No changes found for batch $batch_num (IDs $batch_start-$batch_end)"
        return 1
    fi
}

# Function to push all commits
push_changes() {
    print_status "Pushing all commits to remote..."

    if git push --no-verify; then
        print_success "Successfully pushed all commits"
    else
        print_error "Failed to push commits"
        exit 1
    fi
}

# Main execution
main() {
    print_status "Starting item update process"
    print_status "Range: $START_ID to $END_ID (batch size: $BATCH_SIZE)"

    # Check if we're in a git repository
    if ! git rev-parse --git-head > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi

    # Check if working directory is clean
    if ! git diff --quiet || ! git diff --cached --quiet; then
        print_warning "Working directory not clean. Current changes will be included in first batch."
    fi

    local total_batches=$(( (END_ID - START_ID + BATCH_SIZE - 1) / BATCH_SIZE ))
    local processed_batches=0
    local successful_batches=0

    print_status "Total batches to process: $total_batches"

    # Process each batch
    for ((batch_start=START_ID; batch_start<=END_ID; batch_start+=BATCH_SIZE)); do
        batch_end=$((batch_start + BATCH_SIZE - 1))
        if ((batch_end > END_ID)); then
            batch_end=$END_ID
        fi

        processed_batches=$((processed_batches + 1))

        if process_batch $batch_start $batch_end $processed_batches; then
            successful_batches=$((successful_batches + 1))
        fi

        # Optional: Push every 5 batches to avoid large push at the end
        if ((processed_batches % 5 == 0)); then
            print_status "Pushing intermediate commits (batch $processed_batches)..."
            git push --no-verify 2>/dev/null || print_warning "Intermediate push failed, will continue"
        fi
    done

    print_status "Processing complete: $successful_batches/$processed_batches batches committed"

    # Push all changes at the end
    if ((successful_batches > 0)); then
        push_changes
    else
        print_warning "No batches were committed, nothing to push"
    fi

    print_success "Item update process completed successfully"
}

# Show usage if requested
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Usage: $0 [start_id] [end_id] [batch_size]"
    echo ""
    echo "Arguments:"
    echo "  start_id   Starting item ID (default: $DEFAULT_START_ID)"
    echo "  end_id     Ending item ID (default: $DEFAULT_END_ID)"
    echo "  batch_size Number of IDs per batch (default: $DEFAULT_BATCH_SIZE)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Use defaults: 1000-2000 in batches of 100"
    echo "  $0 1000 1500          # Process IDs 1000-1500 in batches of 100"
    echo "  $0 1000 2000 50       # Process IDs 1000-2000 in batches of 50"
    echo "  $0 2000 2500 200      # Process IDs 2000-2500 in batches of 200"
    exit 0
fi

# Run main function
main "$@"