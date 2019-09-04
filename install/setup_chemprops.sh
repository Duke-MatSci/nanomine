#!/usr/bin/env bash
CP_FORK='bluedevil-oit'
CP_BRANCH='master'
cd ${HOME}
git clone https://github.com/"${CP_FORK}"/chemprops.git
if [[ ${CP_FORK} != 'master' ]]; then
  git checkout ${CP_FORK}
fi
pip install -r /apps/chemprops/requirements.txt
echo 'export NM_MONGO_CHEMPROPS_DB=chemprops' >> nanomine_env
echo 'export NM_MONGO_CHEMPROPS_URI="mongodb://${NM_MONGO_API_USER}:${NM_MONGO_API_PWD}@${NM_MONGO_HOST}:${NM_MONGO_PORT}/${NM_MONGO_CHEMPROPS_DB}"'  >> nanomine_env
echo 'export NM_AUTOSTART_CHEMPROPS="no"' >> nanomine_env
wget -O /apps/chemprops/gs.config ${CHEMPROPS_GS_CONFIG_DOWNLOAD_LOCATION}
mongo --port $NM_MONGO_PORT -u $NM_MONGO_USER -p $NM_MONGO_PWD --authenticationDatabase admin <<EOF
use admin
db.createUser(
  {
    user: "${NM_MONGO_API_USER}",
    pwd: "${NM_MONGO_API_PWD}",
    roles: [ { role: "userAdminAnyDatabase", db: "admin"}, { role: "dbOwner", db: "chemprops"} ]
  }
)

use chemprops
db.createUser(
  {
  user: "${NM_MONGO_API_USER}",
  pwd: "${NM_MONGO_API_PWD}",
  roles: ["readWrite"]
});
EOF
cd chemprops
python -c 'from nmChemPropsPrepare import nmChemPropsPrepare; nm = nmChemPropsPrepare();nm.updateMongoDB()'
