#!/usr/bin/env python

# run the XMLCONV batch process

# Environment variables will be set, so they're available here.

import os
import sys
import json
import urllib2

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
logging.info(code_srcDir)
xsdDir = glob.glob(code_srcDir + '/*.xsd')[0]
logging.info(xsdDir)
# add code_src to the sys path
sys.path.insert(0, code_srcDir)
# call the conversion code
from conversion import conversion
try:
  status, messages = conversion(jobDir, code_srcDir, xsdDir, templateName)
except:
  logging.info('exception occurred')
  logging.info('exception: ' + str(sys.exc_info()[0]))
  status = 'failure'
  messages = ['[Conversion Error] Oops! The conversion cannot be finished! Please contact the administrator.']

logging.info("CONVERSION RESULT: " + status)
for message in messages:
	logging.info("message: " + message)
# example sending error template (rough cut)
# for now the email just goes into the rest server log file: nanomine/rest/nanomine.log.gz (log file name will get fixed soon)
# templates are in rest/config/emailtemplates/JOBTYPE/TEMPLATENAME.etf (etf extension is required, but implied in POST data)
try:
  emailurl = 'http://localhost/nmr/jobemail'
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
  rq = urllib2.Request(emailurl)
  logging.info('request created using emailurl')
  rq.add_header('Content-Type','application/json')
  r = urllib2.urlopen(rq, json.dumps(emaildata))
  logging.info('sent ' + status + ' email: ' + str(r.getcode()))
except:
  logging.info('exception occurred')
  logging.info('exception: ' + str(sys.exc_info()[0]))


