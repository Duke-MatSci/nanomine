## Excel worksheet ID extraction script
## By Bingyin Hu 05/25/2018

import xlrd
import sys
from doiretriever import mainDOIsoupFirst
import datetime
import json
import urllib2

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
def extractID(xlsxName, jobDir, code_srcDir, restbase, user):
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
        # call restDOI here
        response, message = restDOI(DOI, code_srcDir, restbase, sheet_sample, user)
        # if doi is not valid
        if response is None:
            with open(jobDir + '/error_message.txt', 'a') as fid:
                fid.write(message)
            return
        # special case, special issue made-up DOI, format: ma-SI-FirstName-LastName
        SI_flag = False
        if 'ma-SI' in DOI:
            SI_flag = True
        # generate ID here
        newID = generateID(response, ID_raw, SI_flag)
        # write the ID in jobDir/ID.txt
        with open(jobDir + '/ID.txt', 'w') as fid:
            fid.write(newID)
    else:
        # write the message in jobDir/error_message.txt
        with open(jobDir + '/error_message.txt', 'a') as fid:
            fid.write(message)
    return


# make rest call for doi info
def restDOI(DOI, code_srcDir, restbase, sheet_sample, user):
    message = ''
    exist = False
    response = None
    # check existence
    try:
        dsurl = restbase + '/nmr/dataset?doi='+DOI
        rq = urllib2.Request(dsurl)
        j = json.loads(urllib2.urlopen(rq).read())
        if len(j["data"]) > 0:
            exist = True
            response = j["data"][0]
    except:
        message += 'exception occurred during dataset GET by doi\n'
        message += 'exception: ' + str(sys.exc_info()[0]) + '\n'
    if message != '':
        return (None, message)
    # if doi doesn't exist, ds-create
    if not exist:
        # special case, special issue madeup DOI
        if 'ma-SI' in DOI:
            # generate ds_data for special issue by reading the Excel
            ds_data = specialIssueRest(sheet_sample, DOI)
        else:
            # now fetch the metadata using doi-crawler
            crawlerDict = mainDOIsoupFirst(DOI, code_srcDir)
            # check if doi valid
            if len(crawlerDict) == 0:
                message += '[DOI Error] Please check the reported DOI, it seems that DOI does not exist.\n'
                return (None, message)
            ds_data = mapToRest(crawlerDict)
        response = None # initialize response of the request
        # POST ds-create
        try:
            ds_create_url = restbase + '/nmr/dataset/create'
            rq = urllib2.Request(ds_create_url)
            # logging.info('request created using ds_create_url')
            rq.add_header('Content-Type','application/json')

            # NOTE: TODO this may not be the best place for this but, default for create is false and need to set userid ...
            dsInfo = ds_data['dsInfo']
            dsInfo['isPublic'] = 'false'
            dsInfo['ispublished'] = 'false' # no camel case on this one
            dsInfo['userid'] = user
            # NOTE END

            r = urllib2.urlopen(rq, json.dumps(ds_data))
            # logging.info('dataset create request posted: ' + str(r.getcode()))
            response = json.loads(r.read())['data']
        except:
            message += 'exception occurred during dataset-create\n'
            message += 'exception: ' + str(sys.exc_info()[0]) + '\n'
        # assemble the PID
        if response is None:
            message += 'exception occurred during getting the response of dataset-create\n'
        if message != '':
            return (None, message)
    # return response at the end, if response is not None, message will be ''
    return (response, message)
    

# generate ID with format PID_SID_LastName_PubYear for users with DOI
def generateID(response, SID, SI_flag):
    seq = response['seq']
    PID = 'L' + str(seq)
    LastName = 'LastName'
    if 'author' in response:
        Name = response['author'][0]
        LastName = Name.split(',')[0]
    PubYear = 'PubYear'
    if 'publicationYear' in response:
        PubYearRaw = response['publicationYear']
        PubYear = str(PubYearRaw)
    if SI_flag: # special issue uses current year
        PubYear = str(datetime.datetime.now().year)
    return '_'.join([PID, SID, LastName, PubYear])


