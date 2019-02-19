#!/bin/bash

if [[ -z ${MONGO_DUMP_DOWNLOAD_LOCATION} ]] ; then
  echo 'Export MONGO_DUMP_DOWNLOAD_LOCATION before running installer'
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

echo installing curl and git
apt-get install -y curl
apt-get install -y git

echo add user whyis
adduser --home /apps --shell /bin/bash --ingroup sudo whyis
# echo whyis:${whyispw} | sudo chpasswd

echo installing whyis ...
bash < <(curl -skL https://raw.githubusercontent.com/bluedevil-oit/whyis/master/install.sh)

(su whyis -c "mkdir /apps/install")
(su whyis -c "curl -skL https://raw.githubusercontent.com/bluedevil-oit/nanomine/install/install_rest.sh > /apps/install/install_rest.sh; chmod a+x /apps/install/install_rest.sh")
(su whyis -c "curl -skL https://raw.githubusercontent.com/bluedevil-oit/nanomine/install/setup_mongo.sh > /apps/install/setup_mongo.sh; chmod a+x /apps/install/setup_mongo.sh")
(su whyis -c "curl -skL https://raw.githubusercontent.com/bluedevil-oit/nanomine/install/setup_nanomine.sh > /apps/install/setup_nanomine.sh; chmod a+x /apps/install/setup_nanomine.sh")

echo executing rest server install as whyis...
(su - whyis -c "/apps/install/install_rest.sh")

echo installing mongo
apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/4.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list
apt-get update
apt-get install -y mongodb-org
mkdir /nanomine-mongodata
chown mongodb:mongodb /nanomine-mongodata
cp /apps/nanomine/install/mongoConfig /etc/mongod.conf
systemctl start mongod
systemctl enable mongod

echo setting up mongo
(su - whyis -c "/apps/install/setup_mongo.sh")

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
  echo '. /apps/nanomine_env' >> /etc/apache2/envvars
fi

# add this line near the top of /etc/init.d/celeryd after the first set of comments (use sudo vi /etc/init.d/celeryd or sudo nano /etc/init.d/celeryd)
export dttm=$(date +%Y%m%d%H%M%S)
grep nanomine_env /etc/init.d/celeryd 2>/dev/null
if [[ $? -gt 0 ]] ; then
  cp /etc/init.d/celeryd /etc/init.d/celeryd.backup-${dttm}
  newfile = $(sed -e 's/\. \/lib\/lsb\/init-functions/\. \/apps\/nanomine_env\n\. \/lib\/lsb\/init-functions/' /etc/init.d/celeryd)
  echo ${newfile} > /etc/init.d/celeryd
fi

systemctl restart apache2
systemctl restart celeryd

cp /apps/nanomine/install/nm-rest.service /etc/systemd/system
systemctl daemon-reload
systemctl start nm-rest  # NOTE: can also 'restart' or 'stop' as necessary
systemctl enable nm-rest # ensure that rest server runs after reboot

(su - whyis -c "/apps/install/setup_nanomine.sh")
systemctl restart nm-rest # since the db was re-created by setup_nanomine.sh

echo if you would like to login as whyis from the ubuntu login, execute 'sudo passwd whyis' and set a password to use from the login page




