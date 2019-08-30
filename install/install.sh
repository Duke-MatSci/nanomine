#!/bin/bash
# export MONGO_DUMP_DOWNLOAD_LOCATION=""
# export NM_INSTALL_FORK=""
# export NM_INSTALL_BRANCH=""
# export whyispw=""

if [[ -z ${MONGO_DUMP_DOWNLOAD_LOCATION} ]] ; then
  echo 'Export MONGO_DUMP_DOWNLOAD_LOCATION before running installer'
  exit
fi

if [[ -z ${NM_INSTALL_FORK} ]]; then
  echo 'Export NM_INSTALL_FORK before running installer'
  echo "hint: possibly your user id on github or 'duke-matsci'"
  exit
fi
if [[ -z ${NM_INSTALL_BRANCH} ]]; then
  echo 'Export NM_INSTALL_BRANCH before running installer'
  echo "hint: usually, this should be: 'dev'"
  exit
fi

if [[ $(whoami) != "root" ]]; then
  echo 'please run this script as root'
  exit
fi

if [[ -z $(which pip) ]]; then
  echo 'Installing pip - python package installer'
  curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
  (su root -c 'python get-pip.py')
else
  echo 'Already installed: pip -- updating pip'
  (su root -c 'pip install --upgrade pip')
fi

echo installing git
apt-get install -y git

echo add user whyis
useradd --home-dir /apps --shell /bin/bash -G sudo -M -U whyis
if [[ ! -d /apps ]]; then
  (su root -c 'mkdir /apps; touch /apps/nanomine_env; chown -R whyis:whyis /apps; ls -lasR /apps')
fi
echo installing whyis ...
export WHYIS_FORK='bluedevil-oit'
export WHYIS_BRANCH='v1.2'
## bash < <(curl -skL https://raw.githubusercontent.com/tetherless-world/whyis/master/install.sh)
curl -skL --output whyis-install.tmp https://raw.githubusercontent.com/${WHYIS_FORK}/whyis/${WHYIS_BRANCH}/install.sh
if [[ $? -ne 0 ]]; then
  echo 'error obtaining whyis installer'
  exit
fi

sed -e 's/tetherless-world\/whyis\/\${WHYIS_BRANCH}/\${WHYIS_FORK}\/whyis\/\${WHYIS_BRANCH}/g' < whyis-install.tmp > whyis-install.sh
bash whyis-install.sh

if [[ ! -z ${whyispw} ]]; then
  echo setting whyis user password
  echo whyis:${whyispw} | sudo chpasswd # system owner can add whyis password manually if desired
fi

(su whyis -c "mkdir /apps/install")
(su whyis -c "curl -skL https://raw.githubusercontent.com/${NM_INSTALL_FORK}/nanomine/${NM_INSTALL_BRANCH}/install/install_rest.sh > /apps/install/install_rest.sh; chmod a+x /apps/install/install_rest.sh")
(su whyis -c "curl -skL https://raw.githubusercontent.com/${NM_INSTALL_FORK}/nanomine/${NM_INSTALL_BRANCH}/install/setup_mongo.sh > /apps/install/setup_mongo.sh; chmod a+x /apps/install/setup_mongo.sh")
(su whyis -c "curl -skL https://raw.githubusercontent.com/${NM_INSTALL_FORK}/nanomine/${NM_INSTALL_BRANCH}/install/setup_nanomine.sh > /apps/install/setup_nanomine.sh; chmod a+x /apps/install/setup_nanomine.sh")
(su whyis -c "curl -skL https://raw.githubusercontent.com/${NM_INSTALL_FORK}/nanomine/${NM_INSTALL_BRANCH}/install/setup_nanomine.sh > /apps/install/setup_nanomine.sh; chmod a+x /apps/install/setup_chemprops.sh")

echo executing rest server install as whyis...
(su - whyis -c "/apps/install/install_rest.sh ${MONGO_DUMP_DOWNLOAD_LOCATION} ${NM_INSTALL_FORK} ${NM_INSTALL_BRANCH}")

# Note: mongo is installed with defaults for localhost/27017
echo 'installing mongo (NOTE: installing 3.6)'
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.6.list
apt-get update
apt-get install -y mongodb-org
mkdir /nanomine-mongodata
chown mongodb:mongodb /nanomine-mongodata
cp /apps/nanomine/install/mongoConfig /etc/mongod.conf
systemctl start mongod
systemctl enable mongod

echo -e "\n" | nc localhost 27017
while [[ $? -ne 0 ]]; do
  echo waiting for mongod listener to wake up
  sleep 2
  echo -e "\n" | nc localhost 27017
done

echo configuring mongo
(su - whyis -c "/apps/install/setup_mongo.sh")

echo restarting mongo with authorization active
systemctl restart mongod

echo install apache modules
a2enmod proxy_connect.load
a2enmod proxy_html.load
a2enmod proxy_http.load
a2enmod proxy.load

echo update proxy config
cp /apps/nanomine/install/000-default.conf /etc/apache2/sites-available # update proxy config

# add this line to the end /etc/apache2/envvars (use sudo vi /etc/apache2/envvars or sudo nano /etc/apache2/envvars)
grep nanomine_env /etc/apache2/envvars 2>/dev/null
if [[ $? -gt 0 ]] ; then
  echo ' ' >> /etc/apache2/envvars
  echo '. /apps/nanomine_env' >> /etc/apache2/envvars
fi

# add this line near the top of /etc/init.d/celeryd after the first set of comments (use sudo vi /etc/init.d/celeryd or sudo nano /etc/init.d/celeryd)
export dttm=$(date +%Y%m%d%H%M%S)
grep nanomine_env /etc/init.d/celeryd 2>/dev/null
if [[ $? -gt 0 ]] ; then
  cp /etc/init.d/celeryd /etc/init.d/celeryd.backup-${dttm}
  export tmpFile=$(mktemp)
  $(sed -e 's/\. \/lib\/lsb\/init-functions/\. \/apps\/nanomine_env\n\. \/lib\/lsb\/init-functions/' /etc/init.d/celeryd > ${tmpFile})
  cp ${tmpFile} /etc/init.d/celeryd
  ## rm ${tmpFile}
fi
systemctl daemon-reload

cp /apps/nanomine/install/nm-rest.service /etc/systemd/system
systemctl daemon-reload
systemctl start nm-rest  # NOTE: can also 'restart' or 'stop' as necessary
systemctl enable nm-rest # ensure that rest server runs after reboot

(su - whyis -c '/apps/install/setup_chemprops.sh')

(su - whyis -c "/apps/install/setup_nanomine.sh")
systemctl restart nm-rest # since the db was re-created by setup_nanomine.sh
systemctl restart apache2
systemctl restart celeryd

echo "if you would like to login as whyis from the ubuntu login, execute 'sudo passwd whyis' and set a password to use from the login page"




