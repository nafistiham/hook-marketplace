#!/bin/bash
# create-checkpoint — auto-stash uncommitted changes at end of Claude session
#
# Adapted from claudekit (https://github.com/carlrannaberg/claudekit)
# Copyright (c) 2024 claudekit contributors
# MIT License — https://github.com/carlrannaberg/claudekit/blob/main/LICENSE

MAX_CHECKPOINTS=10

# Must be in a git repo
if ! git rev-parse --git-dir &> /dev/null; then
    exit 0
fi

# Nothing to stash if working tree is clean
if git diff --quiet && git diff --cached --quiet; then
    exit 0
fi

timestamp=$(date +%Y%m%d-%H%M%S)
stash_name="hookpm-checkpoint-$timestamp"

git stash push -m "$stash_name" &> /dev/null

# Prune oldest checkpoints beyond MAX_CHECKPOINTS
stash_list=$(git stash list | grep "hookpm-checkpoint-" | awk -F: '{print $1}')
count=$(echo "$stash_list" | wc -l | tr -d ' ')

if [ "$count" -gt "$MAX_CHECKPOINTS" ]; then
    to_drop=$(echo "$stash_list" | tail -n +$((MAX_CHECKPOINTS + 1)))
    while IFS= read -r stash_ref; do
        git stash drop "$stash_ref" &> /dev/null
    done <<< "$to_drop"
fi

exit 0
