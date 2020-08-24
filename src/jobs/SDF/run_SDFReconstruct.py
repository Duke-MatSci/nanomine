#!/usr/bin/env python

# run the example Otsu process

# Environment variables will be set, so they're available here.

import os
import sys
import json
import urllib.request
import traceback

from nm.common import *
from nm.common.matlab import matlab
from nm.common.nm_rest import nm_rest

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

sysToken = os.environ['NM_AUTH_SYSTEM_TOKEN']
emailApiToken = os.environ['NM_AUTH_API_TOKEN_EMAIL']
emailRefreshToken = os.environ['NM_AUTH_API_REFRESH_EMAIL']

paramFile = open(jobDir + '/' + 'job_parameters.json', 'r')
inputParameters = json.load(paramFile)
userId = str(inputParameters['user'])
NumOfReconstructions = str(inputParameters['NumOfReconstructs'])
ImageDimensions = inputParameters['dimensions']
PhaseInfo = inputParameters['phase']

jobSrcDir = os.getcwd()
webBaseUri = os.environ['NM_WEB_BASE_URI']

jobDataUriSuffix = os.environ['NM_JOB_DATA_URI']

logging.info(pgmName + ' input parameters: ')
for key in inputParameters.keys():
  logging.info( '  ' + key + ' = ' + str(inputParameters[key]))

# Do not modify job_status.json -- the server will handle it
logging.info(pgmName + ' input files: ')
myfiles = os.listdir(jobDir)
for f in myfiles:
  print('  ' + f)
  #check file type and set appropriate flag for MATLAB
  if f.endswith(".zip"):
    input_type = '2'
    input_name = f
  elif f.endswith(".mat"):
    input_type = '3'
    input_name = f
  elif f.lower().endswith((".jpg",".png",".tif")):
    input_type = '1'
    input_name = f

matlabPgm = 'SDFRecon' # .m is implied, test mode will use python pgm
mlab = matlab(logging) # create matlab object

matlabPgmParams = (input_type,input_name,NumOfReconstructions,PhaseInfo)

rc = mlab.run(userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri, jobDataUriSuffix, matlabPgm, matlabPgmParams)
print('MATLAB return code - rc: ' + str(rc))

# write job_output_parameters.json
if rc ==0:
  file = open(jobDir+"/"+"job_output_parameters.json","w")
  file.write('{\n"inputFileName": "output/Input1.jpg",\n')
  file.write('"SDFPlot": "output/SDF_2D.jpg",\n')
  file.write('"zipFileName": "output/Results.zip",\n')
  file.write('"errors": "output/errors.txt"\n}')
  file.close()
else:
  file = open(jobDir+"/"+"job_output_parameters.json","w")
  file.write('{\n"errors": "output/errors.txt"\n}')
  file.close()

try:
  with open(jobDir+"/"+"output/errors.txt") as f:
    errmsgs = f.read()
  errmsgs = str.replace(errmsgs, '\n','<br/>\n')
except:
  logging.info('exception reading otsu matlab job error messages')
  logging.info('exception: ' + traceback.format_exc())
  errmsgs = ''
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
        "resultpage": webBaseUri + '/nm#/SDFReconstructResults?refuri='+jobDataUriSuffix+'/'+jobId,
        "jobinfo": {
          "resultcode":rc
        },
        "user": userId
      }
    }
    print('email data: %s' % emaildata)
    logging.info('emaildata: ' + json.dumps(emaildata))
    rq = urllib.request.Request(emailurl)
    logging.info('request created using emailurl')
    rq.add_header('Content-Type','application/json')
    nmEmail = nm_rest(logging, sysToken, emailApiToken, emailRefreshToken, rq)
    #r = urllib2.urlopen(rq, json.dumps(emaildata))
    r = nmEmail.urlopen(json.dumps(emaildata).encode('utf-8'))
    logging.info('sent success email: ' + str(r.getcode()))
  except:
    logging.info('exception occurred sending run_SDFReconstruct success email')
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
          "resultcode":rc,
          "errors": errmsgs
        },
        "user": userId
      }
    }
    print('email data: %s' % emaildata)
    logging.info('emaildata: ' + json.dumps(emaildata))
    rq = urllib.request.Request(emailurl)
    logging.info('request created using emailurl')
    rq.add_header('Content-Type','application/json')
    nmEmail = nm_rest(logging, sysToken, emailApiToken, emailRefreshToken, rq)
    #r = urllib2.urlopen(rq, json.dumps(emaildata))
    r = nmEmail.urlopen(json.dumps(emaildata).encode('utf-8'))
    logging.info('sent failure email: ' + str(r.getcode()))
  except:
    logging.info('exception occurred sending run_SDFReconstruct failure email')
    logging.info('exception: ' + traceback.format_exc())
