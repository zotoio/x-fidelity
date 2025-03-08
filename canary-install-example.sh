#!/bin/bash
#
# This script uses the LaunchDarkly Node SDK to evaluate a feature flag
# and conditionally run a command based on the flag’s value.
#
# Requirements:
#   - Node.js installed.
#   - LaunchDarkly Node SDK installed:
#       yarn global add launchdarkly-node-client-sdk
#
# Set your LaunchDarkly clientid and feature flag key here.
# note that the clientid is not a secret, as it is public in the client-side SDKs
#
# export XFI_LD_CLIENT_ID="YOUR_LAUNCHDARKLY_CLIENT_ID"
# export XFI_VERSION_FLAG_KEY="your-feature-flag-key"

# get the first commit on this repo to use as the context key
XFI_CONTEXT_KEY=$(git rev-list --max-parents=0 HEAD | head -n 1)

# print config
echo "XFI_CONTEXT_KEY: $XFI_CONTEXT_KEY"
echo "XFI_LD_CLIENT_ID: $XFI_LD_CLIENT_ID"
echo "XFI_VERSION_FLAG_KEY: $XFI_VERSION_FLAG_KEY"

# Run a Node.js script to evaluate the flag.
FLAG_VALUE=$(node ./flagCheck.js $XFI_CONTEXT_KEY)
echo "FLAG_VALUE: $FLAG_VALUE"

# Check if the Node.js command succeeded.
if [ $? -ne 0 ]; then
  echo 'Error: Failed to evaluate the feature flag.'
  exit 0
fi

# Decide which command to run based on the flag value.
if [ "$FLAG_VALUE" == "true" ]; then
  echo "Installing the NEW version of xfi"
  # add your canary CI install command here
  # eg. yarn global add x-fidelity@3.9.1 --ignore-engines
else
  echo "Installing the current version of xfi"
  # add your current CI install command here
  # eg. yarn global add x-fidelity@2.17.2 --ignore-engines
fi