# a helper method to map crawlerDict to rest data format
def mapToRest(crawlerDict):
    restDict = {}
    # citationType
    if 'CitationType' in crawlerDict:
        restDict['citationType'] = crawlerDict['CitationType'][0]
    # publication
    if 'Publication' in crawlerDict:
        restDict['publication'] = crawlerDict['Publication'][0]
    # title
    if 'Title' in crawlerDict:
        restDict['title'] = crawlerDict['Title'][0]
    # author
    if 'Author' in crawlerDict:
        restDict['author'] = crawlerDict['Author']
    # keyword
    if 'Keyword' in crawlerDict:
        restDict['keyword'] = crawlerDict['Keyword']
    # publisher
    if 'Publisher' in crawlerDict:
        restDict['publisher'] = crawlerDict['Publisher'][0]
    # publicationYear
    if 'PublicationYear' in crawlerDict:
        restDict['publicationYear'] = crawlerDict['PublicationYear'][0]
    # doi
    if 'DOI' in crawlerDict:
        restDict['doi'] = crawlerDict['DOI'][0]
    # volume
    if 'Volume' in crawlerDict:
        restDict['volume'] = crawlerDict['Volume'][0]
    # url
    if 'URL' in crawlerDict:
        restDict['url'] = crawlerDict['URL'][0]
    # language
    if 'Language' in crawlerDict:
        restDict['language'] = crawlerDict['Language'][0]
    # location
    if 'Institution' in crawlerDict:
        restDict['location'] = crawlerDict['Institution'][0]
    # dateOfCitation
    if 'DateOfCitation' in crawlerDict:
        restDict['dateOfCitation'] = crawlerDict['DateOfCitation'][0]
    # issn
    if 'ISSN' in crawlerDict:
        restDict['issn'] = crawlerDict['ISSN'][0]
    # issue
    if 'Issue' in crawlerDict:
        restDict['issue'] = crawlerDict['Issue'][0]
    # final formatting
    restDict = {'dsInfo': restDict}
    return restDict

# a helper method to read the Sample Info sheet and generate ds_data for REST
def specialIssueRest(sheet, DOI):
    restDict = {'doi':DOI}
    authors = [] # a list for author
    keywords = [] # a list for keyword
    for row in xrange(sheet.nrows):
        # publication
        if match(sheet.row_values(row)[0], 'Publication'):
            publication = str(sheet.row_values(row)[1])
            if len(publication.strip()) > 0:
                restDict['publication'] = publication.strip()
        # title
        if match(sheet.row_values(row)[0], 'Title'):
            title = str(sheet.row_values(row)[1])
            if len(title.strip()) > 0:
                restDict['title'] = title.strip()
        # author
        if match(sheet.row_values(row)[0], 'Author'):
            author = str(sheet.row_values(row)[1])
            if len(author.strip()) > 0:
                if ',' not in author:
                    fn = ' '.join(author.split()[:-1])
                    ln = author.split()[-1]
                    author = ln + ', ' + fn
                authors.append(author.strip())
        # keyword
        if match(sheet.row_values(row)[0], 'Keyword'):
            keyword = str(sheet.row_values(row)[1])
            if len(keyword.strip()) > 0:
                keywords.append(keyword.strip())
        # publicationYear
        if match(sheet.row_values(row)[0], 'Publication Year'):
            publicationYear = str(sheet.row_values(row)[1])
            if len(publicationYear.strip()) > 0:
                restDict['publicationYear'] = publicationYear.strip()
        # volume
        if match(sheet.row_values(row)[0], 'Volume'):
            volume = str(sheet.row_values(row)[1])
            if len(volume.strip()) > 0:
                restDict['volume'] = volume.strip()
        # issue
        if match(sheet.row_values(row)[0], 'Issue'):
            issue = str(sheet.row_values(row)[1])
            if len(issue.strip()) > 0:
                restDict['issue'] = issue.strip()
        # url
        if match(sheet.row_values(row)[0], 'URL'):
            url = str(sheet.row_values(row)[1])
            if len(url.strip()) > 0:
                restDict['url'] = url.strip()
        # language
        if match(sheet.row_values(row)[0], 'Language'):
            language = str(sheet.row_values(row)[1])
            if len(language.strip()) > 0:
                restDict['language'] = language.strip()
        # location
        if match(sheet.row_values(row)[0], 'Location'):
            location = str(sheet.row_values(row)[1])
            if len(location.strip()) > 0:
                restDict['location'] = location.strip()
        # dateOfCitation
        if match(sheet.row_values(row)[0], 'Date of citation'):
            dateOfCitation = str(sheet.row_values(row)[1])
            if len(dateOfCitation.strip()) > 0:
                restDict['dateOfCitation'] = dateOfCitation.strip()
    # EOF, check authors and keywords
    if len(authors) > 0:
        restDict['author'] = authors
    if len(keywords) > 0:
        restDict['keyword'] = keywords
    # final formatting
    restDict = {'dsInfo': restDict}
    return restDict

def runEVI(jobDir, code_srcDir, templateName, restbase, user):
    xlsxName = jobDir + '/' + templateName
    extractID(xlsxName, jobDir, code_srcDir, restbase, user)
