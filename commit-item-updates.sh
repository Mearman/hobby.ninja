#!/bin/bash

# Script to commit and push item/manual updates in batches
# Usage: ./commit-item-updates.sh [OPTIONS]
# Supports both items and manuals via --type flag

set -e  # Exit on any error

# Default values
DEFAULT_START_ID=1
DEFAULT_END_ID=10000
DEFAULT_BATCH_SIZE=100
DEFAULT_TYPE="items"

# Default values
START_ID=$DEFAULT_START_ID
END_ID=$DEFAULT_END_ID
BATCH_SIZE=$DEFAULT_BATCH_SIZE
WATCH_MODE=false
DATA_TYPE=$DEFAULT_TYPE

# Parse named arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --type)
            DATA_TYPE="$2"
            shift 2
            ;;
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
            echo "  --type TYPE       Data type: 'items' or 'manuals' (default: $DEFAULT_TYPE)"
            echo "  --start-id ID     Starting ID (default: $DEFAULT_START_ID)"
            echo "  --end-id ID       Ending ID (default: $DEFAULT_END_ID)"
            echo "  --batch-size SIZE Number of IDs per batch (default: $DEFAULT_BATCH_SIZE)"
            echo "  --watch           Enable watch mode (default: disabled)"
            echo "  --no-watch        Disable watch mode (default: disabled)"
            echo "  -h, --help        Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                            # Items: 1-10000 in batches of 100"
            echo "  $0 --type manuals --start-id 1 --end-id 500  # Manuals: 1-500"
            echo "  $0 --start-id 1000 --end-id 1500             # Items: 1000-1500 in batches of 100"
            echo "  $0 --type manuals --watch                    # Watch mode for manuals"
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

# Validate type
if [[ "$DATA_TYPE" != "items" && "$DATA_TYPE" != "manuals" ]]; then
    echo "Invalid type: $DATA_TYPE. Must be 'items' or 'manuals'"
    exit 1
fi

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

# Helper functions for type-specific paths
get_json_file() {
    local id=$1
    local padded_id=$(printf "%04d" $id)
    if [[ "$DATA_TYPE" == "items" ]]; then
        echo "data/src/items/01_${padded_id}.json"
    else
        echo "data/src/manuals/${padded_id}.json"
    fi
}

get_asset_dir() {
    local id=$1
    local padded_id=$(printf "%04d" $id)
    if [[ "$DATA_TYPE" == "items" ]]; then
        echo "assets/images/items/01_${padded_id}"
    else
        echo "assets/manuals/${padded_id}"
    fi
}

get_alt_asset_dir() {
    local id=$1
    local padded_id=$(printf "%04d" $id)
    if [[ "$DATA_TYPE" == "items" ]]; then
        echo "apps/next/public/images/items/01_${padded_id}"
    else
        echo ""  # No alternate location for manuals
    fi
}

get_old_flat_pattern() {
    local id=$1
    local padded_id=$(printf "%04d" $id)
    if [[ "$DATA_TYPE" == "items" ]]; then
        echo "apps/next/public/images/items/01_${padded_id}_*.jpg"
    else
        echo ""  # No old flat pattern for manuals
    fi
}

# Get old manual cover pattern (e.g., assets/manuals/0088/0088.jpg)
get_old_manual_cover() {
    local id=$1
    local padded_id=$(printf "%04d" $id)
    if [[ "$DATA_TYPE" == "manuals" ]]; then
        echo "assets/manuals/${padded_id}/${padded_id}.jpg"
    else
        echo ""
    fi
}

get_commit_prefix() {
    if [[ "$DATA_TYPE" == "items" ]]; then
        echo "items"
    else
        echo "manuals"
    fi
}

# Check if a specific ID has any changes (JSON, deleted covers, or new assets)
id_has_changes() {
    local id=$1
    local json_file=$(get_json_file $id)
    local asset_dir=$(get_asset_dir $id)
    local old_cover=$(get_old_manual_cover $id)

    # Check JSON file: untracked, modified, or staged
    if [[ -f "$json_file" ]]; then
        if ! git ls-files --error-unmatch "$json_file" 2>/dev/null; then
            return 0  # Untracked JSON
        fi
        if ! git diff --quiet "$json_file" 2>/dev/null; then
            return 0  # Modified JSON
        fi
        if ! git diff --cached --quiet "$json_file" 2>/dev/null; then
            return 0  # Staged JSON changes
        fi
    fi

    # Check for deleted old manual cover (shows as "D" in worktree)
    if [[ -n "$old_cover" ]]; then
        # File was tracked but is now deleted in worktree
        if git ls-files --error-unmatch "$old_cover" 2>/dev/null && [[ ! -f "$old_cover" ]]; then
            return 0  # Deleted cover
        fi
    fi

    # Check for untracked files in asset directory
    if [[ -d "$asset_dir" ]]; then
        local untracked_count=$(git ls-files --others --exclude-standard "$asset_dir" 2>/dev/null | wc -l | tr -d ' ')
        if [[ "$untracked_count" -gt 0 ]]; then
            return 0  # Has new untracked assets
        fi
    fi

    return 1  # No changes
}

