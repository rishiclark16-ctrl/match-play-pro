#!/bin/bash

# MATCH Golf - App Store Screenshot Helper
# This script helps take screenshots from iOS simulators

set -e

SCREENSHOTS_DIR="./screenshots"
mkdir -p "$SCREENSHOTS_DIR"

echo "🏌️ MATCH Golf Screenshot Helper"
echo "================================"
echo ""

# Get device UDIDs
DEVICE_PRO_MAX=$(xcrun simctl list devices available | grep "iPhone 17 Pro Max" | grep -o '[A-F0-9-]\{36\}' | head -1)
DEVICE_PRO=$(xcrun simctl list devices available | grep "iPhone 17 Pro" | grep -v Max | grep -o '[A-F0-9-]\{36\}' | head -1)

if [ -z "$DEVICE_PRO_MAX" ]; then
    echo "❌ iPhone 17 Pro Max simulator not found."
    exit 1
fi

echo "✅ Found iPhone 17 Pro Max: $DEVICE_PRO_MAX"
echo ""

# Boot simulator if not already running
echo "🔄 Booting simulator..."
xcrun simctl boot "$DEVICE_PRO_MAX" 2>/dev/null || true

# Open Simulator app
open -a Simulator

sleep 3

echo ""
echo "================================"
echo "📱 Simulator is ready!"
echo ""
echo "STEPS:"
echo "1. In Xcode, select 'iPhone 17 Pro Max' as the target device"
echo "2. Build and run the app (Cmd+R)"
echo "3. Navigate to each screen and run the commands below"
echo ""
echo "SCREENSHOT COMMANDS:"
echo "--------------------"
echo ""
echo "# 1. Home Screen (show your rounds list)"
echo "xcrun simctl io $DEVICE_PRO_MAX screenshot $SCREENSHOTS_DIR/01_home.png"
echo ""
echo "# 2. Scorecard (mid-round with scores)"
echo "xcrun simctl io $DEVICE_PRO_MAX screenshot $SCREENSHOTS_DIR/02_scorecard.png"
echo ""
echo "# 3. Leaderboard/Match Status"
echo "xcrun simctl io $DEVICE_PRO_MAX screenshot $SCREENSHOTS_DIR/03_leaderboard.png"
echo ""
echo "# 4. Friends Page"
echo "xcrun simctl io $DEVICE_PRO_MAX screenshot $SCREENSHOTS_DIR/04_friends.png"
echo ""
echo "# 5. Round Complete/Results"
echo "xcrun simctl io $DEVICE_PRO_MAX screenshot $SCREENSHOTS_DIR/05_results.png"
echo ""
echo "# 6. New Round Setup"
echo "xcrun simctl io $DEVICE_PRO_MAX screenshot $SCREENSHOTS_DIR/06_new_round.png"
echo ""
echo "Screenshots will be saved to: $SCREENSHOTS_DIR"
echo ""
echo "NOTE: App Store Connect accepts 6.7\" screenshots and scales them"
echo "for other sizes. You only need ONE set of screenshots!"
echo "================================"
