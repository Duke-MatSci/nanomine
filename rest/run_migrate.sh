#!/usr/bin/env bash
# this version just runs migration which will check version information and do the right thing (hopefully)
echo W A R N I N G!!! Backup the database before running this script!
x='abort'
read -p "Type 'migrate' and then press enter to continue or ctrl+c to abort: " x
if [[ $x == 'migrate' ]]; then
  pushd /apps/nanomine/rest
  echo running migration
  # npm i
  node --harmony-promise-finally migrate.js
  popd
else
  echo Aborted.
fi