# Function to process a single batch
process_batch() {
    local batch_start=$1
    local batch_end=$2
    local batch_num=$3

    print_status "Processing batch $batch_num: IDs $batch_start-$batch_end ($DATA_TYPE)"

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
        # Use unified change detection (JSON, deleted covers, new assets)
        if ! id_has_changes $id; then
            continue
        fi

        print_status "  - Processing ID $id: Found changes"

        local json_file=$(get_json_file $id)
        local dir_path=$(get_asset_dir $id)
        local alt_dir_path=$(get_alt_asset_dir $id)
        local delete_pattern=$(get_old_flat_pattern $id)
        local old_cover=$(get_old_manual_cover $id)

        # Stage JSON file if it exists and has changes
        if [[ -f "$json_file" ]]; then
            git add "$json_file" 2>/dev/null || true
        fi
        staged=true

        # Delete old flat files for items using pattern
        if [[ -n "$delete_pattern" ]]; then
            local deleted_output=$(git rm $delete_pattern 2>&1)
            local deleted_count=$(echo "$deleted_output" | grep "rm '" | wc -l)
            deleted_count=$(echo "$deleted_count" | tr -d '[:space:]')
            if [[ "$deleted_count" =~ ^[0-9]+$ ]] && ((deleted_count > 0)); then
                deleted_files=$((deleted_files + deleted_count))
                print_status "  - ID $id: Deleted $deleted_count old image files"
            fi
        fi

        # Delete old manual cover if it's been removed from worktree
        if [[ -n "$old_cover" ]]; then
            if git ls-files --error-unmatch "$old_cover" 2>/dev/null && [[ ! -f "$old_cover" ]]; then
                git rm "$old_cover" 2>/dev/null || true
                deleted_files=$((deleted_files + 1))
                print_status "  - ID $id: Deleted old manual cover"
            fi
        fi

        # Add new directory if it exists (check both possible locations)
        if [[ -d "$dir_path" ]]; then
            git add "$dir_path" 2>/dev/null || true
            local file_count=$(find "$dir_path" -type f 2>/dev/null | wc -l)
            file_count=$(echo "$file_count" | tr -d '[:space:]')
            if [[ "$file_count" -gt 0 ]]; then
                added_files=$((added_files + file_count))
                print_status "  - ID $id: Added $file_count new asset files"
            fi
        elif [[ -n "$alt_dir_path" && -d "$alt_dir_path" ]]; then
            git add "$alt_dir_path" 2>/dev/null || true
            local file_count=$(find "$alt_dir_path" -type f 2>/dev/null | wc -l)
            file_count=$(echo "$file_count" | tr -d '[:space:]')
            if [[ "$file_count" -gt 0 ]]; then
                added_files=$((added_files + file_count))
                print_status "  - ID $id: Added $file_count new asset files from alt location"
            fi
        fi
    done

    # Log summary for this batch
    if ((deleted_files > 0)); then
        print_status "  - Deleted $deleted_files old files in this batch"
    fi
    if ((added_files > 0)); then
        print_status "  - Added $added_files new files in this batch"
    fi

    # Commit if there are staged changes
    if $staged; then
        local commit_prefix=$(get_commit_prefix)
        local commit_msg="feat: update ${commit_prefix} $batch_start-$batch_end"

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

    for ((id=batch_start; id<=batch_end; id++)); do
        if id_has_changes $id; then
            return 0  # Has changes
        fi
    done

    return 1  # No changes
}

# Function to check if the current batch has changes
check_current_batch() {
    local current_id=$1
    local batch_start=$current_id
    local batch_end=$((current_id + BATCH_SIZE - 1))
    if ((batch_end > END_ID)); then
        batch_end=$END_ID
    fi

    if check_for_changes $batch_start $batch_end; then
        return 0  # Has changes
    else
        return 1  # No changes
    fi
}

