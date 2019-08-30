#!/usr/bin/env bash
CP_FORK='bluedevil-oit'
CP_BRANCH='master'
cd /apps
git clone https://github.com/"${CP_FORK}"/chemprops.git
if [[ ${CP_FORK} != 'master' ]]; then
  git checkout ${CP_FORK}
fi
pip install -r /apps/chemprops/requirements.txt

