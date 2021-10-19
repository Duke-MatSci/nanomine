## Excel worksheet - xml compiler with automatic features supporting customized
## Excel worksheet template.
## By Bingyin Hu, Anqi Lin 04/16/2018
## Updated for JobMgr() on 09/07/2018

# -------------------------------------------- file os and other general lib
import glob, os                           # Python standard library
import sys                                # Python standard library
import copy                               # Python standard library
from time import gmtime, strftime         # Python standard library
import datetime
import ssl
import traceback

# -------------------------------------------- convert .XLSX to .XML files
import xlrd
import dicttoxml
import csv

# -------------------------------------------- XML Schemas
import collections                        # Python standard library
from lxml import etree

# -------------------------------------------- XML-XSD validation tool
from xml_update_validator import runValidation

# -------------------------------------------- REST service
import urllib.request
import json
# import logging
from nm.common import *
from nm.common.nm_rest import nm_rest


## Helper Methods
# a helper method to extract data from Excel files attached with the template
# and store data into "Distribution" Type in xml schema
def read_excel_profile(filename, jobDir):
    if len(str(filename).strip()) == 0:
       return ''
    # # append file extension if user does not put one
    # if len(filename.strip('.xlsx')) == len(filename):
    #     filename += '.xlsx'
    # confirm whether the file exists
    if not os.path.exists(jobDir + '/' + filename):
        # write the message in ./error_message.txt
        with open(jobDir + '/error_message.txt', 'a') as fid:
            fid.write('[File Error] Missing file! Please include "%s" in your uploads.\n' % (filename))
            return ''
    if os.path.splitext(filename)[-1] == '.xlsx':
        # open and read data
        data_file = xlrd.open_workbook(jobDir + '/' + filename)
        data_names = data_file.sheet_names()
        data_content = data_file.sheet_by_name(data_names[0])
        # read data from excel file
        header = [{'column': data_content.row_values(0)[0]},
                  {'column': data_content.row_values(0)[1]}]
        start_row = 1
        end_row = data_content.nrows
        profile_data = []
        for i in range(start_row, end_row):
            profile_data.append({'row':({'column':data_content.row_values(i)[0]},
                                        {'column':data_content.row_values(i)[1]})})
    elif os.path.splitext(filename)[-1] == '.csv':
        # open and read data
        with open(jobDir + '/' + filename, newline='') as data_file:
            data_reader = csv.reader(data_file)
            first = True
            profile_data = []
            for row in data_reader:
                if len(row) != 2:
                    # write the message in ./error_message.txt
                    with open(jobDir + '/error_message.txt', 'a') as fid:
                        fid.write('[File Error] csv file "%s" has a row that is not occupied by exactly the first and the second column.\n' % (filename))
                        return ''
                if first:
                    header = [{'column': row[0]}, {'column': row[1]}]
                    first = False
                else:
                    profile_data.append({'row':({'column':row[0]},
                                                {'column':row[1]})})
    # return the package
    return {'headers': header, 'rows': profile_data}

# a helper method to standardize the axis label and axis unit from headers
# handle left for further development (!!!!!!!!) input header is a string
def axisStd(header):
    header = header.strip()
    # replace synonyms
    # breakdown labels and units
        # scan for () [] , /
    puncs = {'(':-1, '[':-1, ',':-1, '/':-1} # init -1 indicates doesn't exist
    for punc in puncs:
        puncs[punc] = header.find(punc)
        if header.find(punc) == -1:
            puncs[punc] = len(header)
        # find the punctuation that appears first
    firstPunc = sorted(puncs, key = puncs.get)[0]
        # if none of the puncs appears, then we have a label and a unit (dimensionless)
    # special case, end with '%' (e.g. strain)
    if header[-1] != '%':
        if puncs[firstPunc] == len(header):
            return (header, 'dimensionless')
        label = header[0:puncs[firstPunc]].strip()
        unit = header[puncs[firstPunc]+1:].strip()
    elif ' ' in header: # unit separated by white space
        label = header[:header.rfind(' ')].strip()
        unit = header[header.rfind(' ')+1:].strip()
    else: # % unit not separated by white space
        label = header[:-1]
        unit = header[-1]
    # standardize label
        # make every leading letter in the label capital
    if len(label) == 1:
        label = label.upper()
    else:
        # if starts with uppercase letters, example: CNF content(phr)
        if label.split(' ')[0].isupper() and len(label.split(' ')) > 1:
            label = label.split(' ')[0] + label[label.find(' '):].lower()
        else:
            label = label[0].upper() + label[1:].lower()
        # other standardize

    # standardize unit
        # remove the other half punctuation if it exists
    if firstPunc == '(':
        unit = unit.strip(')')
    elif firstPunc == '[':
        unit = unit.strip(']')
        # other standardize
    if len(unit) == 0:
        unit = 'dimensionless'

    return (label, unit)

# a helper method to extract the axis label and axis unit from headers
def axisInfo(datadict):
    if type(datadict) != dict and type(datadict) != collections.OrderedDict:
        return ''
    if 'headers' not in datadict.keys():
        return ''
    # x-axis
    header_x = datadict['headers'][0]['column']
    (label_x, unit_x) = axisStd(header_x)
    # y-axis
    header_y = datadict['headers'][1]['column']
    (label_y, unit_y) = axisStd(header_y)
    # output a dict AxisLabel
    AxisLabel = collections.OrderedDict()
    AxisLabel['xName'] = label_x
    AxisLabel['xUnit'] = unit_x
    AxisLabel['yName'] = label_y
    AxisLabel['yUnit'] = unit_y
    return AxisLabel

# a helper method to find a blurry match regardless of # signs between two
# strings, testant is the standard expression
def match(testee, testant):
    if type(testee) != str or type(testant) != str:
        return False
    if (testant.lower() == testee.lower()):
        return True
    elif (testant.lower() == testee.lower().split("#")[0].strip()):
        return True
    return False

# a helper method to find a blurry match regardless of # signs between a string
# an a list of strings, basically call match() for all strings in the list.
# if we find a match, then return the matched string in myList, otherwise return
# False
def matchList(testee, myList):
    for testant in myList:
        if match(testee, testant):
            return testant
    return False

# a helper method to sort a list of dicts according to their keys, the sequence
# is extracted from the xsd file
def sortSequence(myList, myClassName, myXSDtree):
    # don't sort if input is not a list
    if type(myList) != list:
        return myList
    CTmap = {'Distribution':'Distribution',# small_list_data;'Distribution'
             'CommonFields':'CitationDetailType',# CommonFields;'CommonFields'
             'Journal':'CitationJournalType',# Journal;'Journal'
             'LabGenerated':'LabGeneratedType',# LabGenerated;'LabGenerated'
             'MATERIALS':'MaterialsType', # temp_list;'MATERIALS'
             'Matrix':'MatrixType',# temp;prevTemp
             'MatrixComponent':'PolymerType',# MatrixComponent;'MatrixComponent'
             'Filler':'FillerType',# temp;prevTemp
             'FillerComponent':'ParticleType',# FillerComponent;'FillerComponent'
             'Particle Surface Treatment (PST)':'ParticleSurfaceModificationType',# PST;'Particle Surface Treatment (PST)'
             'PROCESSING':'ProcessingCategoryType',# Process_list;'PROCESSING'
             'Additive':'ProcessingParameterAdditive',# temp;prevTemp
             'Solvent':'SolventType',# temp;prevTemp
             'Mixing':'ProcessingParameterMixing',# temp;prevTemp
             'Extrusion':'ExtrusionType',# temp;prevTemp not necessary
             'SingleScrewExtrusion':'SingleScrewExtrusionExtruderType',# Extrusion;prevExtrsHeader
             'TwinScrewExtrusion':'TwinScrewExtrusionExtruderType',# Extrusion;prevExtrsHeader
             'ExtrusionHeatingZone':'HeatingZoneType',# ExtrsHZ;'ExtrusionHeatingZone'
             'ExtrusionOutput':'ExtruderOutput',# ExtrsOP;'ExtrusionOutput'
             'Heating':'GeneralConditionsType',# temp;prevTemp
             'Cooling':'GeneralConditionsType',# temp;prevTemp
             'Drying/Evaporation':'GeneralConditionsType',# temp;prevTemp
             'Molding':'MoldingDescriptionType',# temp;prevTemp
             'MoldingInfo':'GeneralConditionsType',# MoldingInfo;'MoldingInfo'
             'Curing':'GeneralConditionsType',# temp;prevTemp
             'CHARACTERIZATION':'MeasurementMethodsType',# temp_list;'CHARACTERIZATION'
             'Transmission electron microscopy':'SEMTEMtype',# temp;prevTemp
             'Scanning electron microscopy':'SEMTEMtype',# temp;prevTemp
             'Dynamic mechanical analysis':'GeneralEquipmentType',# temp;prevTemp
             'Dielectric and impedance spectroscopy analysis':'GeneralEquipmentType',# temp;prevTemp
             'Differential scanning calorimetry':'DSCMeasurementType',# temp;prevTemp
             'Fourier transform infrared spectroscopy':'GeneralEquipmentType',# temp;prevTemp
             'Xray diffraction and scattering':'GeneralEquipmentType',# temp;prevTemp
             'Xray photoelectron spectroscopy':'GeneralEquipmentType',# temp;prevTemp
             'Atomic force microscopy':'GeneralEquipmentType',# temp;prevTemp
             'Thermogravimetric analysis':'GeneralEquipmentType',# temp;prevTemp
             'Raman spectroscopy':'GeneralEquipmentType',# temp;prevTemp
             'Nuclear magnetic resonance':'GeneralEquipmentType',# temp;prevTemp
             'Pulsed electro acoustic':'GeneralEquipmentType',# temp;prevTemp
             'Rheometry':'RheometryType',# temp;prevTemp
             'Electrometry':'GeneralEquipmentType',# temp;prevTemp
             'Optical microscopy':'GeneralEquipmentType',# temp;prevTemp
             'PROPERTIES':'PropertiesType',# DATA_PROP;'PROPERTIES'
             'Mechanical':'MechanicalType',# temp_list;'Mechanical'
             'Tensile':'TensileType',# temp;prevTemp
             'Conditions':'TensileMeasurementMethodType',# Conditions;'Conditions'
             'Flexural':'FlexuralType',# temp;prevTemp
             'Compression':'CompressionType',# temp;prevTemp
             'Shear':'ShearType',# temp;prevTemp
             'Fracture':'FractureToughnessType',# temp;prevTemp
             'Essential work of fracture (EWF)':'EWFType',# tempFracture;prevTempFrac
             'Linear Elastic':'LinearElasticType',# tempFracture;prevTempFrac
             'Plastic Elastic':'PlasticElasticType',# tempFracture;prevTempFrac
             'Impact':'ImpactEnergyType',# temp;prevTemp
             'Hardness': 'HardnessType',# temp;prevTemp
             'Viscoelastic':'ViscoelasticType',# temp_list;'Viscoelastic'
             'Dynamic properties':'DMAType',# temp;prevTemp
             'Frequency sweep':'DMAFrequencyType',# DMA_Test;prevDMA
             'Temperature sweep':'DMATemperatureType',# DMA_Test;prevDMA
             'Strain sweep':'DMAStrainSweepTypeType',# DMA_Test;prevDMA
             'Creep':'CreepType',# temp;prevTemp
             'CompressiveVisc':'CompressiveCreepType',# temp_Creep;prevCreep
             'TensileVisc':'TensileCreepType',# temp_Creep;prevCreep
             'FlexuralVisc':'FlexuralCreepType',# temp_Creep;prevCreep
             'Electrical':'DielectricPropertiesType', # temp_list;'Electrical'
             'AC dielectric dispersion':'DielectricDispersionType', # temp;prevTemp
             'Dielectric breakdown strength':'BreakdownStrengthType', # temp;prevTemp
             'Thermal':'ThermalType', # temp_list;'Thermal'
             'Crystallinity':'CrystallizationType', # temp;prevTemp
             'Volumetric':'VolumetricType', # temp_list;'Volumetric'
             'Rheological':'RheologicalType', # temp_list;'Rheological'
             'Complex Modulus':'RheologicalPropertiesType', # temp;prevTemp
             'Viscosity':'ViscosityType', # temp;prevTemp
             'MICROSTRUCTURE':'MicrostructureDescriptorsType', # temp_list;'MICROSTRUCTURE'
             'Imagefile':'ImageFileType', # temp;prevTemp
             'Dimension':'ImageSizeType', # Dimension;'Dimension'
             'Sample experimental info':'SampleType', # temp;prevTemp
             'PolymerNanocomposite':'Root' # DATA;'PolymerNanocomposite'
             } # {myClassName:xsdComplexTypeName}
    myTypeName = CTmap[myClassName] #example: MatrixType
    myTypeTree = myXSDtree.findall(".//*[@name='" + myTypeName + "']")
    # prepare seq dict {className:index}
    index = 0
    seq = {}
    for ele in myTypeTree[0].iter('{http://www.w3.org/2001/XMLSchema}element'):
        seq[ele.get('name')] = index
        index += 1
    # sort myList by the index for each element key
    myList.sort(key=lambda x: seq[list(x.keys())[0]])
    return myList

# a helper method to check the length of a cell input
def hasLen(val):
    if (type(val) == str and len(val.strip()) > 0) or len(str(val).strip()) > 0:
        return True
    return False

# a helper method to insert a dict with {key: val} into a list
def insert(key, val, container):
    if hasLen(val):
        if (type(val) == str):
            container.append({key: val.strip()})
            return container
        else:
            container.append({key: val})
        # print 'key', key, 'PASSED!'
    return container

# a helper method to add a {key: val} pair into the input dict
def addKV(key, val, dict_in):
    if hasLen(val):
        if (type(val) == str):
            dict_in[key] = val.strip()
            return dict_in
        else:
            dict_in[key] = val
    return dict_in

# a helper method to handle a row with a description-value-unit pair, or a
# data_file-data_des pair. Uncertainty type and value are optional.
def addKVU(key, description, value, unit, unc_type, unc_value,
           data_des, data_file, dict_in, jobDir, myXSDtree):
    # first strip all the input
    if (type(value) == str):
        value = value.strip()
    if (type(unit) == str):
        unit = unit.strip()
    if (type(unc_type) == str):
        unc_type = unc_type.strip()
    if (type(description) == str):
        description = description.strip()
    if (type(data_des) == str):
        data_des = data_des.strip()
    if (type(data_file) == str):
        data_file = data_file.strip()
    # create 4 internal dicts
    small_dict = collections.OrderedDict()
    small_dict_unc = collections.OrderedDict()
    small_list_data = []
    small_dict_axis = collections.OrderedDict()
    if hasLen(description):
        small_dict['description'] = description
    if hasLen(value):
        small_dict['value'] = value
    if hasLen(unit):
        small_dict['unit'] = unit
    if hasLen(unc_type):
        small_dict_unc['type'] = unc_type
    if hasLen(unc_value):
        small_dict_unc['value'] = unc_value
    if len(small_dict_unc) > 1:# if both unc_type and unc_value present, save them
        small_dict['uncertainty'] = small_dict_unc
    if hasLen(data_file):
        if hasLen(data_des):
            small_list_data.append({'description': data_des})
        small_list_data.append({'data': read_excel_profile(data_file, jobDir)})
    if len(small_list_data) > 0:
        # read the header and extract the axis labels and units
        # 'data' dict always the last in small_list_data
        small_dict_axis = axisInfo(small_list_data[-1]['data'])
        if len(small_dict_axis) > 0:
            small_list_data.append({'AxisLabel': small_dict_axis})
        # sort small_list_data
        small_list_data = sortSequence(small_list_data, 'Distribution', myXSDtree)
        small_dict['data'] = small_list_data
    # store small_dict into dict_in
    if len(small_dict) > 0:
        dict_in[key] = small_dict
    return dict_in

# a helper method that also takes standard deviation on the top of the addKVU
# method.
def addKVSU(key, description, value, unit, unc_type, unc_value, stdDev,
            data_des, data_file, dict_in, jobDir, myXSDtree):
    # first strip all the input
    if (type(value) == str):
        value = value.strip()
    if (type(unit) == str):
        unit = unit.strip()
    if (type(unc_type) == str):
        unc_type = unc_type.strip()
    if (type(stdDev) == str):
        stdDev = stdDev.strip()
    if (type(description) == str):
        description = description.strip()
    if (type(data_des) == str):
        data_des = data_des.strip()
    if (type(data_file) == str):
        data_file = data_file.strip()
    # create 4 internal dicts
    small_dict = collections.OrderedDict()
    small_dict_unc = collections.OrderedDict()
    small_list_data = []
    small_dict_axis = collections.OrderedDict()
    if hasLen(description):
        small_dict['description'] = description
    if hasLen(value):
        small_dict['value'] = value
    if hasLen(unit):
        small_dict['unit'] = unit
    if hasLen(unc_type):
        small_dict_unc['type'] = unc_type
    if hasLen(unc_value):
        small_dict_unc['value'] = unc_value
    if len(small_dict_unc) > 1:# if both unc_type and unc_value present, save them
        small_dict['uncertainty'] = small_dict_unc
    if hasLen(stdDev):
        small_dict['standardDeviation'] = stdDev
    if hasLen(data_file):
        if hasLen(data_des):
            small_list_data.append({'description': data_des})
        small_list_data.append({'data': read_excel_profile(data_file, jobDir)})
    if len(small_list_data) > 0:
        # read the header and extract the axis labels and units
        # 'data' dict always the last in small_list_data
        small_dict_axis = axisInfo(small_list_data[-1]['data'])
        if len(small_dict_axis) > 0:
            small_list_data.append({'AxisLabel': small_dict_axis})
        # sort small_list_data
        small_list_data = sortSequence(small_list_data, 'Distribution', myXSDtree)
        small_dict['data'] = small_list_data
    # store small_dict into dict_in
    if len(small_dict) > 0:
        dict_in[key] = small_dict
    return dict_in

# a helper method to add a value to a 2-level key-subkey dictionary
def addKKV(key_1, key_2, val, dict_in):
    if hasLen(val):
        subdict = collections.OrderedDict()
        if type(val) == str:
            subdict[key_2] = val.strip()
        else:
            subdict[key_2] = val
        dict_in[key_1] = subdict
    return dict_in

# a helper method to identify which property is addressed in "Properties
# Addressed" sheets and return a list of saved properties
def whichProp(sheet, DATA_PROP, myXSDtree, jobDir):
    # Sub categories of addressed PROPERTIES
    propSet = {"mechanical", "viscoelastic", "electrical", "thermal", "volumetric",
               "rheological"}
    # Each property should only have one sheet and its corresponding helper
    # method should only be called once, create flags here for that purpose.
    (me, vi, el, th, vo, rh) = (False, False,  False,  False,  False,  False)
    for row in range(sheet.nrows):
        # scan the first column until we find a match in propSet
        if (sheet.cell_value(row, 0).strip().lower() in propSet):
            if (sheet.cell_value(row, 0).strip().lower() == "mechanical" and not me):
                DATA_PROP = sheetPropMech(sheet, DATA_PROP, myXSDtree, jobDir)
                me = True
            if (sheet.cell_value(row, 0).strip().lower() == "viscoelastic" and not vi):
                DATA_PROP = sheetPropVisc(sheet, DATA_PROP, myXSDtree, jobDir)
                vi = True
            if (sheet.cell_value(row, 0).strip().lower() == "electrical" and not el):
                DATA_PROP = sheetPropElec(sheet, DATA_PROP, myXSDtree, jobDir)
                el = True
            if (sheet.cell_value(row, 0).strip().lower() == "thermal" and not th):
                DATA_PROP = sheetPropTher(sheet, DATA_PROP, myXSDtree, jobDir)
                th = True
            if (sheet.cell_value(row, 0).strip().lower() == "volumetric" and not vo):
                DATA_PROP = sheetPropVolu(sheet, DATA_PROP, myXSDtree, jobDir)
                vo = True
            if (sheet.cell_value(row, 0).strip().lower() == "rheological" and not rh):
                DATA_PROP = sheetPropRheo(sheet, DATA_PROP, myXSDtree, jobDir)
                rh = True
    return DATA_PROP

