#!/usr/bin/env bash
# This convert all images from tif to png
x='abort'
read -p "Type 'test' to sample test or 'convert' and then press enter to convert all or ctrl+c to abort: " x
if [[ $x == 'test' ]]; then
  pushd /apps/nanomine/rest
  echo running conversion
  node imageConverter.js testing
  popd
elif [[ $x == 'convert' ]]; then
   pushd /apps/nanomine/rest
  echo running conversion
  node imageConverter.js convert
  popd
else
  echo Aborted.
fi
