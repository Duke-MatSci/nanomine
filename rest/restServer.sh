#!/bin/bash
# Run by nm-rest.service unit
source /apps/whyis/venv/bin/activate
cd /apps/nanomine/rest
source /apps/nanomine_env
/apps/n/bin/node index.js $*


