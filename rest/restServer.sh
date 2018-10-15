#!/bin/bash
# Run by nm-rest.service unit
cd /apps/nanomine/rest
source /apps/nanomine_env
/apps/n/bin/node index.js $*


