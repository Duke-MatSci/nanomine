#!/usr/bin/env python

# run the example batch process

# Environment variables will be set, so they're available here.

import os
import sys
import json
import urllib.request
from nm.common import *

logging.info('nanomine environment keys: ')
for key in os.environ.keys():
  if key.startswith('NM_'):
    logging.info('  ' + key)

logging.info('--------')

jobBaseDir = os.environ['NM_JOB_DATA']
pgmName = sys.argv[0]
jobType = sys.argv[1]
jobId = sys.argv[2]
jobDir = sys.argv[3]

paramFile = open(jobDir + '/' + 'job_parameters.json', 'r')
inputParameters = json.load(paramFile)

logging.info(pgmName + ' input parameters: ')
for key in inputParameters.keys():
  logging.info( '  ' + key + ' = ' + inputParameters[key])

# Do not modify job_status.json -- the server will handle it
logging.info(pgmName + ' input files: ')
myfiles = os.listdir(jobDir)
for f in myfiles:
  print('  ' + f)

# example sending error template (rough cut)
# for now the email just goes into the rest server log file: nanomine/rest/nanomine.log.gz (log file name will get fixed soon)
# templates are in rest/config/emailtemplates/JOBTYPE/TEMPLATENAME.etf (etf extension is required, but implied in POST data)
try:
  emailurl = 'http://localhost/nmr/jobemail'
  logging.info('emailurl: ' + emailurl)
  emaildata = {
    "jobid": jobId,
    "jobtype": jobType,
    "emailtemplatename": "failure",
    "emailvars": {
      "jobinfo": {
        "resultcode":21
      },
      "user": str(inputParameters['user'])
    }
  }
  print('email data: %s' % emaildata)
  #logging.info('emaildata: ' + json.dumps(emaildata))
  rq = urllib.request.Request(emailurl)
  logging.info('request created using emailurl')
  rq.add_header('Content-Type','application/json')
  r = urllib.request.urlopen(rq, json.dumps(emaildata).encode('utf-8'))
  logging.info('sent failure email: ' + str(r.getcode()))
except:
  logging.info('exception occurred')
  logging.info('exception: ' + str(sys.exc_info()[0]))