# a helper method to add information extracted by DOI retriever into the
# CommonFields and substitute old replicate entries.
def doiAdd(doiKVPair, CommonFields):
    # doiKVPair example:
    # {'Author' : [u'Melo, M.', u'Ara\xfajo, E. B.', u'Shvartsman, V. V.', u'Shur, V. Ya.', u'Kholkin, A. L.']}
    toDel = [] # a list of index to delete in CommonFields
    for i in range(len(CommonFields)):
        # remove duplicate
        if list(CommonFields[i].keys())[0] == list(doiKVPair.keys())[0]:
            toDel.append(i)
    for j in toDel:
        del CommonFields[j]
    # write
    doiK = list(doiKVPair.keys())[0]
    doiVlist = doiKVPair[doiK]
    for doiV in doiVlist:
        doiV = doiV.replace('&amp;','and') # replace html expression '&amp;'
        # 'Institution' renamed as 'Location'
        if match(doiK, 'Institution'):
            doiK = 'Location'
        CommonFields.append({doiK: doiV})
    return CommonFields


## Sheet by sheet data extraction
# Sheet 1. Data Origin (Sample Info)
# neglecting issue for now
def sheetSampleInfo(sheet, DATA, myXSDtree, jobDir, restbase, runCtx):

    CurrentTime = strftime("%Y-%m-%d %H:%M:%S", gmtime())
    CommonFields = []
    Journal = []
    LabGenerated = []
    # ID read from ID.txt, in views.py only ID.txt exists this script will
    # be called, all ID's will have a sequence
    with open(jobDir + '/ID.txt', 'r+') as fid:
        ID = fid.read()
    # get the seq
    seq = ID.split('_')[0][1:] # get the first chunk and delete the first letter
    # GET dsInfo by seq
    response = {}
    try:
        dsurl = restbase + '/nmr/dataset?id=' + runCtx['datasetId']
        rq = urllib.request.Request(dsurl)
        nmCurate = nm_rest(logging, runCtx['sysToken'], runCtx['curateApiToken'], runCtx['curateRefreshToken'], rq)
        rv = nmCurate.urlopen(None)
        j = json.loads(rv.read().decode('utf8')) # no data for GET request
        response = j["data"][0]
    except:
        logging.error('exception occurred during dataset GET by datasetId')
        #print 'exception: ' + str(sys.exc_info()[0])
        logging.error('exception: '  + str(traceback.format_exc()))


# special case author and keyword, which are saved as list
    authorREST = 'author' in response
    keywordREST = 'keyword' in response
    if authorREST:
        for author in response['author']:
            CommonFields = insert('Author', author, CommonFields)
    if keywordREST:
        for keyword in response['keyword']:
            CommonFields = insert('Keyword', keyword, CommonFields)
    if 'issn' in response:
        Journal = insert('ISSN', response['issn'], Journal)
    # loop through the rows in the excel
    for row in range(sheet.nrows):
        # Control_ID
        if match(sheet.row_values(row)[0], 'Control sample ID'):
            control = sheet.row_values(row)[1]
            if hasLen(control):
                IDseg = ID.split('_')
                IDseg[1] = control.strip()
                assembledCtrl = '_'.join(IDseg)
                DATA.append({'Control_ID': assembledCtrl})
        elif match(sheet.row_values(row)[0], 'Your Name'):
            UploaderName = sheet.row_values(row)[1]

        elif match(sheet.row_values(row)[0], 'Your Email'):
            UploaderEmail = sheet.row_values(row)[1]

        elif match(sheet.row_values(row)[0], 'Publication Type'):
            value = sheet.row_values(row)[1]
            if 'citationType' in response:
                value = response['citationType']
            CommonFields = insert('CitationType', value, CommonFields)

        elif match(sheet.row_values(row)[0], 'Publication'):
            value = sheet.row_values(row)[1]
            if 'publication' in response:
                value = response['publication']
            CommonFields = insert('Publication', value, CommonFields)

        elif match(sheet.row_values(row)[0], 'Title'):
            value = sheet.row_values(row)[1]
            if 'title' in response:
                value = response['title']
            CommonFields = insert('Title', value, CommonFields)

        elif match(sheet.row_values(row)[0], 'Author') and not authorREST:
            CommonFields = insert('Author', sheet.row_values(row)[1], CommonFields)

        elif match(sheet.row_values(row)[0], 'Keyword') and not keywordREST:
            CommonFields = insert('Keyword', sheet.row_values(row)[1], CommonFields)

        elif match(sheet.row_values(row)[0], 'Publication Year'):
            value = sheet.row_values(row)[1]
            if 'publicationYear' in response:
                value = response['publicationYear']
            CommonFields = insert('PublicationYear', value, CommonFields)

        elif match(sheet.row_values(row)[0], 'DOI'):
            value = sheet.row_values(row)[1].strip()
            if 'doi' in response:
                value = response['doi']
            CommonFields = insert('DOI', value, CommonFields)

        elif match(sheet.row_values(row)[0], 'Volume'):
            value = sheet.row_values(row)[1]
            if 'volume' in response:
                value = response['volume']
            CommonFields = insert('Volume', value, CommonFields)

        elif match(sheet.row_values(row)[0], 'URL'):
            value = sheet.row_values(row)[1]
            if 'url' in response:
                value = response['url']
            CommonFields = insert('URL', value, CommonFields)

        elif match(sheet.row_values(row)[0], 'Language'):
            value = sheet.row_values(row)[1]
            if 'language' in response:
                value = response['language']
            CommonFields = insert('Language', value, CommonFields)

        elif match(sheet.row_values(row)[0], 'Location'):
            value = sheet.row_values(row)[1]
            if 'location' in response:
                value = response['location']
            CommonFields = insert('Location', value, CommonFields)

        elif match(sheet.row_values(row)[0], 'DateOfCitation'):
            value = sheet.row_values(row)[1]
            if 'dateOfCitation' in response:
                value = response['dateOfCitation']
            CommonFields = insert('DateOfCitation', value, CommonFields)

        elif match(sheet.row_values(row)[0], 'Issue'):
            value = sheet.row_values(row)[1]
            if 'issue' in response:
                value = response['issue']
            Journal = insert('Issue', value, Journal)
        # lab generated
        elif match(sheet.row_values(row)[0], 'Date of Sample Made'):
            if hasLen(sheet.row_values(row)[1]) and str(sheet.row_values(row)[1]).replace('.','',1).isdigit():
                timetuple = xlrd.xldate_as_tuple(sheet.row_values(row)[1], 0)
                realDate = datetime.datetime(*timetuple).strftime('%m/%d/%Y')
                LabGenerated = insert('DateOfSampleMade', realDate, LabGenerated)
        elif match(sheet.row_values(row)[0], 'Date of Data Measurement'):
            if hasLen(sheet.row_values(row)[1]) and str(sheet.row_values(row)[1]).replace('.','',1).isdigit():
                timetuple = xlrd.xldate_as_tuple(sheet.row_values(row)[1], 0)
                realDate = datetime.datetime(*timetuple).strftime('%m/%d/%Y')
                LabGenerated = insert('DateOfMeasurement', realDate, LabGenerated)
        elif match(sheet.row_values(row)[0], 'Related DOI'):
            LabGenerated = insert('relatedDOI', sheet.row_values(row)[1], LabGenerated)
    with open(jobDir + '/upload_history.txt', 'a+') as _f:
        _f.write(CurrentTime + '\t' + str(ID) + '\t' + '(' + str(UploaderName) +  ')' + '\t' + str(UploaderEmail) + '\n')
    # write ID into DATA
    DATA.append({'ID': ID})
    DATA.append({'SchemaVersion': runCtx['schemaName']})
    DATA.append({'SchemaID': runCtx['schemaId']})
    DATA.append({'DatasetID': runCtx['datasetId']})
    # sort CommonFields, Journal, and LabGenerated
    CommonFields = sortSequence(CommonFields, 'CommonFields', myXSDtree)
    Journal = sortSequence(Journal, 'Journal', myXSDtree)
    LabGenerated = sortSequence(LabGenerated, 'LabGenerated', myXSDtree)
    # group CommonFields, Journal, and LabGenerated
    DataSource = collections.OrderedDict()
    Citation = collections.OrderedDict()
    if len(CommonFields) > 0:
        Citation['CommonFields'] = CommonFields
    if len(Journal) > 0:
        Citation['CitationType'] = {'Journal':Journal}
    if len(Citation) > 0:
        DataSource['Citation'] = Citation
    if len(LabGenerated) > 0:
        DataSource['LabGenerated'] = LabGenerated
    DATA.append({'DATA_SOURCE': DataSource})
    # if len(CommonFields) > 0 and len(Journal) == 0:
    #     DATA.append({'DATA_SOURCE': {'Citation': {'CommonFields':CommonFields}}})
    # if len(CommonFields) == 0 and len(Journal) > 0: # very unlikely
    #     DATA.append({'DATA_SOURCE': {'Citation': {'CitationType': {'Journal':Journal}}}})
    # if len(CommonFields) > 0 and len(Journal) > 0:
    #     DATA.append({'DATA_SOURCE': {'Citation': collections.OrderedDict([('CommonFields', CommonFields), ('CitationType', {'Journal':Journal})])}})
    # if len(LabGenerated) > 0:
    #     DATA.append({'DATA_SOURCE': {'LabGenerated': LabGenerated}})
    return (ID, DATA)

# Sheet 2. Material Types
def sheetMatType(sheet, DATA, myXSDtree, jobDir):
    headers = {'Matrix': 'Matrix', 'Filler': 'Filler'}
    headers_PST = {'Particle Surface Treatment (PST)': 'ParticleSurfaceTreatment'}
    MatrixComponent = [] # a list for MATERIALS/Matrix/MatrixComponent
    FillerComponent = [] # a list for MATERIALS/Filler/FillerComponent
    nonSpher = collections.OrderedDict() # a list for MATERIALS/Filler/FillerComponent/NonSphericalShape
    PST = [] # a list for MATERIALS/Filler/FillerComponent/ParticleSurfaceTreatment
    temp_list = [] # the highest level list for MATERIALS
    temp = [] # always save temp if not empty when we find a match in headers
    prevTemp = '' # save the previous cleanTemp
    prevTempPST = '' # save the previous cleanTempPST
    frac = collections.OrderedDict() # for mass and volume fractions
    for row in range(sheet.nrows):
        # First deal with the ParticleSurfaceTreatment
        cleanTempPST = matchList(sheet.cell_value(row, 0), headers_PST.keys())
        if cleanTempPST:
            if len(prevTempPST) == 0: # initialize prevTemp
                prevTempPST = cleanTempPST
            # save PST
            if len(PST) > 0: # update temp if it's not empty
                # sort PST
                PST = sortSequence(PST, prevTempPST, myXSDtree)
                FillerComponent.append({headers_PST[prevTempPST]: PST})
                # initialize
                PST = []
            prevTempPST = cleanTempPST # update prevTempPST
        # Then deal with higher level headers
        cleanTemp = matchList(sheet.cell_value(row, 0), headers.keys())
        if cleanTemp:
            if len(prevTemp) == 0: # initialize prevTemp
                prevTemp = cleanTemp
            # special case NonSphericalShape, need to save the dict from bottom up
            # into FillerComponent
            if len(nonSpher) > 0:
                FillerComponent.append({'NonSphericalShape': nonSpher})
                # initialize
                nonSpher = collections.OrderedDict() # initialize
            # special case ParticleSurfaceTreatment, need to save the list from
            # bottom up into FillerComponent
            if len(PST) > 0:
                # sort PST
                PST = sortSequence(PST, prevTempPST, myXSDtree)
                FillerComponent.append({'ParticleSurfaceTreatment': PST})
                # initialize
                PST = []
                prevTempPST = ''
            # special case MatrixComponent, need to save the list from bottom up
            # into temp
            if len(MatrixComponent) > 0:
                # sort MatrixComponent
                MatrixComponent = sortSequence(MatrixComponent, 'MatrixComponent', myXSDtree)
                temp.append({'MatrixComponent': MatrixComponent})
                # initialize
                MatrixComponent = []
            # special case FillerComponent, need to save the list from bottom up
            # into temp
            if len(FillerComponent) > 0:
                # sort FillerComponent
                FillerComponent = sortSequence(FillerComponent, 'FillerComponent', myXSDtree)
                temp.append({'FillerComponent': FillerComponent})
                # initialize
                FillerComponent = []
            # special case FillerComposition
            if len(frac) > 0:
                # sort frac, always follow the order: mass, volume
                if 'volume' in frac:
                    frac.move_to_end('volume')
                temp.append({'FillerComposition':{'Fraction':frac}})
                frac = collections.OrderedDict()
            # save temp
            if len(temp) > 0: # update temp if it's not empty
                # sort temp
                temp = sortSequence(temp, prevTemp, myXSDtree)
                temp_list.append({headers[prevTemp]: temp})
                temp = []
            prevTemp = cleanTemp # update prevTemp
        # Matrix
            # MatrixComponent/ChemicalName
        if match(sheet.cell_value(row, 0), 'Chemical name'):
            MatrixComponent = insert('ChemicalName', sheet.cell_value(row, 1), MatrixComponent)
            # MatrixComponent/PubChemRef
        if match(sheet.cell_value(row, 0), 'PubChem Reference'):
            MatrixComponent = insert('PubChemRef', sheet.cell_value(row, 1), MatrixComponent)
            # MatrixComponent/Abbreviation
        if match(sheet.cell_value(row, 0), 'Abbreviation'):
            MatrixComponent = insert('Abbreviation', sheet.cell_value(row, 1), MatrixComponent)
            # MatrixComponent/ConstitutionalUnit
        if match(sheet.cell_value(row, 0), 'Polymer constitutional unit (CU)'):
            MatrixComponent = insert('ConstitutionalUnit', sheet.cell_value(row, 1), MatrixComponent)
            # MatrixComponent/PlasticType
        if match(sheet.cell_value(row, 0), 'Polymer plastic type'):
            MatrixComponent = insert('PlasticType', sheet.cell_value(row, 1), MatrixComponent)
            # MatrixComponent/PolymerClass
        if match(sheet.cell_value(row, 0), 'Polymer class'):
            MatrixComponent = insert('PolymerClass', sheet.cell_value(row, 1), MatrixComponent)
            # MatrixComponent/PolymerType
        if match(sheet.cell_value(row, 0), 'Polymer type'):
            MatrixComponent = insert('PolymerType', sheet.cell_value(row, 1), MatrixComponent)
            # MatrixComponent/ManufacturerOrSourceName
        if match(sheet.cell_value(row, 0), 'Polymer manufacturer or source name'):
            MatrixComponent = insert('ManufacturerOrSourceName', sheet.cell_value(row, 1), MatrixComponent)
            # MatrixComponent/TradeName
        if match(sheet.cell_value(row, 0), 'Polymer trade name'):
            MatrixComponent = insert('TradeName', sheet.cell_value(row, 1), MatrixComponent)
            # MatrixComponent/MolecularWeight
        if match(sheet.cell_value(row, 0), 'Polymer molecular weight'):
            molW = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            molW = addKVU('MolecularWeight', myRow[1],
                          myRow[2], myRow[3], '', '', '', '', molW, jobDir, myXSDtree)
            if len(molW) > 0:
                MatrixComponent.append(molW)
            # MatrixComponent/Polydispersity
        if match(sheet.cell_value(row, 0), 'Polydispersity'):
            MatrixComponent = insert('Polydispersity', sheet.cell_value(row, 1), MatrixComponent)
            # MatrixComponent/Tacticity
        if match(sheet.cell_value(row, 0), 'Tacticity'):
            MatrixComponent = insert('Tacticity', sheet.cell_value(row, 1), MatrixComponent)
            # MatrixComponent/Density
        if match(sheet.cell_value(row, 0), 'Density') and prevTemp == 'Matrix':
            denS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            denS = addKVU('Density', myRow[1], myRow[2], myRow[3], '', '', '', '', denS, jobDir, myXSDtree)
            if len(denS) > 0:
                MatrixComponent.append(denS)
            # MatrixComponent/Viscosity
        if match(sheet.cell_value(row, 0), 'Viscosity'):
            visC = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            visC = addKVU('Viscosity', myRow[1], myRow[2], myRow[3], '', '', '', '', visC, jobDir, myXSDtree)
            if len(visC) > 0:
                MatrixComponent.append(visC)
            # MatrixComponent/Hardener
        if match(sheet.cell_value(row, 0), 'Hardener'):
            MatrixComponent = insert('Hardener', sheet.cell_value(row, 1), MatrixComponent)
            # MatrixComponent/Additive
        if match(sheet.cell_value(row, 0), 'Additive'):
            addI = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
                # avoid mixing up with "Additive #"
            if match(myRow[1], 'Description/Fixed Value') or match(myRow[2], 'Unit') or match(myRow[3], 'Note'):
                continue
            addI = addKVU('Additive', myRow[1], myRow[2], myRow[3], '', '', '', '', addI, jobDir, myXSDtree)
            if len(addI) > 0:
                MatrixComponent.append(addI)
            # MatrixComponent/MatrixComponentComposition
        if match(sheet.cell_value(row, 0), 'Matrix Component Composition weight fraction'):
            mcc = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            if type(myRow[2]) == float or len(myRow[2]) > 0:
                if hasLen(myRow[1]):
                    mcc['Constituent'] = myRow[1]
                mcc['Fraction'] = {'mass':myRow[2]}
            if len(mcc) > 0:
                MatrixComponent.append({'MatrixComponentComposition':mcc})
        if match(sheet.cell_value(row, 0), 'Matrix Component Composition volume fraction'):
            vcc = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            if type(myRow[2]) == float or len(myRow[2]) > 0:
                if hasLen(myRow[1]):
                    vcc['Constituent'] = myRow[1]
                vcc['Fraction'] = {'volume':myRow[2]}
            if len(vcc) > 0:
                MatrixComponent.append({'MatrixComponentComposition':vcc})
        # Filler
            # Description
        if match(sheet.cell_value(row, 0), 'Filler description'):
            temp = insert('Description', sheet.cell_value(row, 1), temp)
            # FillerComponent/ChemicalName
        if match(sheet.cell_value(row, 0), 'Filler chemical name/Filler name'):
            FillerComponent = insert('ChemicalName', sheet.cell_value(row, 1), FillerComponent)
            # FillerComponent/PubChemRef
        if match(sheet.cell_value(row, 0), 'Filler PubChem Reference'):
            FillerComponent = insert('PubChemRef', sheet.cell_value(row, 1), FillerComponent)
            # FillerComponent/Abbreviation
        if match(sheet.cell_value(row, 0), 'Filler abbreviation'):
            FillerComponent = insert('Abbreviation', sheet.cell_value(row, 1), FillerComponent)
            # FillerComponent/ManufacturerOrSourceName
        if match(sheet.cell_value(row, 0), 'Manufacturer or source name'):
            FillerComponent = insert('ManufacturerOrSourceName', sheet.cell_value(row, 1), FillerComponent)
            # FillerComponent/TradeName
        if match(sheet.cell_value(row, 0), 'Trade name'):
            FillerComponent = insert('TradeName', sheet.cell_value(row, 1), FillerComponent)
            # FillerComponent/Density
        if match(sheet.cell_value(row, 0), 'Density') and prevTemp == 'Filler':
            denS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            denS = addKVU('Density', myRow[1], myRow[2], myRow[3], '', '', '', '', denS, jobDir, myXSDtree)
            if len(denS) > 0:
                FillerComponent.append(denS)
            # FillerComponent/CrystalPhase
        if match(sheet.cell_value(row, 0), 'Crystal phase'):
            FillerComponent = insert('CrystalPhase', sheet.cell_value(row, 1), FillerComponent)
            # FillerComponent/SphericalParticleDiameter
        if match(sheet.cell_value(row, 0), 'Particle diameter'):
            parS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            parS = addKVSU('SphericalParticleDiameter', myRow[1], myRow[2], myRow[3], '', '', myRow[4], '', '', parS, jobDir, myXSDtree)
            if len(parS) > 0:
                FillerComponent.append(parS)
            # FillerComponent/SurfaceArea/specific
        if match(sheet.cell_value(row, 0), 'Specific surface area'):
            speS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            speS = addKVU('specific', myRow[1], myRow[2], myRow[3], '', '', '', '', speS, jobDir, myXSDtree)
            if len(speS) > 0:
                FillerComponent.append({'SurfaceArea': speS})
            # FillerComponent/SurfaceArea/total
        if match(sheet.cell_value(row, 0), 'Total surface area'):
            totS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            totS = addKVU('total', myRow[1], myRow[2], myRow[3], '', '', '', '', totS, jobDir, myXSDtree)
            if len(totS) > 0:
                FillerComponent.append({'SurfaceArea': totS})
            # FillerComponent/ParticleAspectRatio
        if match(sheet.cell_value(row, 0), 'Aspect ratio'):
            aspR = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            aspR = addKVU('ParticleAspectRatio', myRow[1], myRow[2], '', '', '', '', '', aspR, jobDir, myXSDtree)
            if len(aspR) > 0:
                FillerComponent.append(aspR)
            # FillerComponent/NonSphericalShape/Length
        if match(sheet.cell_value(row, 0), 'Non spherical shape-length'):
            myRow = sheet.row_values(row) # save the list of row_values
            nonSpher = addKVU('Length', myRow[1],
                              myRow[2], myRow[3], '', '', '', '', nonSpher, jobDir, myXSDtree)
            # FillerComponent/NonSphericalShape/Width
        if match(sheet.cell_value(row, 0), 'Non spherical shape-width'):
            myRow = sheet.row_values(row) # save the list of row_values
            nonSpher = addKVU('Width', myRow[1],
                              myRow[2], myRow[3], '', '', '', '', nonSpher, jobDir, myXSDtree)
            # FillerComponent/NonSphericalShape/Depth
        if match(sheet.cell_value(row, 0), 'Non spherical shape-depth'):
            myRow = sheet.row_values(row) # save the list of row_values
            nonSpher = addKVU('Depth', myRow[1],
                              myRow[2], myRow[3], '', '', '', '', nonSpher, jobDir, myXSDtree)
            # FillerComponent/FillerComponentComposition/mass
        if match(sheet.cell_value(row, 0), 'Filler Component Composition weight fraction'):
            mcc = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            if type(myRow[2]) == float or len(myRow[2]) > 0:
                mcc['mass'] = myRow[2]
            if len(mcc) > 0:
                FillerComponent.append({'FillerComponentComposition':mcc})
            # FillerComponent/FillerComponentComposition/volume
        if match(sheet.cell_value(row, 0), 'Filler Component Composition volume fraction'):
            vcc = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            if type(myRow[2]) == float or len(myRow[2]) > 0:
                vcc['volume'] = myRow[2]
            if len(vcc) > 0:
                FillerComponent.append({'FillerComponentComposition':vcc})
            # FillerComposition/mass(volume)
        if match(sheet.cell_value(row, 0), 'Fraction'):
            if type(sheet.cell_value(row, 2)) == float or len(sheet.cell_value(row, 2)) > 0:
                if match(sheet.cell_value(row, 1), 'mass'):
                    frac['mass'] = collections.OrderedDict([('value',sheet.cell_value(row, 2)),
                                                            ('source','reported')])
                    # temp.append({'FillerComposition':{'Fraction':{'mass':sheet.cell_value(row, 2)}}})
                elif match(sheet.cell_value(row, 1), 'volume'):
                    frac['volume'] = collections.OrderedDict([('value',sheet.cell_value(row, 2)),
                                                              ('source','reported')])
                    # temp.append({'FillerComposition':{'Fraction':{'volume':sheet.cell_value(row, 2)}}})
            # FillerComponent/ParticleSurfaceTreatment
                #./ChemicalName
        if match(sheet.cell_value(row,0), 'PST chemical name'):
            PST = insert('ChemicalName', sheet.cell_value(row, 1), PST)
                #./Abbreviation
        if match(sheet.cell_value(row,0), 'PST abbreviation'):
            PST = insert('Abbreviation', sheet.cell_value(row, 1), PST)
                #./ConstitutionalUnit
        if match(sheet.cell_value(row,0), 'PST constitutional unit'):
            PST = insert('ConstitutionalUnit', sheet.cell_value(row, 1), PST)
                #./ManufacturerOrSourceName
        if match(sheet.cell_value(row,0), 'PST manufacturer or source name'):
            PST = insert('ManufacturerOrSourceName', sheet.cell_value(row, 1), PST)
                #./TradeName
        if match(sheet.cell_value(row,0), 'PST trade name'):
            PST = insert('TradeName', sheet.cell_value(row, 1), PST)
                #./Density
        if match(sheet.cell_value(row, 0), 'PST density'):
            denS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            denS = addKVU('Density', myRow[1],
                          myRow[2], myRow[3], '', '', '', '', denS, jobDir, myXSDtree)
            if len(denS) > 0:
                PST.append(denS)
                #./GraftDensity
        if match(sheet.cell_value(row, 0), 'PST population density'):
            graD = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            graD = addKVU('GraftDensity', myRow[1],
                          myRow[2], myRow[3], '', '', '', '', graD, jobDir, myXSDtree)
            if len(graD) > 0:
                PST.append(graD)
                #./MolecularWeight
        if match(sheet.cell_value(row, 0), 'PST molecular weight'):
            molW = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            molW = addKVU('MolecularWeight', myRow[1],
                          myRow[2], myRow[3], '', '', '', '', molW, jobDir, myXSDtree)
            if len(molW) > 0:
                PST.append(molW)
                #./PST_Composition
        if match(sheet.cell_value(row, 0), 'PST Component Composition weight fraction'):
            mcc = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            if hasLen(myRow[1]):
                mcc['Constituent'] = myRow[1]
            if type(myRow[2]) == float or len(myRow[2]) > 0:
                mcc['Fraction'] = {'mass': myRow[2]}
            if len(mcc) > 0:
                PST.append({'PST_Composition':mcc})
        if match(sheet.cell_value(row, 0), 'PST Component Composition volumn fraction'):
            vcc = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            if hasLen(myRow[1]):
                vcc['Constituent'] = myRow[1]
            if type(myRow[2]) == float or len(myRow[2]) > 0:
                vcc['Fraction'] = {'volume': myRow[2]}
            if len(mcc) > 0:
                PST.append({'PST_Composition':vcc})
                #./SurfaceChemistryProcessing
        if match(sheet.cell_value(row, 0), 'Surface Chemical Processing'):
            PST_SCP = sheetProcTypeHelper(sheet, row, [], 'Surface Chemical Processing', myXSDtree, jobDir) # helper
            if len(PST_SCP) > 0:
                # dump the PST_SCP as a dict into Process_list
                PST.append(collections.OrderedDict({'SurfaceChemistryProcessing': PST_SCP}))

    # END OF THE LOOP
    # special case NonSphericalShape, need to save the list from
    # bottom up into FillerComponent
    if len(nonSpher) > 0:
        FillerComponent.append({'NonSphericalShape': nonSpher})
        # initialize
        nonSpher = collections.OrderedDict() # initialize
    # special case ParticleSurfaceTreatment, need to save the list from
    # bottom up into FillerComponent
    if len(PST) > 0:
        # sort PST
        PST = sortSequence(PST, prevTempPST, myXSDtree)
        FillerComponent.append({'ParticleSurfaceTreatment': PST})
        # initialize
        PST = []
    # special case MatrixComponent, need to save the list from bottom up
    # into temp
    if len(MatrixComponent) > 0:
        # sort MatrixComponent
        MatrixComponent = sortSequence(MatrixComponent, 'MatrixComponent', myXSDtree)
        temp.append({'MatrixComponent': MatrixComponent})
        # initialize
        MatrixComponent = []
    # special case FillerComponent, need to save the list from bottom up
    # into temp
    if len(FillerComponent) > 0:
        # sort FillerComponent
        FillerComponent = sortSequence(FillerComponent, 'FillerComponent', myXSDtree)
        temp.append({'FillerComponent': FillerComponent})
        # initialize
        FillerComponent = []
    # special case FillerComposition
    if len(frac) > 0:
        # sort frac, always follow the order: mass, volume
        if 'volume' in frac:
            frac.move_to_end('volume')
        temp.append({'FillerComposition':{'Fraction':frac}})
        frac = collections.OrderedDict()
    # don't forget about the last temp
    # save temp
    if len(temp) > 0: # update temp if it's not empty
        # sort temp
        temp == sortSequence(temp, prevTemp, myXSDtree)
        temp_list.append({headers[prevTemp]: temp})
        temp = []
    if len(temp_list) > 0:
        # sort temp_list
        temp_list = sortSequence(temp_list, 'MATERIALS', myXSDtree)
        DATA.append({'MATERIALS': temp_list})
    return DATA


