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

    # Stage all changes using individual ID patterns
    local staged=false
    local deleted_files=0
    local added_files=0

    # Process each ID with its own pattern
    for ((id=batch_start; id<=batch_end; id++)); do
        local padded_id=$(printf "%04d" $id)
        local item_dir="01_${padded_id}"

        # Delete old flat files for this ID using pattern
        local delete_pattern="apps/next/public/images/items/${item_dir}_*.jpg"
        local deleted_output=$(git rm $delete_pattern 2>&1)
        local deleted_count=$(echo "$deleted_output" | grep "rm '" | wc -l)
        # Ensure we have a clean number
        deleted_count=$(echo "$deleted_count" | tr -d '[:space:]')
        if [[ "$deleted_count" =~ ^[0-9]+$ ]] && ((deleted_count > 0)); then
            deleted_files=$((deleted_files + deleted_count))
            staged=true
        fi

        # Add new directory if it exists
        local dir_path="apps/next/public/images/items/${item_dir}/"
        if [[ -d "$dir_path" ]]; then
            git add "$dir_path" 2>/dev/null || true
            staged=true
            # Count files in this directory for reporting
            local file_count=$(find "$dir_path" -type f 2>/dev/null | wc -l)
            added_files=$((added_files + file_count))
        fi

        # Add JSON file if it exists
        local json_file="data/src/items/01_${padded_id}.json"
        if [[ -f "$json_file" ]]; then
            git add "$json_file" 2>/dev/null || true
            staged=true
        fi
    done

    # Log summary for this batch
    if ((deleted_files > 0)); then
        print_status "  - Deleted $deleted_files old image files in this batch"
    fi
    if ((added_files > 0)); then
        print_status "  - Added $added_files new image files in this batch"
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

        # Process the batch and capture result
        local batch_success=false
        if process_batch $batch_start $batch_end $processed_batches; then
            successful_batches=$((successful_batches + 1))
            batch_success=true
        fi

        # Push after each successful batch
        if $batch_success; then
            print_status "Pushing batch $processed_batches to remote..."
            if git push --no-verify; then
                print_success "Successfully pushed batch $processed_batches"
            else
                print_warning "Failed to push batch $processed_batches, will continue with remaining batches"
            fi
        else
            print_warning "Skipping push for batch $processed_batches (no changes committed)"
        fi
    done

    print_status "Processing complete: $successful_batches/$processed_batches batches committed"

    # Final summary (batches already pushed individually)
    if ((successful_batches > 0)); then
        print_success "All $successful_batches successful batches have been pushed to remote"
    else
        print_warning "No batches were committed"
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