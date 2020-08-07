import os
import sys
from subprocess import *

# The MATLAB script that is run by run_matlab should exist in the job's src directory.
# If MATLAB is not configured on the node i.e. MATLAB_AVAILABLE not defined or not == 'yes', then
#   run_matlab will run the python script TEST_matlabpgm from the job's matlab directory

class matlab:
  def __init__(self, logger):
    self.logger = logger
    self.matlabAvailable = True
    try:
      self.matlabAvailable = (os.environ['NM_MATLAB_AVAILABLE']=='yes')
    except:
      pass

  def run(self, userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri, jobDataUriSuffix, matlabPgm, matlabPgmParams):
    self.logger.info('path ' + os.environ['PATH'])
    rc = 2
    mlparams = '\'' + userId + '\',' + '\'' + jobId + '\',' + '\'' + jobType + '\',' + '\'' + jobDir + '\',' + '\'' + webBaseUri + '\',' + '\'' + jobDataUriSuffix + '\','
    for mlp in matlabPgmParams:
      mlparams += '\'' + mlp + '\','
    mlparams = mlparams.rstrip(',')


    matlabDir = jobSrcDir + '/matlab'
    self.logger.info('Running MATLAB for jobId: ' + jobId + '.  MATLAB_AVAILABLE: ' + str(self.matlabAvailable))
    self.logger.info('                  userId: ' + userId)
    self.logger.info('                   jobId: ' + jobId)
    self.logger.info('                 jobType: ' + jobType)
    self.logger.info('               jobSrcDir: ' + jobSrcDir)
    self.logger.info('                  jobDir: ' + jobDir)
    self.logger.info('              webBaseUri: ' + webBaseUri)
    self.logger.info('        jobDataUriSuffix: ' + jobDataUriSuffix)
    self.logger.info('               matlabDir: ' + matlabDir)
    self.logger.info('               matlabPgm: ' + matlabPgm)
    self.logger.info('         matlabPgmParams: ' + str(matlabPgmParams))
    self.logger.info('         matlabInputParams: ' + str(mlparams))

    runpgm = ''
    runstr = 'cd ' + matlabDir + '; ' + matlabPgm + '(' + mlparams +'); exit;'
    if(self.matlabAvailable):
      self.logger.info('EXECUTING MATLAB - ' + matlabPgm + '.m')
      runpgm = ["matlab", "-nodesktop", "-nodisplay", "-nosplash", "-r", runstr]
    else :
      self.logger.info('Running TEST_' + matlabPgm)
      runpgm = ["python", jobSrcDir + '/matlab/' + 'TEST_Otsu.py',
                userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri, jobDataUriSuffix, matlabDir,
                "-nodesktop", "-nodisplay", "-nosplash", "-r", runstr]
    print(runpgm)
    p = Popen(runpgm)
    p.wait()
    rc = p.returncode
    return rc


