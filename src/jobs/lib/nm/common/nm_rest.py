import os
import sys
import urllib.request
import ssl
import time
import json
import traceback

# rest_request takes a urllib.request and executes it after requesting a new access token for the
#   service being requested
class nm_rest:
  def __init__(self, logger, sysToken=None, apiToken=None, refreshToken=None, urllib2req=None):
    self.logger = logger
    self.sysToken = sysToken
    self.apiToken = apiToken
    self.refreshToken = refreshToken
    self.accessToken = None
    self.accessExpiration = None
    self.callerReq = urllib2req # caller's urllib.request
    self.refreshUrl = '/nmr/refreshtoken'
    self.baseUrl = os.environ['NM_LOCAL_REST_BASE']
    self.logger.debug('nm_rest init. sysToken = %s, apiToken = %s, refreshToken = %s' % (self.sysToken, self.apiToken, self.refreshToken) )
    if self.sysToken == None or self.apiToken == None or self.refreshToken == None:
      raise ValueError('sysToken, apiToken and accessToken are required parameters and must be valid')

  def getRequest(self):
    return self.callerReq

  def urlopen(self, rqData):
    self.logger.debug('nm_rest urlopen...')
    now = int(time.time())
    if self.accessToken == None or self.accessExpiration == None or self.accessExpiration <= now :
      refreshData = {
      "systemToken": self.sysToken,
      "apiToken": self.apiToken,
      "refreshToken": self.refreshToken
      }
      self.logger.debug('refreshData: %s' % refreshData)
      atReq = urllib.request.Request(self.baseUrl + self.refreshUrl)
      atReq.add_header('Content-Type','application/json')
      try:
        r = urllib.request.urlopen(atReq, json.dumps(refreshData).encode("utf-8"), context=ssl._create_unverified_context())
        sdata = r.read()
        self.logger.debug('access token: ' + sdata.decode("utf-8"))
        data = json.loads(sdata.decode("utf-8"))['data']
        self.accessToken = data['accessToken']
        self.accessExpiration = int(data['expiration'])
      except:
        self.logger.error('exception occurred obtaining access token for %s using %s %s %s' %(self.callerReq.get_full_url(), self.sysToken, self.apiToken, self.refreshToken))
        raise # re-throw the exception

     # now, execute the original request with the correct bearer token
    self.callerReq.add_header('Authentication', 'Bearer ' + self.accessToken)
    rv = urllib.request.urlopen(self.callerReq, rqData, context=ssl._create_unverified_context())
    return rv
