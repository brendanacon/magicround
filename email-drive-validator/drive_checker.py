"""
Google Drive folder navigator and file checker.

Navigates into a Drive folder, finds expected subfolders,
counts files, and validates them.
"""

import io
from config import EXPECTED_SUBFOLDERS, MIN_FILE_SIZE_BYTES, IMAGE_EXTENSIONS


def list_folder_contents(drive_service, folder_id):
    """List all files and folders inside a Google Drive folder."""
    items = []
    page_token = None

    while True:
        response = drive_service.files().list(
            q=f"'{folder_id}' in parents and trashed = false",
            spaces="drive",
            fields="nextPageToken, files(id, name, mimeType, size, thumbnailLink, webViewLink)",
            pageToken=page_token,
            pageSize=100,
        ).execute()

        items.extend(response.get("files", []))
        page_token = response.get("nextPageToken")
        if not page_token:
            break

    return items


def find_subfolders(drive_service, parent_folder_id, expected_names=None):
    """
    Find subfolders within a parent folder.

    If expected_names is provided, matches case-insensitively.
    Returns a dict mapping normalized name -> {id, name, ...}
    """
    if expected_names is None:
        expected_names = EXPECTED_SUBFOLDERS

    items = list_folder_contents(drive_service, parent_folder_id)

    folders = {}
    expected_lower = {name.lower(): name for name in expected_names}

    for item in items:
        if item["mimeType"] == "application/vnd.google-apps.folder":
            name_lower = item["name"].lower().strip()
            if name_lower in expected_lower:
                folders[expected_lower[name_lower]] = item
            else:
                # Fuzzy match: check if the expected name is contained in the folder name
                for exp_lower, exp_orig in expected_lower.items():
                    if exp_lower in name_lower or name_lower in exp_lower:
                        folders[exp_orig] = item
                        break

    return folders, items


def count_files_in_folder(drive_service, folder_id):
    """Count non-folder files in a Drive folder and return the file list."""
    items = list_folder_contents(drive_service, folder_id)
    files = [f for f in items if f["mimeType"] != "application/vnd.google-apps.folder"]
    return len(files), files


def get_file_extension(filename):
    """Extract file extension from a filename."""
    if "." in filename:
        return "." + filename.rsplit(".", 1)[1].lower()
    return ""


def validate_file(drive_service, file_info):
    """
    Validate a single file for corruption indicators.

    Returns a dict with validation results:
    - valid: bool
    - issues: list of issue descriptions
    """
    issues = []
    file_id = file_info["id"]
    file_name = file_info["name"]
    mime_type = file_info.get("mimeType", "")
    file_size = int(file_info.get("size", 0))
    extension = get_file_extension(file_name)

    # Google Docs/Sheets/Slides don't have a "size" in the traditional sense
    is_google_doc = mime_type.startswith("application/vnd.google-apps.")

    # Check 1: File size (skip for Google-native docs)
    if not is_google_doc:
        if file_size == 0:
            issues.append(f"File is empty (0 bytes)")
        elif file_size < MIN_FILE_SIZE_BYTES:
            issues.append(f"File is suspiciously small ({file_size} bytes)")

    # Check 2: Thumbnail availability (Google Drive generates thumbnails for valid files)
    if not is_google_doc and extension in IMAGE_EXTENSIONS:
        thumbnail_link = file_info.get("thumbnailLink")
        if not thumbnail_link:
            issues.append("No thumbnail available (image may be corrupted)")

    # Check 3: For non-Google-native files, try to read the first few bytes
    # to verify the file is accessible and has valid headers
    if not is_google_doc and extension in IMAGE_EXTENSIONS:
        try:
            request = drive_service.files().get_media(fileId=file_id)
            # Only download first 8KB to check headers
            fh = io.BytesIO()
            from googleapiclient.http import MediaIoBaseDownload
            downloader = MediaIoBaseDownload(fh, request)
            # Set a small chunk size
            downloader._chunksize = 8192
            downloader.next_chunk()
            header_bytes = fh.getvalue()

            if len(header_bytes) == 0:
                issues.append("File downloaded as empty")
            else:
                # Validate image headers
                header_issue = check_image_header(header_bytes, extension)
                if header_issue:
                    issues.append(header_issue)

        except Exception as e:
            issues.append(f"Cannot download file for validation: {e}")

    # Check 4: For documents, verify they have a reasonable size
    if not is_google_doc and extension in {".pdf", ".docx", ".doc", ".pptx"}:
        if file_size > 0 and file_size < 500:
            issues.append(f"Document is likely corrupted ({file_size} bytes is too small)")

    return {
        "file_name": file_name,
        "file_id": file_id,
        "mime_type": mime_type,
        "size": file_size,
        "valid": len(issues) == 0,
        "issues": issues,
    }


