#!/bin/bash

# Script to commit and push item/manual/pbandai updates in batches
# Usage: ./commit-item-updates.sh [OPTIONS]
# Processes items, manuals, and P-Bandai items sequentially
# Uses fixed batch sizes (number of files) rather than ID ranges

set -e  # Exit on any error

# Default values
DEFAULT_BATCH_SIZE=100
DRY_RUN=false
BATCH_SIZE=$DEFAULT_BATCH_SIZE

# Parse named arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --batch-size)
            BATCH_SIZE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --batch-size SIZE Number of IDs per batch (default: $DEFAULT_BATCH_SIZE)"
            echo "  --dry-run         Show what would be committed without committing"
            echo "  -h, --help        Show this help message"
            echo ""
            echo "Each ID includes its JSON file and associated assets (images/PDFs)."
            echo ""
            echo "Examples:"
            echo "  $0                              # Commit all changed items, manuals, and pbandai in batches of 100"
            echo "  $0 --batch-size 50              # Use smaller batches of 50 IDs"
            echo "  $0 --dry-run                    # Preview batches without committing"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate batch size
if ! [[ "$BATCH_SIZE" =~ ^[0-9]+$ ]] || ((BATCH_SIZE < 1)); then
    echo "Invalid batch size: must be a positive number"
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

# Get all changed IDs for items (from JSON files and asset directories)
get_changed_item_ids() {
    local ids=()

    # From JSON files in data/src/items/
    for f in $(git diff --name-only data/src/items/ 2>/dev/null | grep '\.json$' | grep -v 'index\.json$'); do
        ids+=($(basename "$f" .json))
    done
    for f in $(git diff --cached --name-only data/src/items/ 2>/dev/null | grep '\.json$' | grep -v 'index\.json$'); do
        ids+=($(basename "$f" .json))
    done
    for f in $(git ls-files --others --exclude-standard data/src/items/ 2>/dev/null | grep '\.json$' | grep -v 'index\.json$'); do
        ids+=($(basename "$f" .json))
    done

    # From asset directories in assets/images/items/
    for d in $(git diff --name-only assets/images/items/ 2>/dev/null | cut -d'/' -f4 | sort -u); do
        [[ -n "$d" ]] && ids+=("$d")
    done
    for d in $(git diff --cached --name-only assets/images/items/ 2>/dev/null | cut -d'/' -f4 | sort -u); do
        [[ -n "$d" ]] && ids+=("$d")
    done
    for d in $(git ls-files --others --exclude-standard assets/images/items/ 2>/dev/null | cut -d'/' -f4 | sort -u); do
        [[ -n "$d" ]] && ids+=("$d")
    done

    # Deduplicate and sort
    printf '%s\n' "${ids[@]}" | sort -u
}

# Get all changed IDs for manuals (from JSON files and asset directories)
get_changed_manual_ids() {
    local ids=()

    # From JSON files in data/src/manuals/
    for f in $(git diff --name-only data/src/manuals/ 2>/dev/null | grep '\.json$' | grep -v 'index\.json$'); do
        ids+=($(basename "$f" .json))
    done
    for f in $(git diff --cached --name-only data/src/manuals/ 2>/dev/null | grep '\.json$' | grep -v 'index\.json$'); do
        ids+=($(basename "$f" .json))
    done
    for f in $(git ls-files --others --exclude-standard data/src/manuals/ 2>/dev/null | grep '\.json$' | grep -v 'index\.json$'); do
        ids+=($(basename "$f" .json))
    done

    # From asset directories in assets/manuals/
    for d in $(git diff --name-only assets/manuals/ 2>/dev/null | cut -d'/' -f3 | sort -u); do
        [[ -n "$d" ]] && ids+=("$d")
    done
    for d in $(git diff --cached --name-only assets/manuals/ 2>/dev/null | cut -d'/' -f3 | sort -u); do
        [[ -n "$d" ]] && ids+=("$d")
    done
    for d in $(git ls-files --others --exclude-standard assets/manuals/ 2>/dev/null | cut -d'/' -f3 | sort -u); do
        [[ -n "$d" ]] && ids+=("$d")
    done

    # Deduplicate and sort
    printf '%s\n' "${ids[@]}" | sort -u
}

