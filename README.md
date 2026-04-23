# Custom Ads Configuration for OYK Games

This directory contains the configuration and media files for your custom reward ads system.

## Current Setup

The current configuration promotes these OYK Games titles:

1. **Final Freeway**
2. **Final Freeway 2R**
3. **Fractal Combat X (FCX)**
4. **Fractal Strike**

Each ad entry in `config.json` points at media stored in `media/` plus the
destination URLs to open after the user watches the content.

## Adding Or Updating An Ad

### 1. Prepare media files
Add the trailer/gameplay clip and thumbnail to `media/`.

Tip: when sourcing a trailer from PublishKit or another large master asset,
create a lighter ad-specific encode first so the reward flow stays fast on
mobile connections.

### 2. Add the ad entry to `config.json`
For each ad, set:
- `id` - Stable unique id, usually `oyk-<game-name>`
- `title` and `description` - User-facing copy shown in the modal
- `mediaType`, `mediaUrl`, `thumbnailUrl` - Local asset paths relative to this directory
- `clickUrl` - Primary destination URL
- `creditsReward` and `duration` - Reward amount and media length
- `metadata.storeLinks` - Optional per-store URLs for iOS and Android buttons

### 3. Keep store links accurate
Prefer official store URLs when a game is live. If only one platform is live,
set the live store URL as `clickUrl` and leave the unavailable store link out of
`metadata.storeLinks`.

## Media Specifications

**Videos:**
- Formats: MP4, MOV, WEBM
- Max size: 50MB per video
- Recommended resolution: 1280x720 (720p)
- Duration: 15-60 seconds for optimal user engagement

**Images:**
- Formats: JPG, PNG, WEBP
- Max size: 5MB per image
- Recommended resolution: 800x600 or 1200x900
- Use high-quality screenshots that showcase gameplay

## Upload Command

Once you have your media files ready:

```bash
# Upload to S3 (requires DO_SPACES_* environment variables)
node scripts/upload-custom-ads.js

# Or dry-run to test first:
node scripts/upload-custom-ads.js --dry-run
```

## Tips for Success

1. **Compelling Trailers**: Short, exciting videos work best (15-30 seconds)
2. **Clear Screenshots**: Show actual gameplay, not just title screens
3. **Engaging Descriptions**: Focus on fun and excitement, not features
4. **Fair Rewards**: Balance credits with your app's economy
5. **Mobile Optimization**: Ensure videos/images look good on small screens

## Testing

After uploading:
1. Enable custom ads: `CUSTOM_ADS_ENABLED=true`
2. Test the CustomAdModal component in your app
3. Verify videos play smoothly and links work
4. Check credit awarding functionality
