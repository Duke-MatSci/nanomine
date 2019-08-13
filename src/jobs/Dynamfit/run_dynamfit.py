#!/usr/bin/env python

# run the dynamfit batch process

# Environment variables will be set, so they're available here.

import os
import sys
import json
import urllib.request
from nm.common import *
from nm.common.nm_rest import nm_rest

restbase = os.environ['NM_LOCAL_REST_BASE']
webbase = os.environ['NM_WEB_BASE_URI']
jobbase = os.environ['NM_JOB_DATA_URI']
sloglevel=os.environ['NM_LOGLEVEL']
loglevel = logging.DEBUG
try:
  loglevel = getattr(logging, sloglevel.upper())
except:
  pass

logging.basicConfig(filename=os.environ['NM_LOGFILE'],level=loglevel)

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

# copy a.out to jobDir
os.system('cp ' + os.getcwd() + '/code_src/a.out ' + jobDir)

paramFile = open(jobDir + '/' + 'job_parameters.json', 'r')
inputParameters = json.load(paramFile)

logging.info(pgmName + ' input parameters: ')
for key in inputParameters.keys():
  logging.info( '  ' + key + ' = ' + str(inputParameters[key]))

# Do not modify job_status.json -- the server will handle it
logging.info(pgmName + ' input files: ')
myfiles = os.listdir(jobDir)
for f in myfiles:
  print('  ' + f)

## dynamfit conversion section
messages = []
# gather the parameters
# templateName
templateName = inputParameters['templateName']
# remove .X_T from templateName
if templateName.endswith(".X_T"):
  templateName = templateName[:-4]
else:
  messages.append("[Extension Error] Your upload does not seem to have a .X_T file.")
# weight
weight = str(inputParameters['weight'])
if not weight.replace('.','',1).isdigit():
  messages.append("[Input Error] Weight factor should be a non-negative number. Please read instructions on the Dynamfit page carefully.")
else:
  if float(weight) < 0.0 or float(weight) > 2.0:
    messages.append("[Input Error] Weight factor should between 0.0 and 2.0. Please read instructions on the Dynamfit page carefully.")
# nEle
if not str(inputParameters['nEle']).replace('.','',1).isdigit():
  messages.append("[Input Error] The number of element should be a positive number. Please read instructions on the Dynamfit page carefully.")
else:
  if int(inputParameters['nEle']) != float(int(inputParameters['nEle'])):
    messages.append("[Input Error] Please use integer for the number of element.")
  nEle = int(inputParameters['nEle']) # integer number of element
  if nEle > 2 and nEle <= 104:
    nEle = str(nEle)
  else:
    messages.append("[Input Error] We suggest to use 2 to 104 elements in Dynamfit.")
# stddev
stddev = inputParameters['stddev']
if stddev in {"std1", "std2"}:
  if stddev == "std1":
    std = '1'
  elif stddev == "std2":
    std = '2'
else:
  messages.append("[Input Error] Please reselect the standard deviation.")

# dt
dtype = inputParameters['dt']
if dtype in {"dt1", "dt2"}:
  if dtype == "dt1":
    dt = '1'
  elif dtype == "dt2":
    dt = '2'
else:
  messages.append("[Input Error] Please reselect the data type.")

# add code_src to the sys path
code_srcDir = os.getcwd() + '/code_src'
sys.path.insert(0, code_srcDir)
# call the calculation code
import traceback
try:
  from myfun_plot import plotEandEE # for plotting
except:
  logging.info(str(traceback.format_exc()))

status = 'failure'
logging.info("calculation begin")
if len(messages) == 0:
  try:
    logging.info("before a.out")
    os.system("cd %s; ./a.out %s %s %s %s %s" %(jobDir, templateName, weight, std, nEle, dt))
    logging.info("after a.out")
    plotEandEE(jobDir, templateName+'.X_T', templateName+'.XPR', int(nEle))
    status = 'success'
    logging.info("calculation finished")
  except:
    logging.info('exception occurred')
    logging.info('exception: ' + str(sys.exc_info()[0]))
    status = 'failure'
    messages.append("[Calculation Error] Oops! The calculation cannot be finished! Please contact the administrator.")

logging.info("DYNAMFIT RESULT: " + status)
for message in messages:
  logging.info("message: " + message)

if status == 'success':
# write job_output_parameters.json
  with open(os.path.join(jobDir, "job_output_parameters.json"),"w") as f:
    f.write('{\n"XPR": "%s.XPR",\n' %(templateName))
    f.write('"XFF": "%s.XFF",\n' %(templateName))
    f.write('"XTF": "%s.XTF",\n' %(templateName))
    f.write('"Eimg": "E.png",\n')
    f.write('"EEimg": "EE.png"\n}')

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
      "resultpage": webbase + '/nm#/DynamfitResult?ref='+jobbase+'/'+jobId,
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
  logging.info('exception: ' + str(sys.exc_info()[0]))