# Get all changed IDs for P-Bandai items (from JSON files and asset directories)
get_changed_pbandai_ids() {
    local ids=()

    # From JSON files in data/src/pbandai/en/items/
    for f in $(git diff --name-only data/src/pbandai/en/items/ 2>/dev/null | grep '\.json$' | grep -v 'index\.json$'); do
        ids+=($(basename "$f" .json))
    done
    for f in $(git diff --cached --name-only data/src/pbandai/en/items/ 2>/dev/null | grep '\.json$' | grep -v 'index\.json$'); do
        ids+=($(basename "$f" .json))
    done
    for f in $(git ls-files --others --exclude-standard data/src/pbandai/en/items/ 2>/dev/null | grep '\.json$' | grep -v 'index\.json$'); do
        ids+=($(basename "$f" .json))
    done

    # From asset directories in assets/pbandai/en/items/
    for d in $(git diff --name-only assets/pbandai/en/items/ 2>/dev/null | cut -d'/' -f5 | sort -u); do
        [[ -n "$d" ]] && ids+=("$d")
    done
    for d in $(git diff --cached --name-only assets/pbandai/en/items/ 2>/dev/null | cut -d'/' -f5 | sort -u); do
        [[ -n "$d" ]] && ids+=("$d")
    done
    for d in $(git ls-files --others --exclude-standard assets/pbandai/en/items/ 2>/dev/null | cut -d'/' -f5 | sort -u); do
        [[ -n "$d" ]] && ids+=("$d")
    done

    # Deduplicate and sort
    printf '%s\n' "${ids[@]}" | sort -u
}

# Stage all files for a given item ID
stage_item_files() {
    local id=$1
    local staged=0

    # JSON file
    if [[ -f "data/src/items/${id}.json" ]]; then
        git add "data/src/items/${id}.json" 2>/dev/null && staged=1
    fi

    # Asset directory
    if [[ -d "assets/images/items/${id}" ]]; then
        git add "assets/images/items/${id}" 2>/dev/null && staged=1
    fi

    return $((1 - staged))
}

# Stage all files for a given manual ID
stage_manual_files() {
    local id=$1
    local staged=0

    # JSON file
    if [[ -f "data/src/manuals/${id}.json" ]]; then
        git add "data/src/manuals/${id}.json" 2>/dev/null && staged=1
    fi

    # Asset directory
    if [[ -d "assets/manuals/${id}" ]]; then
        git add "assets/manuals/${id}" 2>/dev/null && staged=1
    fi

    return $((1 - staged))
}

# Stage all files for a given P-Bandai item ID
stage_pbandai_files() {
    local id=$1
    local staged=0

    # JSON file
    if [[ -f "data/src/pbandai/en/items/${id}.json" ]]; then
        git add "data/src/pbandai/en/items/${id}.json" 2>/dev/null && staged=1
    fi

    # Asset directory
    if [[ -d "assets/pbandai/en/items/${id}" ]]; then
        git add "assets/pbandai/en/items/${id}" 2>/dev/null && staged=1
    fi

    # Always include index.json if it has changes
    if [[ -f "data/src/pbandai/en/index.json" ]]; then
        git add "data/src/pbandai/en/index.json" 2>/dev/null
    fi

    return $((1 - staged))
}

