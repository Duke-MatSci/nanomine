## Excel worksheet ID extraction script
## By Bingyin Hu 05/25/2018

import xlrd
import sys
import os
from doiretriever import mainDOIsoupFirst
import datetime
import json
import urllib.request
from nm.common import *
from nm.common.nm_rest import nm_rest
import ssl
import traceback
from slugify import slugify

# a helper method to find a blurry match regardless of # signs between two
# strings, testant is the standard expression
def match(testee, testant):
    if (testant.lower() == testee.lower()):
        return True
    elif (testant.lower() == testee.lower().split("#")[0].strip()):
        return True
    return False


# the method to verify ID (TODO update this fn with re)
def verifyID(ID_raw):
    message = '' # init
    SID = ID_raw
    if SID[0].isalpha():
        # SID starts with the wrong alphabet
        if SID[0] != 'S':
            message += '[SID Error] Sample ID format error: SID must start with "S" case-sensitive. Current upload starts with "%s". Example: "S7".\n' % (SID[0])
        # SID length
        if len(SID) < 2:
            message += '[SID Error] Sample ID format error: SID must have at least a length of 2. Current upload has a length of "%s". Example: "S7".\n' % (len(SID))
        # SID ends with non-digits
        elif not SID[1:].isdigit():
            message += '[SID Error] Sample ID format error: SID must end with numbers. Current upload ends with "%s". Example: "S7".\n' % (SID[1:])
    else:
        # SID starts with non-alphabet
        message += '[SID Error] Sample ID format error: SID must start with "S". Current upload is missing the alphabet. Example: "S7".\n'
    return message


# the method to extract ID
def extractID(xlsxName, jobDir, code_srcDir, restbase, user, runCtx):
    datasetId = runCtx['datasetId']
    # open xlsx
    # xlrd is the library used to read xlsx file
    # https://secure.simplistix.co.uk/svn/xlrd/trunk/xlrd/doc/xlrd.html?p=4966
    xlfile = xlrd.open_workbook(xlsxName)
    # find the sheet with ID
    sheet_sample = '' # init
    sheets = xlfile.sheets()
    for sheet in sheets:
        # check the header of the sheet to determine what it has inside
        if (sheet.nrows > 0 and sheet.row_values(0)[0].strip().lower() == "sample info"):
            sheet_sample = sheet
    # if the sheet with ID is not found, write error message in jobDir/ID.txt
    message = ''
    if sheet_sample == '':
        message += '[Excel Error] Excel template format error: Sample_Info sheet not found.\n'
        with open(jobDir + '/error_message.txt', 'a') as fid:
            fid.write(message)
        return
    # special case for experimental data
    lab = False
    # find and save the ID in jobDir/ID.txt
    for row in range(sheet_sample.nrows):
        # ID
        if match(sheet_sample.row_values(row)[0], 'Sample ID'):
            ID_raw = str(sheet_sample.row_values(row)[1])
            # if no ID is entered in the cell
            if len(ID_raw.strip()) == 0:
                message += '[Excel Error] Excel template value error: Sample ID is not entered in the uploaded Excel template.\n'
            # else verify the entered ID
            else:
                message += verifyID(ID_raw)
        # DOI
        if match(sheet_sample.row_values(row)[0], 'DOI'):
            DOI = str(sheet_sample.row_values(row)[1]).strip()
        # related_DOI, if DOI is not provided, check related_DOI
        if match(sheet_sample.row_values(row)[0], 'Related DOI') and len(DOI) == 0:
            DOI = str(sheet_sample.row_values(row)[1]).strip()
        # a flag for in-house data
        if match(sheet_sample.row_values(row)[0], 'Citation Type'):
            if sheet_sample.row_values(row)[1] == 'lab-generated':
                lab = True
    # if no error detected
    if message == '':
        # call restDOI here
        dsInfo, message = restDOI(DOI, code_srcDir, restbase, sheet_sample, user, runCtx, lab)
        # if doi is not valid
        if dsInfo is None:
            with open(jobDir + '/error_message.txt', 'a') as fid:
                fid.write(message)
            return
        # # special case, special issue made-up DOI, format: ma-SI-FirstName-LastName (no longer needed)
        # SI_flag = False
        # if 'ma-SI' in DOI:
        #     SI_flag = True
        # newID = generateID(dsInfo, ID_raw, SI_flag)
        
        # special case, in-house lab generated data
        # generate ID here
        newID = generateID(dsInfo, ID_raw, lab)
        # write the ID in jobDir/ID.txt
        with open(jobDir + '/ID.txt', 'w') as fid:
            fid.write(newID)
    else:
        # write the message in jobDir/error_message.txt
        with open(jobDir + '/error_message.txt', 'a') as fid:
            fid.write(message)
    return (dsInfo, message)


# make rest call for doi info
def restDOI(DOI, code_srcDir, restbase, sheet_sample, user, runCtx, lab) :
    message = ''
    new_dataset = False
    response = None

