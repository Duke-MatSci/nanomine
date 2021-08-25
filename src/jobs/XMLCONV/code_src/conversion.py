
from extract_verify_ID_callable import runEVI
from customized_compiler_callable import compiler
from xsdTraverse import xsdTraverse
from mfvf import mfvfConvert
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
import mime
import requests
from spectraHeaderParserForXML import spectraHeaderParserForXML


def uploadFilesAndAdjustXMLImageRefs(jobDir, schemaId, xmlId, runCtx):
    imageFiles = [] # track image files uploaded -- which go into default bucket (returned id is substituted back into XML)
    # all other files go into 'curateinput' bucket with filename {schemaId}/{xmlId}/filename (returned ID is not stored)
    # for now let exceptions bubble up to handler in caller
    restbase = runCtx['restbase']
    webbase = runCtx['webbase']
    curateFilesUrl = restbase + '/nmr/blob/create'
    blobs = []
    datasetId = runCtx['datasetId']

    # get a list of all files in jobDir and upload them
    dataFiles = os.listdir(jobDir)
    for f in dataFiles:
      fn = jobDir + '/' + f
      # changed following check to save imageFiles into curateinput bucket as well since not doing so causes downstream issue
      if os.path.isfile(fn): ## and f not in imageFiles: # make sure it's a regular file and wasn't already uploaded as an image
        dataUri = DataURI.from_file(fn)
        dataUri = dataUri.replace("\n","") # remove line feeds
        ## objFN = schemaId + '/' + xmlId + '/' + f # change to datasetid/xmlid/filename
        ## objFN = datasetId + '/' + xmlId + '/' + f
        objFN = f
        # curatefiledata = '{"filename":"'+ objFN + '","bucketName":"curateinput", "dataUri":"' + dataUri + '"}'
        curatefiledata = '{"filename":"'+ objFN + '","dataUri":"' + dataUri + '","originalDatasetId":"' + datasetId + '"}'
        # logging.debug(curatefiledata + ' len is: ' + str(len(curatefiledata)))
        curatefiledata = json.loads(curatefiledata)
        rq = urllib.request.Request(curateFilesUrl)
        logging.debug('request created using createFilesUrl')
        rq.add_header('Content-Type','application/json')
        nmCurateFiles = nm_rest(logging, runCtx['sysToken'], runCtx['curateApiToken'], runCtx['curateRefreshToken'], rq)
        r = nmCurateFiles.urlopen(json.dumps(curatefiledata).encode("utf8"))
        if r.getcode() == 201:
          uploadId = json.loads(r.read().decode("utf-8"))['data']['id']
          logging.debug('uploaded file ID: ' + uploadId)
          content_type = mime.Types.of(objFN)[0].content_type
          blob_info = {'type': 'blob', 'id': uploadId, 'metadata': {'filename': objFN, 'contentType': content_type}}
          if runCtx['excelTemplateName'] == objFN:
            blob_info['metadata']['is_completed_pnc_template'] = True
          blobs.append(blob_info)
          ## testing - raise ValueError('Upload of input successful. returned id: ' + uploadId) ## for testing
        else:
          raise ValueError('Unexpected return code from file upload (' + objFN + '): ' + str(r.getcode()))

    # TODO remove this block after testing
    #xmlTitleRe = re.compile('^[A-Z]([0-9]+)[_][S]([0-9]+)[_][\S]+[_]\d{4}([.][Xx][Mm][Ll])?$')
    #reMatch = xmlTitleRe.match(xmlId) ## TODO handle invalid title i.e. reMatch == None
    #if reMatch == None:
    #  logging.error('xmlId (title) does not match expected format: ' + xmlId + ' (match was None)')

    #datasetId = reMatch.group(1)
    xmlName = jobDir + '/xml/' + xmlId + '.xml'
    xmlTree = etree.parse(xmlName)
    updatedXml = False
    for f in xmlTree.findall('.//MICROSTRUCTURE/ImageFile/File'):
      fn = f.text.split('/')[-1]
      blob = None
      for b in blobs:
        bfn = b['metadata']['filename']
        if bfn == fn:
          blob = b
      if blob == None:
        raise ValueError('Unable to match xml: ' + xmlId + ' MICROSTRUCTURE image filename: ' + fn + ' with an uploaded image name.')
      else:
        imageRef = webbase + '/nmr/blob?id=' + blob['id']
        logging.debug('new image value for XML: ' + imageRef)
        f.text = imageRef # update XML node with new image reference
        ## testing -- raise ValueError('Upload successful. returned id: ' + uploadId) ## for testing
        updatedXml = True

    if updatedXml == True:
      # update the XML in the file
      xmlTree.write(xmlName)
    return blobs


