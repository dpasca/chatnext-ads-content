#!/usr/bin/env node

/**
 * Upload Custom Ads to S3
 *
 * Note: Run this script from the project root directory
 *
 * This script uploads ad configuration and media files to S3 for the custom ad system.
 * It reads ad definitions from a local directory and uploads them to the configured S3 bucket.
 *
 * Usage:
 *   node upload-custom-ads.js [options]
 *
 * Options:
 *   --config-dir <path>    Path to ads configuration directory (default: .)
 *   --dry-run             Show what would be uploaded without actually uploading
 *   --force              Overwrite existing files
 *   --help               Show this help message
 *
 * Directory structure expected (relative to server directory):
 *   ./
 *   ├── config.json              # Ad definitions
 *   ├── media/
 *   │   ├── game1-trailer.mp4
 *   │   ├── game1-thumb.jpg
 *   │   └── game2-preview.mp4
 *   └── README.md                # Optional documentation
 */

import { promises as fs } from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { config } from 'dotenv';

// Load environment variables from .env files
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
config({ path: envFile });

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  configDir: '.',
  dryRun: false,
  force: false,
  help: false
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--config-dir':
      options.configDir = args[++i];
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--force':
      options.force = true;
      break;
    case '--help':
      options.help = true;
      break;
    default:
      if (args[i].startsWith('--')) {
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
      }
  }
}

if (options.help) {
  console.log(`
Upload Custom Ads to S3

Usage: node upload-custom-ads.js [options]

Options:
  --config-dir <path>    Path to ads configuration directory (default: .)
  --dry-run             Show what would be uploaded without actually uploading
  --force              Overwrite existing files
  --help               Show this help message

Directory structure expected:
  ./
  ├── config.json              # Ad definitions
  ├── media/
  │   ├── game1-trailer.mp4
  │   ├── game1-thumb.jpg
  │   └── game2-preview.mp4
  └── README.md                # Optional documentation

Environment variables required:
  DO_SPACES_ACCESS_KEY         # DigitalOcean Spaces access key
  DO_SPACES_SECRET_KEY         # DigitalOcean Spaces secret key
  DO_SPACES_BUCKET            # DigitalOcean Spaces bucket name
  DO_SPACES_ENDPOINT          # DigitalOcean Spaces endpoint
  DO_SPACES_REGION            # DigitalOcean Spaces region
  DO_SPACES_PUBLIC_URL        # DigitalOcean Spaces public URL
`);
  process.exit(0);
}

// Validate required environment variables
const requiredEnvVars = [
  'DO_SPACES_ACCESS_KEY',
  'DO_SPACES_SECRET_KEY',
  'DO_SPACES_BUCKET',
  'DO_SPACES_ENDPOINT',
  'DO_SPACES_REGION'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please set these environment variables before running this script.');
  process.exit(1);
}

// Initialize S3 client
const s3Client = new S3Client({
  endpoint: `https://${process.env.DO_SPACES_ENDPOINT}`,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
  },
});

const bucketName = process.env.DO_SPACES_BUCKET;
const publicBaseUrl = process.env.DO_SPACES_PUBLIC_URL || `https://${bucketName}.${process.env.DO_SPACES_ENDPOINT}`;

/**
 * Get MIME type for a file based on its extension
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.json': 'application/json',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.webm': 'video/webm',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.md': 'text/markdown'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Check if a file exists in S3
 */
async function fileExistsInS3(key) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: key,
      MaxKeys: 1
    });
    const result = await s3Client.send(command);
    return result.Contents && result.Contents.length > 0 && result.Contents[0].Key === key;
  } catch (error) {
    return false;
  }
}

/**
 * Upload a file to S3
 */