# Sheet 3. Synthesis and Processing
def sheetProcTypeHelper(sheet, row, temp_list, stop_sign, myXSDtree, jobDir):
    headers = {'Aging': 'Aging', 'Additive': 'Additive', 'Cooling': 'Cooling',
               'Curing': 'Curing', 'Solvent': 'Solvent', 'Mixing': 'Mixing',
               'Extrusion': 'Extrusion', 'Heating': 'Heating',
               'Drying/Evaporation': 'Drying-Evaporation',
               'Centrifugation': 'Centrifugation', 'Molding': 'Molding',
               'Deposition and Coating': 'DepositionAndCoating',
               'Self-Assembly': 'Self-Assembly', 'Other': 'Other'}
    temp = [] # always save temp if not empty when we find a match in headers
    irow = row + 1 # the row we are looking at
    prevTemp = '' # save the previous cleanTemp
    MoldingInfo = [] # a list for Molding/MoldingInfo
    # a dict for identifying single and twin screw extrusion
    extrsHeaders = {'Extrusion - Single screw extrusion': 'SingleScrewExtrusion',
                    'Extrusion - Twin screw extrusion': 'TwinScrewExtrusion'}
    prevExtrsHeader = ''
    Extrusion = [] # a list for Extrusion/SingleScrewExtrusion and Extrusion/TwinScrewExtrusion
    ExtrsHZ = [] # a list for Extrusion/.../HeatingZone
    ExtrsOP = [] # a list for Extrusion/.../Output
    # start scanning
    # as long as we are not 1) out of bound 2) find a stop_sign
    while (irow < sheet.nrows and
           not match(sheet.cell_value(irow, 0), stop_sign)):
        cleanTemp = matchList(sheet.cell_value(irow, 0), headers.keys())
        if cleanTemp:
            if len(prevTemp) == 0: # initialize prevTemp
                prevTemp = cleanTemp
            # special case Molding, need to save the list for MoldingInfo into temp
            if prevTemp == 'Molding' and len(MoldingInfo) > 0:
                # sort MoldingInfo
                MoldingInfo = sortSequence(MoldingInfo, 'MoldingInfo', myXSDtree)
                # then save MoldingInfo as a dict in temp
                temp.append({'MoldingInfo': MoldingInfo})
                # initialize
                MoldingInfo = []
            # special case Extrusion, need to save the list from bottom up
            # (HeatingZone and Output => Extrusion => dict with
            # SingleScrewExtrusion or TwinScrewExtrusion as key) into temp
            if prevTemp == 'Extrusion':
                if len(ExtrsHZ) > 0:
                    # sort ExtrsHZ
                    ExtrsHZ = sortSequence(ExtrsHZ, 'ExtrusionHeatingZone', myXSDtree)
                    Extrusion.append({'HeatingZone': ExtrsHZ})
                    # initialize
                    ExtrsHZ = []
                if len(ExtrsOP) > 0:
                    # sort ExtrsOP
                    ExtrsOP = sortSequence(ExtrsOP, 'ExtrusionOutput', myXSDtree)
                    Extrusion.append({'Output': ExtrsOP})
                    # initialize
                    ExtrsOP = []
                if len(Extrusion) > 0:
                    # sort Extrusion
                    Extrusion = sortSequence(Extrusion, prevExtrsHeader, myXSDtree)
                    temp.append({prevExtrsHeader: Extrusion})
                # initialize
                Extrusion = []
                prevExtrsHeader = ''
            # save temp
            if len(temp) > 0: # update temp if it's not empty
                # sort temp
                temp = sortSequence(temp, prevTemp, myXSDtree)
                temp_list.append({'ChooseParameter': {headers[prevTemp]: temp}})
                temp = []
            prevTemp = cleanTemp # update prevTemp
    # Aging (skipped)
    # Other
        # Description
        if match(sheet.cell_value(irow, 0), 'Other - description'):
            # temp = insert('Description', sheet.cell_value(irow, 1), temp)
            temp = str(sheet.cell_value(irow, 1)).strip() # DANGEROUS! type(temp) changes here
    # Additive
        # Description
        if match(sheet.cell_value(irow, 0), 'Additive - description'):
            temp = insert('Description', sheet.cell_value(irow, 1), temp)
        # Additive
        if match(sheet.cell_value(irow, 0), 'Additive - additive'):
            temp = insert('Additive', sheet.cell_value(irow, 1), temp)
        # Amount
        if match(sheet.cell_value(irow, 0), 'Additive - amount'):
            amount = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                amount = addKVU('Amount', '', sheet.row_values(irow)[1],
                                sheet.row_values(irow)[2], '', '', '', '', amount, jobDir, myXSDtree)
            else:
                amount = addKVU('Amount', sheet.row_values(irow)[1], '',
                                sheet.row_values(irow)[2], '', '', '', '', amount, jobDir, myXSDtree)
            if len(amount) > 0:
                temp.append(amount)

    # Cooling
        # Description
        if match(sheet.cell_value(irow, 0), 'Cooling - description'):
            temp = insert('Description', sheet.cell_value(irow, 1), temp)
        # Temperature
        if match(sheet.cell_value(irow, 0), 'Cooling - temperature'):
            temperature = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            temperature = addKVU('Temperature', '', sheet.row_values(irow)[1],
                                 sheet.row_values(irow)[2], '', '', '', '', temperature, jobDir, myXSDtree)
            # else:
            #     temperature = addKVU('Temperature', sheet.row_values(irow)[1], '',
            #                          sheet.row_values(irow)[2], '', '', '', '', temperature)
            if len(temperature) > 0:
                temp.append(temperature)
        # Time
        if match(sheet.cell_value(irow, 0), 'Cooling - time'):
            time = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            time = addKVU('Time', '', sheet.row_values(irow)[1],
                          sheet.row_values(irow)[2], '', '', '', '', time, jobDir, myXSDtree)
            # else:
            #     time = addKVU('Time', sheet.row_values(irow)[1], '',
            #                   sheet.row_values(irow)[2], '', '', '', '', time)
            if len(time) > 0:
                temp.append(time)
        # Pressure
        if match(sheet.cell_value(irow, 0), 'Cooling - pressure'):
            pressure = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            pressure = addKVU('Pressure', '', sheet.row_values(irow)[1],
                              sheet.row_values(irow)[2], '', '', '', '', pressure, jobDir, myXSDtree)
            # else:
            #     pressure = addKVU('Pressure', sheet.row_values(irow)[1], '',
            #                       sheet.row_values(irow)[2], '', '', '', '', pressure)
            if len(pressure) > 0:
                temp.append(pressure)
        # AmbientCondition
        if match(sheet.cell_value(irow, 0), 'Cooling - ambient condition'):
            temp = insert('AmbientCondition', sheet.cell_value(irow, 1), temp)

    # Solvent
        # SolventName
        if match(sheet.cell_value(irow, 0), 'Solvent - solvent amount'):
            temp = insert('SolventName', sheet.cell_value(irow, 1), temp)
            amount = collections.OrderedDict()
            amount = addKVU('SolventAmount', '', sheet.row_values(irow)[2],
                            sheet.row_values(irow)[3], '', '', '', '', amount, jobDir, myXSDtree)
            if len(amount) > 0:
                temp.append(amount)

    # Mixing
        # Description
        if match(sheet.cell_value(irow, 0), 'Mixing - description'):
            temp = insert('Description', sheet.cell_value(irow, 1), temp)
        # Mixer
        if match(sheet.cell_value(irow, 0), 'Mixing - mixer'):
            temp = insert('Mixer', sheet.cell_value(irow, 1), temp)
        # MixingMethod
        if match(sheet.cell_value(irow, 0), 'Mixing - method'):
            temp = insert('MixingMethod', sheet.cell_value(irow, 1), temp)
        # ChemicalUsed
        if match(sheet.cell_value(irow, 0), 'Mixing - chemical used'):
            myRow = sheet.row_values(irow)
            che = collections.OrderedDict()
            che = addKVU('ChemicalUsed', myRow[1], myRow[2], myRow[3], '', '', '', '', che, jobDir, myXSDtree)
            if len(che) > 0:
                temp.append(che)
        # RPM
        if match(sheet.cell_value(irow, 0), 'Mixing - RPM'):
            rpm = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                rpm = addKVU('RPM', '', sheet.row_values(irow)[1],
                             sheet.row_values(irow)[2], '', '', '', '', rpm, jobDir, myXSDtree)
            else:
                rpm = addKVU('RPM', sheet.row_values(irow)[1], '',
                             sheet.row_values(irow)[2], '', '', '', '', rpm, jobDir, myXSDtree)
            if len(rpm) > 0:
                temp.append(rpm)
        # Time
        if match(sheet.cell_value(irow, 0), 'Mixing - time'):
            time = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            time = addKVU('Time', '', sheet.row_values(irow)[1],
                          sheet.row_values(irow)[2], '', '', '', '', time, jobDir, myXSDtree)
            # else:
            #     time = addKVU('Time', sheet.row_values(irow)[1], '',
            #                   sheet.row_values(irow)[2], '', '', '', '', time)
            if len(time) > 0:
                temp.append(time)
        # Temperature
        if match(sheet.cell_value(irow, 0), 'Mixing - temperature'):
            temperature = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            temperature = addKVU('Temperature', '', sheet.row_values(irow)[1],
                                 sheet.row_values(irow)[2], '', '', '', '', temperature, jobDir, myXSDtree)
            # else:
            #     temperature = addKVU('Temperature', sheet.row_values(irow)[1], '',
            #                          sheet.row_values(irow)[2], '', '', '', '', temperature)
            if len(temperature) > 0:
                temp.append(temperature)

    # Extrusion
        # first detect the correct header, single or twin
        if matchList(sheet.cell_value(irow, 0), extrsHeaders.keys()):
            # only if all the Extrusion lists are empty we update the prevExtrsHeader
            if len(Extrusion) == 0 and len(ExtrsHZ) == 0 and len(ExtrsOP) == 0:
                prevExtrsHeader = extrsHeaders[sheet.cell_value(irow, 0)]
        # Single(Twin)ScrewExtrusion/Extruder
        if match(sheet.cell_value(irow, 0), 'Extruder'):
            Extrusion = insert('Extruder', sheet.cell_value(irow, 1), Extrusion)
        # Single(Twin)ScrewExtrusion/ResidenceTime
        if match(sheet.cell_value(irow, 0), 'Residence time'):
            time = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            time = addKVU('ResidenceTime', '', sheet.row_values(irow)[1],
                          sheet.row_values(irow)[2], '', '', '', '', time, jobDir, myXSDtree)
            # else:
            #     time = addKVU('ResidenceTime', sheet.row_values(irow)[1], '',
            #                   sheet.row_values(irow)[2], '', '', '', '', time)
            if len(time) > 0:
                Extrusion.append(time)
        # Single(Twin)ScrewExtrusion/ExtrusionTemperature
        if match(sheet.cell_value(irow, 0), 'Extrusion temperature'):
            temperature = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            temperature = addKVU('ExtrusionTemperature', '', sheet.row_values(irow)[1],
                                 sheet.row_values(irow)[2], '', '', '', '', temperature, jobDir, myXSDtree)
            # else:
            #     temperature = addKVU('ExtrusionTemperature', sheet.row_values(irow)[1], '',
            #                          sheet.row_values(irow)[2], '', '', '', '', temperature)
            if len(temperature) > 0:
                Extrusion.append(temperature)
        # Single(Twin)ScrewExtrusion/ScrewDiameter
        if match(sheet.cell_value(irow, 0), 'Screw diameter'):
            diameter = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                diameter = addKVU('ScrewDiameter', '', sheet.row_values(irow)[1],
                                  sheet.row_values(irow)[2], '', '', '', '', diameter, jobDir, myXSDtree)
            else:
                diameter = addKVU('ScrewDiameter', sheet.row_values(irow)[1], '',
                                  sheet.row_values(irow)[2], '', '', '', '', diameter, jobDir, myXSDtree)
            if len(diameter) > 0:
                Extrusion.append(diameter)
        # Single(Twin)ScrewExtrusion/D_L_ratio
        if match(sheet.cell_value(irow, 0), 'D/L ratio'):
            Extrusion = insert('D_L_ratio', sheet.cell_value(irow, 1), Extrusion)
        # Single(Twin)ScrewExtrusion/FlightWidth
        if match(sheet.cell_value(irow, 0), 'Flight width'):
            width = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                width = addKVU('FlightWidth', '', sheet.row_values(irow)[1],
                               sheet.row_values(irow)[2], '', '', '', '', width, jobDir, myXSDtree)
            else:
                width = addKVU('FlightWidth', sheet.row_values(irow)[1], '',
                                sheet.row_values(irow)[2], '', '', '', '', width, jobDir, myXSDtree)
            if len(width) > 0:
                Extrusion.append(width)
        # Single(Twin)ScrewExtrusion/HeatingZone
            # heatingZoneNumber
        if match(sheet.cell_value(irow, 0), 'Heating zone - number'):
            if type(sheet.cell_value(irow, 1)) == float:
                if int(sheet.cell_value(irow, 1)) == sheet.cell_value(irow, 1):
                    ExtrsHZ = insert('heatingZoneNumber', int(sheet.cell_value(irow, 1)), ExtrsHZ)
                else:
                    ExtrsHZ = insert('heatingZoneNumber', sheet.cell_value(irow, 1), ExtrsHZ)
            else: # if user enters non-number value, save it and raise error
                ExtrsHZ = insert('heatingZoneNumber', sheet.cell_value(irow, 1), ExtrsHZ)
            # lengthOfHeatingZone
        if match(sheet.cell_value(irow, 0), 'Heating zone - length'):
            length = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                length = addKVU('lengthOfHeatingZone', '', sheet.row_values(irow)[1],
                                sheet.row_values(irow)[2], '', '', '', '', length, jobDir, myXSDtree)
            else:
                length = addKVU('lengthOfHeatingZone', sheet.row_values(irow)[1], '',
                                sheet.row_values(irow)[2], '', '', '', '', length, jobDir, myXSDtree)
            if len(length) > 0:
                ExtrsHZ.append(length)
            # barrelTemperature
        if match(sheet.cell_value(irow, 0), 'Heating zone - barrel temperature'):
            temperature = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            temperature = addKVU('barrelTemperature', '', sheet.row_values(irow)[1],
                                 sheet.row_values(irow)[2], '', '', '', '', temperature, jobDir, myXSDtree)
            # else:
            #     temperature = addKVU('barrelTemperature', sheet.row_values(irow)[1], '',
            #                          sheet.row_values(irow)[2], '', '', '', '', temperature)
            if len(temperature) > 0:
                ExtrsHZ.append(temperature)
        # Single(Twin)ScrewExtrusion/DieDiameter
        if match(sheet.cell_value(irow, 0), 'Die diameter'):
            diameter = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                diameter = addKVU('DieDiameter', '', sheet.row_values(irow)[1],
                                  sheet.row_values(irow)[2], '', '', '', '', diameter, jobDir, myXSDtree)
            else:
                diameter = addKVU('DieDiameter', sheet.row_values(irow)[1], '',
                                  sheet.row_values(irow)[2], '', '', '', '', diameter, jobDir, myXSDtree)
            if len(diameter) > 0:
                Extrusion.append(diameter)
        # Single(Twin)ScrewExtrusion/Output
            # MeltTemperature
        if match(sheet.cell_value(irow, 0), 'Output - Melt temperature'):
            melt = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            melt = addKVU('MeltTemperature', '', sheet.row_values(irow)[1],
                          sheet.row_values(irow)[2], '', '', '', '', melt, jobDir, myXSDtree)
            # else:
            #     melt = addKVU('MeltTemperature', sheet.row_values(irow)[1], '',
            #                   sheet.row_values(irow)[2], '', '', '', '', melt)
            if len(melt) > 0:
                ExtrsOP.append(melt)
            # PressureAtDie
        if match(sheet.cell_value(irow, 0), 'Output - Pressure at die'):
            pressure = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            pressure = addKVU('PressureAtDie', '', sheet.row_values(irow)[1],
                              sheet.row_values(irow)[2], '', '', '', '', pressure, jobDir, myXSDtree)
            # else:
            #     pressure = addKVU('PressureAtDie', sheet.row_values(irow)[1], '',
            #                       sheet.row_values(irow)[2], '', '', '', '', pressure)
            if len(pressure) > 0:
                ExtrsOP.append(pressure)
            # Torque
        if match(sheet.cell_value(irow, 0), 'Output - Torque'):
            torque = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                torque = addKVU('Torque', '', sheet.row_values(irow)[1],
                                sheet.row_values(irow)[2], '', '', '', '', torque, jobDir, myXSDtree)
            else:
                torque = addKVU('Torque', sheet.row_values(irow)[1], '',
                                sheet.row_values(irow)[2], '', '', '', '', torque, jobDir, myXSDtree)
            if len(torque) > 0:
                ExtrsOP.append(torque)
            # Amperage
        if match(sheet.cell_value(irow, 0), 'Output - Amperage'):
            amperage = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                amperage = addKVU('Amperage', '', sheet.row_values(irow)[1],
                                  sheet.row_values(irow)[2], '', '', '', '', amperage, jobDir, myXSDtree)
            else:
                amperage = addKVU('Amperage', sheet.row_values(irow)[1], '',
                                  sheet.row_values(irow)[2], '', '', '', '', amperage, jobDir, myXSDtree)
            if len(amperage) > 0:
                ExtrsOP.append(amperage)
            # Voltage
        if match(sheet.cell_value(irow, 0), 'Output - Voltage'):
            voltage = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                voltage = addKVU('Voltage', '', sheet.row_values(irow)[1],
                                 sheet.row_values(irow)[2], '', '', '', '', voltage, jobDir, myXSDtree)
            else:
                voltage = addKVU('Voltage', sheet.row_values(irow)[1], '',
                                 sheet.row_values(irow)[2], '', '', '', '', voltage, jobDir, myXSDtree)
            if len(voltage) > 0:
                ExtrsOP.append(voltage)
            # Power
        if match(sheet.cell_value(irow, 0), 'Output - Power'):
            power = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                power = addKVU('Power', '', sheet.row_values(irow)[1],
                               sheet.row_values(irow)[2], '', '', '', '', power, jobDir, myXSDtree)
            else:
                power = addKVU('Power', sheet.row_values(irow)[1], '',
                               sheet.row_values(irow)[2], '', '', '', '', power, jobDir, myXSDtree)
            if len(power) > 0:
                ExtrsOP.append(power)
            # ThroughPut
        if match(sheet.cell_value(irow, 0), 'Output - Throughput'):
            throughput = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                throughput = addKVU('ThroughPut', '', sheet.row_values(irow)[1],
                                     sheet.row_values(irow)[2], '', '', '', '', throughput, jobDir, myXSDtree)
            else:
                throughput = addKVU('ThroughPut', sheet.row_values(irow)[1], '',
                                     sheet.row_values(irow)[2], '', '', '', '', throughput, jobDir, myXSDtree)
            if len(throughput) > 0:
                ExtrsOP.append(throughput)
            # ResidenceTime
        if match(sheet.cell_value(irow, 0), 'Output - Residence time'):
            residence = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            residence = addKVU('ResidenceTime', '', sheet.row_values(irow)[1],
                               sheet.row_values(irow)[2], '', '', '', '', residence, jobDir, myXSDtree)
            # else:
            #     residence = addKVU('ResidenceTime', sheet.row_values(irow)[1], '',
            #                        sheet.row_values(irow)[2], '', '', '', '', residence)
            if len(residence) > 0:
                ExtrsOP.append(residence)
        # SingleScrewExtrusion/InnerBarrelDiameter
        if match(sheet.cell_value(irow, 0), 'Inner barrel diameter'):
            diameter = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                diameter = addKVU('InnerBarrelDiameter', '', sheet.row_values(irow)[1],
                                  sheet.row_values(irow)[2], '', '', '', '', diameter, jobDir, myXSDtree)
            else:
                diameter = addKVU('InnerBarrelDiameter', sheet.row_values(irow)[1], '',
                                  sheet.row_values(irow)[2], '', '', '', '', diameter, jobDir, myXSDtree)
            if len(diameter) > 0:
                Extrusion.append(diameter)
        # SingleScrewExtrusion/ScrewLength
        if match(sheet.cell_value(irow, 0), 'Screw length'):
            length = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                length = addKVU('ScrewLength', '', sheet.row_values(irow)[1],
                                sheet.row_values(irow)[2], '', '', '', '', length, jobDir, myXSDtree)
            else:
                length = addKVU('ScrewLength', sheet.row_values(irow)[1], '',
                                sheet.row_values(irow)[2], '', '', '', '', length, jobDir, myXSDtree)
            if len(length) > 0:
                Extrusion.append(length)
        # SingleScrewExtrusion/RadialFlightClearance
        if match(sheet.cell_value(irow, 0), 'Radial flight clearance'):
            clearance = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                clearance = addKVU('RadialFlightClearance', '', sheet.row_values(irow)[1],
                                   sheet.row_values(irow)[2], '', '', '', '', clearance, jobDir, myXSDtree)
            else:
                clearance = addKVU('RadialFlightClearance', sheet.row_values(irow)[1], '',
                                sheet.row_values(irow)[2], '', '', '', '', clearance, jobDir, myXSDtree)
            if len(clearance) > 0:
                Extrusion.append(clearance)
        # SingleScrewExtrusion/ChannelDepth
        if match(sheet.cell_value(irow, 0), 'Channel depth'):
            depth = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                depth = addKVU('ChannelDepth', '', sheet.row_values(irow)[1],
                               sheet.row_values(irow)[2], '', '', '', '', depth, jobDir, myXSDtree)
            else:
                depth = addKVU('ChannelDepth', sheet.row_values(irow)[1], '',
                               sheet.row_values(irow)[2], '', '', '', '', depth, jobDir, myXSDtree)
            if len(depth) > 0:
                Extrusion.append(depth)
        # SingleScrewExtrusion/ScrewLead
        if match(sheet.cell_value(irow, 0), 'Screw lead'):
            lead = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                lead = addKVU('ScrewLead', '', sheet.row_values(irow)[1],
                              sheet.row_values(irow)[2], '', '', '', '', lead, jobDir, myXSDtree)
            else:
                lead = addKVU('ScrewLead', sheet.row_values(irow)[1], '',
                              sheet.row_values(irow)[2], '', '', '', '', lead, jobDir, myXSDtree)
            if len(lead) > 0:
                Extrusion.append(lead)
        # SingleScrewExtrusion/NumberOfChannelsPerScrew
        if match(sheet.cell_value(irow, 0), 'Number of channels per screw'):
            if type(sheet.cell_value(irow, 1)) == float:
                if int(sheet.cell_value(irow, 1)) == sheet.cell_value(irow, 1):
                    Extrusion = insert('NumberOfChannelsPerScrew', int(sheet.cell_value(irow, 1)), Extrusion)
                else:
                    Extrusion = insert('NumberOfChannelsPerScrew', sheet.cell_value(irow, 1), Extrusion)
            else: # if user enters non-number value, save it and raise error
                Extrusion = insert('NumberOfChannelsPerScrew', sheet.cell_value(irow, 1), Extrusion)
        # SingleScrewExtrusion/ScrewChannelWidth
        if match(sheet.cell_value(irow, 0), 'Screw channel width'):
            width = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                width = addKVU('ScrewChannelWidth', '', sheet.row_values(irow)[1],
                               sheet.row_values(irow)[2], '', '', '', '', width, jobDir, myXSDtree)
            else:
                width = addKVU('ScrewChannelWidth', sheet.row_values(irow)[1], '',
                               sheet.row_values(irow)[2], '', '', '', '', width, jobDir, myXSDtree)
            if len(width) > 0:
                Extrusion.append(width)
        # Single(Twin)ScrewExtrusion/RotationSpeed
        if match(sheet.cell_value(irow, 0), 'Rotation speed'):
            speed = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                speed = addKVU('RotationSpeed', '', sheet.row_values(irow)[1],
                               sheet.row_values(irow)[2], '', '', '', '', speed, jobDir, myXSDtree)
            else:
                speed = addKVU('RotationSpeed', sheet.row_values(irow)[1], '',
                               sheet.row_values(irow)[2], '', '', '', '', speed, jobDir, myXSDtree)
            if len(speed) > 0:
                Extrusion.append(speed)
        # SingleScrewExtrusion/BarrelTemperature (maybe redundant)
        if match(sheet.cell_value(irow, 0), 'Barrel Temperature'):
            temperature = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            temperature = addKVU('BarrelTemperature', '', sheet.row_values(irow)[1],
                                 sheet.row_values(irow)[2], '', '', '', '', temperature, jobDir, myXSDtree)
            # else:
            #     temperature = addKVU('BarrelTemperature', sheet.row_values(irow)[1], '',
            #                          sheet.row_values(irow)[2], '', '', '', '', temperature)
            if len(temperature) > 0:
                Extrusion.append(temperature)
        # TwinScrewExtrusion/RotationMode
        if match(sheet.cell_value(irow, 0), 'Rotation mode'):
            Extrusion = insert('RotationMode', sheet.cell_value(irow, 1), Extrusion)
        # TwinScrewExtrusion/ScrewChannelDiameter
        if match(sheet.cell_value(irow, 0), 'Screw channel diameter'):
            diameter = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                diameter = addKVU('ScrewChannelDiameter', '', sheet.row_values(irow)[1],
                                  sheet.row_values(irow)[2], '', '', '', '', diameter, jobDir, myXSDtree)
            else:
                diameter = addKVU('ScrewChannelDiameter', sheet.row_values(irow)[1], '',
                                  sheet.row_values(irow)[2], '', '', '', '', diameter, jobDir, myXSDtree)
            if len(diameter) > 0:
                Extrusion.append(diameter)
        # TwinScrewExtrusion/FlightClearance
        if match(sheet.cell_value(irow, 0), 'Flight clearance'):
            clearance = collections.OrderedDict()
            if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
                clearance = addKVU('FlightClearance', '', sheet.row_values(irow)[1],
                                   sheet.row_values(irow)[2], '', '', '', '', clearance, jobDir, myXSDtree)
            else:
                clearance = addKVU('FlightClearance', sheet.row_values(irow)[1], '',
                                   sheet.row_values(irow)[2], '', '', '', '', clearance, jobDir, myXSDtree)
            if len(clearance) > 0:
                Extrusion.append(clearance)

    # Heating
        # Description
        if match(sheet.cell_value(irow, 0), 'Heating - description'):
            temp = insert('Description', sheet.cell_value(irow, 1), temp)
        # Temperature
        if match(sheet.cell_value(irow, 0), 'Heating - temperature'):
            temperature = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            temperature = addKVU('Temperature', '', sheet.row_values(irow)[1],
                                 sheet.row_values(irow)[2], '', '', '', '', temperature, jobDir, myXSDtree)
            # else:
            #     temperature = addKVU('Temperature', sheet.row_values(irow)[1], '',
            #                          sheet.row_values(irow)[2], '', '', '', '', temperature)
            if len(temperature) > 0:
                temp.append(temperature)
        # Time
        if match(sheet.cell_value(irow, 0), 'Heating - time'):
            time = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            time = addKVU('Time', '', sheet.row_values(irow)[1],
                          sheet.row_values(irow)[2], '', '', '', '', time, jobDir, myXSDtree)
            # else:
            #     time = addKVU('Time', sheet.row_values(irow)[1], '',
            #                   sheet.row_values(irow)[2], '', '', '', '', time)
            if len(time) > 0:
                temp.append(time)
        # Pressure
        if match(sheet.cell_value(irow, 0), 'Heating - pressure'):
            pressure = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            pressure = addKVU('Pressure', '', sheet.row_values(irow)[1],
                              sheet.row_values(irow)[2], '', '', '', '', pressure, jobDir, myXSDtree)
            # else:
            #     pressure = addKVU('Pressure', sheet.row_values(irow)[1], '',
            #                       sheet.row_values(irow)[2], '', '', '', '', pressure)
            if len(pressure) > 0:
                temp.append(pressure)
        # AmbientCondition
        if match(sheet.cell_value(irow, 0), 'Heating - ambient condition'):
            temp = insert('AmbientCondition', sheet.cell_value(irow, 1), temp)

    # Drying/Evaporation
        # Description
        if match(sheet.cell_value(irow, 0), 'Drying/Evaporation - description'):
            temp = insert('Description', sheet.cell_value(irow, 1), temp)
        # Temperature
        if match(sheet.cell_value(irow, 0), 'Drying/Evaporation - temperature'):
            temperature = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            temperature = addKVU('Temperature', '', sheet.row_values(irow)[1],
                                 sheet.row_values(irow)[2], '', '', '', '', temperature, jobDir, myXSDtree)
            # else:
            #     temperature = addKVU('Temperature', sheet.row_values(irow)[1], '',
            #                          sheet.row_values(irow)[2], '', '', '', '', temperature)
            if len(temperature) > 0:
                temp.append(temperature)
        # Time
        if match(sheet.cell_value(irow, 0), 'Drying/Evaporation - time'):
            time = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            time = addKVU('Time', '', sheet.row_values(irow)[1],
                          sheet.row_values(irow)[2], '', '', '', '', time, jobDir, myXSDtree)
            # else:
            #     time = addKVU('Time', sheet.row_values(irow)[1], '',
            #                   sheet.row_values(irow)[2], '', '', '', '', time)
            if len(time) > 0:
                temp.append(time)
        # Pressure
        if match(sheet.cell_value(irow, 0), 'Drying/Evaporation - pressure'):
            pressure = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            pressure = addKVU('Pressure', '', sheet.row_values(irow)[1],
                              sheet.row_values(irow)[2], '', '', '', '', pressure, jobDir, myXSDtree)
            # else:
            #     pressure = addKVU('Pressure', sheet.row_values(irow)[1], '',
            #                       sheet.row_values(irow)[2], '', '', '', '', pressure)
            if len(pressure) > 0:
                temp.append(pressure)
        # AmbientCondition
        if match(sheet.cell_value(irow, 0), 'Drying/Evaporation - ambient condition'):
            temp = insert('AmbientCondition', sheet.cell_value(irow, 1), temp)

    # Centrifugation
        # Used or not
        if match(sheet.cell_value(irow, 0), 'Centrifugation'):
            temp = sheet.cell_value(irow, 1)

    # Molding
        # MoldingMode
        if match(sheet.cell_value(irow, 0), 'Molding - mode'):
            temp = insert('MoldingMode', sheet.cell_value(irow, 1), temp)
        # MoldingInfo/Description
        if match(sheet.cell_value(irow, 0), 'Molding - description'):
            MoldingInfo = insert('Description', sheet.cell_value(irow, 1), MoldingInfo)
        # MoldingInfo/Temperature
        if match(sheet.cell_value(irow, 0), 'Molding - temperature'):
            temperature = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            temperature = addKVU('Temperature', '', sheet.row_values(irow)[1],
                                 sheet.row_values(irow)[2], '', '', '', '', temperature, jobDir, myXSDtree)
            # else:
            #     temperature = addKVU('Temperature', sheet.row_values(irow)[1], '',
            #                          sheet.row_values(irow)[2], '', '', '', '', temperature)
            if len(temperature) > 0:
                MoldingInfo.append(temperature)
        # MoldingInfo/Time
        if match(sheet.cell_value(irow, 0), 'Molding - time'):
            time = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            time = addKVU('Time', '', sheet.row_values(irow)[1],
                          sheet.row_values(irow)[2], '', '', '', '', time, jobDir, myXSDtree)
            # else:
            #     time = addKVU('Time', sheet.row_values(irow)[1], '',
            #                   sheet.row_values(irow)[2], '', '', '', '', time)
            if len(time) > 0:
                MoldingInfo.append(time)
        # MoldingInfo/Pressure
        if match(sheet.cell_value(irow, 0), 'Molding - pressure'):
            pressure = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            pressure = addKVU('Pressure', '', sheet.row_values(irow)[1],
                              sheet.row_values(irow)[2], '', '', '', '', pressure, jobDir, myXSDtree)
            # else:
            #     pressure = addKVU('Pressure', sheet.row_values(irow)[1], '',
            #                       sheet.row_values(irow)[2], '', '', '', '', pressure)
            if len(pressure) > 0:
                MoldingInfo.append(pressure)
        # AmbientCondition
        if match(sheet.cell_value(irow, 0), 'Molding - ambient condition'):
            MoldingInfo = insert('AmbientCondition', sheet.cell_value(irow, 1), MoldingInfo)

    # Curing
        # Description
        if match(sheet.cell_value(irow, 0), 'Curing - description'):
            temp = insert('Description', sheet.cell_value(irow, 1), temp)
        # Temperature
        if match(sheet.cell_value(irow, 0), 'Curing - temperature'):
            temperature = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            temperature = addKVU('Temperature', '', sheet.row_values(irow)[1],
                                 sheet.row_values(irow)[2], '', '', '', '', temperature, jobDir, myXSDtree)
            # else:
            #     temperature = addKVU('Temperature', sheet.row_values(irow)[1], '',
            #                          sheet.row_values(irow)[2], '', '', '', '', temperature)
            if len(temperature) > 0:
                temp.append(temperature)
        # Time
        if match(sheet.cell_value(irow, 0), 'Curing - time'):
            time = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            time = addKVU('Time', '', sheet.row_values(irow)[1],
                          sheet.row_values(irow)[2], '', '', '', '', time, jobDir, myXSDtree)
            # else:
            #     time = addKVU('Time', sheet.row_values(irow)[1], '',
            #                   sheet.row_values(irow)[2], '', '', '', '', time)
            if len(time) > 0:
                temp.append(time)
        # Pressure
        if match(sheet.cell_value(irow, 0), 'Curing - pressure'):
            pressure = collections.OrderedDict()
            # if type(sheet.row_values(irow)[1]) == float or len(sheet.row_values(irow)[1]) > 0:
            pressure = addKVU('Pressure', '', sheet.row_values(irow)[1],
                              sheet.row_values(irow)[2], '', '', '', '', pressure, jobDir, myXSDtree)
            # else:
            #     pressure = addKVU('Pressure', sheet.row_values(irow)[1], '',
            #                       sheet.row_values(irow)[2], '', '', '', '', pressure)
            if len(pressure) > 0:
                temp.append(pressure)
        # AmbientCondition
        if match(sheet.cell_value(irow, 0), 'Curing - ambient condition'):
            temp = insert('AmbientCondition', sheet.cell_value(irow, 1), temp)

        # move to the next row
        irow += 1
    # END OF THE LOOP
    # don't forget about the last temp
    # special case Molding, need to save the list for MoldingInfo into temp
    if prevTemp == 'Molding' and len(MoldingInfo) > 0:
        # sort MoldingInfo
        MoldingInfo = sortSequence(MoldingInfo, 'MoldingInfo', myXSDtree)
        # then save MoldingInfo as a dict in temp
        temp.append({'MoldingInfo': MoldingInfo})
    # special case Extrusion, need to save the list from bottom up
    # (HeatingZone and Output => Extrusion => dict with
    # SingleScrewExtrusion or TwinScrewExtrusion as key) into temp
    if prevTemp == 'Extrusion':
        if len(ExtrsHZ) > 0:
            # sort ExtrsHZ
            ExtrsHZ = sortSequence(ExtrsHZ, 'ExtrusionHeatingZone', myXSDtree)
            Extrusion.append({'HeatingZone': ExtrsHZ})
            # initialize
            ExtrsHZ = []
        if len(ExtrsOP) > 0:
            # sort ExtrsOP
            ExtrsOP = sortSequence(ExtrsOP, 'ExtrusionOutput', myXSDtree)
            Extrusion.append({'Output': ExtrsOP})
            # initialize
            ExtrsOP = []
        if len(Extrusion) > 0:
            # sort Extrusion
            Extrusion = sortSequence(Extrusion, prevExtrsHeader, myXSDtree)
            temp.append({prevExtrsHeader: Extrusion})
    # save temp
    if len(temp) > 0: # update temp if it's not empty
        # sort temp
        temp = sortSequence(temp, prevTemp, myXSDtree)
        temp_list.append({'ChooseParameter': {headers[prevTemp]: temp}})
        temp = []
