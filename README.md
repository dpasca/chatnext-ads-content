# Custom Ads Configuration for OykGames

This directory contains the configuration and media files for your custom reward ads system.

## Current Setup

This example configuration promotes three games from your OykGames portfolio:

1. **Adventure Quest** (30 credits) - Epic RPG with video trailer
2. **Space Shooter Pro** (20 credits) - Action shooter with screenshot
3. **Puzzle Master** (25 credits) - Brain puzzle game with demo video

## What You Need To Add

### 1. Media Files
Add these files to the `media/` directory:

**Videos** (for trailers/gameplay):
- `adventure-quest-trailer.mp4` - Game trailer (recommended: 30-60 seconds, <50MB)
- `puzzle-master-demo.mp4` - Puzzle gameplay demo (recommended: 20-30 seconds, <50MB)

**Images** (for screenshots/thumbnails):
- `adventure-quest-thumb.jpg` - Thumbnail for video trailer (recommended: 400x300px, <2MB)
- `space-shooter-screenshot.jpg` - Game screenshot (recommended: 800x600px, <5MB)
- `puzzle-master-thumb.jpg` - Thumbnail for video demo (recommended: 400x300px, <2MB)

### 2. Update URLs
In `config.json`, update the `clickUrl` fields to point to your actual game pages:
- Replace `https://oykgames.com/adventure-quest` with real URLs
- Replace `https://oykgames.com/space-shooter` with real URLs
- Replace `https://oykgames.com/puzzle-master` with real URLs

### 3. Customize Content
Feel free to modify:
- **titles** - Make them catchy and appealing
- **descriptions** - Highlight what makes each game fun
- **creditsReward** - Adjust based on your credit economy
- **duration** - Set actual video lengths
- **metadata** - Add relevant tags and categories

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