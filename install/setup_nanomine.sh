#!/usr/bin/env bash
export REST_DIR="/apps/nanomine/rest"

source /apps/nanomine_env

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

export NM_WEBFILES_ROOT="/apps/nanomine-webfiles"
export NM_WEB_BASE_URI="http://localhost" # external apache uri. May need to tweak this for your local machine/vm depending on external access location -- external uri to apache
export NM_RDF_LOD_PREFIX="http://localhost"
export NM_JOB_DATA="${NM_WEBFILES_ROOT}/jobdata"
export NM_JOB_DATA_URI="/nmf/jobdata"
export NM_LOCAL_REST_BASE="http://localhost"
export NM_AUTOSTART_CURATOR="no"

export NM_SMTP_SERVER="myemailserver"
export NM_SMTP_PORT="587" # other fields will be needed if not local server, but for now this is adequate
export NM_SMTP_TEST="true" # set this to true and emails will go into the log for testing instead of sending
export NM_SMTP_REST_URL="http://localhost/nmr/jobemail"
export NM_SMTP_ADMIN_ADDR="adminuser@example.com"
export NM_SMTP_TEST_ADDR="testuser@example.com"
export NM_SMTP_AUTH_USER="mysmtpuser@example.com"
export NM_SMTP_AUTH_PWD="mysmtppwd"
export NM_LOGLEVEL="debug"  # use this when creating a logger for javascript or python, then log each message according to severity i.e. logger.info('my info message')
export NM_LOGFILE="nanomine.log" # use this log for python logging
export NM_MATLAB_AVAILABLE="no" # run TEST_XXXXXX matlab scripts instead of matlab directly
export NM_NEO4J_IMAGE="http://path.to.neo4j.tgz"  # Before using, obtain the actual location for this reference


source /apps/nanomine_env

cd /apps/whyis

python manage.py createuser -e nouser@nodomain.edu -p none -f nanomine -l test -u ${NM_AUTH_SYSTEM_USER_ID} --roles=admin

python manage.py load -i /apps/nanomine/nm.ttl -f turtle
python manage.py load -i /apps/nanomine/setl/ontology.setl.ttl -f turtle
python manage.py load -i /apps/nanomine/setl/xml_ingest.setl.ttl -f turtle