##    prevTemp = cleanTemp # update prevTemp

##     if (prevTemp and len(temp) > 0):
##        temp_list.append({'ChooseParameter': {headers[prevTemp]: temp}})
    return temp_list

def sheetProcType(sheet, DATA, myXSDtree, jobDir):
    # a flag to indicate whether a processing method is selected by the user
    prcMtd_flag = False
    Process_list = [] # could have SolutionProcessing, MeltMixing, In-SituPolymerization
    temp_list = [] # a temperary list in case multiple processing methods

    ExpPrc = [] # an emptry list for ExperimentalProcedure
    for row in range(sheet.nrows):
        # Experimental Procedure, assume no duplication allowed
        if match(sheet.row_values(row)[0], 'Experimental Procedure'):
            if len(sheet.cell_value(row, 1).strip()) > 0:
                ExpPrc.append(sheet.cell_value(row, 1).strip())
        # decide which list to add to by scanning Processing Method #
        if match(sheet.row_values(row)[0], 'Processing method'):
            prcMtd = sheet.cell_value(row, 1).strip()
            # SolutionProcessing
            if match(prcMtd, 'SolutionProcessing'):
                temp_list = [] # initialize
                temp_list = sheetProcTypeHelper(sheet, row, temp_list, 'Processing method', myXSDtree, jobDir) # helper
                if len(temp_list) > 0:
                    # dump the temp_list as a dict into Process_list
                    Process_list.append(collections.OrderedDict({'SolutionProcessing': temp_list}))
            # Meltmixing
            if match(prcMtd, 'MeltMixing'):
                temp_list = [] # initialize
                temp_list = sheetProcTypeHelper(sheet, row, temp_list, 'Processing method', myXSDtree, jobDir) # helper
                if len(temp_list) > 0:
                    # dump the temp_list as a dict into Process_list
                    Process_list.append(collections.OrderedDict({'MeltMixing': temp_list}))
            # In-SituPolymerization
            if match(prcMtd, 'In-SituPolymerization'):
                temp_list = [] # initialize
                temp_list = sheetProcTypeHelper(sheet, row, temp_list, 'Processing method', myXSDtree, jobDir) # helper
                if len(temp_list) > 0:
                    # dump the temp_list as a dict into Process_list
                    Process_list.append(collections.OrderedDict({'In-SituPolymerization': temp_list}))
            # OtherProcessing
            if match(prcMtd, 'Other_Processing'):
                temp_list = [] # initialize
                temp_list = sheetProcTypeHelper(sheet, row, temp_list, 'Processing method', myXSDtree, jobDir) # helper
                if len(temp_list) > 0:
                    # dump the temp_list as a dict into Process_list
                    Process_list.append(collections.OrderedDict({'Other_Processing': temp_list}))
    # finish up the Experimental Procedure part
    if len(ExpPrc) > 0:
        Process_list.insert(0, collections.OrderedDict({'ExperimentalProcedure': ExpPrc}))
    # dump into DATA
    if len(Process_list) > 0:
        # sort Process_list
        Process_list = sortSequence(Process_list, 'PROCESSING', myXSDtree)
        DATA.append({'PROCESSING': Process_list})
    return DATA



