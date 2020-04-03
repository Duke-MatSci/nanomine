#!/usr/bin/env python

# run the XMLCONV batch process

# Environment variables will be set, so they're available here.

from nm.common import *
from nm.common.nm_rest import nm_rest
import os
import sys
import json
import urllib.request
import traceback

# import logging # this should be done by a wrapper in the future
restbase = os.environ['NM_LOCAL_REST_BASE']
webbase = os.environ['NM_WEB_BASE_URI']

sysToken = os.environ['NM_AUTH_SYSTEM_TOKEN']
emailApiToken = os.environ['NM_AUTH_API_TOKEN_EMAIL']
emailRefreshToken = os.environ['NM_AUTH_API_REFRESH_EMAIL']

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
  logging.info('  ' + f)

## XMLCONV conversion section
import glob
# gather the parameters
code_srcDir = os.getcwd() + '/code_src'
templateName = inputParameters['templateName']
datasetId = inputParameters['datasetId']
logging.info(code_srcDir)
xsdDir = glob.glob(code_srcDir + '/*.xsd')[0]
logging.info(xsdDir)
# add code_src to the sys path
sys.path.insert(0, code_srcDir)
# call the conversion code

try:
  from conversion import conversion
except:
  logging.info(str(traceback.format_exc()))

logging.info("conversion begin")
try:
  status, messages = conversion(jobDir, code_srcDir, xsdDir, templateName, str(inputParameters['user']), datasetId)
  logging.info("conversion finished")
except:
  logging.error('exception occurred')
  logging.error('exception: ' + str(traceback.format_exc()))
  status = 'failure'
  messages = ['[Conversion Error] Oops! The conversion cannot be finished! Please contact the administrator.']

logging.info("CONVERSION RESULT: " + status)
for message in messages:
	logging.info("message: " + message)

# example sending error template (rough cut)
# for now the email just goes into the rest server log file: nanomine/rest/nanomine.log.gz (log file name will get fixed soon)
# templates are in rest/config/emailtemplates/JOBTYPE/TEMPLATENAME.etf (etf extension is required, but implied in POST data)
try:
  emailurl = restbase + '/nmr/jobemail'
  logging.info('emailurl: ' + emailurl)
  emaildata = {
    "jobid": jobId,
    "jobtype": jobType,
    "emailtemplatename": status,
    "emailvars": {
      "jobinfo": {
        "resultcode":21,
        "errormsg":'\n'.join(messages)
      },
      "user": str(inputParameters['user'])
    }
  }
  print('email data: %s' % emaildata)
  #logging.info('emaildata: ' + json.dumps(emaildata))
  rq = urllib.request.Request(emailurl)
  logging.info('request created using emailurl')
  rq.add_header('Content-Type','application/json')
  nmEmail = nm_rest(logging, sysToken, emailApiToken, emailRefreshToken, rq)
  ## r = urllib.request.urlopen(rq, json.dumps(emaildata))
  r = nmEmail.urlopen(json.dumps(emaildata).encode("utf8"))
  logging.info('sent ' + status + ' email: ' + str(r.getcode()))
except:
  logging.info('exception occurred')
  logging.info('exception: ' + str(traceback.format_exc()))
