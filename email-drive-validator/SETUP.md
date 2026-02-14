# Email-Drive File Validator - Setup Guide

This tool reads your emails, finds the Google Drive links, and checks that the right number of files are in the character profiles and character objectives folders (and that none are corrupted).

---

## Step 1: Install Python (if you don't have it)

Open Terminal and check:

```
python3 --version
```

If you get a version number (3.8 or higher), you're good. If not, download Python from https://www.python.org/downloads/

---

## Step 2: Set up Google Cloud (one-time, ~5 minutes)

This gives the tool permission to read your Gmail and Google Drive.

1. Open https://console.cloud.google.com/
2. Sign in with the same Google account that receives the game emails
3. At the top of the page, click the project dropdown and click **New Project**
4. Name it anything (e.g. "File Validator") and click **Create**
5. Wait a few seconds, then make sure your new project is selected in the top dropdown

---

## Step 3: Turn on Gmail and Drive APIs

1. In the left sidebar, click **APIs & Services** then **Library**
2. In the search bar, type **Gmail API**
3. Click on it, then click the blue **Enable** button
4. Go back to the Library (click the back arrow or left sidebar)
5. Search for **Google Drive API**
6. Click on it, then click the blue **Enable** button

---

## Step 4: Create your credentials file

1. In the left sidebar, click **APIs & Services** then **Credentials**
2. Click the blue **+ CREATE CREDENTIALS** button at the top
3. Select **OAuth client ID**
4. You'll likely be asked to **Configure Consent Screen** first:
   - Click the button to configure it
   - Choose **External** and click Create
   - Fill in **App name** (e.g. "File Validator")
   - Fill in **User support email** (your email)
   - Scroll down, fill in **Developer contact email** (your email again)
   - Click **Save and Continue** through the remaining steps (Scopes, Test Users, Summary)
   - On the **Test Users** step, click **+ Add Users** and add your own email address
   - Click **Save and Continue**, then **Back to Dashboard**
5. Now go back to **Credentials** in the left sidebar
6. Click **+ CREATE CREDENTIALS** > **OAuth client ID** again
7. For **Application type**, choose **Desktop app**
8. Name it anything and click **Create**
9. Click **DOWNLOAD JSON** on the popup that appears
10. Rename the downloaded file to **`credentials.json`**
11. Move it into the `email-drive-validator` folder (same folder as `agent.py`)

---

## Step 5: Install the Python packages

Open Terminal, navigate to this folder, and run:

```
cd email-drive-validator
pip3 install -r requirements.txt
```

---

## Step 6: Tell the tool what emails to search for

Open `config.py` in any text editor and change this line to match your game emails:

```python
GMAIL_SEARCH_QUERY = 'subject:"murder mystery" OR subject:"character" OR subject:"game"'
```

For example, if all your game emails come from a specific address:
```python
GMAIL_SEARCH_QUERY = 'from:orders@yourgamecompany.com'
```

Or if they all have a specific subject:
```python
GMAIL_SEARCH_QUERY = 'subject:"your party game name"'
```

Also update the subfolder names if yours are different:
```python
EXPECTED_SUBFOLDERS = ["character profiles", "character objectives"]
```

---

## Step 7: Run it

```
python3 agent.py
```

**First time only:** A browser window will pop up asking you to sign in to Google and allow access. Click through and approve it. This only happens once - after that it remembers your login.

The tool will then:
1. Search your Gmail for matching emails
2. Pull out the guest count and Drive folder link from each email
3. Open each Drive folder
4. Check the character profiles and character objectives subfolders
5. Count the files and flag any that look corrupted

---

## Other ways to run it

**Check a specific Drive folder directly** (skip the email step):
```
python3 agent.py --folder-id PASTE_FOLDER_ID_HERE
```
(The folder ID is the long string of letters/numbers at the end of the Drive folder URL)

**Tell it exactly how many files to expect:**
```
python3 agent.py --count 8
```

**Combine both:**
```
python3 agent.py --folder-id PASTE_FOLDER_ID_HERE --count 10
```

---

## What the output looks like

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

  FOLDER: Character Objectives
    Files: 7 (expected 8) [MISMATCH]

  SUMMARY:
    COUNT MISMATCH in 'Character Objectives': found 7, expected 8
    FILE ISSUE in 'Character Profiles/chef.pdf': File is suspiciously small
======================================================================
```

- **OK** = file looks good
- **BAD** = something is wrong (empty, corrupted, or can't load)
- **MISMATCH** = wrong number of files vs. what the email said
- **MISSING subfolder** = the expected folder wasn't found in Drive

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Missing credentials.json" | Make sure you completed Step 4 and the file is in this folder |
| "Access denied" to a Drive folder | The Drive folder needs to be shared with (or owned by) the Google account you signed in with |
| No emails found | Adjust the `GMAIL_SEARCH_QUERY` in `config.py` to match your emails (Step 6) |
| "pip3 not found" | Try `pip` instead of `pip3`, or install Python first (Step 1) |
| Browser doesn't open on first run | Copy the URL from the terminal and paste it into your browser manually |
