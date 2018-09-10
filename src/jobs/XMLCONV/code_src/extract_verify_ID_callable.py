## Excel worksheet ID extraction script
## By Bingyin Hu 05/25/2018

import xlrd
import sys
from doiretriever import mainDOIsoupFirst
from customized_compiler_callable import sortSequence
import pickle
import xml.etree.ElementTree as ET
import dicttoxml
import collections
import copy
import datetime

# a helper method to find a blurry match regardless of # signs between two
# strings, testant is the standard expression
def match(testee, testant):
    if (testant.lower() == testee.lower()):
        return True
    elif (testant.lower() == testee.lower().split("#")[0].strip()):
        return True
    return False

# the method to verify ID
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
def extractID(xlsxName, myXSDtree, jobDir, code_srcDir):
    # open xlsx
    # xlrd is the library used to read xlsx file
    # https://secure.simplistix.co.uk/svn/xlrd/trunk/xlrd/doc/xlrd.html?p=4966
    xlfile = xlrd.open_workbook(xlsxName)
    # find the sheet with ID
    sheet_sample = '' # init
    sheets = xlfile.sheets()
    for sheet in sheets:
        # check the header of the sheet to determine what it has inside
        if (sheet.row_values(0)[0].strip().lower() == "sample info"):
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
    for row in xrange(sheet_sample.nrows):
        if match(sheet_sample.row_values(row)[0], 'Sample ID'):
            ID_raw = str(sheet_sample.row_values(row)[1])
            # if no ID is entered in the cell
            if len(ID_raw.strip()) == 0:
                message += '[Excel Error] Excel template value error: Sample ID is not entered in the uploaded Excel template.\n'
        if match(sheet_sample.row_values(row)[0], 'Citation Type'):
            if sheet_sample.row_values(row)[1] == 'lab-generated':
                lab = True
    if lab:
        if message != '':
            # write the message in jobDir/error_message.txt
            with open(jobDir + '/error_message.txt', 'a') as fid:
                fid.write(message)
        else:
            # write the ID in jobDir/ID.txt
            with open(jobDir + '/ID.txt', 'w') as fid:
                fid.write(ID_raw.strip())
        return
    # otherwise, find and save the ID in jobDir/ID.txt
    for row in xrange(sheet_sample.nrows):
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
            DOI = str(sheet_sample.row_values(row)[1])
    # if no error detected
    if message == '':
        # call localDOI here
        localdoiDict = localDOI(DOI, myXSDtree, code_srcDir)
        # if doi is not valid
        if localdoiDict is None:
            with open(jobDir + '/error_message.txt', 'a') as fid:
                fid.write('[DOI Error] Please check the reported DOI, it seems that DOI does not exist.\n')
            return
        # special case, special issue made-up DOI, format: ma-SI-FirstName-LastName
        if 'ma-SI' in DOI:
            LastName = DOI.split('-')[-1]
            CurrentYear = str(datetime.datetime.now().year)
            newID = '_'.join([str(localdoiDict['paperID']), ID_raw, LastName, CurrentYear])
        else:
        # generate ID here
            newID = generateID(localdoiDict, ID_raw)
        # write the ID in jobDir/ID.txt
        with open(jobDir + '/ID.txt', 'w') as fid:
            fid.write(newID)
    else:
        # write the message in jobDir/error_message.txt
        with open(jobDir + '/error_message.txt', 'a') as fid:
            fid.write(message)
    return