async function uploadFile(localPath, s3Key, contentType) {
  try {
    const fileContent = await fs.readFile(localPath);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      ACL: 'public-read', // Make files publicly readable
    });

    if (!options.dryRun) {
      await s3Client.send(command);
    }

    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${localPath} to ${s3Key}:`, error.message);
    return false;
  }
}

/**
 * Validate ad configuration
 */
function validateAdConfig(config) {
  if (!config.version) {
    throw new Error('Ad config missing version field');
  }

  if (!config.ads || !Array.isArray(config.ads)) {
    throw new Error('Ad config missing ads array');
  }

  for (let i = 0; i < config.ads.length; i++) {
    const ad = config.ads[i];
    const requiredFields = ['id', 'title', 'description', 'mediaType', 'mediaUrl', 'clickUrl', 'creditsReward'];

    for (const field of requiredFields) {
      if (!ad[field]) {
        throw new Error(`Ad ${i} missing required field: ${field}`);
      }
    }

    if (!['video', 'image'].includes(ad.mediaType)) {
      throw new Error(`Ad ${i} has invalid mediaType: ${ad.mediaType} (must be 'video' or 'image')`);
    }

    if (typeof ad.creditsReward !== 'number' || ad.creditsReward <= 0) {
      throw new Error(`Ad ${i} has invalid creditsReward: ${ad.creditsReward} (must be positive number)`);
    }
  }

  console.log(`✅ Ad configuration is valid (${config.ads.length} ads)`);
}

/**
 * Update ad configuration with S3 URLs
 */
function updateAdConfigUrls(config, mediaFiles) {
  const updatedConfig = { ...config };

  updatedConfig.ads = config.ads.map(ad => {
    const updatedAd = { ...ad };

    // Update mediaUrl to S3 URL if it's a local file reference
    if (updatedAd.mediaUrl && !updatedAd.mediaUrl.startsWith('http')) {
      const mediaFileName = path.basename(updatedAd.mediaUrl);
      if (mediaFiles.includes(mediaFileName)) {
        updatedAd.mediaUrl = `${publicBaseUrl}/ads/media/${mediaFileName}`;
      }
    }

    // Update thumbnailUrl to S3 URL if it's a local file reference
    if (updatedAd.thumbnailUrl && !updatedAd.thumbnailUrl.startsWith('http')) {
      const thumbFileName = path.basename(updatedAd.thumbnailUrl);
      if (mediaFiles.includes(thumbFileName)) {
        updatedAd.thumbnailUrl = `${publicBaseUrl}/ads/media/${thumbFileName}`;
      }
    }

    return updatedAd;
  });

  // Update timestamp
  updatedConfig.lastUpdated = new Date().toISOString();

  return updatedConfig;
}

/**
 * Main upload function
 */
async function uploadAds() {
  console.log(`🚀 Starting custom ads upload...`);
  console.log(`📁 Config directory: ${options.configDir}`);
  console.log(`🪣 S3 Bucket: ${bucketName}`);
  console.log(`🌐 Public URL: ${publicBaseUrl}`);

  if (options.dryRun) {
    console.log(`🧪 DRY RUN: No files will actually be uploaded`);
  }

  try {
    // Check if config directory exists
    const configDir = path.resolve(options.configDir);
    try {
      await fs.access(configDir);
    } catch (error) {
      console.error(`❌ Config directory not found: ${configDir}`);
      console.error('Create the directory and add your ads configuration.');
      process.exit(1);
    }

    // Load and validate ad configuration
    const configPath = path.join(configDir, 'config.json');
    let config;
    try {
      const configContent = await fs.readFile(configPath, 'utf8');
      config = JSON.parse(configContent);
    } catch (error) {
      console.error(`❌ Failed to load config.json from ${configPath}`);
      console.error('Make sure the file exists and contains valid JSON.');
      process.exit(1);
    }

    validateAdConfig(config);

    // Get list of media files
    const mediaDir = path.join(configDir, 'media');
    let mediaFiles = [];
    try {
      const files = await fs.readdir(mediaDir);
      mediaFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp4', '.mov', '.avi', '.webm', '.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      });
      console.log(`📁 Found ${mediaFiles.length} media files`);
    } catch (error) {
      console.log(`⚠️  Media directory not found or empty: ${mediaDir}`);
    }

    // Update config with S3 URLs
    const updatedConfig = updateAdConfigUrls(config, mediaFiles);

    let uploadCount = 0;
    let skipCount = 0;

    // Upload media files
    for (const mediaFile of mediaFiles) {
      const localPath = path.join(mediaDir, mediaFile);
      const s3Key = `ads/media/${mediaFile}`;
      const contentType = getMimeType(mediaFile);

      // Check if file already exists
      const exists = !options.force && await fileExistsInS3(s3Key);

      if (exists) {
        console.log(`⏭️  Skipping ${mediaFile} (already exists, use --force to overwrite)`);
        skipCount++;
      } else {
        console.log(`⬆️  Uploading ${mediaFile}...`);
        const success = await uploadFile(localPath, s3Key, contentType);
        if (success) {
          uploadCount++;
          console.log(`✅ Uploaded ${mediaFile} to ${s3Key}`);
        }
      }
    }

    // Upload updated configuration
    const configS3Key = 'ads/config.json';
    const configExists = !options.force && await fileExistsInS3(configS3Key);

    if (configExists && !options.force) {
      console.log(`⏭️  Skipping config.json (already exists, use --force to overwrite)`);
      skipCount++;
    } else {
      console.log(`⬆️  Uploading updated configuration...`);

      if (!options.dryRun) {
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: configS3Key,
          Body: JSON.stringify(updatedConfig, null, 2),
          ContentType: 'application/json',
          ACL: 'public-read',
        });
        await s3Client.send(command);
      }

      uploadCount++;
      console.log(`✅ Uploaded configuration to ${configS3Key}`);
    }

    // Summary
    console.log('\n📊 Upload Summary:');
    console.log(`   ✅ Uploaded: ${uploadCount} files`);
    console.log(`   ⏭️  Skipped: ${skipCount} files`);
    console.log(`   🎯 Total ads: ${updatedConfig.ads.length}`);

    if (options.dryRun) {
      console.log('\n🧪 This was a dry run. Use without --dry-run to actually upload files.');
    } else {
      console.log('\n🎉 Upload completed successfully!');
      console.log(`\n🔗 Your ads will be available at:`);
      console.log(`   Config: ${publicBaseUrl}/ads/config.json`);

      if (mediaFiles.length > 0) {
        console.log(`   Media: ${publicBaseUrl}/ads/media/`);
      }

      console.log(`\n💡 Tip: Use the /api/ads/invalidate-cache endpoint to refresh the ad cache in your application.`);
    }

  } catch (error) {
    console.error(`❌ Upload failed:`, error.message);
    process.exit(1);
  }
}

// Create example configuration if config directory doesn't exist
async function createExampleConfig() {
  const configDir = path.resolve(options.configDir);

  try {
    await fs.access(configDir);
    return; // Directory exists, don't create example
  } catch (error) {
    // Directory doesn't exist, create it with example files
  }

  console.log(`📁 Creating example configuration in ${configDir}...`);

  await fs.mkdir(configDir, { recursive: true });
  await fs.mkdir(path.join(configDir, 'media'), { recursive: true });

  const exampleConfig = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    ads: [
      {
        id: 'oyk-game-1',
        title: 'Amazing Adventure Game',
        description: 'Embark on an epic journey in this amazing adventure game! Discover new worlds, collect treasures, and defeat enemies.',
        mediaType: 'video',
        mediaUrl: 'media/game1-trailer.mp4',
        thumbnailUrl: 'media/game1-thumb.jpg',
        clickUrl: 'https://oykgames.com/game1',
        creditsReward: 25,
        duration: 30,
        active: true,
        metadata: {
          gameId: 'adventure-quest',
          category: 'adventure',
          tags: ['adventure', 'rpg', 'fantasy']
        }
      },
      {
        id: 'oyk-game-2',
        title: 'Space Shooter Pro',
        description: 'Defend Earth from alien invaders in this action-packed space shooter!',
        mediaType: 'image',
        mediaUrl: 'media/game2-screenshot.jpg',
        clickUrl: 'https://oykgames.com/game2',
        creditsReward: 15,
        active: true,
        metadata: {
          gameId: 'space-shooter',
          category: 'action',
          tags: ['shooter', 'action', 'space']
        }
      }
    ]
  };

  await fs.writeFile(
    path.join(configDir, 'config.json'),
    JSON.stringify(exampleConfig, null, 2),
    'utf8'
  );

  const readmeContent = `# Custom Ads Configuration

