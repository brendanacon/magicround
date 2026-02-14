# Email-Drive File Validator Agent

Automatically checks Google Drive folders linked in your emails to verify that the correct number of character files exist and none are corrupted.

## What it does

1. Searches your Gmail for recent game-related emails
2. Extracts the number of guests/characters from the email text
3. Finds Google Drive folder links in the email
4. Opens each Drive folder and looks for subfolders: **character profiles** and **character objectives**
5. Counts files in each subfolder and compares against the expected guest count
6. Validates each file for corruption (checks file size, image headers, thumbnail availability)
7. Prints a clear report showing what passed and what needs attention

## Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Gmail API** and **Google Drive API**:
   - Go to APIs & Services > Library
   - Search for "Gmail API" and click Enable
   - Search for "Google Drive API" and click Enable

### 2. Create OAuth2 Credentials

1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" user type
   - Fill in the app name (e.g., "File Validator")
   - Add your email as a test user
4. For Application type, select **Desktop app**
5. Download the JSON file and save it as `credentials.json` in this directory

### 3. Install Dependencies

```bash
cd email-drive-validator
pip install -r requirements.txt
```

### 4. Configure (Optional)

Edit `config.py` to customize:
- `GMAIL_SEARCH_QUERY` - the Gmail search query to find your game emails
- `MAX_EMAILS_TO_CHECK` - how many recent emails to scan
- `EXPECTED_SUBFOLDERS` - the subfolder names to look for
- `MIN_FILE_SIZE_BYTES` - threshold below which files are flagged as suspicious

### 5. Run

```bash
# Check all recent matching emails
python agent.py

# Check a specific Drive folder directly
python agent.py --folder-id YOUR_FOLDER_ID

# Override the expected file count
python agent.py --count 8

# Use a custom email search query
python agent.py --query "from:sender@example.com"
```

On first run, a browser window will open asking you to authorize access to your Gmail and Drive. The authorization token is saved to `token.json` for future runs.

## File Validation Checks

The agent performs these corruption checks on each file:

| Check | What it detects |
|-------|----------------|
| **File size** | Empty files (0 bytes) or suspiciously small files (<1KB) |
| **Image headers** | Invalid magic bytes (wrong file format or corrupted data) |
| **Thumbnail availability** | Missing Drive thumbnails (images that won't render) |
| **Document size** | Documents too small to contain real content |

## Example Output

```
======================================================================
EMAIL: Your Murder Mystery Game - 8 Players
  From: games@example.com
  Date: Mon, 10 Feb 2025
  Detected guest count: 8

DRIVE FOLDER: 1ABC123...

  STATUS: ISSUES FOUND

  FOLDER: Character Profiles
    Files: 8 (expected 8) [OK]
      OK  detective.pdf (245.3 KB)
      OK  butler.pdf (198.7 KB)
      BAD chef.pdf
          -> File is suspiciously small (512 bytes)
      ...

  FOLDER: Character Objectives
    Files: 7 (expected 8) [MISMATCH]
      ...

  SUMMARY:
    COUNT MISMATCH in 'Character Objectives': found 7, expected 8
    FILE ISSUE in 'Character Profiles/chef.pdf': File is suspiciously small
======================================================================
```
