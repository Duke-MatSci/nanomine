#!/usr/bin/env bash
# yum install goaccess / apt-get install goaccess (slightly diff paramters for older version in ubuntu 16)
goaccess --ignore-crawlers --log-format='%h %^[%d:%t %^] "%r" %s %b %u' --time-format="%H:%M:%S" --date-format="%d/%b/%Y"  -f analytics.log  -o html > output.html