# check existence
    try:
        # dsurl = restbase + '/nmr/dataset?doi='+DOI
        dsurl = restbase + '/nmr/dataset?id=' + runCtx['datasetId']
        rq = urllib.request.Request(dsurl)
        # j = json.loads(urllib.request.urlopen(rq, context=ssl._create_unverified_context()).read().decode('utf-8'))
        nmCurate = nm_rest(logging, runCtx['sysToken'], runCtx['curateApiToken'], runCtx['curateRefreshToken'], rq)
        #j = json.loads(nmCurate.urlopen(None).read().encode("utf8")) # no data for GET request
        rv = nmCurate.urlopen(None)
        j = json.loads(rv.read().decode('utf8')) # no data for GET request
        if len(j["data"]) > 0:
            if j["data"][0]['doi'] == runCtx['nm_dataset_initial_doi']:
              new_dataset = True
            response = j["data"][0]
        else:
          message += 'Expected to find datasetId: ' + runCtx['datasetId'] + ', but no data found.'
          logging.error(message)
    except:
        message += 'exception occurred during dataset GET by datasetId: ' + runCtx['datasetId'] + '\n'
        # message += 'exception occurred during dataset GET by doi\n'
        message += 'exception: ' + str(traceback.format_exc()) + '\n'
        logging.error('exception: '  + str(traceback.format_exc()))

    if message != '':
        return (None, message)
    # if doi doesn't exist, ds-create

    ## NOTE: should not create datasets anymore. The datasetId in the job_parameters should already exist
    ## However, initially, the dataset is mostly empty, so the data must still be set up
    dsInfo = response
    if new_dataset:
        # special case, lab generated data
        if lab and len(DOI) == 0:
            logging.info('DOI from spreadsheet: ' + DOI + ' dsInfo: ' + json.dumps(dsInfo))
            DOI = 'unpublished-' + DOI
            dsInfo['doi'] = DOI
            # generate ds_data for special issue by reading the Excel
            dsInfo = specialIssueRest(sheet_sample, dsInfo)
        else: # DOI from spreadsheet is standard DOI
            # now fetch the metadata using doi-crawler
            crawlerDict = mainDOIsoupFirst(DOI, code_srcDir)
            # check if doi valid
            if len(crawlerDict) == 0:
                message += '[DOI Error] Please check the reported DOI, it seems that DOI does not exist.\n'
                return (None, message)
            dsInfo = mapToRest(dsInfo, crawlerDict)['dsUpdate']
    # return response at the end, if response is not None, message will be ''
    return (dsInfo, message)


# generate ID with format PID_SID_LastName_PubYear for users with DOI
# def generateID(response, SID, SI_flag):
def generateID(response, SID, lab):
    logging.debug('Dataset Information: ' + str(response))
    seq = response['seq']
    if lab:
        PID = 'E' + str(seq)
    else:
        PID = 'L' + str(seq)
    LastName = 'LastName'
    if 'author' in response and len(response['author']) > 0:
        Name = response['author'][0]
        LastName = Name.split(',')[0]

    PubYear = 'PubYear'
    if 'publicationYear' in response:
        PubYearRaw = response['publicationYear']
        PubYear = str(PubYearRaw)
    elif lab: # lab data uses current year if no related DOI provided
        PubYear = str(datetime.datetime.now().year)
    else:
        PubYear = 'unknownYear'
    return '_'.join([PID, SID, slugify(LastName), PubYear])


# a helper method to map crawlerDict to rest data format
def mapToRest(restDict, crawlerDict):
    # citationType
    if 'CitationType' in crawlerDict and len(crawlerDict['CitationType']) > 0:
        restDict['citationType'] = crawlerDict['CitationType'][0]
    # publication
    if 'Publication' in crawlerDict and len(crawlerDict['Publication']) > 0:
        restDict['publication'] = crawlerDict['Publication'][0]
    # title
    if 'Title' in crawlerDict and len(crawlerDict['Title']) > 0:
        restDict['title'] = crawlerDict['Title'][0]
    # author
    if 'Author' in crawlerDict and len(crawlerDict['Author']) > 0:
        restDict['author'] = crawlerDict['Author']
    # keyword
    if 'Keyword' in crawlerDict and len(crawlerDict['Keyword']) > 0:
        restDict['keyword'] = crawlerDict['Keyword']
    # publisher
    if 'Publisher' in crawlerDict and len(crawlerDict['Publisher']) > 0:
        restDict['publisher'] = crawlerDict['Publisher'][0]
    # publicationYear
    if 'PublicationYear' in crawlerDict and len(crawlerDict['PublicationYear']) > 0:
        restDict['publicationYear'] = crawlerDict['PublicationYear'][0]
    # doi
    if 'DOI' in crawlerDict and len(crawlerDict['DOI']) > 0:
        restDict['doi'] = crawlerDict['DOI'][0]
    # volume
    if 'Volume' in crawlerDict and len(crawlerDict['Volume']) > 0:
        restDict['volume'] = crawlerDict['Volume'][0]
    # url
    if 'URL' in crawlerDict and len(crawlerDict['URL']) > 0:
        restDict['url'] = crawlerDict['URL'][0]
    # language
    if 'Language' in crawlerDict and len(crawlerDict['Language']) > 0:
        restDict['language'] = crawlerDict['Language'][0]
    # location
    if 'Institution' in crawlerDict and len(crawlerDict['Institution']) > 0:
        restDict['location'] = crawlerDict['Institution'][0]
    # dateOfCitation
    if 'DateOfCitation' in crawlerDict and len(crawlerDict['DateOfCitation']) > 0:
        restDict['dateOfCitation'] = crawlerDict['DateOfCitation'][0]
    # issn
    if 'ISSN' in crawlerDict and len(crawlerDict['ISSN']) > 0:
        restDict['issn'] = crawlerDict['ISSN'][0]
    # issue
    if 'Issue' in crawlerDict and len(crawlerDict['Issue']) > 0:
        restDict['issue'] = crawlerDict['Issue'][0]
    # final formatting
    restDict = {'dsUpdate': restDict}
    return restDict

