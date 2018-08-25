#!/usr/bin/env python

# run the XMLCONV batch process

# Environment variables will be set, so they're available here.

import os
import sys
import json

for key in os.environ.keys():
  if key.startswith('NM_'):
    print key

jobBaseDir = os.environ['NM_JOB_DATA']
jobId = sys.argv[1]
jobDir = sys.argv[2]

paramFile = open(jobDir + '/' + 'job_parameters.json','r')
inputParameters = json.load(paramFile)

print('input parameters: ')
for key in inputParameters.keys():
  print '  ' + key + ' = ' + inputParameters[key]


myfiles = os.listdir(jobDir)



