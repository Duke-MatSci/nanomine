#!/usr/bin/env bash

if [[ $(whoami) != "whyis" ]]; then
  echo 'please run ${0} script as whyis.  Mongo Dump not retrieved.'
  exit
fi

mkdir /apps/mongodump 2> /dev/null
if [[ $NM_MONGO_DUMP=="file://*" ]]; then
  cp_err_msg="Unable to copy ${fn} mongo dump originally referenced as ${NM_MONGO_DUMP}"
  fn=${NM_MONGO_DUMP#file://}
  if [[ -f ${fn} ]]; then
    cp $fn /apps/mongodump/mgi.tgz
    if [[ $? -ne 0 ]]; then
      echo $cp_err_msg
    fi
  else
    echo $cp_err_msg
  fi
elif [[ -z $NM_MONGO_DUMP ]]; then
  echo error '$NM_MONGO_DUMP' not defined
else
  curl -k -o /apps/mongodump/mgi.tgz $NM_MONGO_DUMP
fi

cd /apps/mongodump
tar zxvf mgi.tgz
