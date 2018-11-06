from extract_verify_ID_callable import runEVI
from customized_compiler_callable import compiler
import os
import csv
import urllib2
import json
import logging
import sys

def conversion(jobDir, code_srcDir, xsdDir, templateName):
    # logging config
    # sloglevel=os.environ['NM_LOGLEVEL']
    # loglevel = logging.DEBUG
    # try:
    #     loglevel = getattr(logging, sloglevel.upper())
    # except:
    #     pass
    # logging.basicConfig(filename=os.environ['NM_LOGFILE'],level=loglevel)
    # rest setup
    restbase = os.environ['NM_LOCAL_REST_BASE']
    xsdFilename = xsdDir.split("/")[-1]
    # initialize messages
    messages = []
    # check #1: extension of templateName
    if os.path.splitext(templateName)[1] not in {'.xlsx', '.xls'}:
        messages = ['[Upload Error] The Excel template file should have extensions like ".xlsx" or ".xls".']
        return ('failure', messages)
    # get the ID
    runEVI(jobDir, code_srcDir, templateName, restbase)
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
    logName = compiler(jobDir, code_srcDir, xsdDir, templateName)
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
    # rest call for schemaID
    try:
        schemaurl = restbase + '/nmr/templates/select?filename='+xsdFilename
        rq = urllib2.Request(schemaurl)
        j = json.loads(urllib2.urlopen(rq).read())
        schemaID = j["data"][0]["_id"]
        # curate-insert rest call
        with open(jobDir + "/xml/" + ID + ".xml", "r") as f:
            content = f.read()
        curate_insert_url = restbase + '/nmr/curate'
        curate_data = {
            "title": ID + ".xml",
            "schemaID": schemaID,
            "curatedDataState": "EditedNotValid",
            "content": content
        }
        rq = urllib2.Request(curate_insert_url)
        # logging.info('request created using curate_insert_url')
        rq.add_header('Content-Type','application/json')
        r = urllib2.urlopen(rq, json.dumps(curate_data))
        # logging.info('curate insert request posted: ' + str(r.getcode()))
    except:
        messages.append('exception occurred during curate-insert')
        messages.append('exception: ' + str(sys.exc_info()[0]))
    if len(messages) > 0:
        return ('failure', messages)
    # pass all the checks
    return ('success', messages)