# NanoMine
NanoMine Nanocomposites Data Resource

##### NOTE: Prototype code. Some approaches will change. Monitor this README for updates.
# NanoMine
NanoMine Nanocomposites Data Resource

##### NOTE: Prototype code. Some approaches will change. Monitor this README for updates.

# Installation 
#### (REQUIRES ubuntu 16.04 -- 18.04 will not work yet)
### Note: if installing on a virtual machine, be sure to allocate at least 8G Memory, 2 CPUs and 60G Disk if installing MATLAB otherwise 35GB will probably work.
### Also, this is a DEVELOPMENT only install for a personal system (or vm). Don't use these instructions for QA or production environments.

- whyis will be installed in /apps/whyis

- Run these commands after adjusting the mongo dump location in a terminal window on your Ubuntu VM or native Ubuntu install:
```
export MONGO_DUMP_DOWNLOAD_LOCATION=http://somewhere.edu/mgi.tgz  # adjust this to the real download location
export NM_INSTALL_FORK='duke-matsci' # this should probably be YOUR github userid if you intend to push changes
export NM_INSTALL_BRANCH='dev' # usually, this should be 'dev' if you intend to push changes
sudo apt-get install -y curl
sudo apt-get install -y vim 
curl -skL https://raw.githubusercontent.com/${NM_INSTALL_FORK}/nanomine/${NM_INSTALL_BRANCH}/install/install.sh > ./nminstall.sh
chmod a+x ./nminstall.sh
sudo -E ./nminstall.sh 2>&1 | tee nminstall.log # Take a break. It will take a while.
```

- When loading data into whyis, 
  - The load process can be monitored with 'sudo tail -f /var/log/celery/w1.log', but note that loading will usually not occur until upload via XMLCONV GUI
  
### Use the server...  
- go to http://YOURVMADDRESS/nm to access NanoMine

### Code changes
- If code changes are made to the GUI
```
cd /apps/nanomine
npm run build
sudo systemctl restart apache2  # may be optional depending on what was changed. For nanomine javascript and job changes, it's not currently necessary.
```
- If code changes are made to the rest server - be sure to stop the rest server and restart
```
  sudo systemctl restart nm-rest
```
<!--  
  ### NOTE OPTIONAL!
  ###  Neo4j is optional -- most devs should probably not install
  cd /apps
  mkdir neo4j
  cd neo4j 
  curl -o /tmp/neo4j.tgz $NM_NEO4J_IMAGE
  tar zxf /tmp/neo4j.tgz
  
  ### start neo4j with this command
  /apps/neo4j/bin/neo4j start 
  - the neo4j browser will be available at http://localhost:7474 -- NOTE: ONLY available to browser running on VM directly
-->  
  - NOTE: need both /etc/security/limits.conf settings and /etc/systemd/system.conf.d/limits.conf (system.conf.d may be new directory)
  - add to /etc/security/limits.conf (sudo vi /etc/security/limits.conf)
  ```
    whyis hard nofile 40000
    whyis soft nofile 40000
  ```  
  - add to /etc/systemd/system.conf.d/limits.conf (sudo mkdir /etc/systemd/system.conf.d; sudo vi /etc/systemd/system.conf.d/limits.conf)
  ``` 
     [Manager]
     DefaultLimitNOFILE=40000
  ```   
<!--  
  sudo cp /apps/nanomine/install/nm-neo4j.service /etc/systemd/system
  sudo systemctl daemon-reload
  sudo systemctl start nm-neo4j  # can also restart or stop as necessary
  sudo systemctl enable nm-neo4j # ensure that neo4j runs after reboot
  ## NOTE -- END of Neo4j install
-->  

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


