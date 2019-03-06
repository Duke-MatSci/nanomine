#!/usr/bin/env bash
#
# drop the current mgi database
# restore the mongo dump from /apps/mongodump/mgi
# migrate the data
force=$1
if [[ -z $force || $force != "FORCE" ]] ; then
  echo "This script no longer executes by default."
  echo "IT IS DANGEROUS. If you really need drop the database, restore and migrate then use the FORCE option."
  echo "NOTE that the default operations are to DELETE THE DATA before restoring the DB and doing a migration"
  echo "BE AWARE that re-creating the database requires that the system user be re-configured for API services by updating keys (see install/setup_nanomine.sh)."
  echo "use $0 FORCE to force dropping the db, and migrating the data from the dump file"
  echo "Aborting."
  exit
else
  mongo -u $NM_MONGO_OWNER_USER -p $NM_MONGO_OWNER_PWD --port=$NM_MONGO_PORT --authenticationDatabase admin mgi --eval "db.dropDatabase()"
  mongorestore -u $NM_MONGO_USER -p $NM_MONGO_PWD --port=$NM_MONGO_PORT --authenticationDatabase admin -d mgi  /apps/mongodump/mgi

  pushd /apps/nanomine/rest
  npm i
  node --harmony-promise-finally migrate.js
  popd
fi
