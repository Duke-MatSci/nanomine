#!/usr/bin/env bash
CP_FORK='bluedevil-oit'
CP_BRANCH='master'
cd ${HOME}
git clone https://github.com/"${CP_FORK}"/chemprops.git
if [[ ${CP_BRANCH} != 'master' ]]; then
  git checkout ${CP_BRANCH}
fi
pip install -r /apps/chemprops/requirements.txt

export tmpFile=$(mktemp)
echo $tmpFile
# remove the old chemprops values
sed -e 's/export NM_MONGO_CHEMPROPS.*//g' /apps/nanomine_env |
sed -e 's/export NM_AUTOSTART_CHEMPROPS.*//g'   |
sed -r '/^\s*$/d' > $tmpFile  # GNU sed extension to remove blank lines
cp $tmpFile /apps/nanomine_env

echo 'export NM_MONGO_CHEMPROPS_DB="ChemProps"' >> /apps/nanomine_env
echo 'export NM_MONGO_CHEMPROPS_USER="mongochempropsuser"' >> /apps/nanomine_env
echo 'export NM_MONGO_CHEMPROPS_PWD="'$(/apps/nanomine/install/random.js)'"'  >> /apps/nanomine_env
echo 'export NM_MONGO_CHEMPROPS_URI="mongodb://${NM_MONGO_CHEMPROPS_USER}:${NM_MONGO_CHEMPROPS_PWD}@${NM_MONGO_HOST}:${NM_MONGO_PORT}/${NM_MONGO_CHEMPROPS_DB}"'  >> /apps/nanomine_env
echo 'export NM_AUTOSTART_CHEMPROPS="no"' >> /apps/nanomine_env
source /apps/nanomine_env
wget -O /apps/chemprops/gs.config ${CHEMPROPS_GS_CONFIG_DOWNLOAD_LOCATION}
# NOTE: the NM_MONGO_CHEMPROPS_USER can only work with the ChemProps db and is not
#   allowed to listDatabases() either with the mongo shell or the api.
#   In the mongo shell, the ChemProps user can remove the ChemProps database
#     even though 'show dbs' will not work.  Just do this:
#        use ChemProps
#        db.dropDatabase()
# NOTE that in the API, it's not necessary to verify the existence of the ChemProps database.
#   Telling the client to list a collection within the database (or to simply find() on the collection)
#   is sufficient to verify that a collection exists.
# NOTE adding the chemprops user to the admin db is specifically for the mongo cli
#    The user definition for the ChemProps db is sufficient for the API.
mongo --port $NM_MONGO_PORT -u $NM_MONGO_USER -p $NM_MONGO_PWD --authenticationDatabase admin <<EOF

use admin
db.dropUser("${NM_MONGO_CHEMPROPS_USER}")

db.createUser({
      user: "${NM_MONGO_CHEMPROPS_USER}",
      pwd: "${NM_MONGO_CHEMPROPS_PWD}",
      roles: [
        {role: "readWrite", db: "ChemProps"},
        {role: "dbAdmin", db: "ChemProps"}
      ]
    })

use ${NM_MONGO_CHEMPROPS_DB}
db.dropUser("${NM_MONGO_CHEMPROPS_USER}")

db.createUser({
  user: "${NM_MONGO_CHEMPROPS_USER}",
  pwd: "${NM_MONGO_CHEMPROPS_PWD}",
  roles: [
    "readWrite",
    "dbOwner"
  ]
})
EOF
cd chemprops
python -c 'from nmChemPropsPrepare import nmChemPropsPrepare; nm = nmChemPropsPrepare(); nm.updateMongoDB()'
