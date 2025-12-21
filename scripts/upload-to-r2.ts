#!/usr/bin/env npx tsx

import { execFile } from 'child_process';
import { promisify } from 'util';
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, relative, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
interface FileInfo {
  localPath: string;
  remotePath: string;
  size: number;
  checksum: string;
}

interface UploadState {
  uploaded: string[];
  failed: Array<{
    file: string;
    error: string;
    checksum: string;
  }>;
}

// Configuration
const BUCKET_NAME = 'hobby-ninja';
const DATA_DIR = './assets';
const BATCH_SIZE = 25; // Smaller batches for better reliability
const DRY_RUN = process.argv.includes('--dry-run');
const RESUME = !process.argv.includes('--force'); // Resume by default, --force to upload all
const STATE_FILE = './upload-state.json';

// Utility functions
async function execCommand(command: string, args: string[], options: Record<string, unknown> = {}): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: 120000, // 2 minute timeout
      ...options
    });
    return stdout;
  } catch (error) {
    // Check for SIGINT (Ctrl+C) and exit gracefully
    if (error.signal === 'SIGINT') {
      console.log('\n\n⚠️  Upload interrupted by user (Ctrl+C)');
      console.log('💾 Use --resume flag to continue later');
      process.exit(0);
    }
    console.error(`Error executing: ${command} ${args.join(' ')}`);
    console.error(error.message);
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    throw error;
  }
}

function getAllFiles(dir: string, extensions: string[] = ['.jpg', '.jpeg', '.pdf']): FileInfo[] {
  const files: FileInfo[] = [];

  function traverse(currentDir: string): void {
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
      console.error(`Error reading directory ${currentDir}:`, (error as Error).message);
    }
  }

  traverse(dir);
  return files.sort((a, b) => a.remotePath.localeCompare(b.remotePath));
}

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
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

function loadState(): UploadState {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8')) as UploadState;
  } catch {
    return { uploaded: [], failed: [] };
  }
}

function saveState(state: UploadState): void {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error saving state:', (error as Error).message);
  }
}

// Main upload function
async function uploadFiles(): Promise<void> {
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
    console.log('🔄 RESUME MODE (default) - Will skip already uploaded files');
    console.log('   Use --force to upload all files from scratch');
    console.log('');
  } else {
    console.log('🔄 FORCE MODE - Will upload all files from scratch');
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
    console.log('📝 By default, upload will resume from where it left off');
    console.log('   Use --force to upload all files from scratch');
    console.log('');
    console.log('Example commands that would be executed:');
    console.log(`wrangler r2 object put "${BUCKET_NAME}/path/to/file.jpg" --file="./assets/path/to/file.jpg"`);
    return;
  }

  // Handle resume state
  let state: UploadState = RESUME ? loadState() : { uploaded: [], failed: [] };
  const uploadedChecksums = new Set(state.uploaded);

  // Filter out already uploaded files
  const filesToUpload: FileInfo[] = RESUME
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
  const alreadyProcessed = RESUME ? (allFiles.length - filesToUpload.length) : 0;

  for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
    const batch = filesToUpload.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(filesToUpload.length / BATCH_SIZE);

    console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} files)...`);

    for (const file of batch) {
      try {
        // Use wrangler r2 object put command with remote flag
        await execCommand('wrangler', [
          'r2', 'object', 'put',
          `${BUCKET_NAME}/${file.remotePath}`,
          '--file', file.localPath,
          '--remote'
        ]);

        uploaded++;
        state.uploaded.push(file.checksum);

        // Progress indicator
        if (uploaded % 5 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const avgTime = elapsed / uploaded;
          const remaining = (filesToUpload.length - uploaded) * avgTime;
          const totalProcessed = alreadyProcessed + uploaded;
          const overallProgress = ((totalProcessed / allFiles.length) * 100).toFixed(1);

          process.stdout.write(`\r⏳ Progress: ${overallProgress}% (${totalProcessed}/${allFiles.length}) [↑${uploaded} ↓${failed} ⏭️${alreadyProcessed}] - ETA: ${formatDuration(remaining)}`);
        }

        // Save state periodically
        if (uploaded % 25 === 0) {
          saveState(state);
        }
      } catch (error) {
        failed++;
        state.failed.push({
          file: file.remotePath,
          error: (error as Error).message,
          checksum: file.checksum
        });
        console.error(`\n❌ Failed to upload: ${file.remotePath}`);
        console.error(`   Error: ${(error as Error).message}`);
      }
    }

    console.log(` ✅ Batch ${batchNum} complete`);
  }

  // Save final state
  saveState(state);

  // Final report
  const totalTime = (Date.now() - startTime) / 1000;
  const totalProcessed = alreadyProcessed + uploaded + failed;
  console.log('');
  console.log('🎉 Upload session complete!');

  // Summary breakdown
  console.log(`📊 Session Summary:`);
  if (alreadyProcessed > 0) {
    console.log(`   ⏭️  Previously uploaded: ${alreadyProcessed} files`);
  }
  console.log(`   ✅ Successfully uploaded: ${uploaded} files`);
  if (failed > 0) {
    console.log(`   ❌ Failed uploads: ${failed} files`);
  }
  console.log(`   📁 Total processed: ${totalProcessed}/${allFiles.length} files (${((totalProcessed / allFiles.length) * 100).toFixed(1)}%)`);

  if (failed > 0) {
    console.log(`💾 Failed files saved to state file for retry`);
    console.log(`🔄 To retry failed files: ./scripts/upload-to-r2.ts`);
  }
  console.log(`⏱️  Session time: ${formatDuration(totalTime)}`);
  if (uploaded > 0) {
    console.log(`📊 Upload speed: ${formatBytes(filesToUpload.reduce((sum, f) => sum + f.size, 0) / totalTime)}/s`);
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
  console.log('💾 Run script again to continue (resume is enabled by default)');
  process.exit(0);
});

// Run the script
uploadFiles().catch(console.error);