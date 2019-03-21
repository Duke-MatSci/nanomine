import sys
import os
from shutil import copy
from nm.common import *

# do what the Otsu.m would do except for running MATLAB
# Inputs and output should be the same, but outputs come from canned data placed into test_outputs directory

# 1. copy canned outputs to jobDir directory
# 2. return success error code i.e. 0
rc = 0
pgmName = sys.argv[0]
userId = sys.argv[1]
jobId = sys.argv[2]
jobType = sys.argv[3]
jobSrcDir = sys.argv[4]
jobDir = sys.argv[5]
webBaseUri = sys.argv[6]
jobDataUriSuffix = sys.argv[7]
matlabDir = sys.argv[8]

if len(sys.argv) > 9: # the rest of the args are what would have been passed to MATLAB if this test program were not called instead
  for i in range(9, len(sys.argv)):
    logging.info('matlab param: ' + sys.argv[i])

outDir = jobDir + '/output'

try:
  os.makedirs(outDir)
except:
  pass

srcDir = jobSrcDir + '/matlab/test_outputs/'
outFiles = [ srcDir + 'Binarized_Input1.jpg', srcDir + 'Input1.jpg', srcDir + 'Results.zip', srcDir + 'errors.txt']

try:
  for f in outFiles:
    copy(f, outDir)
  logging.info(pgmName + ' copied test output to ' + outDir + ' successfully.')
except:
  logging.error(pgmName + ' error copying test output to ' + outDir)
  rc = 2

file = open(jobDir+"/"+"job_output_parameters.json","w")
file.write('{\n"inputFileName": "output/Input1.jpg",\n')
file.write('"binarizedFileName": "output/Binarized_Input1.jpg",\n')
file.write('"zipFileName": "output/Results.zip"\n')
file.write('\n}')
file.close()
sys.exit(rc)
