#!/usr/bin/env bash
echo exporting mongo users to mongo_users.json
mongoexport --collection=users --out=mongo_users.json --db=mgi --port=$NM_MONGO_PORT --username=$NM_MONGO_USER --password=$NM_MONGO_PWD --authenticationDatabase=admin
