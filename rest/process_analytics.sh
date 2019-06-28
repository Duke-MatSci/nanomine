#!/usr/bin/env bash
# run under whyis user

# Process web analytics file
# yum install goaccess / apt-get install goaccess (slightly diff paramters for older version in ubuntu 16)
goaccess --ignore-crawlers --log-format='%h %^[%d:%t %^] "%r" %s %b %u' --time-format="%H:%M:%S" --date-format="%d/%b/%Y"  -f analytics.log  -o html > webstats.html

# process job analytics
./jobanalytics.js > jobstats.txt
