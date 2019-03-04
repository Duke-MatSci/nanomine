#!/usr/bin/env bash
echo the uninstall does not work well and is really only for testing the installer
echo if re-install is needed, it might be best to re-create the virtual machine and re-install
exit
sudo apt-get remove --purge -y celeryd
sudo systemctl stop elasticsearch
sudo systemctl disable elasticsearch
sudo apt-get remove --purge -y elasticsearch
sudo rm -rf /var/lib/elasticsearch
sudo rm -rf /etc/elasticsearch
sudo rm -rf /usr/share/elasticsearch
sudo apt-get remove --purge -y mongodb-org
sudo rm /etc/mongod.conf
sudo rm -rf /nanomine-mongodata
sudo rm -rf /apps

