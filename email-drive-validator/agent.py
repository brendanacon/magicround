#!/usr/bin/env python3
"""
Email-Drive File Validator Agent

Monitors Gmail for game-related emails, extracts Google Drive folder links,
and validates that the correct number of uncorrupted files are present in
the expected subfolders (character profiles, character objectives).

Usage:
    python agent.py                    # Check all recent matching emails
    python agent.py --folder-id ABC123 # Check a specific Drive folder
    python agent.py --count 8          # Override expected file count
    python agent.py --query "subject:party"  # Custom Gmail search query
"""

import argparse
import sys

from auth import get_gmail_service, get_drive_service
from email_parser import fetch_recent_emails
from drive_checker import check_drive_folder


def print_divider():
    print("=" * 70)


def print_report(report, email_info=None):
    """Pretty-print a folder validation report."""
    print_divider()

    if email_info:
        print(f"EMAIL: {email_info['subject']}")
        print(f"  From: {email_info['from']}")
        print(f"  Date: {email_info['date']}")
        if email_info.get("guest_count"):
            print(f"  Detected guest count: {email_info['guest_count']}")
        print()

    print(f"DRIVE FOLDER: {report['folder_id']}")
    print()

    # Overall status
    if report["all_valid"]:
        print("  STATUS: ALL CHECKS PASSED")
    else:
        print("  STATUS: ISSUES FOUND")

    print()

    # Missing subfolders
    if report["missing_subfolders"]:
        print("  MISSING SUBFOLDERS:")
        for name in report["missing_subfolders"]:
            print(f"    - {name}")
        print()

    # Subfolder details
    for subfolder_name, sub_report in report["subfolders"].items():
        count_status = "OK" if sub_report["count_matches"] else "MISMATCH"
        expected_str = ""
        if sub_report["expected_count"] is not None:
            expected_str = f" (expected {sub_report['expected_count']})"

        print(f"  FOLDER: {sub_report['folder_name']}")
        print(f"    Files: {sub_report['file_count']}{expected_str} [{count_status}]")

        # File details
        for file_report in sub_report["files"]:
            if file_report["valid"]:
                size_str = format_size(file_report["size"])
                print(f"      OK  {file_report['file_name']} ({size_str})")
            else:
                print(f"      BAD {file_report['file_name']}")
                for issue in file_report["issues"]:
                    print(f"          -> {issue}")

        print()

    # Extra items at root
    if report["extra_items"]:
        print("  OTHER ITEMS AT ROOT:")
        for item in report["extra_items"]:
            print(f"    - {item}")
        print()

    # Summary
    if report["summary"]:
        print("  SUMMARY:")
        for line in report["summary"]:
            print(f"    {line}")

    print_divider()
    print()


def format_size(size_bytes):
    """Format bytes into human-readable size."""
    if size_bytes == 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB"]
    for unit in units:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def run_from_emails(gmail_service, drive_service, query=None, count_override=None):
    """Main flow: fetch emails, extract links, validate Drive folders."""
    print("Fetching recent emails...")
    emails = fetch_recent_emails(gmail_service, query=query)

    if not emails:
        print("No matching emails found.")
        return

    print(f"Found {len(emails)} matching email(s).\n")

    found_any = False

    for email_info in emails:
        if not email_info["drive_links"]:
            continue

        found_any = True
        expected_count = count_override or email_info.get("guest_count")

        for link_info in email_info["drive_links"]:
            print(f"Checking Drive folder: {link_info['url']}")
            try:
                report = check_drive_folder(
                    drive_service,
                    link_info["folder_id"],
                    expected_count=expected_count,
                )
                print_report(report, email_info=email_info)
            except Exception as e:
                print(f"  ERROR accessing folder {link_info['folder_id']}: {e}")
                print(f"  (Make sure the folder is shared with your Google account)")
                print()

    if not found_any:
        print("No emails contained Google Drive folder links.")
        print("Try adjusting the search query in config.py or with --query.")


def run_single_folder(drive_service, folder_id, expected_count=None):
    """Check a specific Drive folder directly (skip email parsing)."""
    print(f"Checking Drive folder: {folder_id}")
    try:
        report = check_drive_folder(
            drive_service,
            folder_id,
            expected_count=expected_count,
        )
        print_report(report)
    except Exception as e:
        print(f"ERROR accessing folder {folder_id}: {e}")
        print("Make sure the folder is shared with your Google account.")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Validate game files in Google Drive folders linked from emails.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python agent.py                          Check all recent matching emails
  python agent.py --folder-id ABC123       Check a specific folder
  python agent.py --count 8                Override the expected file count
  python agent.py --query "from:games@co"  Custom email search query
        """,
    )
    parser.add_argument(
        "--folder-id",
        help="Check a specific Google Drive folder ID directly (skips email parsing)",
    )
    parser.add_argument(
        "--count",
        type=int,
        help="Override the expected number of files per subfolder",
    )
    parser.add_argument(
        "--query",
        help="Custom Gmail search query (overrides config.py setting)",
    )

    args = parser.parse_args()

    # Build services
    drive_service = get_drive_service()

    if args.folder_id:
        run_single_folder(drive_service, args.folder_id, expected_count=args.count)
    else:
        gmail_service = get_gmail_service()
        run_from_emails(gmail_service, drive_service, query=args.query, count_override=args.count)


if __name__ == "__main__":
    main()
