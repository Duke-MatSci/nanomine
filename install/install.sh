#!/bin/bash


if [[ -z $(which pip) ]]; then
  echo 'Installing pip - python package installer'
  curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py

  sudo python get-pip.py
else
  echo 'Already installed: pip -- updating pip'
  sudo pip install --upgrade pip
fi


echo 'Installing ansible - systems management tool'
sudo pip install ansible

