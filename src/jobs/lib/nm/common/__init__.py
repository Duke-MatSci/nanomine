# Common utilities and setup code
import os
import sys
import datetime

import logging
sloglevel=os.environ['NM_LOGLEVEL']
loglevel = logging.DEBUG
try:
  loglevel = getattr(logging, sloglevel.upper())
except:
  pass

logging.basicConfig(filename=os.environ['NM_LOGFILE'], level=loglevel)
class NmLogWriter: # https://stackoverflow.com/a/19438364
  def __init__(self, logger, level):
    self.logger = logger
    self.level = level
  def write(self, msg):
    dt = datetime.datetime.now().isoformat()
    if msg != '\n':
      self.logger.log(self.level, dt + ' - ' + msg)
  def flush(self):
    pass

sys.stdout = NmLogWriter(logging, loglevel)
sys.stderr = NmLogWriter(logging, loglevel)