# Sheet 4. Characterization Methods
def sheetCharMeth(sheet, DATA, myXSDtree, jobDir):
    headers = {'Transmission electron microscopy': 'Transmission_Electron_Microscopy',
               'Scanning electron microscopy': 'Scanning_Electron_Microscopy',
               'Atomic force microscopy': 'Atomic_Force_Microscopy',
               'Optical microscopy': 'OpticalMicroscopy',
               'Confocal microscopy': 'Confocal_Microscopy',
               'Scanning tunneling microscopy': 'Scanning_Tunneling_Microscopy',
               'Fourier transform infrared spectroscopy': 'Fourier_Transform_Infrared_Spectroscopy',
               'Dielectric and impedance spectroscopy analysis': 'Dielectric_and_Impedance_Spectroscopy_Analysis',
               'Raman spectroscopy': 'Raman_Spectroscopy',
               'Xray photoelectron spectroscopy': 'XRay_Photoelectron_Spectroscopy',
               'Nuclear magnetic resonance': 'Nuclear_Magnetic_Resonance',
               'Neutron spin echo spectroscopy': 'Neutron_Spin_Echo_Spectroscopy',
               'Calorimetry': 'Calorimetry',
               'Differential thermal analysis': 'Differential_Thermal_Analysis',
               'Differential scanning calorimetry': 'Differential_Scanning_Calorimetry',
               'Thermogravimetric analysis': 'Thermogravimetric_Analysis',
               'Dynamic thermal analysis': 'Dynamic_Thermal_Analysis',
               'Dynamic mechanical analysis': 'Dynamic_Mechanical_Analysis',
               'Xray diffraction and scattering': 'XRay_Diffraction_and_Scattering',
               'Neutron scattering': 'Neutron_Scattering',
               'Light scattering': 'Light_Scattering',
               'Pulsed electro acoustic': 'Pulsed_Electro_Acoustic',
               'Rheometry': 'Rheometery',
               'Electrometry': 'Electrometry'}
    temp_list = [] # the highest level list for CHARACTERIZATION
    temp = [] # always save temp if not empty when we find a match in headers
    prevTemp = '' # save the previous cleanTemp
    for row in range(sheet.nrows):
        cleanTemp = matchList(sheet.cell_value(row, 0), headers.keys())
        if cleanTemp:
            if len(prevTemp) == 0: # initialize prevTemp
                prevTemp = cleanTemp
            # save temp
            if len(temp) > 0: # update temp if it's not empty
                # sort temp
                temp = sortSequence(temp, prevTemp, myXSDtree)
                temp_list.append({headers[prevTemp]: temp})
                temp = []
            prevTemp = cleanTemp # update prevTemp
        # EquipmentUsed (schema should update on this !!!!!!!!!!!)
        if match(sheet.cell_value(row, 0), 'Equipment used'):
            if match(prevTemp, 'Transmission electron microscopy') or match(prevTemp, 'Scanning electron microscopy'):
                temp = insert('EquipmentUsed', sheet.cell_value(row, 1), temp)
            else:
                temp = insert('Equipment', sheet.cell_value(row, 1), temp)
        # Description
        if match(sheet.cell_value(row, 0), 'Equipment description'):
            temp = insert('Description', sheet.cell_value(row, 1), temp)
        # Magnification
        if match(sheet.cell_value(row, 0), 'Magnification'):
            mag = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            mag = addKVU('Magnification', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], mag, jobDir, myXSDtree)
            if len(mag) > 0:
                temp.append(mag)
        # AcceleratingVoltage
        if match(sheet.cell_value(row, 0), 'Accelerating voltage'):
            accV = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            accV = addKVU('AcceleratingVoltage', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], accV, jobDir, myXSDtree)
            if len(accV) > 0:
                temp.append(accV)
        # EmissionCurrent
        if match(sheet.cell_value(row, 0), 'Emission current'):
            emiC = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            emiC = addKVU('EmissionCurrent', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], emiC, jobDir, myXSDtree)
            if len(emiC) > 0:
                temp.append(emiC)
        # WorkingDistance
        if match(sheet.cell_value(row, 0), 'Working distance'):
            worD = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            worD = addKVU('WorkingDistance', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], worD, jobDir, myXSDtree)
            if len(worD) > 0:
                temp.append(worD)
        # ExposureTime
        if match(sheet.cell_value(row, 0), 'Exposure time'):
            expT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            expT = addKVU('ExposureTime', '', myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], expT, jobDir, myXSDtree)
            if len(expT) > 0:
                temp.append(expT)
        # Data
        if match(sheet.cell_value(row, 0), 'Result data') or match(sheet.cell_value(row, 0), 'Result data (fixed value, unit)'):
            resD = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            resD = addKVU('data', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], resD, jobDir, myXSDtree)
            if len(resD) > 0:
                temp.append(resD)
        # HeatingRate
        if match(sheet.cell_value(row, 0), 'Heating rate'):
            heaR = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            heaR = addKVU('HeatingRate', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], heaR, jobDir, myXSDtree)
            if len(heaR) > 0:
                temp.append(heaR)
        # CoolingRate
        if match(sheet.cell_value(row, 0), 'Cooling rate'):
            cooR = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            cooR = addKVU('CoolingRate', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], cooR, jobDir, myXSDtree)
            if len(cooR) > 0:
                temp.append(cooR)
        # CycleInformation
        if match(sheet.cell_value(row, 0), 'Cycle information'):
            temp = insert('CycleInformation', sheet.cell_value(row, 1), temp)
        # RheometerType
        if match(sheet.cell_value(row, 0), 'Rheometer type'):
            temp = insert('RheometerType', sheet.cell_value(row, 1), temp)
        # CapillarySize
        if match(sheet.cell_value(row, 0), 'Capillary size'):
            temp = insert('CapillarySize', sheet.cell_value(row, 1), temp)
    # END OF THE LOOP
    # don't forget about the last temp
    # save temp
    if len(temp) > 0: # update temp if it's not empty
        # sort temp
        temp = sortSequence(temp, prevTemp, myXSDtree)
        temp_list.append({headers[prevTemp]: temp})
        temp = []
    if len(temp_list) > 0:
        # sort temp_list
        temp_list = sortSequence(temp_list, 'CHARACTERIZATION', myXSDtree)
        DATA.append({'CHARACTERIZATION': temp_list})
    return DATA


