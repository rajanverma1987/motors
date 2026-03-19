#!/usr/bin/env bash
# Motop Technician — EAS helpers (run from repo root or this app folder).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

usage() {
  echo "Usage: $0 <command> [args]"
  echo ""
  echo "Build (production profile):"
  echo "  build-android     eas build --platform android"
  echo "  build-ios         eas build --platform ios"
  echo "  build-all         eas build --platform all"
  echo ""
  echo "Submit latest build to stores:"
  echo "  submit-android    eas submit --platform android --latest"
  echo "  submit-ios        eas submit --platform ios --latest"
  echo ""
  echo "OTA (JS/assets only, channel production):"
  echo "  ota \"message\"     eas update --channel production --message \"...\""
  exit 1
}

case "${1:-}" in
  build-android) eas build --platform android --profile production ;;
  build-ios)     eas build --platform ios --profile production ;;
  build-all)     eas build --platform all --profile production ;;
  submit-android) eas submit --platform android --latest --profile production ;;
  submit-ios)     eas submit --platform ios --latest --profile production ;;
  ota)
    shift
    MSG="${*:-Update}"
    eas update --channel production --message "$MSG"
    ;;
  ""|-h|--help) usage ;;
  *) echo "Unknown command: $1"; usage ;;
esac
