#!/bin/bash

# Script to commit and push item updates in batches
# Usage: ./commit-item-updates.sh [start_id] [end_id] [batch_size]
# Defaults: start_id=1000, end_id=2000, batch_size=100

set -e  # Exit on any error

# Default values
DEFAULT_START_ID=1000
DEFAULT_END_ID=10000
DEFAULT_BATCH_SIZE=100

# Default values
START_ID=$DEFAULT_START_ID
END_ID=$DEFAULT_END_ID
BATCH_SIZE=$DEFAULT_BATCH_SIZE
WATCH_MODE=false

# Parse named arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --start-id)
            START_ID="$2"
            shift 2
            ;;
        --end-id)
            END_ID="$2"
            shift 2
            ;;
        --batch-size)
            BATCH_SIZE="$2"
            shift 2
            ;;
        --watch)
            WATCH_MODE=true
            shift
            ;;
        --no-watch)
            WATCH_MODE=false
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --start-id ID     Starting item ID (default: $DEFAULT_START_ID)"
            echo "  --end-id ID       Ending item ID (default: $DEFAULT_END_ID)"
            echo "  --batch-size SIZE Number of IDs per batch (default: $DEFAULT_BATCH_SIZE)"
            echo "  --watch           Enable watch mode (default: disabled)"
            echo "  --no-watch        Disable watch mode (default: disabled)"
            echo "  -h, --help        Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                            # Use defaults: 1000-2000 in batches of 100"
            echo "  $0 --start-id 1000 --end-id 1500             # Process IDs 1000-1500 in batches of 100"
            echo "  $0 --start-id 1000 --end-id 2000 --batch-size 50  # Process with batches of 50"
            echo "  $0 --start-id 1000 --end-id 2000 --watch     # Watch mode: monitor for changes"
            echo "  $0 --start-id 1000 --end-id 2000 --batch-size 20 --watch  # Watch mode with small batches"
            echo ""
            echo "Watch Mode:"
            echo "  Continuously monitors for changes and processes complete batches"
            echo "  Only processes batches where JSON files have been modified"
            echo "  Automatically pushes each batch as it becomes complete"
            echo "  Skips batches with no changes and continues monitoring"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate arguments
if ! [[ "$START_ID" =~ ^[0-9]+$ ]] || ! [[ "$END_ID" =~ ^[0-9]+$ ]] || ! [[ "$BATCH_SIZE" =~ ^[0-9]+$ ]]; then
    print_error "Invalid arguments: start-id, end-id, and batch-size must be numbers"
    exit 1
fi

if ((START_ID > END_ID)); then
    print_error "Start ID cannot be greater than end ID"
    exit 1
fi

if ((BATCH_SIZE < 1)); then
    print_error "Batch size must be at least 1"
    exit 1