# Sheet 5. Properties addressed - Mechanical
def sheetPropMech(sheet, DATA_PROP, myXSDtree, jobDir):
    headers = {'Tensile': 'Tensile', 'Flexural': 'Flexural',
               'Compression': 'Compression', 'Shear': 'Shear',
               'Fracture': 'FractureToughness', 'Impact': 'Impact',
               'Hardness': 'Hardness'}
    headers_fracture = {'Essential work of fracture (EWF)': 'EssentialWorkOfFracture',
                        'Linear Elastic': 'LinearElastic',
                        'Plastic Elastic': 'PlasticElastic'}
    temp_list = [] # the highest level list for PROPERTIES/Mechanical
    temp = [] # always save temp if not empty when we find a match in headers
    Conditions = [] # a list for Mechanical/.../Conditions
    LoadingProfile = [] # a list for Mechanical/.../LoadingProfile
    tempFracture = [] # a list for Mechanical/FractureToughness/EssentialWorkOfFracture and LinearElastic and PlasticElastic
    prevTemp = '' # save the previous cleanTemp
    prevTempFrac = '' # save the previous cleanTempFrac
    underFrac = False # a flag, True if our cursor is under a Fracture field. We need this flag in case the Excel sheet ends with a shared "Loading Profile (filename.xlsx)"
    for row in range(sheet.nrows):
        # First deal with the Fracture
        cleanTempFrac = matchList(sheet.cell_value(row, 0), headers_fracture.keys())
        if cleanTempFrac:
            underFrac = True # update flag underFrac
            if len(prevTempFrac) == 0: # initialize prevTempFrac
                prevTempFrac = cleanTempFrac
            # special case LoadingProfile(profile), need to save the list
            if len(LoadingProfile) > 0:
                tempFracture.append({'profile': LoadingProfile})
                # initialize
                LoadingProfile = []
            # save tempFracture
            if len(tempFracture) > 0: # update temp if it's not empty
                # sort tempFracture
                tempFracture = sortSequence(tempFracture, prevTempFrac, myXSDtree)
                temp.append({headers_fracture[prevTempFrac]: tempFracture})
                tempFracture = []
                prevTempFrac = ''
            prevTempFrac = cleanTempFrac # update prevTemp
        # Then deal with higher level headers
        cleanTemp = matchList(sheet.cell_value(row, 0), headers.keys())
        if cleanTemp:
            underFrac = False # update flag underFrac
            if len(prevTemp) == 0: # initialize prevTemp
                prevTemp = cleanTemp
            # special case FractureToughness, need to save tempFracture
            if prevTemp == 'Fracture':
                # special case profile, need to save the list
                if len(tempFracture) > 0: # update temp if it's not empty
                    # sort tempFracture
                    tempFracture = sortSequence(tempFracture, prevTempFrac, myXSDtree)
                    temp.append({headers_fracture[prevTempFrac]: tempFracture})
                    tempFracture = []
                    prevTempFrac = ''
            # special case Condition, need to save the list from bottom up
            # into temp
            if len(Conditions) > 0:
                # sort Conditions
                Conditions = sortSequence(Conditions, 'Conditions', myXSDtree)
                temp.append({'Conditions': Conditions})
                # initialize
                Conditions = []
            # special case LoadingProfile, need to save the list
            if len(LoadingProfile) > 0:
                temp.insert(0, {'LoadingProfile': LoadingProfile})
                # initialize
                LoadingProfile = []
            # save temp
            if len(temp) > 0: # update temp if it's not empty
                # sort temp
                temp = sortSequence(temp, prevTemp, myXSDtree)
                temp_list.append({headers[prevTemp]: temp})
                temp = []
            prevTemp = cleanTemp # update prevTemp
        # Tensile
            # TensileModulus
        if match(sheet.cell_value(row, 0), 'Tensile Modulus'):
            tenM = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            tenM = addKVU('TensileModulus', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], tenM, jobDir, myXSDtree)
            if len(tenM) > 0:
                temp.append(tenM)
            # TensileStressAtBreak
        if match(sheet.cell_value(row, 0), 'Tensile stress at break'):
            tenB = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            tenB = addKVU('TensileStressAtBreak', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], tenB, jobDir, myXSDtree)
            if len(tenB) > 0:
                temp.append(tenB)
            # TensileStressAtYield
        if match(sheet.cell_value(row, 0), 'Tensile stress at yield'):
            tenY = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            tenY = addKVU('TensileStressAtYield', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], tenY, jobDir, myXSDtree)
            if len(tenY) > 0:
                temp.append(tenY)
            # TensileStrength
        if match(sheet.cell_value(row, 0), 'Tensile strength'):
            tenS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            tenS = addKVU('TensileStrength', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], tenS, jobDir, myXSDtree)
            if len(tenS) > 0:
                temp.append(tenS)
            # StressRelaxation
        if match(sheet.cell_value(row, 0), 'Stress relaxation (filename.xlsx)'):
            if hasLen(sheet.cell_value(row, 1)):
                strR = collections.OrderedDict()
                strR = addKVU('StressRelaxation', '', '', '', '', '', '', sheet.cell_value(row, 1), strR, jobDir, myXSDtree)
                if len(strR) > 0:
                    temp.append(strR)
            # StrainAtBreak
        if match(sheet.cell_value(row, 0), 'Strain at break'):
            strB = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            strB = addKVU('StrainAtBreak', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], strB, jobDir, myXSDtree)
            if len(strB) > 0:
                temp.append(strB)
            # TensileToughness
        if match(sheet.cell_value(row, 0), 'Tensile toughness'):
            tenT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            tenT = addKVU('TensileToughness', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], tenT, jobDir, myXSDtree)
            if len(tenT) > 0:
                temp.append(tenT)
            # ElongationAtBreak
        if match(sheet.cell_value(row, 0), 'Elongation at break'):
            eloB = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            eloB = addKVU('ElongationAtBreak', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], eloB, jobDir, myXSDtree)
            if len(eloB) > 0:
                temp.append(eloB)
            # ElongationAtYield
        if match(sheet.cell_value(row, 0), 'Elongation at yield'):
            eloY = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            eloY = addKVU('ElongationAtYield', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], eloY, jobDir, myXSDtree)
            if len(eloY) > 0:
                temp.append(eloY)
            # FiberTensileModulus
        if match(sheet.cell_value(row, 0), 'Fiber tensile modulus'):
            fibM = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            fibM = addKVU('FiberTensileModulus', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], fibM, jobDir, myXSDtree)
            if len(fibM) > 0:
                temp.append(fibM)
            # FiberTensileStrength
        if match(sheet.cell_value(row, 0), 'Fiber tensile strength'):
            fibS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            fibS = addKVU('FiberTensileStrength', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], fibS, jobDir, myXSDtree)
            if len(fibS) > 0:
                temp.append(fibS)
            # FiberTensileElongation
        if match(sheet.cell_value(row, 0), 'Fiber tensile elongation'):
            fibE = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            fibE = addKVU('FiberTensileElongation', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], fibE, jobDir, myXSDtree)
            if len(fibE) > 0:
                temp.append(fibE)
            # PoissonsRatio
        if match(sheet.cell_value(row, 0), '''Poisson's ratio'''):
            temp = insert('PoissonsRatio', sheet.cell_value(row, 2), temp)
        # Flexural
            # FlexuralModulus
        if match(sheet.cell_value(row, 0), 'Flexural modulus'):
            fleM = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            fleM = addKVU('FlexuralModulus', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], fleM, jobDir, myXSDtree)
            if len(fleM) > 0:
                temp.append(fleM)
            # FlexuralStressAtBreak
        if match(sheet.cell_value(row, 0), 'Flexural stress at break'):
            fleB = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            fleB = addKVU('FlexuralStressAtBreak', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], fleB, jobDir, myXSDtree)
            if len(fleB) > 0:
                temp.append(fleB)
            # FlexuralStressAtYield
        if match(sheet.cell_value(row, 0), 'Flexural stress at yield'):
            fleY = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            fleY = addKVU('FlexuralStressAtYield', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], fleY, jobDir, myXSDtree)
            if len(fleY) > 0:
                temp.append(fleY)
            # FlexuralToughness
        if match(sheet.cell_value(row, 0), 'Flexural toughness'):
            fleT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            fleT = addKVU('FlexuralToughness', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], fleT, jobDir, myXSDtree)
            if len(fleT) > 0:
                temp.append(fleT)
        # Compression
            # CompressionModulus
        if match(sheet.cell_value(row, 0), 'Compression modulus'):
            comM = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            comM = addKVU('CompressionModulus', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], comM, jobDir, myXSDtree)
            if len(comM) > 0:
                temp.append(comM)
            # CompressionStressAtBreak
        if match(sheet.cell_value(row, 0), 'Compression stress at break'):
            comB = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            comB = addKVU('CompressionStressAtBreak', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], comB, jobDir, myXSDtree)
            if len(comB) > 0:
                temp.append(comB)
            # CompressionStressAtYield
        if match(sheet.cell_value(row, 0), 'Compression stress at yield'):
            comY = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            comY = addKVU('CompressionStressAtYield', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], comY, jobDir, myXSDtree)
            if len(comY) > 0:
                temp.append(comY)
            # CompressiveToughness
        if match(sheet.cell_value(row, 0), 'Compressive toughness'):
            comT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            comT = addKVU('CompressiveToughness', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], comT, jobDir, myXSDtree)
            if len(comT) > 0:
                temp.append(comT)
        # Shear
            # ShearModulus
        if match(sheet.cell_value(row, 0), 'Shear modulus'):
            sheM = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            sheM = addKVU('ShearModulus', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], sheM, jobDir, myXSDtree)
            if len(sheM) > 0:
                temp.append(sheM)
            # ShearStressAtBreak
        if match(sheet.cell_value(row, 0), 'Shear stress at break'):
            sheB = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            sheB = addKVU('ShearStressAtBreak', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], sheB, jobDir, myXSDtree)
            if len(sheB) > 0:
                temp.append(sheB)
            # ShearStressAtYield
        if match(sheet.cell_value(row, 0), 'Shear stress at yield'):
            sheY = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            sheY = addKVU('ShearStressAtYield', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], sheY, jobDir, myXSDtree)
            if len(sheY) > 0:
                temp.append(sheY)
        # FractureToughness
            # preCrackingProcess (upper case leading P for EssentialWorkFracture)
        if match(sheet.cell_value(row, 0), 'Pre-cracking process'):
            tempFracture = insert('preCrackingProcess', sheet.cell_value(row, 1), tempFracture)
            # strainRate (upper case leading S for EssentialWorkFracture)
        if match(sheet.cell_value(row, 0), 'Strain rate'):
            strR = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            strR = addKVU('strainRate', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], strR, jobDir, myXSDtree)
            if len(strR) > 0:
                tempFracture.append(strR)
            # FractureEnergy
        if match(sheet.cell_value(row, 0), 'Fracture energy'):
            fraE = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            fraE = addKVU('FractureEnergy', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], fraE, jobDir, myXSDtree)
            if len(fraE) > 0:
                tempFracture.append(fraE)
            # sampleShape
        if match(sheet.cell_value(row, 0), 'Sample shape'):
            tempFracture = insert('sampleShape', sheet.cell_value(row, 1), tempFracture)
            # K-factor
        if match(sheet.cell_value(row, 0), 'K-factor'):
            tempFracture = insert('K-factor', sheet.cell_value(row, 1), tempFracture)
            # J-integral
        if match(sheet.cell_value(row, 0), 'J-integral'):
            tempFracture = insert('J-integral', sheet.cell_value(row, 1), tempFracture)
        # Impact
            # Notch
        if match(sheet.cell_value(row, 0), 'Notch'):
            temp = insert('Notch', sheet.cell_value(row, 1), temp)
            # IZOD_Area
        if match(sheet.cell_value(row, 0), 'IZOD-Area'):
            izoA = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            izoA = addKVU('IZOD_Area', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], izoA, jobDir, myXSDtree)
            if len(izoA) > 0:
                temp.append(izoA)
            # IZOD_ImpactEnergy
        if match(sheet.cell_value(row, 0), 'IZOD-Impact energy'):
            izoI = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            izoI = addKVU('IZOD_ImpactEnergy', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], izoI, jobDir, myXSDtree)
            if len(izoI) > 0:
                temp.append(izoI)
            # CharpyImpactEnergy
        if match(sheet.cell_value(row, 0), 'Charpy Impact Energy'):
            chaI = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            chaI = addKVU('CharpyImpactEnergy', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], chaI, jobDir, myXSDtree)
            if len(chaI) > 0:
                temp.append(chaI)
            # ImpactToughness
        if match(sheet.cell_value(row, 0), 'Impact toughness'):
            impT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            impT = addKVU('ImpactToughness', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], impT, jobDir, myXSDtree)
            if len(impT) > 0:
                temp.append(impT)
        # SHARED PROPERTIES
        # Conditions
            # StrainRate
        if match(sheet.cell_value(row, 0), 'Conditions-Strain rate'):
            conS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            conS = addKVU('StrainRate', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], conS, jobDir, myXSDtree)
            if len(conS) > 0:
                Conditions.append(conS)
            # PreLoad
        if match(sheet.cell_value(row, 0), 'Conditions-Preload'):
            conP = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            conP = addKVU('PreLoad', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], conP, jobDir, myXSDtree)
            if len(conP) > 0:
                Conditions.append(conP)
            # LoadingProfile
        if match(sheet.cell_value(row, 0), 'Loading Profile (filename.xlsx)'):
            if hasLen(sheet.cell_value(row, 1)):
                LP = collections.OrderedDict()
                LP = addKVU('DeleteMe', '', '', '', '', '', '', sheet.cell_value(row, 1), LP, jobDir, myXSDtree)
                if len(LP) > 0 and 'DeleteMe' in LP.keys() and 'data' in LP['DeleteMe'].keys():
                    LoadingProfile.append(LP['DeleteMe']['data'])
        # Hardness
            # HardnessTestStandard
        if match(sheet.cell_value(row, 0), 'Test standard'):
            temp = insert('HardnessTestStandard', sheet.cell_value(row, 1), temp)
            # HardnessScale
        if match(sheet.cell_value(row, 0), 'Scale'):
            temp = insert('HardnessScale', sheet.cell_value(row, 1), temp)
            # HardnessValue
        if match(sheet.cell_value(row, 0), 'Hardness value'):
            harV = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            harV = addKVU('HardnessValue', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], harV, jobDir, myXSDtree)
            if len(harV) > 0:
                temp.append(harV)
    # END OF THE LOOP
    # based on the flag
    if underFrac:
        # special case LoadingProfile(profile), need to save the list
        if len(LoadingProfile) > 0:
            tempFracture.append({'profile': LoadingProfile})
            # initialize
            LoadingProfile = []
        # save tempFracture if it's not empty
        if len(tempFracture) > 0: # update temp if it's not empty
            # sort tempFracture
            tempFracture = sortSequence(tempFracture, prevTempFrac, myXSDtree)
            temp.append({headers_fracture[prevTempFrac]: tempFracture})
            tempFracture = []
    else:
        # special case Condition, need to save the list from bottom up into temp
        if len(Conditions) > 0:
            # sort Conditions
            Conditions = sortSequence(Conditions, 'Conditions', myXSDtree)
            temp.append({'Conditions': Conditions})
            # initialize
            Conditions = []
        # special case LoadingProfile, need to save the list
        if len(LoadingProfile) > 0:
            temp.insert(0, {'LoadingProfile': LoadingProfile})
            # initialize
            LoadingProfile = []
    # don't forget about the last temp
    # save temp
    if len(temp) > 0: # update temp if it's not empty
        # sort temp
        temp = sortSequence(temp, prevTemp, myXSDtree)
        temp_list.append({headers[prevTemp]: temp})
        temp = []
    if len(temp_list) > 0:
        # sort temp_list
        temp_list = sortSequence(temp_list, 'Mechanical', myXSDtree)
        DATA_PROP.append({'Mechanical': temp_list})
    return DATA_PROP


# Sheet 5. Properties addressed - Viscoelastic
def sheetPropVisc(sheet, DATA_PROP, myXSDtree, jobDir):
    headers = {'Dynamic properties': 'DynamicProperties',
               'Creep': 'Creep'}
    headers_sub = {'Equipment Description': 'Description',
                   'Measurement mode': 'MeasurementMode',
                   'Measurement method': 'MeasurementMethod',
                   'DMA mode': 'DMA_mode',
                   'DMA Datafile.xlsx': 'DynamicPropertyProfile',
                   'Master Curve.xlsx': 'MasterCurve'}
    headers_creep = {'Compressive': 'Compressive',
                     'Tensile': 'Tensile',
                     'Flexural': 'Flexural'}
    headers_DMA = {'Frequency sweep': 'FrequencySweep',
                   'Temperature sweep': 'TemperatureSweep',
                   'Strain sweep': 'StrainSweep'}
    temp_list = [] # the highest level list for PROPERTIES/Viscoelastic
    temp = [] # always save temp if not empty when we find a match in headers
    temp_Creep = [] # a list for Viscoelastic/DynamicProperties/DMA_mode/ and Viscoelastic/Creep/.../
    DMA_Test = [] # a list for Viscoelastic/DynamicProperties/DMA_mode/.../condition
    prevTemp = '' # save the previous cleanTemp, "Dynamic properties" or "Creep"
    prevCreep = '' # save the previous cleanCreep, "Compressive", "Tensile" or "Flexural"
    prevDMA = '' # save the previous cleanDMA, "Frequency sweep", "Temperature sweep" or "Strain sweep"
    DMA_file_num = 0 # count the number of DMA file.xlsx specified by the user

    for row in range(sheet.nrows):
        # First deal with the DMA_Test
        if matchList(sheet.cell_value(row, 0), headers.keys()) or matchList(sheet.cell_value(row, 0), headers_creep.keys()):
            if len(DMA_Test) > 0 and len(prevDMA) > 0: # update DMA_Test if it's not empty and user has selected DMA_mode
                # sort DMA_Test
                DMA_Test = sortSequence(DMA_Test, prevDMA, myXSDtree)
                temp.append({'DMA_mode': {headers_DMA[prevDMA]: {'condition': DMA_Test}}})
                DMA_Test = []
                prevDMA = ''
        # Second deal with the Creep
        cleanCreep = matchList(sheet.cell_value(row, 0), headers_creep.keys())
        if cleanCreep:
            if len(prevCreep) == 0: # initialize prevCreep
                prevCreep = cleanCreep
            # save temp_Creep
            if len(temp_Creep) > 0: # update temp_Creep if it's not empty
                # sort temp_Creep
                temp_Creep = sortSequence(temp_Creep, prevCreep + 'Visc', myXSDtree)
                temp.append({headers_creep[prevCreep]: temp_Creep})
                temp_Creep = []
                prevCreep = ''
            prevCreep = cleanCreep # update prevCreep
        # Then deal with higher level headers
        cleanTemp = matchList(sheet.cell_value(row, 0), headers.keys())
        if cleanTemp:
            if len(prevTemp) == 0: # initialize prevTemp
                prevTemp = cleanTemp
            # save temp
            if len(temp) > 0: # update temp if it's not empty
                # sort temp
                temp = sortSequence(temp, prevTemp, myXSDtree)
                temp_list.append({headers[prevTemp]: temp})
                temp = []
            prevTemp = cleanTemp # update prevTemp
        # DynamicProperties/Description
        if match(sheet.cell_value(row, 0), 'Equipment Description'):
            temp = insert('Description', sheet.cell_value(row, 1), temp)
        # DynamicProperties/MeasurementMode
        if match(sheet.cell_value(row, 0), 'Measurement mode'):
            temp = insert('MeasurementMode', sheet.cell_value(row, 1), temp)
        # DynamicProperties/MeasurementMethod
        if match(sheet.cell_value(row, 0), 'Measurement method'):
            temp = insert('MeasurementMethod', sheet.cell_value(row, 1), temp)
        # DynamicProperties/DMA_mode
        if match(sheet.cell_value(row, 0), 'DMA mode'):
            if hasLen(sheet.cell_value(row, 1)):
                prevDMA = sheet.cell_value(row, 1).strip() # update prevDMA
        # DynamicProperties/DMA_mode/.../condition/temperature
        if match(sheet.cell_value(row, 0), 'Temperature'):
            temP = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            temP = addKVU('temperature', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], temP, jobDir, myXSDtree)
            if len(temP) > 0:
                DMA_Test.append(temP)
        # DynamicProperties/DMA_mode/.../condition/strainAmplitude
        if match(sheet.cell_value(row, 0), 'Strain amplitude'):
            strR = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            strR = addKVU('strainAmplitude', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], strR, jobDir, myXSDtree)
            if len(strR) > 0:
                DMA_Test.append(strR)
        # DynamicProperties/DMA_mode/.../condition/frequency
        if match(sheet.cell_value(row, 0), 'Frequency'):
            freQ = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            freQ = addKVU('frequency', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], freQ, jobDir, myXSDtree)
            if len(freQ) > 0:
                DMA_Test.append(freQ)
        # DynamicProperties/DynamicPropertyProfile (if we have multiple entries, copy all other fields in DynamicProperties)
        if match(sheet.cell_value(row, 0), 'DMA Datafile.xlsx'):
            dynP = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            dynP = addKVU('DynamicPropertyProfile',
                          '', '', '', '', '', myRow[1], myRow[2], dynP, jobDir, myXSDtree)
            if len(dynP) > 0:
                temp.append(dynP)
                DMA_file_num += 1 # add 1 count
        # DynamicProperties/MasterCurve
        if match(sheet.cell_value(row, 0), 'Master Curve.xlsx'):
            masC = collections.OrderedDict()
            masC_list = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            if hasLen(myRow[1]):
                masC['description'] = myRow[1]
            if type(myRow[2]) == str and len(myRow[2]) > 0:
                data = read_excel_profile(myRow[2], jobDir)
                small_dict_axis = axisInfo(data)
                if len(small_dict_axis) > 0:
                    masC['AxisLabel'] = small_dict_axis
                if len(data) > 0:
                    masC['data'] = data
            if len(masC) > 0:
                masC_list['MasterCurve'] = masC
                temp.append(masC_list)
        # CompressiveCreepRuptureStrength
        if match(sheet.cell_value(row, 0), 'Compressive creep rupture strength'):
            comS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            comS = addKVU('CompressiveCreepRuptureStrength', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], comS, jobDir, myXSDtree)
            if len(comS) > 0:
                temp_Creep.append(comS)
        # CompressiveCreepRuptureTime
        if match(sheet.cell_value(row, 0), 'Compressive creep rupture time'):
            comT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            comT = addKVU('CompressiveCreepRuptureTime', '', myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], comT, jobDir, myXSDtree)
            if len(comT) > 0:
                temp_Creep.append(comT)
        # CompressiveCreepStrain
        if match(sheet.cell_value(row, 0), 'Compressive creep strain'):
            comS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            comS = addKVU('CompressiveCreepStrain', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], comS, jobDir, myXSDtree)
            if len(comS) > 0:
                temp_Creep.append(comS)
        # TensileCreepRecovery
        if match(sheet.cell_value(row, 0), 'Tensile creep recovery'):
            temp_Creep = insert('TensileCreepRecovery', sheet.cell_value(row, 1), temp_Creep)
        # TensileCreepModulus
        if match(sheet.cell_value(row, 0), 'Tensile creep modulus'):
            tenM = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            tenM = addKVU('TensileCreepModulus', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], tenM, jobDir, myXSDtree)
            if len(tenM) > 0:
                temp_Creep.append(tenM)
        # TensileCreepCompliance
        if match(sheet.cell_value(row, 0), 'Tensile creep compliance'):
            tenC = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            tenC = addKVU('TensileCreepCompliance', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], tenC, jobDir, myXSDtree)
            if len(tenC) > 0:
                temp_Creep.append(tenC)
        # TensileCreepRuptureStrength
        if match(sheet.cell_value(row, 0), 'Tensile creep rupture strength'):
            tenS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            tenS = addKVU('TensileCreepRuptureStrength', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], tenS, jobDir, myXSDtree)
            if len(tenS) > 0:
                temp_Creep.append(tenS)
        # TensileCreepRuptureTime
        if match(sheet.cell_value(row, 0), 'Tensile creep rupture time'):
            tenT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            tenT = addKVU('TensileCreepRuptureTime', '', myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], tenT, jobDir, myXSDtree)
            if len(tenT) > 0:
                temp_Creep.append(tenT)
        # TensileCreepStrain
        if match(sheet.cell_value(row, 0), 'Tensile creep strain'):
            tenS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            tenS = addKVU('TensileCreepStrain', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], tenS, jobDir, myXSDtree)
            if len(tenS) > 0:
                temp_Creep.append(tenS)
        # FlexuralCreepRuptureStrength
        if match(sheet.cell_value(row, 0), 'Flexural creep rupture strength'):
            fleS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            fleS = addKVU('FlexuralCreepRuptureStrength', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], fleS, jobDir, myXSDtree)
            if len(fleS) > 0:
                temp_Creep.append(fleS)
        # FlexuralCreepRuptureTime
        if match(sheet.cell_value(row, 0), 'Flexural creep rupture time'):
            fleT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            fleT = addKVU('FlexuralCreepRuptureTime', '', myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], fleT, jobDir, myXSDtree)
            if len(fleT) > 0:
                temp_Creep.append(fleT)
        # FlexuralCreepStrain
        if match(sheet.cell_value(row, 0), 'Flexural creep strain'):
            fleS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            fleS = addKVU('FlexuralCreepStrain', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], fleS, jobDir, myXSDtree)
            if len(fleS) > 0:
                temp_Creep.append(fleS)

    # END OF THE LOOP
    # save DMA_Test if it's not empty and user has selected DMA_mode
    if len(DMA_Test) > 0 and len(prevDMA) > 0:
        # sort DMA_Test
        DMA_Test = sortSequence(DMA_Test, prevDMA, myXSDtree)
        temp.append({'DMA_mode': {headers_DMA[prevDMA]: {'condition': DMA_Test}}})
        DMA_Test = []
    # save temp_Creep if it's not empty
    if len(temp_Creep) > 0: # update temp_Creep if it's not empty
        # sort temp_Creep
        temp_Creep = sortSequence(temp_Creep, prevCreep + 'Visc', myXSDtree)
        temp.append({headers_creep[prevCreep]: temp_Creep})
        temp_Creep = []
    # don't forget about the last temp
    # save temp
    if len(temp) > 0: # update temp if it's not empty
        # sort temp
        temp = sortSequence(temp, prevTemp, myXSDtree)
        temp_list.append({headers[prevTemp]: temp})
        temp = []
    # scan for multiple DynamicPropertyProfile (DMA_file.xlsx)
    if DMA_file_num > 0:
        temp_list_new = [] # prepare a new temp_list
        for i in range(len(temp_list)):
            myDict = temp_list[i]
            if 'DynamicProperties' in myDict.keys():
                dynP_list = myDict['DynamicProperties'] # get the list of subdicts out
                dynP_list_no_dynPP = [] # initialize dynP_list_no_dynPP
                dynPPs = [] # a list for non DynamicProperties/DynamicPropertyProfile subdicts
                poplist = [] # a list for DPP index to be poped
                # loop thru Description, MeasurementMode, DMA_mode, DynamicPropertyProfile ...
                for i in range(len(dynP_list)):
                    od = dynP_list[i]
                    # if we find a DPP OrderedDict
                    if 'DynamicPropertyProfile' in od.keys():
                        # add it to poplist
                        poplist.append(i)
                # reverse the poplist and pop
                for j in poplist[::-1]:
                    # insert to the front
                    dynPPs = [dynP_list.pop(j)] + dynPPs
                # now dynP_list should have no OrderedDict has key 'DynamicPropertyProfile'
                # deepcopy it as dynP_list_no_dynPP
                dynP_list_no_dynPP = copy.deepcopy(dynP_list)
                # assemble the new dynP_list and put it into temp_list_new
                for dynPP in dynPPs:
                    dynP_list_with_dynPP = dynP_list_no_dynPP + [dynPP]
                    temp_list_new.append({'DynamicProperties': dynP_list_with_dynPP})
            # skip Creep dicts
            else:
                temp_list_new.append(myDict)
        # replace temp_list with temp_list_new
        temp_list = temp_list_new

    # add temp_list into DATA_PROP
    if len(temp_list) > 0:
        # sort temp_list
        temp_list = sortSequence(temp_list, 'Viscoelastic', myXSDtree)
        DATA_PROP.append({'Viscoelastic': temp_list})
    return DATA_PROP