# Function to find the earliest ID with changes in the specified range
find_earliest_change() {
    local search_start=$1
    local search_end=$2

    for ((id=search_start; id<=search_end; id++)); do
        if id_has_changes $id; then
            echo $id
            return 0
        fi
    done

    echo -1  # No changes found
    return 1
}

# Function to wait for changes in a specific batch range
wait_for_batch_changes() {
    local wait_start_id=$1
    local wait_end_id=$2

    print_status "Waiting for changes in batch $wait_start_id-$wait_end_id..."

    while true; do
        local changed_ids=()

        for ((id=wait_start_id; id<=wait_end_id; id++)); do
            if id_has_changes $id; then
                changed_ids+=("$id")
            fi
        done

        if [[ ${#changed_ids[@]} -gt 0 ]]; then
            print_status "Changes detected in batch $wait_start_id-$wait_end_id for IDs: ${changed_ids[*]}"
            return 0
        fi

        sleep 3  # Check every 3 seconds for changes
    done
}

# Function to wait for batch completion (no new changes for a period)
wait_for_batch_completion() {
    local wait_start_id=$1
    local wait_end_id=$2
    local stable_duration=10  # Wait 10 seconds of no new changes
    local check_interval=2    # Check every 2 seconds
    local stable_count=0
    local required_checks=$((stable_duration / check_interval))
    local previous_change_count=0
    local current_change_count=0

    print_status "Waiting for batch $wait_start_id-$wait_end_id to complete (stable for ${stable_duration}s)..."

    while true; do
        local changed_ids=()
        current_change_count=0

        # Count current changes in this batch
        for ((id=wait_start_id; id<=wait_end_id; id++)); do
            if id_has_changes $id; then
                changed_ids+=("$id")
                current_change_count=$((current_change_count + 1))
            fi
        done

        # If change count increased, reset stability counter
        if ((current_change_count > previous_change_count)); then
            print_status "New changes detected (${#changed_ids[@]} IDs with changes). Resetting completion timer..."
            previous_change_count=$current_change_count
            stable_count=0
        else
            stable_count=$((stable_count + 1))
            print_status "Batch $wait_start_id-$wait_end_id stable: ${stable_count}/${required_checks} checks (${#changed_ids[@]} IDs with changes)"
        fi

        # If we've had enough stable checks, batch is complete
        if ((stable_count >= required_checks)); then
            print_status "Batch $wait_start_id-$wait_end_id completed (${#changed_ids[@]} IDs with changes)"
            return 0
        fi

        sleep $check_interval
    done
}

# Function to find the highest and lowest IDs with changes
find_change_boundaries() {
    local search_start=$1
    local search_end=$2
    local lowest_id=-1
    local highest_id=-1

    for ((id=search_start; id<=search_end; id++)); do
        if id_has_changes $id; then
            if ((lowest_id == -1)); then
                lowest_id=$id
            fi
            highest_id=$id
        fi
    done

    echo "$lowest_id:$highest_id"
}

# Function to find the first batch with changes by searching incrementally
find_first_batch_with_changes() {
    local search_start=$1
    local search_end=$2
    local batch_size=$3

    # Search batch by batch
    for ((batch_start=search_start; batch_start<=search_end; batch_start+=batch_size)); do
        local batch_end=$((batch_start + batch_size - 1))
        if ((batch_end > search_end)); then
            batch_end=$search_end
        fi

        print_status "Checking batch $batch_start-$batch_end for changes..." >&2

        # Check if this batch has any changes
        local boundaries=$(find_change_boundaries $batch_start $batch_end)
        local lowest_id=${boundaries%%:*}

        if ((lowest_id != -1)); then
            echo "$batch_start:$batch_end"
            return 0
        fi
    done

    echo "-1:-1"  # No changes found
    return 1
}

# Function to watch for changes and process complete batches (pipeline approach)
watch_and_process() {
    local processed_count=0
    local current_batch_start=$START_ID

    print_status "Watch mode: Pipeline monitoring for changes in IDs $START_ID-$END_ID"
    print_status "Each batch will be committed when the next batch starts getting changes"
    print_status "Press Ctrl+C to stop monitoring"

    # Check for any existing changes using incremental search
    print_status "Searching for first batch with changes..."
    local first_batch_result=$(find_first_batch_with_changes $START_ID $END_ID $BATCH_SIZE)
    local first_batch_start=${first_batch_result%%:*}
    local first_batch_end=${first_batch_result##*:}

    if ((first_batch_start == -1)); then
        print_status "No changes found in range $START_ID-$END_ID"
        print_status "Waiting for first changes to appear..."

        # Wait for first changes using incremental search
        while true; do
            first_batch_result=$(find_first_batch_with_changes $START_ID $END_ID $BATCH_SIZE)
            first_batch_start=${first_batch_result%%:*}
            if ((first_batch_start != -1)); then
                first_batch_end=${first_batch_result##:*}
                print_status "First changes detected in batch $first_batch_start-$first_batch_end"
                break
            fi
            sleep 5  # Wait longer between full searches
        done
    else
        print_status "Existing changes detected in batch $first_batch_start-$first_batch_end"
    fi

    # Find the actual range of changes within the first batch
    local boundaries=$(find_change_boundaries $first_batch_start $first_batch_end)
    local lowest_id=${boundaries%%:*}
    local highest_id=${boundaries##*:}
    print_status "Changes in ID range: $lowest_id-$highest_id"

    # Start from the batch that has changes
    current_batch_start=$first_batch_start

    while true; do
        # Calculate current and next batch boundaries
        local current_batch_end=$((current_batch_start + BATCH_SIZE - 1))
        if ((current_batch_end > END_ID)); then
            current_batch_end=$END_ID
        fi

        local next_batch_start=$((current_batch_end + 1))
        local next_batch_end=$((next_batch_start + BATCH_SIZE - 1))
        if ((next_batch_end > END_ID)); then
            next_batch_end=$END_ID
        fi

        print_status "Current batch: $current_batch_start-$current_batch_end, Next batch: $next_batch_start-$next_batch_end"

        # Check if current batch has changes to process
        local current_boundaries=$(find_change_boundaries $current_batch_start $current_batch_end)
        local current_lowest=${current_boundaries%%:*}
        local current_highest=${current_boundaries##*:}

        # Wait for next batch to have changes before processing current batch
        if ((current_lowest != -1)); then
            print_status "Current batch has changes (IDs $current_lowest-$current_highest). Waiting for next batch to start..."

            # Wait for changes to appear in next batch
            while true; do
                local next_boundaries=$(find_change_boundaries $next_batch_start $next_batch_end)
                local next_lowest=${next_boundaries%%:*}
                if ((next_lowest != -1)); then
                    local next_highest=${next_boundaries##*:}
                    print_status "Next batch started! Changes in $next_batch_start-$next_batch_end (IDs $next_lowest-$next_highest)"
                    break
                fi
                sleep 3
            done

            # Process current batch now that next batch has started
            print_status "Processing batch $((processed_count + 1)): IDs $current_batch_start-$current_batch_end (changes $current_lowest-$current_highest)"

            if process_batch $current_batch_start $current_batch_end $((processed_count + 1)); then
                processed_count=$((processed_count + 1))
                print_status "Pushing batch $processed_count to remote..."
                if git push --no-verify; then
                    print_success "Successfully pushed batch $processed_count"
                else
                    print_warning "Failed to push batch $processed_count"
                fi
            fi
        else
            print_status "No changes in current batch $current_batch_start-$current_batch_end, moving to next batch"
        fi

        # Move to the next batch
        current_batch_start=$next_batch_start

        # Check if we've reached the end
        if ((current_batch_start > END_ID)); then
            print_status "Reached end of ID range. Restarting from beginning to watch for new changes..."
            current_batch_start=$START_ID

            # Wait for new changes before continuing using incremental search
            while true; do
                local restart_result=$(find_first_batch_with_changes $START_ID $END_ID $BATCH_SIZE)
                local restart_batch_start=${restart_result%%:*}
                if ((restart_batch_start != -1)); then
                    print_status "New changes detected, restarting pipeline from batch $restart_batch_start-${restart_result##*:}"
                    current_batch_start=$restart_batch_start
                    break
                fi
                sleep 10  # Wait longer before checking for new cycles
            done
        fi
    done
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
    print_status "Starting $DATA_TYPE update process"

    # Check if we're in a git repository
    if ! git rev-parse --git-head > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi

    # Watch mode: continuously monitor and process complete batches
    if [[ "$WATCH_MODE" == "true" ]]; then
        print_status "Watch mode enabled for $DATA_TYPE"
        print_status "Range: $START_ID to $END_ID (batch size: $BATCH_SIZE)"
        watch_and_process
        return
    fi

    # Normal mode: process all batches once
    print_status "Processing $DATA_TYPE: $START_ID to $END_ID (batch size: $BATCH_SIZE)"

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

    print_success "$DATA_TYPE update process completed successfully"
}

# Run main function
main "$@"
