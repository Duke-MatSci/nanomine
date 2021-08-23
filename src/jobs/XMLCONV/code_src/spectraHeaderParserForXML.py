# update xml by applying spectraHeaderParser
# By Bingyin Hu 08/21/2021

from spectraHeaderParser import spectraHeaderParser
from xsdTraverse import xsdTraverse
from lxml import etree
import re
import os
import logging

# config logging

class spectraHeaderParserForXML(object):
    def __init__(self, xsdDir, config=None):
        '''
        :param xsdDir: path to the xsd schema file 
        :type xsdDir: str
        '''
        # load the parser
        if config is None:
            self.parser = spectraHeaderParser()
        else:
            self.parser = spectraHeaderParser(config)
        # load the xsdTraverse object for element sorting
        self.xsdt = xsdTraverse(xsdDir)
        # # (TODO) read spectra data parent element tags from xsd directly
        # self.spectraParentTags = ['data', 'LoadingProfile', 'MasterCurve', 'profile']
        
    def runOnXML(self, xmlDir, createCopy=False):
        '''
        Parse an xml file into an lxml.etree object, finds elements for spectra data, reads the xpath and header information, calls spectraHeaderParser and insert standardized x/yName/Unit information back into the lxml.etree oject, then update the xml file.

        :param xmlDir: path to the xml file
        :type xmlDir: str

        :param createCopy: False then overwrite the xml file, True then create and write to a new xml file, default to False
        :type createCopy: boolean

        :returns: nothing will be returned but the xml file will be updated
        :rtype: 
        '''
        tree = etree.parse(xmlDir)
        # find all headers in the xml and their element path
        headerNodes = tree.findall('.//headers')
        # what we want to edit is the parent of parent of headerNodes with form:
        # data
        # --AxisLabel
        # --data
        # ----header
        for headerNode in headerNodes:
            node = headerNode.getparent().getparent() # move up 2 levels
            xpath = tree.getelementpath(node) # might have index in the element path
            # extract data/data/headers/column
            xheader = headerNode[0].text
            yheader = headerNode[1].text
            # call spectraHeaderParser
            result = self.parser.parse(xpath, xheader, yheader)
            # see if AxisLabel element exists
            axisLabel = node.find('AxisLabel')
            # remove it if it exists
            if axisLabel is not None:
                node.remove(axisLabel)
            # create the node
            axisLabel = etree.SubElement(node, 'AxisLabel')
            xName = etree.SubElement(axisLabel, 'xName')
            xUnit = etree.SubElement(axisLabel, 'xUnit')
            yName = etree.SubElement(axisLabel, 'yName')
            yUnit = etree.SubElement(axisLabel, 'yUnit')
            # sort the subtree of the node by xpath
            xpathWithRoot = re.sub(r'\[.*?\]','',
                '{}/{}'.format(tree.getroot().tag, xpath))
            # print(xpathWithRoot)
            # print(axisLabel)
            self.xsdt.sortSubElementsByPath(tree, xpathWithRoot)
            # sort the subtree of the AxisLabel element by xpath
            self.xsdt.sortSubElementsByPath(tree, 
                '{}/{}'.format(xpathWithRoot,'AxisLabel'))
            # update xName, xUnit, yName, yUnit in AxisLabel
            xName.text = result['xName']
            xUnit.text = result['xUnit']
            yName.text = result['yName']
            yUnit.text = result['yUnit']
        # save xml
        xmlOut = xmlDir
        # change the xmlOut filename if createCopy is True
        if createCopy:
            xmlOut = '{}_copy.xml'.format(
                os.path.splitext(os.path.abspath(xmlDir))[0])
        # write xml
        tree.write(xmlOut, encoding="UTF-8", xml_declaration=True)
        return

## TEST
if __name__ == '__main__':
    shpxml = spectraHeaderParserForXML('./xml/PNC_schema_041220.xsd')
    from glob import glob
    xmls = glob("./xml/*.xml")
    for xml in xmls:
        # skip previously generated xmls
        if '_copy.xml' in xml:
            continue
        shpxml.runOnXML(xml, createCopy=True)
        print('Done parsing headers for {}'.format(xml))