def conversion(jobDir, code_srcDir, xsdDir, templateName, user, datasetId):
    restbase = os.environ['NM_LOCAL_REST_BASE']
    sysToken = os.environ['NM_AUTH_SYSTEM_TOKEN']
    curateApiToken = os.environ['NM_AUTH_API_TOKEN_CURATE']
    curateRefreshToken = os.environ['NM_AUTH_API_REFRESH_CURATE']
    nm_dataset_initial_doi = os.environ['NM_DATASET_INITIAL_DOI']
    webbase = os.environ['NM_WEB_BASE_URI']

    xsdFilename = os.path.split(xsdDir)[1]

    runCtx = {
      'nm_dataset_initial_doi': nm_dataset_initial_doi,
      'datasetId': datasetId,
      'schemaName': xsdFilename,
      'schemaId': '',
      'restbase': restbase,
      'webbase': webbase,
      'sysToken': sysToken,
      'curateApiToken': curateApiToken,
      'curateRefreshToken': curateRefreshToken,
      'excelTemplateName': templateName,
      'xmlID': '',
      'user': user
    }
    # initialize messages
    messages = []

    try:
      # rest call for schemaID
      schemaurl = restbase + '/nmr/templates/select?filename='+xsdFilename
      rq = urllib.request.Request(schemaurl)
      j = json.loads(urllib.request.urlopen(rq, context=ssl._create_unverified_context()).read().decode("utf-8"))
      schemaId = j["data"][0]["_id"]
      runCtx['schemaId'] = schemaId
    except:
      messages.append('Exception looking up schema information')
      return ('failure', messages)

    # check #1: extension of templateName
    if os.path.splitext(templateName)[1] not in {'.xlsx', '.xls'}:
        messages = ['[Upload Error] The Excel template file should have extensions like ".xlsx" or ".xls".']
        return ('failure', messages)
    # get the ID
    (dsInfo, dsMessage) = runEVI(jobDir, code_srcDir, templateName, restbase, user, runCtx)
    if dsInfo == None:
      messages.append(dsMessage)
      return ('failure', messages)

    # kick off dataset update once the ID is created successfully
    response = None # initialize response of the request
    # POST ds-create
    try:
      if not dsInfo['userid'] == user: # do not bypass this since updateEx implies admin acccess and OVERWRITE of another user's dataset WOULD occur
        raise messages.append('Update of dataset failed. Job user: ' + user + ' is not the owner: ' + dsInfo['userid'])
        return('failure', messages)

      ds_update_url = restbase + '/nmr/dataset/updateEx'
      rq = urllib.request.Request(ds_update_url)
      # logging.info('request created using ds_create_url')
      rq.add_header('Content-Type','application/json')

      nmCurate = nm_rest(logging, runCtx['sysToken'], runCtx['curateApiToken'], runCtx['curateRefreshToken'], rq)
      rv = nmCurate.urlopen(json.dumps({'dsUpdate': dsInfo}).encode("utf-8"))
      response = json.loads(rv.read().decode("utf-8"))['data']
    except:
      messages.append('exception occurred during dataset-update\n')
      messages.append('exception: ' + str(traceback.format_exc()) + '\n')
      # assemble the PID
    if response is None:
      messages.append('exception occurred during getting the response of dataset-update\n')
      
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
    logName = compiler(jobDir, code_srcDir, xsdDir, templateName, restbase, runCtx)
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
    with open(logName, 'r', encoding='utf-8') as f:
        vld_log = csv.DictReader(f)
        for row in vld_log:
            logging.info(str(row))
            if ID in row['\ufeffxml directory']:
                if "the atomic type 'xs:double'" in row['error']:
                    messages.append('[XML Schema Validation Error] ' + row['error'].strip() + ', should be a number.')
                else:
                    messages.append('[XML Schema Validation Error] ' + row['error'].strip())
    if len(messages) > 0:
        return ('failure', messages)

    # check #5: call the ChemProps API and add in the standardized chemical names, uSMILES and density
    try:
        xmlName = jobDir + "/xml/" + ID + ".xml"
        xmlTree = etree.parse(xmlName)
        # collect all MatrixComponent/ChemicalName and FillerComponent/ChemicalName packages
        matcomps = xmlTree.findall('.//MatrixComponent')
        filcomps = xmlTree.findall('.//FillerComponent')
        # for each package, send to ChemProps API
        # chemprops_api_url = restbase + '/api/v1/chemprops' || old address
        chemprops_api_url = restbase + '/nmr/api/chemprops_parser'
        # MatrixComponent
        for matcomp in matcomps:
            chemprops_data = {
                "polfil": "pol",
                "chemicalname": matcomp.findtext('ChemicalName'),
                "abbreviation": '' if matcomp.findtext('Abbreviation') is None else matcomp.findtext('Abbreviation'),
                "tradename": '' if matcomp.findtext('TradeName') is None else matcomp.findtext('TradeName'),
                "smiles":  '' if matcomp.findtext('uSMILES') is None else matcomp.findtext('uSMILES'),
                "nmId": ID
            }
            # chemprops_rq = urllib.request.Request(chemprops_api_url)
            logging.debug('request created for ChemProps using chemprops_api_url')
            logging.debug('Searching polymer package: ' + json.dumps(chemprops_data)) #.encode("utf8"))
            # chemprops_rq.add_header('Content-Type','application/json')
            # chemprops_search = nm_rest(logging, sysToken, jobApiToken, jobRefreshToken, chemprops_rq)
            # r = chemprops_search.urlopen(json.dumps(chemprops_data).encode("utf8"))

            r = requests.get(chemprops_api_url, params = chemprops_data)
            # r = requests.get("%s?chemicalname=%s&polfil=%s" %(chemprops_api_url, chemprops_data['ChemicalName'], chemprops_data['polfil'])) 
            # if r.getcode() == 200:
            if r.status_code == 200:
                # result = json.loads(r.read().decode("utf-8"))
                result = r.json()['data']
                logging.debug('Searching result: ' + json.dumps(result)) #.encode("utf8"))
                # now we modify xml with result
                stdCN = matcomp.find('.//StdChemicalName')
                if stdCN is None:
                  stdCN = etree.SubElement(matcomp, 'StdChemicalName')
                stdCN.text = result['StandardName']
                uSMILES = matcomp.find('.//uSMILES')
                if uSMILES is None:
                  uSMILES = etree.SubElement(matcomp, 'uSMILES')
                uSMILES.text = result['uSMILES']
                if matcomp.find('Density') is None:
                  density = etree.SubElement(matcomp, 'Density')
                  dens_des = etree.SubElement(density, 'description')
                  dens_des.text = 'inserted from ChemProps, NanoMine'
                  dens_val = etree.SubElement(density, 'value')
                  dens_val.text = result['density']
                  dens_uni = etree.SubElement(density, 'unit')
                  dens_uni.text = 'g/cm3'
            ## testing - raise ValueError('Upload of input successful. returned id: ' + uploadId) ## for testing
            elif r.status_code == 404:
              logging.error('Matrix not found: ' + json.dumps(chemprops_data))
            else:
                raise ValueError('Unexpected return code from ChemProps: ' + str(r.status_code))
        # FillerComponent
        for filcomp in filcomps:
            chemprops_data = {
                "polfil": "fil",
                "chemicalname": filcomp.findtext('ChemicalName'),
                "abbreviation": '' if filcomp.findtext('Abbreviation') is None else filcomp.findtext('Abbreviation'),
                "nmId": ID
            }
            # chemprops_rq = urllib.request.Request(chemprops_api_url)
            logging.debug('request created for ChemProps using chemprops_api_url')
            logging.debug('Searching filler package: ' + json.dumps(chemprops_data)) #.encode("utf8"))
            # chemprops_rq.add_header('Content-Type','application/json')
            # chemprops_search = nm_rest(logging, sysToken, jobApiToken, jobRefreshToken, chemprops_rq)
            # r = chemprops_search.urlopen(json.dumps(chemprops_data).encode("utf8"))

            r = requests.get(chemprops_api_url, params = chemprops_data)
            # r = requests.get("%s?chemicalname=%s&polfil=%s" %(chemprops_api_url, chemprops_data['ChemicalName'], chemprops_data['polfil']))
            # if r.getcode() == 200:
            if r.status_code == 200:
                # result = json.loads(r.read().decode("utf-8"))
                result = r.json()['data']
                logging.debug('Searching result: ' + json.dumps(result)) #.encode("utf8"))
                # now we modify xml with result
                stdCN = filcomp.find('.//StdChemicalName')
                if stdCN is None:
                  stdCN = etree.SubElement(filcomp, 'StdChemicalName')
                stdCN.text = result['StandardName']
                if filcomp.find('Density') is None:
                  density = etree.SubElement(filcomp, 'Density')
                  dens_des = etree.SubElement(density, 'description')
                  dens_des.text = 'inserted from ChemProps, NanoMine'
                  dens_val = etree.SubElement(density, 'value')
                  dens_val.text = str(result['density'])
                  dens_uni = etree.SubElement(density, 'unit')
                  dens_uni.text = 'g/cm3'
            ## testing - raise ValueError('Upload of input successful. returned id: ' + uploadId) ## for testing
            elif r.status_code == 404:
              logging.error('Filler not found: ' + json.dumps(chemprops_data))
            else:
              raise ValueError('Unexpected return code from ChemProps: ' + str(r.status_code))
        # sort modified elements with xsdTraverse module
        xsdt = xsdTraverse(xsdDir)
        # sort MatrixComponent by xpath PolymerNanocomposite/MATERIALS/Matrix/MatrixComponent
        xsdt.sortSubElementsByPath(xmlTree, 'PolymerNanocomposite/MATERIALS/Matrix/MatrixComponent')
        # sort FillerComponent by xpath PolymerNanocomposite/MATERIALS/Filler/FillerComponent
        xsdt.sortSubElementsByPath(xmlTree, 'PolymerNanocomposite/MATERIALS/Filler/FillerComponent')
        xmlTree.write(xmlName, encoding="UTF-8", xml_declaration=True)
    except:
        messages.append('exception occurred during ChemProps-query')
        messages.append('exception: '  + str(traceback.format_exc()))
    if len(messages) > 0:
        return ('failure', messages)
    
    # check #6: call the mf-vf conversion agent and add in the calculated mf/vf
    try:
        xmlName = jobDir + "/xml/" + ID + ".xml"
        mvc = mfvfConvert(xmlName)
        mvc.run()
        xmlTree = etree.parse(xmlName)
        # sort FillerComponent by xpath PolymerNanocomposite/MATERIALS/Filler/FillerComponent
        xsdt.sortSubElementsByPath(xmlTree, 'PolymerNanocomposite/MATERIALS/Filler/FillerComponent')
        xmlTree.write(xmlName, encoding="UTF-8", xml_declaration=True)
    except:
        messages.append('exception occurred during mass fraction-volume fraction conversion')
        messages.append('exception: '  + str(traceback.format_exc()))
    if len(messages) > 0:
        return ('failure', messages)
    # check #7: call the spectra data header parser
    try:
        xmlName = jobDir + "/xml/" + ID + ".xml"
        config = '{}/nanomineParserConfig.json'.format(code_srcDir)
        shpxml = spectraHeaderParserForXML(xsdDir, config)
        shpxml.runOnXML(xmlName, createCopy=False)
    except:
        messages.append('exception occurred during spectra header parser, please check header rows in your appended data files')
        messages.append('exception: '  + str(traceback.format_exc()))
    if len(messages) > 0:
        return ('failure', messages)

    # check #8: upload and check if the uploading is successful
    try:

        blobs = uploadFilesAndAdjustXMLImageRefs(jobDir, runCtx['schemaId'], ID, runCtx)

        # curate-insert rest call
        with open(jobDir + "/xml/" + ID + ".xml", "r") as f:
          content = f.read()

        curate_insert_url = restbase + '/nmr/curate'
        curate_data = {
          "userid": user,
          "title": ID + ".xml",
          "schemaId": runCtx['schemaId'],
          "datasetId": runCtx['datasetId'],
          "curatedDataState": "Valid", # Valid causes ingest to kick of next. Also, it has passed validation.
          "ispublished": "false",
          "isPublic": "false",
          "content": content
        }
        rq = urllib.request.Request(curate_insert_url)
        rq.add_header('Content-Type','application/json')
        nmCurateFiles = nm_rest(logging, runCtx['sysToken'], runCtx['curateApiToken'], runCtx['curateRefreshToken'], rq)
        rv = nmCurateFiles.urlopen(json.dumps(curate_data).encode("utf8"))
        response = json.loads(rv.read().decode("utf-8"))['data']

        logging.info('curate insert for title: ' + ID + ' datasetId: ' + runCtx['datasetId'] +' request posted. Result: ' + str(rv.getcode()))

    except:
          messages.append('exception occurred during curate-insert')
          messages.append('exception: '  + str(traceback.format_exc()))
    if len(messages) > 0:
      return ('failure', messages)
    # logging.debug('Xml curate Response: ' + str(response))
    xmlMongoId = response['_id']

    blobs.append({'type': 'xmldata', 'id': xmlMongoId, 'metadata': {'contentType': 'application/xml', 'filename': ID + '.xml'}})
    fileset = {'fileset': ID, 'files': blobs}
    filesets = dsInfo.get('filesets')
    if filesets == None:
      dsInfo['filesets'] = []
    dsInfo['filesets'].append(fileset)

    if len(messages) != 0:
      return ('failure', messages)

    # pass all the checks
    return ('success', messages)
