#!/usr/bin/env python

# run the XMLCONV batch process

# Environment variables will be set, so they're available here.

import os
import sys
import json

import logging # this should be done by a wrapper in the future
sloglevel=os.environ['NM_LOGLEVEL']
loglevel = logging.DEBUG
try:
  loglevel = getattr(logging, sloglevel.upper())
except:
  pass

logging.basicConfig(filename=os.environ['NM_LOGFILE'],level=loglevel)


logging.info('nanomine environment keys: ')
for key in os.environ.keys():
  if key.startswith('NM_'):
    logging.info('  ' + key)

logging.info('--------')

jobBaseDir = os.environ['NM_JOB_DATA']
jobType = sys.argv[1]
jobId = sys.argv[2]
jobDir = sys.argv[3]

paramFile = open(jobDir + '/' + 'job_parameters.json','r')
inputParameters = json.load(paramFile)

logging.info(sys.argv[0] + ' input parameters: ')
for key in inputParameters.keys():
  logging.info( '  ' + key + ' = ' + inputParameters[key])

myfiles = os.listdir(jobDir)



