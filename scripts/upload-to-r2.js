#!/usr/bin/env node

import { execSync } from 'child_process';
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, relative, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BUCKET_NAME = 'hobby-ninja';
const DATA_DIR = './data';
const BATCH_SIZE = 25; // Smaller batches for better reliability
const DRY_RUN = process.argv.includes('--dry-run');
const RESUME = process.argv.includes('--resume');
const STATE_FILE = './upload-state.json';

// Utility functions
function execCommand(command, args, options = {}) {
  try {
    const fullCommand = `${command} ${args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ')}`;
    const result = execSync(fullCommand, {
      encoding: 'utf8',
      timeout: 120000, // 2 minute timeout
      stdio: 'pipe',
      ...options
    });
    return result;
  } catch (error) {
    console.error(`Error executing: ${command} ${args.join(' ')}`);
    console.error(error.message);
    throw error;
  }
}

function getAllFiles(dir, extensions = ['.jpg', '.jpeg', '.pdf']) {
  const files = [];

  function traverse(currentDir) {
    try {
      const items = readdirSync(currentDir);

      for (const item of items) {
        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (extensions.includes(extname(item).toLowerCase())) {
          const relativePath = relative(dir, fullPath);
          files.push({
            localPath: fullPath,
            remotePath: relativePath.replace(/\\/g, '/'), // Convert Windows paths to Unix
            size: stat.size,
            checksum: createHash('md5').update(relativePath).digest('hex')
          });
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentDir}:`, error.message);
    }
  }

  traverse(dir);
  return files.sort((a, b) => a.remotePath.localeCompare(b.remotePath));
}

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { uploaded: [], failed: [] };
  }
}

function saveState(state) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error saving state:', error.message);
  }
}

// Main upload function
async function uploadFiles() {
  console.log('🚀 Starting R2 upload to hobby-ninja bucket...');
  console.log(`📁 Source directory: ${DATA_DIR}`);
  console.log(`🗑️  Target bucket: ${BUCKET_NAME}`);
  console.log(`🔍 File types: .jpg, .jpeg, .pdf`);
  console.log('');

  if (DRY_RUN) {
    console.log('🧪 DRY RUN MODE - No files will be uploaded');
    console.log('');
  }

  if (RESUME) {
    console.log('🔄 RESUME MODE - Will skip already uploaded files');
    console.log('');
  }

  // Get all files
  console.log('📋 Scanning for files...');
  const allFiles = getAllFiles(DATA_DIR);

  // Separate by type for reporting
  const jpgFiles = allFiles.filter(f =>
    ['.jpg', '.jpeg'].includes(extname(f.remotePath).toLowerCase())
  );
  const pdfFiles = allFiles.filter(f =>
    extname(f.remotePath).toLowerCase() === '.pdf'
  );

  // Report summary
  console.log(`📊 Found ${allFiles.length} files:`);
  console.log(`   🖼️  Images: ${jpgFiles.length} files (${formatBytes(jpgFiles.reduce((sum, f) => sum + f.size, 0))})`);
  console.log(`   📄 PDFs: ${pdfFiles.length} files (${formatBytes(pdfFiles.reduce((sum, f) => sum + f.size, 0))})`);
  console.log(`   💾 Total: ${formatBytes(allFiles.reduce((sum, f) => sum + f.size, 0))}`);
  console.log('');

  if (DRY_RUN) {
    console.log('🧪 Dry run complete. To upload files, run without --dry-run flag');
    console.log('');
    console.log('Example commands that would be executed:');
    console.log(`wrangler r2 object put "${BUCKET_NAME}/path/to/file.jpg" --file="./data/path/to/file.jpg"`);
    return;
  }

  // Handle resume state
  let state = RESUME ? loadState() : { uploaded: [], failed: [] };
  const uploadedChecksums = new Set(state.uploaded);

  // Filter out already uploaded files
  const filesToUpload = RESUME
    ? allFiles.filter(f => !uploadedChecksums.has(f.checksum))
    : allFiles;

  if (RESUME) {
    const skipped = allFiles.length - filesToUpload.length;
    console.log(`⏭️  Skipping ${skipped} already uploaded files`);
    console.log(`📋 Files remaining: ${filesToUpload.length}`);
    console.log('');
  }

  if (filesToUpload.length === 0) {
    console.log('✅ All files have been uploaded!');
    return;
  }

  // Upload in batches
  const startTime = Date.now();
  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
    const batch = filesToUpload.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(filesToUpload.length / BATCH_SIZE);

    console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} files)...`);

    for (const file of batch) {
      try {
        // Use wrangler r2 object put command
        await execCommand('wrangler', [
          'r2', 'object', 'put',
          `${BUCKET_NAME}/${file.remotePath}`,
          '--file', file.localPath
        ]);

        uploaded++;
        state.uploaded.push(file.checksum);

        // Progress indicator
        if (uploaded % 5 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const avgTime = elapsed / uploaded;
          const remaining = (filesToUpload.length - uploaded) * avgTime;
          const progress = ((uploaded / filesToUpload.length) * 100).toFixed(1);

          process.stdout.write(`\r⏳ Progress: ${progress}% (${uploaded}/${filesToUpload.length}) - ETA: ${formatDuration(remaining)}`);
        }

        // Save state periodically
        if (uploaded % 25 === 0) {
          saveState(state);
        }
      } catch (error) {
        failed++;
        state.failed.push({
          file: file.remotePath,
          error: error.message,
          checksum: file.checksum
        });
        console.error(`\n❌ Failed to upload: ${file.remotePath}`);
        console.error(`   Error: ${error.message}`);
      }
    }

    console.log(` ✅ Batch ${batchNum} complete`);
  }

  // Save final state
  saveState(state);

  // Final report
  const totalTime = (Date.now() - startTime) / 1000;
  console.log('');
  console.log('🎉 Upload complete!');
  console.log(`✅ Successfully uploaded: ${uploaded} files`);
  if (failed > 0) {
    console.log(`❌ Failed uploads: ${failed} files`);
    console.log(`💾 Failed files saved to state file for retry`);
    console.log(`🔄 To retry failed files: node scripts/upload-to-r2.js --resume`);
  }
  console.log(`⏱️  Total time: ${formatDuration(totalTime)}`);
  if (uploaded > 0) {
    console.log(`📊 Average speed: ${formatBytes(filesToUpload.reduce((sum, f) => sum + f.size, 0) / totalTime)}/s`);
  }

  if (!RESUME && failed === 0) {
    // Clean up state file on complete success
    try {
      const { unlinkSync } = await import('fs');
      unlinkSync(STATE_FILE);
      console.log('🗑️  Cleaned up state file');
    } catch {
      // Ignore cleanup errors
    }
  }

  // Check bucket contents
  console.log('');
  console.log('🔍 Checking bucket contents...');
  try {
    const listResult = await execCommand('wrangler', ['r2', 'object', 'list', BUCKET_NAME]);
    const lines = listResult.trim().split('\n');
    const objectCount = lines.length > 0 && lines[0] ? lines.length - 1 : 0; // Subtract header
    console.log(`📦 Bucket now contains approximately ${objectCount} objects`);
  } catch (error) {
    console.log('⚠️  Could not verify bucket contents');
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Unexpected error:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled promise rejection:', reason);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Upload interrupted by user');
  console.log('💾 Use --resume flag to continue later');
  process.exit(0);
});

// Run the script
uploadFiles().catch(console.error);