# Sheet 5. Properties addressed - Electrical
def sheetPropElec(sheet, DATA_PROP, myXSDtree, jobDir):
    headers = {'Conductivity': 'ElectricConductivity',
               'Current density': 'CurrentDensity',
               'Energy density': 'EnergyDensity',
               'Surface resistivity': 'SurfaceResistivity',
               'Volume resistivity': 'VolumeResistivity',
               'Arc resistance': 'ArcResistance',
               'Impedance': 'Impedance',
               'Percolation threshold': 'ElectricPercolationThreshold',
               'DC dielectric constant': 'DC_DielectricConstant',
               'AC dielectric dispersion': 'AC_DielectricDispersion',
               'Dielectric breakdown strength': 'DielectricBreakdownStrength'}
    temp_list = [] # the highest level list for PROPERTIES/Electrical
    temp = [] # always save temp if not empty when we find a match in headers
    dep = collections.OrderedDict() # dict for dependence condition
    depend = '' # FrequencyDependence or TemperatureDependence
    prevTemp = '' # save the previous cleanTemp
    for row in range(sheet.nrows):
        cleanTemp = matchList(sheet.cell_value(row, 0), headers.keys())
        if cleanTemp:
            if len(prevTemp) == 0: # initialize prevTemp
                prevTemp = cleanTemp
            # if depend is not '', i.e. cleanTemp is AC dielectric dispersion
            if len(depend) > 0:
                # insert the dependence structure to temp, no need to sortSequence since we give it
                temp.append({'DielectricDispersionDependence':{depend:{'condition':dep}}})
                # reset dep and depend after added to temp
                dep = collections.OrderedDict()
                depend = ''
            # save temp
            if len(temp) > 0: # update temp if it's not empty
                # sort temp
                temp = sortSequence(temp, prevTemp, myXSDtree)
                temp_list.append({headers[prevTemp]: temp})
                temp = []
            prevTemp = cleanTemp # update prevTemp
        # ElectricConductivity
        if match(sheet.cell_value(row, 0), 'Conductivity'):
            eleC = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            eleC = addKVU('ElectricConductivity', myRow[1], myRow[2], myRow[3], '', '', '', myRow[4], eleC, jobDir, myXSDtree)
            if len(eleC) > 0:
                temp_list.append(eleC) # directly append to the higher level list
        # CurrentDensity
        if match(sheet.cell_value(row, 0), 'Current density'):
            curD = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            curD = addKVU('CurrentDensity', myRow[1], myRow[2], myRow[3], '', '', '', myRow[4], curD, jobDir, myXSDtree)
            if len(curD) > 0:
                temp_list.append(curD) # directly append to the higher level list
        # EnergyDensity
        if match(sheet.cell_value(row, 0), 'Energy density'):
            eneD = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            eneD = addKVU('EnergyDensity', myRow[1], myRow[2], myRow[3], '', '', '', myRow[4], eneD, jobDir, myXSDtree)
            if len(eneD) > 0:
                temp_list.append(eneD) # directly append to the higher level list
        # SurfaceResistivity
        if match(sheet.cell_value(row, 0), 'Surface resistivity'):
            surR = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            surR = addKVU('SurfaceResistivity', myRow[1], myRow[2], myRow[3], '', '', '', myRow[4], surR, jobDir, myXSDtree)
            if len(surR) > 0:
                temp_list.append(surR) # directly append to the higher level list
        # VolumeResistivity
        if match(sheet.cell_value(row, 0), 'Volume resistivity'):
            volR = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            volR = addKVU('VolumeResistivity', myRow[1], myRow[2], myRow[3], '', '', '', myRow[4], volR, jobDir, myXSDtree)
            if len(volR) > 0:
                temp_list.append(volR) # directly append to the higher level list
        # ArcResistance
        if match(sheet.cell_value(row, 0), 'Arc resistance'):
            arcR = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            arcR = addKVU('ArcResistance', myRow[1], myRow[2], myRow[3], '', '', '', myRow[4], arcR, jobDir, myXSDtree)
            if len(arcR) > 0:
                temp_list.append(arcR) # directly append to the higher level list
        # Impedance
        if match(sheet.cell_value(row, 0), 'Impedance'):
            impE = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            impE = addKVU('Impedance', myRow[1], myRow[2], myRow[3], '', '', '', myRow[4], impE, jobDir, myXSDtree)
            if len(impE) > 0:
                temp_list.append(impE) # directly append to the higher level list
        # ElectricPercolationThreshold
        if match(sheet.cell_value(row, 0), 'Percolation threshold'):
            perT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            perT = addKVU('ElectricPercolationThreshold', myRow[1], myRow[2], myRow[3], '', '', '', myRow[4], perT, jobDir, myXSDtree)
            if len(perT) > 0:
                temp_list.append(perT) # directly append to the higher level list
        # DC_DielectricConstant
        if match(sheet.cell_value(row, 0), 'DC dielectric constant'):
            dcdC = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            dcdC = addKVU('DC_DielectricConstant', myRow[1], myRow[2], myRow[3], '', '', '', myRow[4], dcdC, jobDir, myXSDtree)
            if len(dcdC) > 0:
                temp_list.append(dcdC) # directly append to the higher level list
        # Dielectric spectra (skipped, not in the schema)
        # Endurance strength (skipped, not in the schema)
        # AC_DielectricDispersion/Description
        if match(sheet.cell_value(row, 0), 'Description'):
            temp = insert('Description', sheet.cell_value(row, 1), temp)
        # AC_DielectricDispersion/DielectricDispersionDependence
        if match(sheet.cell_value(row, 0), 'Dependence'):
            if hasLen(sheet.cell_value(row, 1)):
                # 'Frequency dependence' or 'Temperature dependence'
                if match(sheet.cell_value(row, 1), 'Frequency dependence'):
                    depend = 'FrequencyDependence'
                elif match(sheet.cell_value(row, 1), 'Temperature dependence'):
                    depend = 'TemperatureDependence'
        # AC_DielectricDispersion/DielectricDispersionDependence/.../condition/temperature
        if match(sheet.cell_value(row, 0), 'Test Conditions - Temperature'):
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            dep = addKVU('temperature', myRow[1], myRow[2], myRow[3], '', '', '', myRow[4], dep, jobDir, myXSDtree)
            # sanity check
            if 'temperature' in dep and not match(depend, 'FrequencyDependence'):
                with open(jobDir + '/error_message.txt', 'a') as fid:
                    fid.write('[Dielectric Dispersion Dependence Error] If you are to fill in "Test Conditions - Temperature", please select "Frequency dependence" for "Dependence"\n')
                # reset dep
                dep = collections.OrderedDict()
        # AC_DielectricDispersion/DielectricDispersionDependence/.../condition/frequency
        if match(sheet.cell_value(row, 0), 'Test Conditions - Frequency'):
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            dep = addKVU('frequency', myRow[1], myRow[2], myRow[3], '', '', '', myRow[4], dep, jobDir, myXSDtree)
            # sanity check
            if 'frequency' in dep and not match(depend, 'TemperatureDependence'):
                with open(jobDir + '/error_message.txt', 'a') as fid:
                    fid.write('[Dielectric Dispersion Dependence Error] If you are to fill in "Test Conditions - Frequency", please select "Temperature dependence" for "Dependence"\n')
                # reset dep
                dep = collections.OrderedDict()
        # AC_DielectricDispersion/Dielectric_Real_Permittivity
        if match(sheet.cell_value(row, 0), 'Real permittivity'):
            reaP = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            reaP = addKVU('Dielectric_Real_Permittivity', myRow[1], myRow[2], myRow[3], '', '', '', myRow[4], reaP, jobDir, myXSDtree)
            if len(reaP) > 0:
                temp.append(reaP)
        # AC_DielectricDispersion/Dielectric_Loss_Permittivity
        if match(sheet.cell_value(row, 0), 'Loss permittivity'):
            losP = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            losP = addKVU('Dielectric_Loss_Permittivity', myRow[1], myRow[2], myRow[3], '', '', '', myRow[4], losP, jobDir, myXSDtree)
            if len(losP) > 0:
                temp.append(losP)
        # AC_DielectricDispersion/Dielectric_Loss_Tangent
        if match(sheet.cell_value(row, 0), 'Loss tangent'):
            losT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            losT = addKVU('Dielectric_Loss_Tangent', myRow[1], myRow[2], myRow[3], '', '', '', myRow[4], losT, jobDir, myXSDtree)
            if len(losT) > 0:
                temp.append(losT)
        # DielectricBreakdownStrength/Condition and Profile
        if match(sheet.cell_value(row, 0), 'Dielectric breakdown strength'):
            temp = insert('Condition', sheet.cell_value(row, 1), temp)
            proF = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            proF = addKVU('Profile', '', myRow[2], myRow[3], '', '', '',
                          myRow[4], proF, jobDir, myXSDtree)
            if len(proF) > 0:
                temp.append(proF)
        # DielectricBreakdownStrength/WeibullPlot
        if match(sheet.cell_value(row, 0), 'Weibull plot'):
            wePl = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            wePl = addKVU('WeibullPlot', '', '', '', '', '', myRow[1], myRow[2], wePl, jobDir, myXSDtree)
            if len(wePl) > 0:
                temp.append(wePl)
        # DielectricBreakdownStrength/WeibullParameter
        if match(sheet.cell_value(row, 0), 'Weibull parameter - scale'):
            weiP = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            weiP = addKVU('WeibullParameter', 'scale parameter', myRow[1], myRow[2], '', '', '', '', weiP, jobDir, myXSDtree)
            if len(weiP) > 0:
                temp.append(weiP)
        if match(sheet.cell_value(row, 0), 'Weibull parameter - shape'):
            weiP = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            weiP = addKVU('WeibullParameter', 'shape parameter', myRow[1], myRow[2], '', '', '', '', weiP, jobDir, myXSDtree)
            if len(weiP) > 0:
                temp.append(weiP)
    # END OF THE LOOP
    # don't forget about the last temp
    # if depend is not '', i.e. the last header is AC dielectric dispersion
    if len(depend) > 0:
        # insert the dependence structure to temp, no need to sortSequence since we give it
        temp.append({'DielectricDispersionDependence':{depend:{'condition':dep}}})
        # reset dep and depend after added to temp
        dep = collections.OrderedDict()
        depend = ''
    # save temp
    if len(temp) > 0: # update temp if it's not empty
        # sort temp
        temp = sortSequence(temp, prevTemp, myXSDtree)
        temp_list.append({headers[prevTemp]: temp})
        temp = []
    if len(temp_list) > 0:
        # sort temp_list
        temp_list = sortSequence(temp_list, 'Electrical', myXSDtree)
        DATA_PROP.append({'Electrical': temp_list})
    return DATA_PROP


# Sheet 5. Properties addressed - Thermal
def sheetPropTher(sheet, DATA_PROP, myXSDtree, jobDir):
    headers = {'DSC profile': 'DSC_Profile',
               'Measurement Method': 'MeasurementMethod',
               'Crystallinity': 'Crystallinity',
               'Crystallization temperature': 'CrystalizationTemperature',
               'Heat of crystallization': 'HeatOfCrystallization',
               'Heat of fusion': 'HeatOfFusion',
               'Thermal decomposition temperature': 'ThermalDecompositionTemperature',
               'Glass transition temperature': 'GlassTransitionTemperature',
               'LC phase transition temperature': 'LC_PhaseTransitionTemperature',
               'Melting temperature': 'MeltingTemperature',
               'Specific heat capacity, C_p': 'SpecificHeatCapacity_Cp',
               'Specific heat capacity, C_v': 'SpecificHeatCapacity_Cv',
               'Thermal conductivity': 'ThermalConductivity',
               'Thermal diffusivity': 'ThermalDiffusivity',
               'Brittle temperature': 'BrittleTemperature'}
    temp_list = [] # the highest level list for PROPERTIES/Thermal
    temp = [] # always save temp if not empty when we find a match in headers
    prevTemp = '' # save the previous cleanTemp
    for row in range(sheet.nrows):
        cleanTemp = matchList(sheet.cell_value(row, 0), headers.keys())
        if cleanTemp:
            if len(prevTemp) == 0: # initialize prevTemp
                prevTemp = cleanTemp
            # save temp
            if len(temp) > 0: # update temp if it's not empty
                # sort temp
                temp = sortSequence(temp, prevTemp, myXSDtree)
                temp_list.append({headers[prevTemp]: temp})
                temp = []
            prevTemp = cleanTemp # update prevTemp
        # DSC_Profile
        if match(sheet.cell_value(row, 0), 'DSC profile'):
            dscP = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            dscP = addKVU('DSC_Profile', '', '', '', '', '', '', myRow[1], dscP, jobDir, myXSDtree)
            if len(dscP) > 0:
                temp_list.append(dscP) # directly append to the higher level list
        # MeasurementMethod
        if match(sheet.cell_value(row, 0), 'DSC profile'):
            # directly append to the higher level list
            temp_list = insert('MeasurementMethod', sheet.cell_value(row, 1), temp_list)
        # Crystallinity
            # DegreeOfCrystallization
        if match(sheet.cell_value(row, 0), 'Degree of crystallization'):
            degC = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            degC = addKVU('DegreeOfCrystallization', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], degC, jobDir, myXSDtree)
            if len(degC) > 0:
                temp.append(degC)
            # GrowthRateOfCrystal
        if match(sheet.cell_value(row, 0), 'Growth rate of crystal'):
            groC = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            groC = addKVU('GrowthRateOfCrystal', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], groC, jobDir, myXSDtree)
            if len(groC) > 0:
                temp.append(groC)
            # GrowthRateParameterOfAvramiEquation
        if match(sheet.cell_value(row, 0), 'Growth rate parameter of Avrami Equation'):
            groA = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            groA = addKVU('GrowthRateParameterOfAvramiEquation', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], groA, jobDir, myXSDtree)
            if len(groA) > 0:
                temp.append(groA)
            # NucleationParameterOfAvramiEquation
        if match(sheet.cell_value(row, 0), 'Nucleation parameter of Avrami Equation'):
            nucA = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            nucA = addKVU('NucleationParameterOfAvramiEquation', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], nucA, jobDir, myXSDtree)
            if len(nucA) > 0:
                temp.append(nucA)
            # HalflifeOfCrystallization
        if match(sheet.cell_value(row, 0), 'Half life of crystallization'):
            halC = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            halC = addKVU('HalflifeOfCrystallization', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], halC, jobDir, myXSDtree)
            if len(halC) > 0:
                temp.append(halC)
        # CrystalizationTemperature
        if match(sheet.cell_value(row, 0), 'Crystallization temperature'):
            cryT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            cryT = addKVU('CrystalizationTemperature', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], cryT, jobDir, myXSDtree)
            if len(cryT) > 0:
                temp_list.append(cryT) # directly append to the higher level list
        # HeatOfCrystallization
        if match(sheet.cell_value(row, 0), 'Heat of crystallization'):
            heaC = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            heaC = addKVU('HeatOfCrystallization', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], heaC, jobDir, myXSDtree)
            if len(heaC) > 0:
                temp_list.append(heaC) # directly append to the higher level list
        # HeatOfFusion
        if match(sheet.cell_value(row, 0), 'Heat of fusion'):
            heaF = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            heaF = addKVU('HeatOfFusion', myRow[1],
                         myRow[2], myRow[3], myRow[4], myRow[5],
                         '', myRow[6], heaF, jobDir, myXSDtree)
            if len(heaF) > 0:
                temp_list.append(heaF) # directly append to the higher level list
        # ThermalDecompositionTemperature
        if match(sheet.cell_value(row, 0), 'Thermal decomposition temperature'):
            theT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            theT = addKVU('ThermalDecompositionTemperature', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], theT, jobDir, myXSDtree)
            if len(theT) > 0:
                temp_list.append(theT) # directly append to the higher level list
        # GlassTransitionTemperature
        if match(sheet.cell_value(row, 0), 'Glass transition temperature'):
            glaT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            glaT = addKVU('GlassTransitionTemperature', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], glaT, jobDir, myXSDtree)
            if len(glaT) > 0:
                temp_list.append(glaT) # directly append to the higher level list
        # LC_PhaseTransitionTemperature
        if match(sheet.cell_value(row, 0), 'LC phase transition temperature'):
            lcpT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            lcpT = addKVU('LC_PhaseTransitionTemperature', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], lcpT, jobDir, myXSDtree)
            if len(lcpT) > 0:
                temp_list.append(lcpT) # directly append to the higher level list
        # MeltingTemperature
        if match(sheet.cell_value(row, 0), 'Melting temperature'):
            melT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            melT = addKVU('MeltingTemperature', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], melT, jobDir, myXSDtree)
            if len(melT) > 0:
                temp_list.append(melT) # directly append to the higher level list
        # SpecificHeatCapacity_Cp
        if match(sheet.cell_value(row, 0), 'Specific heat capacity, C_p'):
            speP = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            speP = addKVU('SpecificHeatCapacity_Cp', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], speP, jobDir, myXSDtree)
            if len(speP) > 0:
                temp_list.append(speP) # directly append to the higher level list
        # SpecificHeatCapacity_Cv
        if match(sheet.cell_value(row, 0), 'Specific heat capacity, C_v'):
            speV = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            speV = addKVU('SpecificHeatCapacity_Cv', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], speV, jobDir, myXSDtree)
            if len(speV) > 0:
                temp_list.append(speV) # directly append to the higher level list
        # ThermalConductivity
        if match(sheet.cell_value(row, 0), 'Thermal conductivity'):
            theC = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            theC = addKVU('ThermalConductivity', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], theC, jobDir, myXSDtree)
            if len(theC) > 0:
                temp_list.append(theC) # directly append to the higher level list
        # ThermalDiffusivity
        if match(sheet.cell_value(row, 0), 'Thermal diffusivity'):
            theD = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            theD = addKVU('ThermalDiffusivity', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], theD, jobDir, myXSDtree)
            if len(theD) > 0:
                temp_list.append(theD) # directly append to the higher level list
        # BrittleTemperature
        if match(sheet.cell_value(row, 0), 'Brittle temperature'):
            briT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            briT = addKVU('BrittleTemperature', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], briT, jobDir, myXSDtree)
            if len(briT) > 0:
                temp_list.append(briT) # directly append to the higher level list
    # END OF THE LOOP
    # don't forget about the last temp
    # save temp
    if len(temp) > 0: # update temp if it's not empty
        # sort temp
        temp = sortSequence(temp, prevTemp, myXSDtree)
        temp_list.append({headers[prevTemp]: temp})
        temp = []
    if len(temp_list) > 0:
        # sort temp_list
        temp_list = sortSequence(temp_list, 'Thermal', myXSDtree)
        DATA_PROP.append({'Thermal': temp_list})
    return DATA_PROP