# Function to process a single batch of IDs
process_batch() {
    local data_type=$1
    local batch_num=$2
    shift 2
    local ids=("$@")

    local id_count=${#ids[@]}
    if ((id_count == 0)); then
        print_warning "No IDs in batch $batch_num"
        return 1
    fi

    local first_id="${ids[0]}"
    local last_id="${ids[$((id_count-1))]}"

    print_status "Processing batch $batch_num: $id_count IDs ($first_id to $last_id)"

    if $DRY_RUN; then
        print_status "  [DRY RUN] Would commit IDs:"
        for id in "${ids[@]}"; do
            echo "    - $id"
        done
        return 0
    fi

    # Clean staging area
    if ! git diff --cached --quiet; then
        print_status "  - Cleaning staging area"
        git reset 2>/dev/null || true
    fi

    # Stage all files for each ID
    for id in "${ids[@]}"; do
        if [[ "$data_type" == "items" ]]; then
            stage_item_files "$id"
        elif [[ "$data_type" == "manuals" ]]; then
            stage_manual_files "$id"
        elif [[ "$data_type" == "pbandai" ]]; then
            stage_pbandai_files "$id"
        fi
    done

    # Commit if there are staged changes
    if ! git diff --cached --quiet; then
        local commit_msg="feat(data): update ${data_type} $first_id to $last_id"

        git commit --no-verify -m "$commit_msg"
        print_success "Committed batch $batch_num ($id_count IDs)"
        return 0
    else
        print_warning "No staged changes for batch $batch_num"
        return 1
    fi
}

# Global counter for successful batches
TOTAL_SUCCESSFUL=0

# Process all changed IDs for a given data type
process_data_type() {
    local data_type=$1

    print_status "=== Processing $data_type ==="

    # Get all changed IDs
    print_status "Finding changed $data_type..."
    local all_ids=()
    if [[ "$data_type" == "items" ]]; then
        while IFS= read -r id; do
            [[ -n "$id" ]] && all_ids+=("$id")
        done < <(get_changed_item_ids)
    elif [[ "$data_type" == "manuals" ]]; then
        while IFS= read -r id; do
            [[ -n "$id" ]] && all_ids+=("$id")
        done < <(get_changed_manual_ids)
    elif [[ "$data_type" == "pbandai" ]]; then
        while IFS= read -r id; do
            [[ -n "$id" ]] && all_ids+=("$id")
        done < <(get_changed_pbandai_ids)
    fi

    local total_ids=${#all_ids[@]}

    if ((total_ids == 0)); then
        print_warning "No changed $data_type found"
        return 0
    fi

    print_status "Found $total_ids changed $data_type"

    local total_batches=$(( (total_ids + BATCH_SIZE - 1) / BATCH_SIZE ))
    local processed_batches=0
    local successful_batches=0

    print_status "Processing in $total_batches batches"

    # Process each batch
    local batch_num=0
    for ((i=0; i<total_ids; i+=BATCH_SIZE)); do
        batch_num=$((batch_num + 1))

        # Extract batch of IDs
        local batch_ids=("${all_ids[@]:i:BATCH_SIZE}")

        # Process the batch
        if process_batch "$data_type" $batch_num "${batch_ids[@]}"; then
            successful_batches=$((successful_batches + 1))
            TOTAL_SUCCESSFUL=$((TOTAL_SUCCESSFUL + 1))

            # Push after each successful batch (unless dry run)
            if ! $DRY_RUN; then
                print_status "Pushing batch $batch_num to remote..."
                if git push --no-verify; then
                    print_success "Successfully pushed batch $batch_num"
                else
                    print_warning "Failed to push batch $batch_num, will continue with remaining batches"
                fi
            fi
        fi

        processed_batches=$((processed_batches + 1))
    done

    print_status "$data_type complete: $successful_batches/$processed_batches batches committed"
}

# Main execution
main() {
    print_status "Starting data update process"
    print_status "Batch size: $BATCH_SIZE files per commit"

    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi

    if $DRY_RUN; then
        print_warning "DRY RUN MODE - No changes will be made"
    fi

    # Process items first
    process_data_type "items"

    echo ""

    # Then process manuals
    process_data_type "manuals"

    echo ""

    # Then process P-Bandai items
    process_data_type "pbandai"

    echo ""
    print_status "========================================="

    if ((TOTAL_SUCCESSFUL > 0)); then
        if $DRY_RUN; then
            print_success "DRY RUN complete - would have committed $TOTAL_SUCCESSFUL total batches"
        else
            print_success "All done! Committed and pushed $TOTAL_SUCCESSFUL total batches"
        fi
    else
        print_warning "No batches were committed"
    fi
}

# Run main function
main "$@"
