#!/usr/bin/env bash
export REST_DIR="/apps/nanomine/rest"

. /apps/nanomine_env

# Restore and migrate mongo dump from production for new version
mkdir /apps/mongodump
curl -k -o /apps/mongodump/mgi.tgz $NM_MONGO_DUMP
cd /apps/mongodump
tar zxvf mgi.tgz
# now do the migration -- this will take a few minutes to run
/apps/nanomine/rest/restore_and_migrate.sh FORCE ## force overrides protection that prevents dropping database!! use wisely!

echo 'export NM_AUTH_SYSTEM_TOKEN="'$(/apps/nanomine/install/random.js)'"' >> /apps/nanomine_env
echo 'export NM_AUTH_API_TOKEN_CURATE="'$(node ${REST_DIR}/updateRestApiToken.js updateToken curate)'"' >> /apps/nanomine_env
echo 'export NM_AUTH_API_REFRESH_CURATE="'$(node ${REST_DIR}/generateUserRefreshToken.js generateRefreshToken ${NM_AUTH_SYSTEM_USER_ID} curate)'"' >> /apps/nanomine_env # use token output '/generateUserRefreshToken.js generateRefreshToken {USERID} curate' here
echo 'export NM_AUTH_API_TOKEN_JOBS="'$(node ${REST_DIR}/updateRestApiToken.js updateToken jobs)'"' >> /apps/nanomine_env # use token output from 'node /apps/nanomine/rest/updateRestApiToken.js updateToken jobs' here
echo 'export NM_AUTH_API_REFRESH_JOBS="'$(node ${REST_DIR}/generateUserRefreshToken.js generateRefreshToken ${NM_AUTH_SYSTEM_USER_ID} jobs)'"' >> /apps/nanomine_env # use token output '/generateUserRefreshToken.js generateRefreshToken {USERID} jobs' here
echo 'export NM_AUTH_API_TOKEN_EMAIL="'$(node ${REST_DIR}/updateRestApiToken.js updateToken email)'"' >> /apps/nanomine_env # use token output from '/updateRestApiToken.js updateToken email' here
echo 'export NM_AUTH_API_REFRESH_EMAIL="'$(node ${REST_DIR}/generateUserRefreshToken.js generateRefreshToken ${NM_AUTH_SYSTEM_USER_ID} email)'"' >> /apps/nanomine_env # use token output '/generateUserRefreshToken.js generateRefreshToken ${NM_AUTH_SYSTEM_USER_ID} email' here
echo 'export NM_AUTH_API_TOKEN_ADMIN="'$(node ${REST_DIR}/updateRestApiToken.js updateToken admin)'"' >> /apps/nanomine_env # use token output from '/updateRestApiToken.js updateToken admin' here
echo 'export NM_AUTH_API_REFRESH_ADMIN="'$(node ${REST_DIR}/generateUserRefreshToken.js generateRefreshToken ${NM_AUTH_SYSTEM_USER_ID} admin)'"' >> /apps/nanomine_env # use token output '/generateUserRefreshToken.js generateRefreshToken ${NM_AUTH_SYSTEM_USER_ID} admin' here

. /apps/nanomine_env

cd /apps/whyis

python manage.py createuser -e nouser@nodomain.edu -p none -f nanomine -l test -u ${NM_AUTH_SYSTEM_USER_ID} --roles=admin

python manage.py load -i /apps/nanomine/nm.ttl -f turtle
python manage.py load -i /apps/nanomine/setl/ontology.setl.ttl -f turtle
python manage.py load -i /apps/nanomine/setl/xml_ingest.setl.ttl -f turtle