fi

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

    # Clean staging area to avoid including unrelated staged changes
    if ! git diff --cached --quiet; then
        print_status "  - Cleaning staging area to avoid unrelated changes"
        git reset 2>/dev/null || true
    fi

    # Stage all changes using individual ID patterns
    local staged=false
    local deleted_files=0
    local added_files=0

    # Process each ID with its own pattern
    for ((id=batch_start; id<=batch_end; id++)); do
        local padded_id=$(printf "%04d" $id)
        local item_dir="01_${padded_id}"
        local json_file="data/src/items/01_${padded_id}.json"

        # Skip this ID if there's no JSON file or if it hasn't been modified
        if [[ ! -f "$json_file" ]]; then
            print_status "  - Skipping ID $id: No JSON file found"
            continue
        fi

        # Check if JSON file has unstaged changes
        if ! git diff --quiet "$json_file" 2>/dev/null; then
            print_status "  - Processing ID $id: Found modified JSON file"
        elif git diff --cached --quiet "$json_file" 2>/dev/null; then
            # JSON file exists but has no changes (neither staged nor unstaged)
            print_status "  - Skipping ID $id: JSON file not modified"
            continue
        else
            print_status "  - Processing ID $id: Found staged JSON file changes"
        fi

        # Add JSON file first
        git add "$json_file" 2>/dev/null || true
        staged=true

        # Delete old flat files for this ID using pattern
        local delete_pattern="apps/next/public/images/items/${item_dir}_*.jpg"
        local deleted_output=$(git rm $delete_pattern 2>&1)
        local deleted_count=$(echo "$deleted_output" | grep "rm '" | wc -l)
        # Ensure we have a clean number
        deleted_count=$(echo "$deleted_count" | tr -d '[:space:]')
        if [[ "$deleted_count" =~ ^[0-9]+$ ]] && ((deleted_count > 0)); then
            deleted_files=$((deleted_files + deleted_count))
            print_status "  - ID $id: Deleted $deleted_count old image files"
        fi

        # Add new directory if it exists
        local dir_path="apps/next/public/images/items/${item_dir}/"
        if [[ -d "$dir_path" ]]; then
            git add "$dir_path" 2>/dev/null || true
            # Count files in this directory for reporting
            local file_count=$(find "$dir_path" -type f 2>/dev/null | wc -l)
            added_files=$((added_files + file_count))
            print_status "  - ID $id: Added $file_count new image files"
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
        local commit_msg="feat: update items $batch_start-$batch_end"

        git commit --no-verify -m "$commit_msg"
        print_success "Committed batch $batch_num (IDs $batch_start-$batch_end)"
        return 0
    else
        print_warning "No changes found for batch $batch_num (IDs $batch_start-$batch_end)"
        return 1
    fi
}

# Function to check if there are changes ready for processing
check_for_changes() {
    local batch_start=$1
    local batch_end=$2
    local has_changes=false

    for ((id=batch_start; id<=batch_end; id++)); do
        local padded_id=$(printf "%04d" $id)
        local json_file="data/src/items/01_${padded_id}.json"

        if [[ -f "$json_file" ]] && (! git diff --quiet "$json_file" 2>/dev/null || ! git diff --cached --quiet "$json_file" 2>/dev/null); then
            has_changes=true
            break
        fi
    done

    $has_changes
}

# Function to watch for changes and process complete batches
watch_and_process() {
    local current_id=$START_ID
    local processed_count=0

    print_status "Watch mode: Monitoring for changes in IDs $START_ID-$END_ID"

    while ((current_id <= END_ID)); do
        local batch_start=$current_id
        local batch_end=$((current_id + BATCH_SIZE - 1))
        if ((batch_end > END_ID)); then
            batch_end=$END_ID
        fi

        if check_for_changes $batch_start $batch_end; then
            print_status "Changes detected for batch $((processed_count + 1)): IDs $batch_start-$batch_end"

            # Process this batch
            if process_batch $batch_start $batch_end $((processed_count + 1)); then
                processed_count=$((processed_count + 1))
                print_status "Pushing batch $processed_count to remote..."
                if git push --no-verify; then
                    print_success "Successfully pushed batch $processed_count"
                else
                    print_warning "Failed to push batch $processed_count"
                fi
            fi

            current_id=$((batch_end + 1))
        else
            # No changes in this batch, check if we should continue monitoring
            if ((current_id + BATCH_SIZE > END_ID)); then
                print_status "No more changes in range. Monitoring complete."
                break
            fi

            print_status "No changes in batch IDs $batch_start-$batch_end. Continuing search..."
            current_id=$((current_id + BATCH_SIZE))
        fi
    done

    if ((processed_count > 0)); then
        print_success "Watch mode complete: Processed $processed_count batches"
    else
        print_status "Watch mode complete: No changes found"
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

    # Check if we're in a git repository
    if ! git rev-parse --git-head > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi

    # Watch mode: continuously monitor and process complete batches
    if [[ "$WATCH_MODE" == "true" ]]; then
        print_status "Watch mode enabled"
        print_status "Range: $START_ID to $END_ID (batch size: $BATCH_SIZE)"
        watch_and_process
        return
    fi

    # Normal mode: process all batches once
    print_status "Range: $START_ID to $END_ID (batch size: $BATCH_SIZE)"

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

# Run main function
main "$@"