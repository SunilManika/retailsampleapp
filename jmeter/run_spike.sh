#!/bin/bash

# ============================================================================
#   Simple 5-Minute Load Test Runner for retail_spike.jmx
#   Runs a single sustained load test for exactly 5 minutes (300 seconds)
#
#   Usage:
#      ./run_5min.sh <server-hostname>
#
#   Example:
#      ./run_5min.sh retail-backend-retail.apps.cluster.domain.com
#
# ============================================================================

# ------------------------------
#  Validate Input
# ------------------------------
SERVER_HOST="$1"

if [ -z "$SERVER_HOST" ]; then
  echo "ERROR: No serverHost provided."
  echo "Usage: ./run_5min.sh <server-hostname>"
  exit 1
fi

# Tell log4j2 where to write jmeter.log before the JVM starts,
# so OpenShift random-UID containers (read-only CWD) don't get
# FileNotFoundException at startup.
export JVM_ARGS="-Djmeter.logfile=/tmp/jmeter.log"

echo "============================================================"
echo "  Running 5-Minute Load Test"
echo "  Server Host: $SERVER_HOST"
echo "  Duration: 300 seconds (5 minutes)"
echo "  Users: 300"
echo "  Ramp-up: 30 seconds"
echo "============================================================"
echo ""

# ------------------------------
#  Test Configuration
# ------------------------------
JMX="./retail_spike.jmx"
USERS=300
RAMP=30
DURATION=300
LOG="/tmp/results_5min.jtl"

# ------------------------------
#  Execute Test
# ------------------------------
jmeter -n \
  -t "$JMX" \
  -l "$LOG" \
  -j "/tmp/jmeter.log" \
  -Jusers="$USERS" \
  -Jramp="$RAMP" \
  -JserverHost="$SERVER_HOST" \
  -Jduration="$DURATION"

echo ""
echo "============================================================"
echo "  5-Minute Load Test Completed"
echo "  Results saved to: $LOG"
echo "============================================================"
echo ""
echo "To view results:"
echo "  - Open JMeter GUI and load $LOG"
echo "  - Or generate HTML report:"
echo "    jmeter -g $LOG -o report_html/"
echo "============================================================"

# Made with Bob
