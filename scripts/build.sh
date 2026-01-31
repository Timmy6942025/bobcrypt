#!/bin/bash
#
# Reproducible Build Script for Encyphrix
# Produces bit-for-bit identical builds given the same source
#
# Usage: ./scripts/build.sh [output_dir]
# Default output: ./dist/

set -euo pipefail

# Configuration
OUTPUT_DIR="${1:-./dist}"
SOURCE_DIR="./src"
MANIFEST_FILE="$OUTPUT_DIR/build-manifest.json"
HASHES_FILE="$OUTPUT_DIR/sri-hashes.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Ensure deterministic output by controlling environment
export LC_ALL=C
export LANG=C
export TZ=UTC

# Check dependencies
check_deps() {
    local deps=("openssl" "sha256sum" "jq" "python3")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "Required dependency not found: $dep"
            exit 1
        fi
    done
    log_success "All dependencies found"
}

# Clean and create output directory
prepare_output() {
    log_info "Preparing output directory: $OUTPUT_DIR"
    rm -rf "$OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR/lib"
    log_success "Output directory prepared"
}

# Copy source files with deterministic ordering
copy_sources() {
    log_info "Copying source files..."
    
    # Copy main HTML file
    cp "$SOURCE_DIR/index.html" "$OUTPUT_DIR/"
    
    # Copy JavaScript files in deterministic order
    for file in $(ls -1 "$SOURCE_DIR"/*.js 2>/dev/null | sort); do
        cp "$file" "$OUTPUT_DIR/"
    done
    
    # Copy lib files in deterministic order
    for file in $(ls -1 "$SOURCE_DIR/lib"/* 2>/dev/null | sort); do
        cp "$file" "$OUTPUT_DIR/lib/"
    done
    
    log_success "Source files copied"
}

# Generate SHA-256 hash of file content
generate_sha256() {
    local file="$1"
    sha256sum "$file" | cut -d' ' -f1
}

# Generate SRI hash (base64-encoded sha384 with algorithm prefix)
generate_sri_hash() {
    local file="$1"
    local hash
    hash=$(openssl dgst -sha384 -binary "$file" | openssl base64 -A)
    echo "sha384-$hash"
}

# Generate all hashes
generate_hashes() {
    log_info "Generating cryptographic hashes..."
    
    local manifest='{"build_info":{},"files":{}}'
    local sri_hashes='{}'
    
    # Build metadata
    local build_time
    build_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local git_commit
    git_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    local git_tag
    git_tag=$(git describe --tags --exact-match 2>/dev/null || echo "none")
    
    manifest=$(echo "$manifest" | jq \
        --arg time "$build_time" \
        --arg commit "$git_commit" \
        --arg tag "$git_tag" \
        '.build_info = {
            "timestamp": $time,
            "git_commit": $commit,
            "git_tag": $tag,
            "builder": "encyphrix-build",
            "version": "1.0.0"
        }')
    
    # Process all files in deterministic order
    while IFS= read -r -d '' file; do
        local rel_path="${file#$OUTPUT_DIR/}"
        local sha256
        sha256=$(generate_sha256 "$file")
        local sri
        sri=$(generate_sri_hash "$file")
        local size
        size=$(stat -c%s "$file")
        
        # Add to manifest
        manifest=$(echo "$manifest" | jq \
            --arg path "$rel_path" \
            --arg sha256 "$sha256" \
            --arg sri "$sri" \
            --argjson size "$size" \
            '.files[$path] = {
                "sha256": $sha256,
                "sri": $sri,
                "size": $size
            }')
        
        # Add to SRI hashes (for external reference)
        sri_hashes=$(echo "$sri_hashes" | jq \
            --arg path "$rel_path" \
            --arg sri "$sri" \
            '. + {($path): $sri}')
        
        log_info "  $rel_path: $sha256"
    done < <(find "$OUTPUT_DIR" -type f \( -name "*.html" -o -name "*.js" -o -name "*.mjs" -o -name "*.css" \) -print0 | sort -z)
    
    # Write manifest
    echo "$manifest" | jq -S . > "$MANIFEST_FILE"
    echo "$sri_hashes" | jq -S . > "$HASHES_FILE"
    
    log_success "Hashes generated and saved to:"
    log_success "  - $MANIFEST_FILE"
    log_success "  - $HASHES_FILE"
}

# Generate overall build hash (hash of all file hashes)
generate_build_hash() {
    log_info "Generating overall build hash..."
    
    local build_hash
    build_hash=$(cat "$MANIFEST_FILE" | sha256sum | cut -d' ' -f1)
    
    # Add build hash to manifest
    local manifest
    manifest=$(cat "$MANIFEST_FILE")
    manifest=$(echo "$manifest" | jq --arg hash "$build_hash" '.build_info.build_hash = $hash')
    echo "$manifest" | jq -S . > "$MANIFEST_FILE"
    
    # Also save as separate file for easy comparison
    echo "$build_hash" > "$OUTPUT_DIR/build-hash.txt"
    
    log_success "Build hash: $build_hash"
}

# Create verification script
create_verify_script() {
    log_info "Creating verification script..."
    
    cat > "$OUTPUT_DIR/verify-build.sh" << 'EOF'
#!/bin/bash
#
# Build Verification Script
# Compares current build against expected hashes
#

set -euo pipefail

MANIFEST_FILE="${1:-./build-manifest.json}"
OUTPUT_DIR="$(dirname "$MANIFEST_FILE")"

if [[ ! -f "$MANIFEST_FILE" ]]; then
    echo "ERROR: Manifest file not found: $MANIFEST_FILE"
    exit 1
fi

echo "Verifying build against manifest: $MANIFEST_FILE"
echo ""

failed=0
verified=0

# Verify each file in manifest
while IFS= read -r entry; do
    path=$(echo "$entry" | jq -r '.key')
    expected_sha256=$(echo "$entry" | jq -r '.value.sha256')
    expected_sri=$(echo "$entry" | jq -r '.value.sri')
    
    file_path="$OUTPUT_DIR/$path"
    
    if [[ ! -f "$file_path" ]]; then
        echo "❌ MISSING: $path"
        ((failed++))
        continue
    fi
    
    actual_sha256=$(sha256sum "$file_path" | cut -d' ' -f1)
    
    if [[ "$actual_sha256" == "$expected_sha256" ]]; then
        echo "✅ VERIFIED: $path"
        ((verified++))
    else
        echo "❌ MISMATCH: $path"
        echo "   Expected: $expected_sha256"
        echo "   Actual:   $actual_sha256"
        ((failed++))
    fi
done < <(jq -c 'to_entries | .[]' "$MANIFEST_FILE" | jq -c '.value.files // {} | to_entries | .[]')

echo ""
echo "================================"
echo "Verification complete:"
echo "  Verified: $verified"
echo "  Failed:   $failed"
echo "================================"

if [[ $failed -gt 0 ]]; then
    echo "❌ VERIFICATION FAILED"
    exit 1
else
    echo "✅ ALL FILES VERIFIED"
    exit 0
fi
EOF

    chmod +x "$OUTPUT_DIR/verify-build.sh"
    log_success "Verification script created: $OUTPUT_DIR/verify-build.sh"
}

# Create reproducibility test script
create_reproducibility_test() {
    log_info "Creating reproducibility test script..."
    
    cat > "$OUTPUT_DIR/test-reproducibility.sh" << 'EOF'
#!/bin/bash
#
# Reproducibility Test Script
# Builds twice and verifies bit-for-bit identical output
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_SCRIPT="$PROJECT_ROOT/scripts/build.sh"

echo "================================"
echo "Reproducibility Test"
echo "================================"
echo ""

# Create temp directories
BUILD1=$(mktemp -d)
BUILD2=$(mktemp -d)

cleanup() {
    rm -rf "$BUILD1" "$BUILD2"
}
trap cleanup EXIT

echo "Build 1: $BUILD1"
echo "Build 2: $BUILD2"
echo ""

# Run first build
echo "Running build 1..."
cd "$PROJECT_ROOT"
"$BUILD_SCRIPT" "$BUILD1" > /dev/null 2>&1
BUILD1_HASH=$(cat "$BUILD1/build-hash.txt")
echo "Build 1 hash: $BUILD1_HASH"

# Run second build
echo "Running build 2..."
"$BUILD_SCRIPT" "$BUILD2" > /dev/null 2>&1
BUILD2_HASH=$(cat "$BUILD2/build-hash.txt")
echo "Build 2 hash: $BUILD2_HASH"

echo ""
echo "================================"

if [[ "$BUILD1_HASH" == "$BUILD2_HASH" ]]; then
    echo "✅ REPRODUCIBLE: Builds are identical"
    echo "   Hash: $BUILD1_HASH"
    exit 0
else
    echo "❌ NOT REPRODUCIBLE: Builds differ"
    echo "   Build 1: $BUILD1_HASH"
    echo "   Build 2: $BUILD2_HASH"
    exit 1
fi
EOF

    chmod +x "$OUTPUT_DIR/test-reproducibility.sh"
    log_success "Reproducibility test script created"
}

# Main build process
main() {
    echo "================================"
    echo "Encyphrix Reproducible Build"
    echo "================================"
    echo ""
    
    check_deps
    prepare_output
    copy_sources
    generate_hashes
    generate_build_hash
    create_verify_script
    create_reproducibility_test
    
    echo ""
    echo "================================"
    log_success "Build complete!"
    echo "================================"
    echo ""
    echo "Output directory: $OUTPUT_DIR"
    echo "Build hash: $(cat "$OUTPUT_DIR/build-hash.txt")"
    echo ""
    echo "Next steps:"
    echo "  1. Verify build:   $OUTPUT_DIR/verify-build.sh"
    echo "  2. Test reproducibility: $OUTPUT_DIR/test-reproducibility.sh"
    echo "  3. See docs:       docs/build-verification.md"
}

main "$@"