# check local dict for doi info
def localDOI(DOI, myXSDtree, code_srcDir):
    with open(code_srcDir + '/doi.pkl','rb') as f:
        alldoiDict = pickle.load(f)
        rollback = copy.deepcopy(alldoiDict)
    if DOI not in alldoiDict:
        # assign it 'nextPID', update 'nextPID', save it into alldoiDict, update
        # doi.pkl, fetching the metadata is slow, so we need to make sure the
        # paperID is updated in the doi.pkl first to avoid collision.
        PID = 'L' + str(alldoiDict['nextPID'])
        alldoiDict['nextPID'] += 1
        alldoiDict[DOI] = {'paperID':PID}
        with open(code_srcDir + '/doi.pkl', 'wb') as f:
            pickle.dump(alldoiDict, f)
        # special case, special issue madeup DOI
        if 'ma-SI' in DOI:
            return alldoiDict[DOI]
        # now fetch the metadata using doi-crawler and save to alldoiDict, doi.pkl
        crawlerDict = mainDOIsoupFirst(DOI, code_srcDir)
        # if doi is not valid, mainDOIsoupFirst() returns {}
        if len(crawlerDict) == 0:
            with open(code_srcDir + '/doi.pkl', 'wb') as f:
                pickle.dump(rollback, f)
            return None
        # transfer the newdoiDict to an xml element
        tree = dict2element(crawlerDict, myXSDtree) # an xml element
        citation = tree.find('.//Citation')
        alldoiDict[DOI]['metadata'] = citation
        # update the doi.pkl for the metadata field
        with open(code_srcDir + '/doi.pkl', 'wb') as f:
            pickle.dump(alldoiDict, f)
        return alldoiDict[DOI]
    else:
        return alldoiDict[DOI]

# generate ID with format PID_SID_LastName_PubYear for users with DOI
def generateID(doiDict, SID):
    PID = doiDict['paperID']
    LastName = 'LastName'
    Name = doiDict['metadata'].find('.//Author')
    if Name is not None:
        LastName = Name.text.split(',')[0]
    PubYear = 'PubYear'
    PubYearRaw = doiDict['metadata'].find('.//PublicationYear')
    if PubYearRaw is not None:
        PubYear = PubYearRaw.text
    return '_'.join([str(PID), SID, LastName, PubYear])

# convert DOI crawler dict into an xml element
def dict2element(crawlerDict, myXSDtree):
    # init
    CommonFields = []
    Journal = []
    Citation = collections.OrderedDict()
    CitationType = collections.OrderedDict()
    output = collections.OrderedDict()
    # port dict infos into lists
    for key in crawlerDict:
        if key == "ISSN" or key == "Issue":
            if len(crawlerDict[key]) > 0:
                Journal.append({key: crawlerDict[key][0]})
        elif key == "Author" or key == "Keyword":
            if len(crawlerDict[key]) > 0:
                for value in crawlerDict[key]:
                    CommonFields.append({key: value})
        elif key == "Institution":
            if len(crawlerDict[key]) > 0:
                CommonFields.append({u"Location": crawlerDict[key][0]})
        else:
            if len(crawlerDict[key]) > 0:
                CommonFields.append({key: crawlerDict[key][0]})
    # sort sequence
    CommonFields = sortSequence(CommonFields, 'CommonFields', myXSDtree)
    Journal = sortSequence(Journal, 'Journal', myXSDtree)
    # save to a dict
    if len(CommonFields) > 0:
        Citation[u'CommonFields'] = CommonFields
    if len(Journal) > 0:
        CitationType = collections.OrderedDict([(u'Journal',Journal)])
    if len(CitationType) > 0:
        Citation[u'CitationType'] = CitationType
    if len(Citation) > 0:
        output = collections.OrderedDict([(u'Citation', Citation)])
    # convert to an xml element
    assert (len(output) > 0)
    doi_xml = dicttoxml.dicttoxml(output,attr_type=False)
    doi_xml = doi_xml.replace('<item>','').replace('</item>','')
    tree = ET.ElementTree(ET.fromstring(doi_xml))
    return tree

def runEVI(jobDir, code_srcDir, xsdDir, templateName):
    myXSDtree = ET.parse(xsdDir)
    xlsxName = jobDir + '/' + templateName
    extractID(xlsxName, myXSDtree, jobDir, code_srcDir)