#!/usr/bin/env bash
#
# drop the current mgi database
# restore the mongo dump from /apps/mongodump/mgi
# migrate the data
if [ 1 -eq 1 ] ; then
  mongo -u $NM_MONGO_OWNER_USER -p $NM_MONGO_OWNER_PWD --port=$NM_MONGO_PORT --authenticationDatabase admin mgi --eval "db.dropDatabase()"
  mongorestore -u $NM_MONGO_USER -p $NM_MONGO_PWD --port=$NM_MONGO_PORT --authenticationDatabase admin -d mgi  /apps/mongodump/mgi

  pushd /apps/nanomine/rest
  npm i
  node --harmony-promise-finally migrate.js
  popd
else
  echo "This script no longer executes by default. It is dangerous. If you really need to migrate, adjust the script"
  echo "and be aware that the default operations are to DELETE THE DATA before restoring the DB and doing a migration"
  exit
fi
