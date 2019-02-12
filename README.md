# NanoMine
NanoMine Nanocomposites Data Resource

##### NOTE: Prototype code. Some approaches will change. Monitor this README for updates.

# Installation 
#### (REQUIRES ubuntu 16.04 -- 18.04 will not work yet)
### Note: if installing on a virtual machine, be sure to allocate at least 8G Memory, 2 CPUs and 60G Disk if installing MATLAB otherwise 35GB will probably work.
### Also, this is a DEVELOPMENT only install for a personal system (or vm). Don't use these instructions for QA or production environments.

-  sudo apt-get install curl
-  sudo pip install --upgrade pip # just in case pip is outdated

- install [whyis](http://tetherless-world.github.io/whyis/install) using this command (bluedevil-oit version contains needed updates)
  ```
  bash < <(curl -skL https://raw.githubusercontent.com/bluedevil-oit/whyis/master/install.sh)
  ```
  #### NOTE: if 'pip' error occurs, copy down the pip command and parameters and run it in /apps/whyis manually
- whyis will be installed in /apps/whyis
- Steps to install NanoMine:
  ```
  
  # NOTE: no need to go back-and-forth to another user. Plus, for development after initial install, just log in as whyis user directly from login page
  sudo usermod -aG sudo whyis
  sudo passwd whyis  # enter a password that only YOU know -- and that you'll actually remember 
  sudo su - whyis
  
  cd /apps
  git clone https://github.com/YOURFORK/nanomine.git  # to use the original, use FORKNAME of 'duke-matsci'
    

  ## WARNING: Execute this only once.  Thereafter, diff the prototype with the /apps/nanomine_env and make required
  ##   updates. Otherwise you will risk losing valuable passwords like db passwords that may require a db wipe/reload
  cp /apps/nanomine/install/nanomine_env.prototype /apps/nanomine_env # Modify the copied version as appropriate to set passwords, etc.
  
  chmod og-rw /apps/nanomine_env # only the login user should see the modified settings

  # add the following line to ~/.bashrc and ~/.bash_profile -- ONLY once
  source /apps/nanomine_env # add this to both ~/.bashrc and ~/.bash_profile
    
  #install n - the nodejs version manager and LTS version of node
  curl -L https://git.io/n-install | bash -s -- -y lts

  # append this line to ~/.bash_profile if it's not already there (it was alreaded added to .bashrc automatically)
  export N_PREFIX="$HOME/n"; [[ :$PATH: == *":$N_PREFIX/bin:"* ]] || PATH+=":$N_PREFIX/bin"  # Added by n-install (see http://git.io/n-install-repo).
  
  #make sure n is in the path and new variables are defined
  source ~/.bashrc

  # install the VueJS command line processor
  npm i -g vue-cli@2.9.6  

  cd /apps/nanomine

  # create node_modules directory and install required components
  npm install

  # build the vue application
  #  (do not forget this -- results in 'Server Error' in browser otherwise)
  #    Also, if running the GUI under apache/whyis, the build will need to be re-run
  #    if gui changes are made.
  npm run build
  
  #install NanoMine python components for Whyis
  pip install -e .
  
  #install XMLCONV components
  pip install -r /apps/nanomine/install/xmlconv-requirements.txt
  pip install python-datauri
  
  sudo a2enmod proxy_connect.load  
  sudo a2enmod proxy_html.load  
  sudo a2enmod proxy_http.load  
  sudo a2enmod proxy.load

  #add this line to /etc/apache2/envvars
  . /apps/nanomine_env
  
  #add this line near the top of /etc/init.d/celeryd
  . /apps/nanomine_env
  
  sudo cp /apps/nanomine/install/000-default.conf /etc/apache2/sites-available
  mkdir /apps/nanomine-webfiles
  
  sudo service apache2 restart
  sudo service celeryd restart
  
  #install MongoDB
  sudo sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
  echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/4.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list
  sudo apt-get update
  sudo apt-get install -y mongodb-org
  sudo mkdir /nanomine-mongodata
  sudo chown mongodb:mongodb /nanomine-mongodata
  sudo cp /apps/nanomine/install/mongoConfig /etc/mongod.conf
  sudo systemctl start mongod
  sudo systemctl enable mongod
  /apps/nanomine/install/mongoSetupAdminUser
  /apps/nanomine/install/mongoSetupApiUser
  /apps/nanomine/install/mongoSetupOwnerUser
 
  cd /apps/nanomine/rest
  npm i # install packages needed by rest server
     
  # Restore and migrate mongo dump from production for new version  
  mkdir /apps/mongodump
  curl -o /apps/mongodump/mgi.tgz $NM_MONGO_DUMP
  cd /apps/mongodump
  tar zxvf mgi.tgz
  # now do the migration -- this will take a few minutes to run
  #  NOTE: need to edit the "if [ 1 -ne 1 ]; then" line to change -ne to -eq ; this is a safety check to ensure that the db is not overwritten accidentally
  /apps/nanomine/rest/restore_and_migrate.sh  
    
  # NOTE: REST server logging now goes into /var/log/syslog (well, some does. Most still goes into /apps/nanomine/rest/nanomine.log)
  #   Also, note that when running jobs, job output currently goes into the source directory of the job that ran.
  #   For instance, the job log outut for src/jobs/XMLCONV for uploads of data goes into that src/jobs/XMLCONV directory.
  #    The instructions above may change.
  sudo cp /apps/nanomine/install/nm-rest.service /etc/systemd/system
  sudo systemctl daemon-reload
  sudo systemctl start nm-rest  # NOTE: can also 'restart' or 'stop' as necessary
  sudo systemctl enable nm-rest # ensure that rest server runs after reboot

  
  cd /apps/whyis 
   
  python manage.py createuser -e nouser@nodomain.edu -p none -f nanomine -l test -u 9999999999 --roles=admin
  
  python manage.py load -i /apps/nanomine/nm.ttl -f turtle
  python manage.py load -i /apps/nanomine/setl/ontology.setl.ttl -f turtle
  python manage.py load -i /apps/nanomine/setl/xml_ingest.setl.ttl -f turtle
  ```

  - The load process can be monitored with 'sudo tail -f /var/log/celery/w1.log', but note that loading will not occur until upload via XMLCONV GUI
  
### Use the server...  
- go to http://YOURVMADDRESS/nm to access NanoMine

### Code changes
- If code changes are made to the GUI
```
cd /apps/nanomine
npm run build
sudo service apache2 restart  # may be optional depending on what was changed. For nanomine javascript and job changes, it's not currently necessary.
```
- If code changes are made to the rest server - be sure to stop the rest server and restart
```
  sudo systemctl restart nm-rest
```
  
  ## NOTE OPTIONAL!
  ###  Neo4j is optional -- most devs should probably not install
  cd /apps
  mkdir neo4j
  cd neo4j 
  curl -o /tmp/neo4j.tgz $NM_NEO4J_IMAGE
  tar zxf /tmp/neo4j.tgz
  
  ### start neo4j with this command
  /apps/neo4j/bin/neo4j start 
  - the neo4j browser will be available at http://localhost:7474 -- NOTE: ONLY available to browser running on VM directly
  - NOTE: need both /etc/security/limits.conf settings and /etc/systemd/system.conf.d/limits.conf (system.conf.d may be new directory)
  - add to /etc/security/limits.conf (sudo vi /etc/security/limits.conf)
  -   whyis hard nofile 40000
  -   whyis soft nofile 40000
  - add to /etc/systemd/system.conf.d/limits.conf (sudo mkdir /etc/systemd/system.conf.d; sudo vi /etc/systemd/system.conf.d/limits.conf) 
  -   [Manager]
  -   DefaultLimitNOFILE=40000
  
  sudo cp /apps/nanomine/install/nm-neo4j.service /etc/systemd/system
  sudo systemctl daemon-reload
  sudo systemctl start nm-neo4j  # can also restart or stop as necessary
  sudo systemctl enable nm-neo4j # ensure that neo4j runs after reboot
  ## NOTE -- END of Neo4j install
  

# Components and Libraries Used
- https://vuejs.org VueJS Javascript Framework
- https://vuejs.org/v2/guide/ VueJS Introduction
- https://router.vuejs.org/. Internal Router
- https://vue-loader.vuejs.org/. VueJS webpack component loader (Build)
- https://vuex.vuejs.org/ VueJS global state management
- https://vuetifyjs.com/en/ Vuetify Material Design CSS framework
  - NOTE: based on Material Design - https://material.io 
- https://vuetifyjs.com/en/getting-started/quick-start Vuetify CSS framework docs
- https://github.com/axios/axios Axios Remote Request Library
- https://www.npmjs.com/package/axios Axios NPM package info
- https://google.github.io/material-design-icons/ ICONS 
- https://expressjs.com ExpressJS Web Application Server Framework
- https://github.com/devstark-com/vue-google-charts Google Charts wrapper for Vue
  - NOTE: Google charts doc: https://developers.google.com/chart/


# Development
Fork the nanomine repository and use the 'dev' branch for 
development (git checkout dev). Ensure 
that pull requests are for the dev branch and not master and not QA.

NOTE: The install instructions above clone the repo from the duke-matsci
using https. Additionally, the files become owned by the 'whyis' user.
This may make it a bit difficult for on-going development. The best work-around
for now is probably to fork the repo and use git ssh under your own user.
However, this will complicate runtime. The readme will be updated with better
instructions once a good alternative is worked out.


```
Since NanoMine's install is similar to the NanomineViz 
install, the instructions for NanoMine (above) are based on a modified 
version of Rui's NanomineViz instructions from raymondino/NanomineViz
```
