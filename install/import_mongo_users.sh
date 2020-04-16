#!/usr/bin/env bash
mongoimport --collection=users --file=mongo_users.json --db=mgi --port=$NM_MONGO_PORT --username=$NM_MONGO_USER --password=$NM_MONGO_PWD --authenticationDatabase=admin
