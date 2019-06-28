#!/bin/bash
# Run by nm-rest.service unit
# instead of using discrete source commands, just source /apps/whyis/.bash_profile (needs testing though -- run it through QA first)
source /apps/whyis/venv/bin/activate
export PATH=$PATH:/usr/local/MATLAB/R2019a/bin
export N_PREFIX="$HOME/n"; [[ :$PATH: == *":$N_PREFIX/bin:"* ]] || PATH+=":$N_PREFIX/bin"  # Added by n-install (see http://git.io/n-install-repo).
cd /apps/nanomine/rest
source /apps/nanomine_env
/apps/n/bin/node index.js $*


