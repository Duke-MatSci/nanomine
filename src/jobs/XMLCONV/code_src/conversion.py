from extract_verify_ID_callable import runEVI
from customized_compiler_callable import compiler
import os
import csv

def conversion(jobDir, code_srcDir, xsdDir, templateName):
    messages = []
    # check #1: extension of templateName
    if os.path.splitext(templateName)[1] not in {'.xlsx', '.xls'}:
        messages = ['[Upload Error] The Excel template file should have extensions like ".xlsx" or ".xls".']
        return ('failure', messages)
    # get the ID
    runEVI(jobDir, code_srcDir, xsdDir, templateName)
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
    # check #5: check if the uploading is successful (TODO)

    # pass all the checks
    return ('success', messages)