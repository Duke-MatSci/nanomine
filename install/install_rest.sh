#!/usr/bin/env bash
export myFork='bluedevil-oit'
export myBranch='install'
if [[ -z $1 ]] ; then
  echo "MONGO Dump location required. Pass value for MONGO_DUMP_DOWNLOAD_LOCATION as first parameter to this script ($0)"
  exit 1
else
  MONGO_DUMP_DOWNLOAD_LOCATION=$1
fi

if [[ -z $2 ]] ; then
  echo "Fork of duke-matsci required for install. Pass value for NM_INSTALL_FORK as second parameter to this script ($0)"
  exit 1
else
  myFork=$2
fi

if [[ -z $3 ]] ; then
  echo "Branch to install required. Pass value for NM_INSTALL_BRANCH as third parameter to this script ($0)"
  exit 1
else
  myBranch=$3
fi


cd /apps
echo cloning fork ${myFork}
git clone https://github.com/"${myFork}"/nanomine.git # to use the original, use FORKNAME of 'duke-matsci'
cd nanomine
echo checking out ${myBranch}
git checkout ${myBranch}

echo installing nodejs
curl -L https://git.io/n-install | bash -s -- -y lts


## export N_PREFIX="$HOME/n"; [[ :$PATH: == *":$N_PREFIX/bin:"* ]] || PATH+=":$N_PREFIX/bin"
if [[ -f ~/.bash_profile ]] ; then
  grep N_PREFIX ~/.bash_profile 2>/dev/null
  if [[ $? -ne 0 ]] ; then
    echo 'export N_PREFIX="$HOME/n"; [[ :$PATH: == *":$N_PREFIX/bin:"* ]] || PATH+=":$N_PREFIX/bin"' >> ~/.bash_profile
  fi
  grep nanomine_env ~/.bash_profile 2>/dev/null
  if [[ $? -ne 0 ]] ; then
    echo '. /apps/nanomine_env' >> ~/.bash_profile
  fi
else
  echo 'export N_PREFIX="$HOME/n"; [[ :$PATH: == *":$N_PREFIX/bin:"* ]] || PATH+=":$N_PREFIX/bin"' > ~/.bash_profile
  echo '. /apps/nanomine_env' >> ~/.bash_profile
fi
grep nanomine_env ~/.bashrc
if [[ $? -ne 0 ]]; then
  echo '. /apps/nanomine_env' >> ~/.bashrc
fi
source /apps/.bashrc

# install the VueJS command line processor
npm i -g vue-cli@2.9.6

cd /apps/nanomine
npm i
cd rest
npm i

echo running javascript build
cd /apps/nanomine
# build the vue application
#  (do not forget this -- results in 'Server Error' in browser otherwise)
#    Also, if running the GUI under apache/whyis, the build will need to be re-run
#    if gui changes are made.
npm run build

echo install NanoMine python components for Whyis
pip install -e .

echo install XMLCONV components
pip install -r /apps/nanomine/install/xmlconv-requirements.txt
pip install python-datauri

echo create directory for dynamically generated web files
mkdir /apps/nanomine-webfiles 2>/dev/null

cd /apps
export dttm=$(date +%Y%m%d%H%M%S)

cp nanomine_env nanomine_env.backup${dttm} 2>/dev/null

touch nanomine_env
chmod og-rw /apps/nanomine_env # only allow owner to view/edit file

echo 'export NM_AUTH_ENABLED="no"' > nanomine_env # no or yes
echo 'export NM_AUTH_TYPE="local"' >> nanomine_env # local or shib-proxy
echo 'export NM_AUTH_EMAIL_HEADER="email"' >> nanomine_env
echo 'export NM_AUTH_USER_HEADER="remote_user"' >> nanomine_env
echo 'export NM_AUTH_GIVEN_NAME_HEADER="givenName"' >> nanomine_env
echo 'export NM_AUTH_SURNAME_HEADER="sn"' >> nanomine_env
echo 'export NM_AUTH_DISPLAYNAME_HEADER="displayName"' >> nanomine_env
echo 'export NM_AUTH_SESSION_EXPIRATION_HEADER="sessionExpiration"' >> nanomine_env
echo 'export NM_AUTH_TEST_USER="testuser"' >> nanomine_env
echo 'export NM_AUTH_SYSTEM_USER_ID="9999999999"' >> nanomine_env
echo 'export NM_AUTH_ANON_USER_ID="testuser"' >> nanomine_env
echo 'export NM_AUTH_LOGOUT_URL="#"' >> nanomine_env # logout
echo 'export NM_AUTH_GROUP_ENABLED="no"' >> nanomine_env # remote groups enable/disable. If not enabled, local groups used instead
echo 'export NM_AUTH_GROUP_STEM="base"' >> nanomine_env # base group name to append
echo 'export NM_AUTH_ADMIN_GROUP_NAME="admins"' >> nanomine_env
echo 'export NM_AUTH_SECRET="'$(./nanomine/install/random.js)'"' >> nanomine_env # CHANGE this for your installation - NOW!
echo 'export NM_SESSION_SECRET="'$(./nanomine/install/random.js)'"' >> nanomine_env # CHANGE this for your installation - NOW!

echo 'export NM_MONGO_PORT=27017' >> nanomine_env
echo 'export NM_MONGO_HOST=localhost' >> nanomine_env
echo 'export NM_MONGO_DB=mgi' >> nanomine_env
echo 'export NM_MONGO_USER=mongodevadmin' >> nanomine_env
echo 'export NM_MONGO_OWNER_USER=mongodevowner' >> nanomine_env
echo 'export NM_MONGO_API_USER=mongodevapiuser' >> nanomine_env

echo 'export NM_MONGO_PWD="'$(/apps/nanomine/install/random.js)'"'  >> nanomine_env # set
echo 'export NM_MONGO_OWNER_PWD="'$(/apps/nanomine/install/random.js)'"'  >> nanomine_env # SET THIS to a different password NOW
echo 'export NM_MONGO_API_PWD="'$(/apps/nanomine/install/random.js)'"'  >> nanomine_env # SET THIS to a different password NOW

echo 'export NM_MONGO_URI="mongodb://${NM_MONGO_API_USER}:${NM_MONGO_API_PWD}@${NM_MONGO_HOST}:${NM_MONGO_PORT}/${NM_MONGO_DB}"'  >> nanomine_env
# the MONGO_DUMP_DOWNLOAD_LOCATION needs to be resolved here and written as a value not a variable
echo 'export NM_MONGO_DUMP="'${MONGO_DUMP_DOWNLOAD_LOCATION}'"'  >> nanomine_env # Before using, obtain the actual location for this reference

