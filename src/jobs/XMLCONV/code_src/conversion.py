
from extract_verify_ID_callable import runEVI
from customized_compiler_callable import compiler
from nm.common import *
from nm.common.nm_rest import nm_rest
import os
import csv
import urllib.request
import json
import sys
import re
from lxml import etree
from datauri import DataURI
import traceback
import ssl


def uploadFilesAndAdjustXMLImageRefs(jobDir, schemaId, xmlId):
    imageFiles = [] # track image files uploaded -- which go into default bucket (returned id is substituted back into XML)
    # all other files go into 'curateinput' bucket with filename {schemaId}/{xmlId}/filename (returned ID is not stored)
    # for now let exceptions bubble up to handler in caller

    restbase = os.environ['NM_LOCAL_REST_BASE']
    webbase = os.environ['NM_WEB_BASE_URI']
    curateFilesUrl = restbase + '/nmr/blob'

    sysToken = os.environ['NM_AUTH_SYSTEM_TOKEN']
    curateApiToken = os.environ['NM_AUTH_API_TOKEN_CURATE']
    curateRefreshToken = os.environ['NM_AUTH_API_REFRESH_CURATE']
    xmlTitleRe = re.compile('^[A-Z]([0-9]+)[_][S]([0-9]+)[_][\S]+[_]\d{4}([.][Xx][Mm][Ll])?$')
    reMatch = xmlTitleRe.match(xmlId) ## TODO handle invalid title i.e. reMatch == None
    if reMatch == None:
      logging.error('xmlId (title) does not match expected format: ' + xmlId + ' (match was None)')

    datasetId = reMatch.group(1)
    xmlName = jobDir + '/xml/' + xmlId + '.xml'
    xmlTree = etree.parse(xmlName)
    updatedXml = False
    for f in xmlTree.findall('.//MICROSTRUCTURE/ImageFile/File'):
      fn = f.text.split('/')[-1]
      imageFiles.append(fn)
      fullImageFileName = jobDir + '/' + fn
      logging.debug('uploading: ' + fullImageFileName)
      dataUri = DataURI.from_file(fullImageFileName)
      dataUri = dataUri.replace("\n","") # remove line feeds
      ## logging.debug('dataUri: ' + dataUri)
      curatefiledata = '{"filename":"'+ fn + '","dataUri":"' + dataUri + '"}'
      # logging.debug(curatefiledata + ' len is: ' + str(len(curatefiledata)))
      curatefiledata = json.loads(curatefiledata)
      rq = urllib.request.Request(curateFilesUrl)
      logging.debug('request created using createFilesUrl')
      rq.add_header('Content-Type','application/json')
      nmCurateFiles = nm_rest(logging, sysToken, curateApiToken, curateRefreshToken, rq)
      r = nmCurateFiles.urlopen(json.dumps(curatefiledata).encode("utf8"))
      if r.getcode() == 201:
        uploadId = json.loads(r.read())['data']['id']
        imageRef = webbase + '/nmr/blob?id=' + uploadId
        logging.debug('new image value for XML: ' + imageRef)
        f.text = imageRef # update XML node with new image reference
        ## testing -- raise ValueError('Upload successful. returned id: ' + uploadId) ## for testing
        updatedXml = True
      else:
        raise ValueError('Unexpected return code from image upload (' + fn + '): ' + str(r.getcode()))
    if updatedXml == True:
      # update the XML in the file
      xmlTree.write(xmlName)

    # get a list of all files in jobDir and upload them
    dataFiles = os.listdir(jobDir)
    for f in dataFiles:
      fn = jobDir + '/' + f
      # changed following check to save imageFiles into curateinput bucket as well since not doing so causes downstream issue
      if os.path.isfile(fn): ## and f not in imageFiles: # make sure it's a regular file and wasn't already uploaded as an image
        dataUri = DataURI.from_file(fn)
        dataUri = dataUri.replace("\n","") # remove line feeds
        ## objFN = schemaId + '/' + xmlId + '/' + f # change to datasetid/xmlid/filename
        objFN = datasetId + '/' + xmlId + '/' + f
        curatefiledata = '{"filename":"'+ objFN + '","bucketName":"curateinput","dataUri":"' + dataUri + '"}'
        # logging.debug(curatefiledata + ' len is: ' + str(len(curatefiledata)))
        curatefiledata = json.loads(curatefiledata)
        rq = urllib.request.Request(curateFilesUrl)
        logging.debug('request created using createFilesUrl')
        rq.add_header('Content-Type','application/json')
        nmCurateFiles = nm_rest(logging, sysToken, curateApiToken, curateRefreshToken, rq)
        r = nmCurateFiles.urlopen(json.dumps(curatefiledata).encode("utf8"))
        if r.getcode() == 201:
          uploadId = json.loads(r.read())['data']['id']
          logging.debug('uploaded file ID: ' + uploadId)
          ## testing - raise ValueError('Upload of input successful. returned id: ' + uploadId) ## for testing
        else:
          raise ValueError('Unexpected return code from file upload (' + objFN + '): ' + str(r.getcode()))