# a helper method to read the Sample Info sheet and generate ds_data for REST
def specialIssueRest(sheet, dsInfo):
    # already set by caller - restDict = {'doi':DOI}
    # Already init'd in dsInfo - authors = [] # a list for author
    # Already init'd in dsInfo - keywords = [] # a list for keyword
    for row in range(sheet.nrows):
        # publication
        if match(sheet.row_values(row)[0], 'Publication') :
            publication = str(sheet.row_values(row)[1])
            if len(publication.strip()) > 0:
                dsInfo['publication'] = publication.strip()
        # title
        if match(sheet.row_values(row)[0], 'Title') :
            title = str(sheet.row_values(row)[1])
            if len(title.strip()) > 0:
                dsInfo['title'] = title.strip()
        # author
        if match(sheet.row_values(row)[0], 'Author'):
            author = str(sheet.row_values(row)[1])
            if len(author.strip()) > 0:
                if ',' not in author:
                    fn = ' '.join(author.split()[:-1])
                    ln = author.split()[-1]
                    author = ln + ', ' + fn
                dsInfo['author'].append(author.strip())
        # keyword
        if match(sheet.row_values(row)[0], 'Keyword'):
            keyword = str(sheet.row_values(row)[1])
            if len(keyword.strip()) > 0:
                dsInfo['keyword'].append(keyword.strip())
        # keyword
        if match(sheet.row_values(row)[0], 'Related DOI'):
          relatedDOI = str(sheet.row_values(row)[1])
          if len(relatedDOI.strip()) > 0:
            dsInfo['relatedDoi'].append(relatedDOI.strip())
        # publicationYear
        if match(sheet.row_values(row)[0], 'Publication Year'):
            publicationYear = str(sheet.row_values(row)[1])
            if len(publicationYear.strip()) > 0:
                dsInfo['publicationYear'] = publicationYear[:publicationYear.find('.')].strip()
        # volume
        if match(sheet.row_values(row)[0], 'Volume'):
            volume = str(sheet.row_values(row)[1])
            if len(volume.strip()) > 0:
                dsInfo['volume'] = volume.strip()
        # issue
        if match(sheet.row_values(row)[0], 'Issue'):
            issue = str(sheet.row_values(row)[1])
            if len(issue.strip()) > 0:
                dsInfo['issue'] = issue.strip()
        # url
        if match(sheet.row_values(row)[0], 'URL'):
            url = str(sheet.row_values(row)[1])
            if len(url.strip()) > 0:
                dsInfo['url'] = url.strip()
        # language
        if match(sheet.row_values(row)[0], 'Language'):
            language = str(sheet.row_values(row)[1])
            if len(language.strip()) > 0:
                dsInfo['language'] = language.strip()
        # location
        if match(sheet.row_values(row)[0], 'Location'):
            location = str(sheet.row_values(row)[1])
            if len(location.strip()) > 0:
                dsInfo['location'] = location.strip()
        # dateOfCitation
        if match(sheet.row_values(row)[0], 'Date of citation'):
            dateOfCitation = str(sheet.row_values(row)[1])
            if len(dateOfCitation.strip()) > 0:
                dsInfo['dateOfCitation'] = dateOfCitation.strip()
    # EOF, check authors and keywords
    #if len(authors) > 0:
    #    restDict['author'] = authors
    #if len(keywords) > 0:
    #    restDict['keyword'] = keywords
    # final formatting
    # restDict = {'dsInfo': restDict}
    return dsInfo

def runEVI(jobDir, code_srcDir, templateName, restbase, user, runCtx):
    xlsxName = jobDir + '/' + templateName
    return extractID(xlsxName, jobDir, code_srcDir, restbase, user, runCtx)