# Sheet 5. Properties addressed - Volumetric
def sheetPropVolu(sheet, DATA_PROP, myXSDtree, jobDir):
    headers = {'Weight loss': 'WeightLoss',
               'Interfacial thickness': 'InterphaseThickness',
               'Density': 'Density',
               'Linear expansion coefficient': 'LinearExpansionCoefficient',
               'Volume expansion coefficient': 'VolumeExpansionCoefficient',
               'Surface tension': 'SurfaceTension',
               'Interfacial tension': 'InterfacialTension',
               'Water absorption': 'WaterAbsorption'}
    temp_list = [] # the highest level list for PROPERTIES/Volumetric
    prevTemp = '' # save the previous cleanTemp
    for row in range(sheet.nrows):
        cleanTemp = matchList(sheet.cell_value(row, 0), headers.keys())
        if cleanTemp:
            if len(prevTemp) == 0: # initialize prevTemp
                prevTemp = cleanTemp
            prevTemp = cleanTemp # update prevTemp
        # WeightLoss
        if match(sheet.cell_value(row, 0), 'Weight loss'):
            weiL = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            weiL = addKVU('WeightLoss', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], weiL, jobDir, myXSDtree)
            if len(weiL) > 0:
                temp_list.append(weiL) # directly append to the higher level list
        # InterphaseThickness
        if match(sheet.cell_value(row, 0), 'Interfacial thickness'):
            intT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            intT = addKVU('InterphaseThickness', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], intT, jobDir, myXSDtree)
            if len(intT) > 0:
                temp_list.append(intT) # directly append to the higher level list
        # Density
        if match(sheet.cell_value(row, 0), 'Density'):
            denS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            denS = addKVU('Density', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], denS, jobDir, myXSDtree)
            if len(denS) > 0:
                temp_list.append(denS) # directly append to the higher level list
        # LinearExpansionCoefficient
        if match(sheet.cell_value(row, 0), 'Linear expansion coefficient'):
            linC = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            linC = addKVU('LinearExpansionCoefficient', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], linC, jobDir, myXSDtree)
            if len(linC) > 0:
                temp_list.append(linC) # directly append to the higher level list
        # VolumeExpansionCoefficient
        if match(sheet.cell_value(row, 0), 'Volume expansion coefficient'):
            volC = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            volC = addKVU('VolumeExpansionCoefficient', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], volC, jobDir, myXSDtree)
            if len(volC) > 0:
                temp_list.append(volC) # directly append to the higher level list
        # SurfaceTension
        if match(sheet.cell_value(row, 0), 'Surface tension'):
            surT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            surT = addKVU('SurfaceTension', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], surT, jobDir, myXSDtree)
            if len(surT) > 0:
                temp_list.append(surT) # directly append to the higher level list
        # InterfacialTension
        if match(sheet.cell_value(row, 0), 'Interfacial tension'):
            intT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            intT = addKVU('InterfacialTension', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], intT, jobDir, myXSDtree)
            if len(intT) > 0:
                temp_list.append(intT) # directly append to the higher level list
        # WaterAbsorption
        if match(sheet.cell_value(row, 0), 'Water absorption'):
            watA = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            watA = addKVU('WaterAbsorption', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], watA, jobDir, myXSDtree)
            if len(watA) > 0:
                temp_list.append(watA) # directly append to the higher level list
    # END OF THE LOOP
    if len(temp_list) > 0:
        # sort temp_list
        temp_list = sortSequence(temp_list, 'Volumetric', myXSDtree)
        DATA_PROP.append({'Volumetric': temp_list})
    return DATA_PROP


# Sheet 5. Properties addressed - Rheological
def sheetPropRheo(sheet, DATA_PROP, myXSDtree, jobDir):
    headers = {'Complex Modulus': 'RheologicalComplexModulus',
               'Viscosity': 'RheologicalViscosity'}
    headers_DMA = {'Frequency sweep': 'FrequencySweep',
                   'Temperature sweep': 'TemperatureSweep',
                   'Strain sweep': 'StrainSweep'}
    temp_list = [] # the highest level list for PROPERTIES/Rheological
    temp = [] # always save temp if not empty when we find a match in headers
    DMA_Test = [] # a list for Rheological/.../RheometerMode/.../condition
    prevTemp = '' # save the previous cleanTemp, "Complex Modulus" or "Viscosity"
    prevDMA = '' # save the previous cleanDMA, "Frequency sweep", "Temperature sweep" or "Strain sweep"
    for row in range(sheet.nrows):
        # First deal with the DMA_Test
        if matchList(sheet.cell_value(row, 0), headers.keys()):
            if len(DMA_Test) > 0 and len(prevDMA) > 0: # update DMA_Test if it's not empty and user has selected DMA_mode
                # sort DMA_Test
                DMA_Test = sortSequence(DMA_Test, prevDMA, myXSDtree)
                temp.append({'RheometerMode': {headers_DMA[prevDMA]: {'condition': DMA_Test}}})
                DMA_Test = []
                prevDMA = ''
        # Then deal with higher level headers
        cleanTemp = matchList(sheet.cell_value(row, 0), headers.keys())
        if cleanTemp:
            if len(prevTemp) == 0: # initialize prevTemp
                prevTemp = cleanTemp
            # save temp
            if len(temp) > 0: # update temp if it's not empty
                # sort temp
                temp = sortSequence(temp, prevTemp, myXSDtree)
                temp_list.append({headers[prevTemp]: temp})
                temp = []
            prevTemp = cleanTemp # update prevTemp
        # .../RheometerMode
        if match(sheet.cell_value(row, 0), 'Rheometer mode'):
            if hasLen(sheet.cell_value(row, 1)):
                prevDMA = sheet.cell_value(row, 1).strip() # update prevDMA
        # .../RheometerMode/.../condition/temperature
        if match(sheet.cell_value(row, 0), 'Temperature'):
            temP = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            temP = addKVU('temperature', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], temP, jobDir, myXSDtree)
            if len(temP) > 0:
                DMA_Test.append(temP)
        # .../RheometerMode/.../condition/strainAmplitude
        if match(sheet.cell_value(row, 0), 'Strain amplitude'):
            strR = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            strR = addKVU('strainAmplitude', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], strR, jobDir, myXSDtree)
            if len(strR) > 0:
                DMA_Test.append(strR)
        # .../RheometerMode/.../condition/frequency
        if match(sheet.cell_value(row, 0), 'Frequency'):
            freQ = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            freQ = addKVU('frequency', myRow[1], myRow[2], myRow[3], myRow[4], myRow[5], '', myRow[6], freQ, jobDir, myXSDtree)
            if len(freQ) > 0:
                DMA_Test.append(freQ)
        # RheologicalComplexModulus/RheologicalStorageModulus
        if match(sheet.cell_value(row, 0), "Rheological G' Datafile.xlsx"):
            rheS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            rheS = addKVU('RheologicalStorageModulus',
                          '', '', '', '', '', myRow[1], myRow[2], rheS, jobDir, myXSDtree)
            if len(rheS) > 0:
                temp.append(rheS)
        # RheologicalComplexModulus/RheologicalLossModulus
        if match(sheet.cell_value(row, 0), "Rheological G'' Datafile.xlsx"):
            rheL = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            rheL = addKVU('RheologicalLossModulus',
                          '', '', '', '', '', myRow[1], myRow[2], rheL, jobDir, myXSDtree)
            if len(rheL) > 0:
                temp.append(rheL)
        # RheologicalComplexModulus/RheologicalLossTangent
        if match(sheet.cell_value(row, 0), 'Rheological tan_delta Datafile.xlsx'):
            rheT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            rheT = addKVU('RheologicalLossTangent',
                          '', '', '', '', '', myRow[1], myRow[2], rheT, jobDir, myXSDtree)
            if len(rheT) > 0:
                temp.append(rheT)
        # RheologicalComplexModulus/RheologicalMasterCurve
        if match(sheet.cell_value(row, 0), 'Master Curve.xlsx'):
            masC = collections.OrderedDict()
            masC_list = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            if hasLen(myRow[1]):
                masC['description'] = myRow[1]
            if type(myRow[2]) == str and len(myRow[2]) > 0:
                data = read_excel_profile(myRow[2], jobDir)
                small_dict_axis = axisInfo(data)
                if len(small_dict_axis) > 0:
                    masC['AxisLabel'] = small_dict_axis
                if len(data) > 0:
                    masC['data'] = data
            if len(masC) > 0:
                masC_list['RheologicalMasterCurve'] = masC
                temp.append(masC_list)
        # RheologicalViscosity/DynamicViscosity
        if match(sheet.cell_value(row, 0), 'Dynamic viscosity'):
            dynV = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            dynV = addKVU('DynamicViscosity', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], dynV, jobDir, myXSDtree)
            if len(dynV) > 0:
                temp.append(dynV)
        # RheologicalViscosity/MeltViscosity
        if match(sheet.cell_value(row, 0), 'Melt viscosity'):
            melV = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            melV = addKVU('MeltViscosity', myRow[1],
                          myRow[2], myRow[3], myRow[4], myRow[5],
                          '', myRow[6], melV, jobDir, myXSDtree)
            if len(melV) > 0:
                temp.append(melV)
    # END OF THE LOOP
    # save DMA_Test if it's not empty and user has selected DMA_mode
    if len(DMA_Test) > 0 and len(prevDMA) > 0:
        # sort DMA_Test
        DMA_Test = sortSequence(DMA_Test, prevDMA, myXSDtree)
        temp.append({'RheometerMode': {headers_DMA[prevDMA]: {'condition': DMA_Test}}})
        DMA_Test = []
    # don't forget about the last temp
    # save temp
    if len(temp) > 0: # update temp if it's not empty
        # sort temp
        temp = sortSequence(temp, prevTemp, myXSDtree)
        temp_list.append({headers[prevTemp]: temp})
        temp = []
    if len(temp_list) > 0:
        # sort temp_list
        temp_list = sortSequence(temp_list, 'Rheological', myXSDtree)
        DATA_PROP.append({'Rheological': temp_list})
    return DATA_PROP

# Sheet 6. Microstructure
# NEED TO BE UPDATED TO USE REST SERVICE (!!!!!!!!!!!)
def sheetMicrostructure(sheet, DATA, myXSDtree, jobDir):
    headers = {'Imagefile': 'ImageFile',
               'Sample experimental info': 'Experimental_Sample_Info'}
    temp_list = [] # the highest level list for MICROSTRUCTURE
    temp = [] # always save temp if not empty when we find a match in headers
    Dimension = [] # a list for image dimension
    prevTemp = '' # save the previous cleanTemp
    for row in range(sheet.nrows):
        cleanTemp = matchList(sheet.cell_value(row, 0), headers.keys())
        if cleanTemp:
            if len(prevTemp) == 0: # initialize prevTemp
                prevTemp = cleanTemp
            # special case Dimension, need to save the list for Dimension into
            # temp if it is not empty
            if len(Dimension) > 0:
                # sort Dimension
                Dimension = sortSequence(Dimension, 'Dimension', myXSDtree)
                # save Dimension as a dict in temp
                temp.append({'Dimension': Dimension})
                # initialize
                Dimension = []
            # save temp
            if len(temp) > 0: # update temp if it's not empty
                # sort temp
                temp = sortSequence(temp, prevTemp, myXSDtree)
                temp_list.append({headers[prevTemp]: temp})
                temp = []
            prevTemp = cleanTemp # update prevTemp
        # ImageFile/File
        if match(sheet.cell_value(row, 0), 'Microstructure filename'): #(!!!!!!!!!!!!!!!!!)
            if hasLen(sheet.cell_value(row, 1)):
                filename = str(sheet.cell_value(row, 1)).strip()
                if os.path.splitext(filename)[-1].lower() not in ['.png', '.bmp', '.jpeg', '.jpg', '.tif', '.tiff', '.gif']:
                    # write the message in ./error_message.txt
                    with open(jobDir + '/error_message.txt', 'a') as fid:
                        fid.write('[File Error] "%s" is not an acceptable image file. Please check the file extension.\n' % (filename))
                        continue
                # confirm whether the file exists
                filename_up = os.path.splitext(filename)[0] + os.path.splitext(filename)[-1].upper()
                filename_low = os.path.splitext(filename)[0] + os.path.splitext(filename)[-1].lower()
                if os.path.exists(jobDir + '/' + filename_low):
                    imageDir = jobDir + '/' + filename_low
                    temp = insert('File', imageDir, temp)
                elif os.path.exists(jobDir + '/' + filename_up):
                    imageDir = jobDir + '/' + filename_up
                    temp = insert('File', imageDir, temp)
                else:
                    # write the message in ./error_message.txt
                    with open(jobDir + '/error_message.txt', 'a') as fid:
                        fid.write('[File Error] Missing file! Please include "%s" in your uploads. Could be the spelling of the file extension.\n' % (filename))
                        continue
        # ImageFile/Description
        if match(sheet.cell_value(row, 0), 'Description'):
            temp = insert('Description', sheet.cell_value(row, 1), temp)
        # ImageFile/MicroscopyType
        if match(sheet.cell_value(row, 0), 'Microscopy type'):
            temp = insert('MicroscopyType', sheet.cell_value(row, 1), temp)
        # ImageFile/Type
        if match(sheet.cell_value(row, 0), 'Image type'):
            temp = insert('Type', sheet.cell_value(row, 1), temp)
        # ImageFile/Dimension
            # width
        if match(sheet.cell_value(row, 0), 'Width'):
            Dimension = insert('width', sheet.cell_value(row, 1), Dimension)
            # height
        if match(sheet.cell_value(row, 0), 'Height'):
            Dimension = insert('height', sheet.cell_value(row, 1), Dimension)
            # depth
        if match(sheet.cell_value(row, 0), 'Depth'):
            Dimension = insert('depth', sheet.cell_value(row, 1), Dimension)
        # ImagePreProcessing
        if match(sheet.cell_value(row, 0), 'Preprocessing'):
            temp = insert('ImagePreProcessing', sheet.cell_value(row, 1), temp)
        # Experimental_Sample_Info/SampleSize
        if match(sheet.cell_value(row, 0), 'Sample size'):
            samS = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            samS = addKVU('SampleSize', '', myRow[1], myRow[2], '', '', '', '', samS, jobDir, myXSDtree)
            if len(samS) > 0:
                temp.append(samS)
        # Experimental_Sample_Info/SampleThickness
        if match(sheet.cell_value(row, 0), 'Sample thickness'):
            samT = collections.OrderedDict()
            myRow = sheet.row_values(row) # save the list of row_values
            while len(myRow) < 7:
                myRow.append('') # prevent IndexError
            samT = addKVU('SampleThickness', '', myRow[1], myRow[2], '', '', '', '', samT, jobDir, myXSDtree)
            if len(samT) > 0:
                temp.append(samT)
    # END OF THE LOOP
    # save Dimension if it's still not empty
    if len(Dimension) > 0:
        # sort Dimension
        Dimension = sortSequence(Dimension, 'Dimension', myXSDtree)
        # save Dimension as a dict in temp
        temp.append({'Dimension': Dimension})
        # initialize
        Dimension = []
    # don't forget about the last temp
    # save temp
    if len(temp) > 0: # update temp if it's not empty
        # sort temp
        temp = sortSequence(temp, prevTemp, myXSDtree)
        temp_list.append({headers[prevTemp]: temp})
        temp = []
    if len(temp_list) > 0:
        # sort temp_list
        temp_list = sortSequence(temp_list, 'MICROSTRUCTURE', myXSDtree)
        DATA.append({'MICROSTRUCTURE': temp_list})
    return DATA

## main
def compiler(jobDir, code_srcDir, xsdDir, templateName, restbase, datasetId):
    ## Global variable myXSDtree
    # read the xsd tree
    myXSDtree = etree.parse(xsdDir)
    # DATA containers
    DATA = [] # the list that will finally be turned into a dict for dicttoxml
    DATA_PROP = [] # the list for the PROPERTIES section

    ## Data extraction
    # Read the Excel template
    filename = jobDir + '/' + templateName

    # xlrd is the library used to read xlsx file
    # https://secure.simplistix.co.uk/svn/xlrd/trunk/xlrd/doc/xlrd.html?p=4966
    xlfile = xlrd.open_workbook(filename)

    ## RUNNING SECTION
    # store those sheet objects in a list and loop through the list
    sheet_content = xlfile.sheets()
    for sheet in sheet_content:
        # skip empty sheets
        if (sheet.nrows == 0):
            continue
        # check the header of the sheet to determine what it has inside
        if (sheet.row_values(0)[0].strip().lower() == "sample info"):
            # sample info sheet
            (ID, DATA) = sheetSampleInfo(sheet, DATA, myXSDtree, jobDir, restbase, datasetId)
        elif (sheet.row_values(0)[0].strip().lower() == "material types"):
            # material types sheet
            DATA = sheetMatType(sheet, DATA, myXSDtree, jobDir)
        elif (sheet.row_values(0)[0].strip().lower() == "synthesis and processing"):
            # synthesis and processing sheet
            DATA = sheetProcType(sheet, DATA, myXSDtree, jobDir)
        elif (sheet.row_values(0)[0].strip().lower() == "characterization methods"):
            # characterization methods sheet
            DATA = sheetCharMeth(sheet, DATA, myXSDtree, jobDir)
        elif (sheet.row_values(0)[0].strip().lower() == "properties addressed"):
            # properties addressed sheet, this part will be saved in DATA_PROP which
            # will be thereafter saved in DATA
            DATA_PROP = whichProp(sheet, DATA_PROP, myXSDtree, jobDir)
        elif (sheet.row_values(0)[0].strip().lower() == "microstructure"):
            # microstructure sheet
            DATA = sheetMicrostructure(sheet, DATA, myXSDtree, jobDir)
    if len(DATA_PROP) > 0:
        # sort DATA_PROP
        DATA_PROP = sortSequence(DATA_PROP, 'PROPERTIES', myXSDtree)
        DATA.append({'PROPERTIES': DATA_PROP})

    ## Finish constructing DATA list, generate the output xml file
    # sort DATA
    DATA = sortSequence(DATA, 'PolymerNanocomposite', myXSDtree)
    # organize the Python dictionary
    # https://docs.python.org/2/library/collections.html#collections.OrderedDict
    diffusionData = collections.OrderedDict({'item':DATA})

    # change the log level of dicttoxml
    dicttoxml.LOG.setLevel(logging.ERROR)
    # using dicttoxml library to convert dictionary to xml
    diffusionDataxml = dicttoxml.dicttoxml(diffusionData,custom_root='PolymerNanocomposite',attr_type=False)
    # need to remove all <item> and </item> and <item > in the xml
    diffusionDataxml = diffusionDataxml.replace(b'<item>', b'').replace(b'</item>', b'').replace(b'<item/>',b'').replace(b'<item >', b'')
    # load xmlstring into etree
    tree = etree.ElementTree()
    root = etree.XML(diffusionDataxml)
    tree._setroot(root)
    # make directory for xml output
    os.mkdir(jobDir + '/xml')
    # write information to ./xml/ID.xml
    filename = jobDir + '/xml/' + str(ID) + '.xml'
    tree.write(filename, encoding="UTF-8", xml_declaration=True)
    ## Validate the xml file
    logName = runValidation(filename, xsdDir, jobDir)
    return logName