def conversion(jobDir, code_srcDir, xsdDir, templateName, user):
    restbase = os.environ['NM_LOCAL_REST_BASE']
    xsdFilename = xsdDir.split("/")[-1]
    # initialize messages
    messages = []
    # check #1: extension of templateName
    if os.path.splitext(templateName)[1] not in {'.xlsx', '.xls'}:
        messages = ['[Upload Error] The Excel template file should have extensions like ".xlsx" or ".xls".']
        return ('failure', messages)
    # get the ID
    runEVI(jobDir, code_srcDir, templateName, restbase, user)
    # check #2: see if ID conversion is successful
    if not os.path.exists(jobDir + '/ID.txt'):
        if os.path.exists(jobDir + '/error_message.txt'):
            with open(jobDir + '/error_message.txt', 'r+') as f:
                error_message = f.read()
            # read the error message
            messages_raw = error_message.split('\n')
            for message in messages_raw:
                if len(message.strip()) > 0:
                    messages.append(message.strip())    
            return ('failure', messages)
        messages += ['[Conversion Error] Failed to assemble the ID. Please check or contact the administrator!']
        return ('failure', messages)
    else:
        with open(jobDir + '/ID.txt', 'r') as f:
            ID = f.read()
    # kickoff the conversion script
    logName = compiler(jobDir, code_srcDir, xsdDir, templateName, restbase)
    # check #3: see if there is an error_message.txt generated during conversion
    if os.path.exists(jobDir + '/error_message.txt'):
        with open(jobDir + '/error_message.txt', 'r+') as f:
            error_message = f.read()
        # read the error message
        messages_raw = error_message.split('\n')
        for message in messages_raw:
            if len(message.strip()) > 0:
                messages.append(message.strip())    
    # check #4: check the schema validation results
    with open(logName) as f:
        vld_log = csv.DictReader(f)
        for row in vld_log:
            if ID in row['xml directory']:
                if "the atomic type 'xs:double'" in row['error']:
                    messages.append('[XML Schema Validation Error] ' + row['error'].strip() + ', should be a number.')
                else:
                    messages.append('[XML Schema Validation Error] ' + row['error'].strip())
    if len(messages) > 0:
        return ('failure', messages)
    # check #5: upload and check if the uploading is successful
    try:
        sysToken = os.environ['NM_AUTH_SYSTEM_TOKEN']
        curateApiToken = os.environ['NM_AUTH_API_TOKEN_CURATE']
        curateRefreshToken = os.environ['NM_AUTH_API_REFRESH_CURATE']

        # rest call for schemaID
        schemaurl = restbase + '/nmr/templates/select?filename='+xsdFilename
        rq = urllib.request.Request(schemaurl)
        j = json.loads(urllib.request.urlopen(rq, context=ssl._create_unverified_context()).read())
        schemaId = j["data"][0]["_id"]
        # upload input files and image files referenced in xml
        uploadFilesAndAdjustXMLImageRefs(jobDir, schemaId, ID)
        # curate-insert rest call
        with open(jobDir + "/xml/" + ID + ".xml", "r") as f:
            content = f.read()

        curate_insert_url = restbase + '/nmr/curate'
        curate_data = {
            "userid": user,
            "title": ID + ".xml",
            "schemaId": schemaId,
            "curatedDataState": "Valid", # Valid causes ingest to kick of next. Also, it has passed validation.
            "ispublished": "false",
            "isPublic": "false",
            "content": content
        }
        rq = urllib.request.Request(curate_insert_url)
        # logging.info('request created using curate_insert_url')
        rq.add_header('Content-Type','application/json')
        ## r = urllib.request.urlopen(rq, json.dumps(curate_data), context=ssl._create_unverified_context())
        nmCurateFiles = nm_rest(logging, sysToken, curateApiToken, curateRefreshToken, rq)
        r = nmCurateFiles.urlopen(json.dumps(curate_data).encode("utf8"))

    # logging.info('curate insert request posted: ' + str(r.getcode()))
    except:
        messages.append('exception occurred during curate-insert')
        messages.append('exception: '  + str(traceback.format_exc()))
    if len(messages) > 0:
        return ('failure', messages)
    # pass all the checks
    return ('success', messages)
