## Bingyin Hu 20180216
## XML update validator
## =============================================================================
## This code follows the xml updating codes to check whether the updated xml
## files are validate under the new xsd schema.

## =============================================================================
## Input:   
## A prompt will ask for the directory of the folder of the updated xml files.
## Another prompt will ask for the directory of the new xsd schema file. This
## script can also be imported as a function.

## =============================================================================
## Output:
## An error log.

## =============================================================================
from lxml import etree
import glob
from datetime import date
import csv

# A function that takes in the directory of the xml folder and the schema file,
# run the validation one by one and generate an error log.
def runValidation(xmlDir, xsdDir, jobDir):
    if jobDir == '':
        jobDir = '.'
    xmlschema = etree.XMLSchema(etree.parse(xsdDir)) # parse the schema
    if len(xmlDir) > 4 and xmlDir[-4:] == '.xml':
        xml_files = [xmlDir]
    else:
        xml_files = glob.glob(xmlDir + '*.xml') # find all xml files in xmlDir
    errors = [] # a list of xml files that fail validation
    # justerrors = [] # a list of error messages, tailored for XMLCONV, assuming only one xml file will be in the xmlDir
    for xml_file in xml_files:
        xml = etree.parse(xml_file)
        if not xmlschema.validate(xml):
            for err in xmlschema.error_log:
                errorInfo = str(err)
                errorInfo = errorInfo[errorInfo.rfind(err.type_name + ':')+len(err.type_name + ':'):-1]
                print(errorInfo)
                errors.append({'xml directory': xml_file.split("\\")[-1],
                               'error': errorInfo})
                # justerrors.append('[XML Schema Validation Error] ' + errorInfo)
    logName = jobDir + '/xml_validation_error_log_' + date.today().isoformat() + '.csv'
    with open(logName, 'w', newline = '', encoding = 'utf-8') as f:
        f.write('\ufeff')
        writer = csv.DictWriter(f, fieldnames = ['xml directory', 'error'])
        writer.writeheader()
        # writer.writerow({'xml directory':"Date: " + date.today().isoformat()})
        for error in errors:
            writer.writerow(error)
            print(error)
            # writer.writerow({k.encode('utf8').strip(): v.encode('utf8').strip() for k, v in error.items()})
    return logName

if __name__ == "__main__":
    xmlDir = input("Please type in the directory of the folder of the xml files:")
    while xmlDir == "":
        xmlDir = input("Please type in the directory of the folder of the xml files:")
    xsdDir = input("Please type in the directory of the xsd schema file:")
    while xsdDir == "":
        xsdDir = input("Please type in the directory of the xsd schema file:")
    logName = runValidation(xmlDir, xsdDir, '')
    print("Errors are saved in the log: " + logName)
