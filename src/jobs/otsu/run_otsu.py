#!/usr/bin/env python

# run the example Otsu process

# Environment variables will be set, so they're available here.

import os
import sys
import json
import urllib2
import traceback

from nm.common import *
from nm.common.matlab import matlab

logging.info('PYTHONPATH: ' + os.environ['PYTHONPATH'])

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
emailurl = os.environ['NM_SMTP_REST_URL']

paramFile = open(jobDir + '/' + 'job_parameters.json', 'r')
inputParameters = json.load(paramFile)
userId = str(inputParameters['user'])

jobSrcDir = os.getcwd()
webBaseUri = os.environ['NM_WEB_BASE_URI']

jobDataUriSuffix = os.environ['NM_JOB_DATA_URI']

logging.info(pgmName + ' input parameters: ')
for key in inputParameters.keys():
  logging.info( '  ' + key + ' = ' + inputParameters[key])

# Do not modify job_status.json -- the server will handle it
logging.info(pgmName + ' input files: ')
myfiles = os.listdir(jobDir)
for f in myfiles:
  print('  ' + f)

matlabPgm = 'Otsu' # .m is implied, test mode will use python pgm
mlab = matlab(logging) # create matlab object

matlabPgmParams = ('param1', 'param2')

rc = mlab.run(userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri, jobDataUriSuffix, matlabPgm, matlabPgmParams)
print('MATLAB return code - rc: ' + str(rc))

# If the NM_SMTP_TEST environment variable is set to true, then emails are not sent via email and are instead
#   go into the rest server log file: nanomine/rest/nanomine.log.gz (log file name will get fixed soon)
# templates are in rest/config/emailtemplates/JOBTYPE/TEMPLATENAME.etf (etf extension is required, but implied in POST data)
if rc == 0: # send success email
  try:
    logging.info('emailurl: ' + emailurl)
    emaildata = {
      "jobid": jobId,
      "jobtype": jobType,
      "emailtemplatename": "success",
      "emailvars": {
        "resultpage": webBaseUri + '/nm#/OtsuResult?refuri='+jobDataUriSuffix+'/'+jobId,
        "jobinfo": {
          "resultcode":rc
        },
        "user": userId
      }
    }
    print('email data: %s' % emaildata)
    #logging.info('emaildata: ' + json.dumps(emaildata))
    rq = urllib2.Request(emailurl)
    logging.info('request created using emailurl')
    rq.add_header('Content-Type','application/json')
    r = urllib2.urlopen(rq, json.dumps(emaildata))
    logging.info('sent success email: ' + str(r.getcode()))
  except:
    logging.info('exception occurred')
    logging.info('exception: ' + traceback.format_exc())
else: # send error email
  try:
    logging.info('emailurl: ' + emailurl)
    emaildata = {
      "jobid": jobId,
      "jobtype": jobType,
      "emailtemplatename": "failure",
      "emailvars": {
        "jobinfo": {
          "resultcode":rc
        },
        "user": userId
      }
    }
    print('email data: %s' % emaildata)
    #logging.info('emaildata: ' + json.dumps(emaildata))
    rq = urllib2.Request(emailurl)
    logging.info('request created using emailurl')
    rq.add_header('Content-Type','application/json')
    r = urllib2.urlopen(rq, json.dumps(emaildata))
    logging.info('sent failure email: ' + str(r.getcode()))
  except:
    logging.info('exception occurred')
    logging.info('exception: ' + traceback.format_exc())




