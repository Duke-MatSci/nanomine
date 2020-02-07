#!/bin/bash
# Run by nm-rest.service unit
# instead of using discrete source commands, just source /apps/whyis/.bash_profile (needs testing though -- run it through QA first)
source /apps/whyis/venv/bin/activate
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

cd /apps/nanomine/rest
if [ -f /etc/profile.d/matlab.sh ]; then
  source /etc/profile.d/matlab.sh
fi
source /apps/nanomine_env
if [[ -x /apps/n/bin/node ]] ; then # pre-global install of node
  /apps/n/bin/node -r esm index.js $*
else
  node -r esm index.js $*
fi
