#!/usr/bin/env bash
export REST_DIR="/apps/nanomine/rest"

source /apps/nanomine_env

echo 'export NM_WEBFILES_ROOT="/apps/nanomine-webfiles"' >> /apps/nanomine_env
echo 'export NM_WEB_BASE_URI="http://localhost"' >> /apps/nanomine_env # external apache uri. May need to tweak this for your local machine/vm depending on external access location -- external uri to apache
echo 'export NM_RDF_LOD_PREFIX="http://localhost"' >> /apps/nanomine_env
echo 'export NM_GRAPH_LOD_PREFIX="${NM_RDF_LOD_PREFIX}"' >> /apps/nanomine_env
echo 'export NM_GRAPH_AUTH_SECRET="${NM_AUTH_SECRET}"' >> /apps/nanomine_env
echo 'export NM_RDF_URI_BASE=""' >> /apps/nanomine_env
echo 'export NM_JOB_DATA="${NM_WEBFILES_ROOT}/jobdata"' >> /apps/nanomine_env
echo 'export NM_JOB_DATA_URI="/nmf/jobdata"' >> /apps/nanomine_env
echo 'export NM_LOCAL_REST_BASE="http://localhost"' >> /apps/nanomine_env
echo 'export NM_AUTOSTART_CURATOR="no"' >> /apps/nanomine_env

echo 'export NM_SMTP_SERVER="myemailserver"' >> /apps/nanomine_env
echo 'export NM_SMTP_PORT="587"' >> /apps/nanomine_env # other fields will be needed if not local server, but for now this is adequate
echo 'export NM_SMTP_TEST="true"' >> /apps/nanomine_env # set this to true and emails will go into the log for testing instead of sending
echo 'export NM_SMTP_REST_URL="http://localhost/nmr/jobemail"' >> /apps/nanomine_env
echo 'export NM_SMTP_ADMIN_ADDR="adminuser@example.com"' >> /apps/nanomine_env
echo 'export NM_SMTP_TEST_ADDR="testuser@example.com"' >> /apps/nanomine_env
echo 'export NM_SMTP_AUTH_USER="mysmtpuser@example.com"' >> /apps/nanomine_env
echo 'export NM_SMTP_AUTH_PWD="mysmtppwd"' >> /apps/nanomine_env
echo 'export NM_LOGLEVEL="debug"' >> /apps/nanomine_env  # use this when creating a logger for javascript or python, then log each message according to severity i.e. logger.info('my info message')
echo 'export NM_LOGFILE="nanomine.log"' >> /apps/nanomine_env # use this log for python logging
echo 'export NM_MATLAB_AVAILABLE="no"' >> /apps/nanomine_env # run TEST_XXXXXX matlab scripts instead of matlab directly
echo 'export NM_NEO4J_IMAGE="http://path.to.neo4j.tgz"' >> /apps/nanomine_env  # Before using, obtain the actual location for this reference

# pick up the variable changes before the next script runs
source /apps/nanomine_env

#install nanomine_graph
export NG_FORK='bluedevil-oit'
export NG_BRANCH='master'

cd /apps
echo cloning nanomine-graph fork ${NG_FORK}
git clone https://github.com/"${NG_FORK}"/nanomine-graph.git # to use the original, use FORKNAME of 'tetherless-world'
cd nanomine-graph
echo checking out ${NG_BRANCH}
if [[ ${NG_BRANCH} != 'master' ]]; then
  git checkout ${NG_BRANCH}
fi
pip install -e . #install nanomine-graph app

cd /apps/whyis

python manage.py createuser -e nouser@nodomain.edu -p none -f nanomine -l test -u ${NM_AUTH_SYSTEM_USER_ID} --roles=admin
python manage.py createuser -e testuser@example.com -p none -f test -l user -u testuser # dev systems need this

# NOTE: caller of this script should ensure that /data/loaded exists and is owned by whyis

# python manage.py load -i /apps/nanomine/nm.ttl -f turtle  ## Apparently no longer needed
## python manage.py load -i /apps/nanomine-graph/setl/ontology.setl.ttl -f turtle # run setlr on this file directly to get the output
##  then ingest output
setlr /apps/nanomine-graph/setl/ontology.setl.ttl /apps/nanomine-graph/setl/nanomine.ttl
python manage.py load -i /apps/nanomine-graph/setl/nanomine.ttl -f turtle
python manage.py load -i /apps/nanomine-graph/setl/xml_ingest.setl.ttl -f turtle
python manage.py load -i 'http://semanticscience.org/ontology/sio-subset-labels.owl' -f xml

# If the mgi.tgz download fails, the last three steps can be re-run to build the db
# Obtain dump, restore and migrate mongo dump from production for new version
/apps/nanomine/install/retrieve_mongo_dump.sh

# now do the migration -- this will take a few minutes to run
/apps/nanomine/rest/restore_and_migrate.sh FORCE ## force overrides protection that prevents dropping database!! use wisely!

# whenever the dataabse is replaced, the api tokens will be overwritten, so re-create them and update nanomine_env
/apps/nanomine/rest/update_api_tokens.sh