This directory contains the configuration and media files for your custom ads.

## Files:
- \`config.json\` - Ad definitions and configuration
- \`media/\` - Directory containing video and image files

## Usage:
1. Add your video/image files to the \`media/\` directory
2. Update \`config.json\` with your ad definitions
3. Run \`node scripts/upload-custom-ads.js\` to upload to S3

## Ad Configuration:
Each ad in the \`ads\` array should have:
- \`id\`: Unique identifier
- \`title\`: Display title
- \`description\`: Ad description
- \`mediaType\`: 'video' or 'image'
- \`mediaUrl\`: Path to media file (relative to this directory)
- \`clickUrl\`: URL to redirect users when they click
- \`creditsReward\`: Number of credits to award
- \`active\`: Whether the ad is currently active
- \`duration\` (optional): Video duration in seconds
- \`thumbnailUrl\` (optional): Thumbnail image
- \`metadata\` (optional): Additional metadata

## Media Files:
Supported formats:
- Videos: .mp4, .mov, .avi, .webm
- Images: .jpg, .jpeg, .png, .gif, .webp

Files should be reasonably sized (< 50MB for videos, < 5MB for images).
`;

  await fs.writeFile(path.join(configDir, 'README.md'), readmeContent, 'utf8');

  console.log(`✅ Created example configuration in ${configDir}`);
  console.log(`📝 Edit ${configDir}/config.json and add media files to ${configDir}/media/`);
  console.log(`📖 See ${configDir}/README.md for more information`);
}

// Main execution
createExampleConfig().then(() => {
  uploadAds();
}).catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});