def check_image_header(data, extension):
    """
    Check if file data starts with valid image magic bytes.

    Returns an issue description string if invalid, None if valid.
    """
    magic_bytes = {
        ".jpg": [b"\xff\xd8\xff"],
        ".jpeg": [b"\xff\xd8\xff"],
        ".png": [b"\x89PNG\r\n\x1a\n"],
        ".gif": [b"GIF87a", b"GIF89a"],
        ".bmp": [b"BM"],
        ".webp": [b"RIFF"],  # RIFF....WEBP
        ".tiff": [b"II\x2a\x00", b"MM\x00\x2a"],
        ".tif": [b"II\x2a\x00", b"MM\x00\x2a"],
    }

    expected = magic_bytes.get(extension, [])
    if not expected:
        return None

    for magic in expected:
        if data[:len(magic)] == magic:
            return None

    return f"Invalid file header (expected {extension} magic bytes, file may be corrupted)"


def check_drive_folder(drive_service, folder_id, expected_count=None):
    """
    Full check of a Drive folder for a game package.

    1. Lists contents of the root folder
    2. Finds expected subfolders (character profiles, character objectives)
    3. Counts files in each subfolder
    4. Validates each file

    Returns a comprehensive report dict.
    """
    report = {
        "folder_id": folder_id,
        "subfolders": {},
        "missing_subfolders": [],
        "extra_items": [],
        "all_valid": True,
        "summary": [],
    }

    # Step 1: Find subfolders
    subfolders, all_items = find_subfolders(drive_service, folder_id)

    # Track what we found at root level
    for item in all_items:
        if item["mimeType"] == "application/vnd.google-apps.folder":
            if item["name"].lower().strip() not in [s.lower() for s in EXPECTED_SUBFOLDERS]:
                matched = any(
                    item["name"].lower().strip() in s.lower() or s.lower() in item["name"].lower().strip()
                    for s in EXPECTED_SUBFOLDERS
                )
                if not matched:
                    report["extra_items"].append(f"Unexpected folder: {item['name']}")

    # Step 2: Check for missing subfolders
    for expected_name in EXPECTED_SUBFOLDERS:
        if expected_name not in subfolders:
            report["missing_subfolders"].append(expected_name)
            report["all_valid"] = False
            report["summary"].append(f"MISSING subfolder: '{expected_name}'")

    # Step 3: Check each found subfolder
    for subfolder_name, subfolder_info in subfolders.items():
        file_count, files = count_files_in_folder(drive_service, subfolder_info["id"])

        subfolder_report = {
            "folder_name": subfolder_info["name"],
            "folder_id": subfolder_info["id"],
            "file_count": file_count,
            "expected_count": expected_count,
            "count_matches": expected_count is None or file_count == expected_count,
            "files": [],
        }

        # Count check
        if expected_count is not None and file_count != expected_count:
            report["all_valid"] = False
            report["summary"].append(
                f"COUNT MISMATCH in '{subfolder_info['name']}': "
                f"found {file_count}, expected {expected_count}"
            )
        else:
            report["summary"].append(
                f"'{subfolder_info['name']}': {file_count} files"
                + (f" (expected {expected_count})" if expected_count else "")
            )

        # Validate each file
        for file_info in files:
            validation = validate_file(drive_service, file_info)
            subfolder_report["files"].append(validation)

            if not validation["valid"]:
                report["all_valid"] = False
                for issue in validation["issues"]:
                    report["summary"].append(
                        f"FILE ISSUE in '{subfolder_info['name']}/{validation['file_name']}': {issue}"
                    )

        report["subfolders"][subfolder_name] = subfolder_report

    return report
