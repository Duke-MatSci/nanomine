# skeleton of the big parser class
import json
from lxml import etree
from standardizer import standardizer
import re

class spectraHeaderParser(object):
    # init function
    def __init__(self, config='./data_preparation/nanomineParserConfig.json'):
        # initialize subclasses
        self.__loadSC__(config)
        pass

    # header separator function
    def separator(self, xheader, yheader):
        '''
        Splits each header string into a name string and a unit string

        :param xheader: the spectra data header string for x axis
        :type xheader: str

        :param yheader: the spectra data header string for y axis
        :type yheader: str

        :returns: a dictionary {'xName': [candidate1, candidate2,...],
                                'xUnit': [candidate1, candidate2,...],
                                'yName': [candidate1, candidate2,...],
                                'yUnit': [candidate1, candidate2,...]}
        :rtype: dict{str:list(str)}
        '''
        # init output
        output = {'xName':[], 'xUnit':[], 'yName':[], 'yUnit':[]}
        # determine unit string first, what's left is considered name string
        # scan for () [] , /
        xNameUnitPairs = self.headerToNameUnit(xheader)
        yNameUnitPairs = self.headerToNameUnit(yheader)
        print(yNameUnitPairs)
        for xNameUnitPair in xNameUnitPairs:
            output['xName'].append(xNameUnitPair[0])
            output['xUnit'].append(xNameUnitPair[1])
        for yNameUnitPair in yNameUnitPairs:
            output['yName'].append(yNameUnitPair[0])
            output['yUnit'].append(yNameUnitPair[1])
        return output

    def headerToNameUnit(self, header):
        '''
        Splits a header string into a name string and a unit string

        :param header: the spectra data header string
        :type xheader: str

        :param yheader: the spectra data header string for y axis
        :type yheader: str

        :returns: a list of tuples containing splitted string
                  [(name, unit), ...]
        :rtype: list(tuple(str))
        '''
        output = []
        # scan for , /
        puncs = {',', '/'}
        for punc in puncs:
            if punc in header:
                segs = header.split(punc)
                for i, seg in enumerate(segs):
                    # skip the last iteration
                    if len(segs) == i+1:
                        break
                    name = punc.join(segs[:i+1])
                    unit = punc.join(segs[i+1:])
                    output.append((name.strip(), unit.strip()))
        # scan for () []
        brackets = {'()','[]'}
        for bracket in brackets:
            pairs = self.findPairs(header,bracket[0],bracket[1])
            for pair in pairs:
                # what's inside () [] -> unit, what's outside -> name
                unit = header[pair[0]+1:pair[1]] # exclude '(' and ')'
                name = header[:pair[0]] + header[pair[1]+1:] # remove unit
                output.append((name.strip(), unit.strip()))
        # if still no split could be made, assume no unit found
        if len(output) == 0:
            output.append((header.strip(),''))
        return output

    def findPairs(self, rawString, startChar, endChar):
        '''
        Finds the index pairs of all startChar and endChar pairs

        :param rawString: the raw input string
        :type rawString: str

        :param startChar: the character that opens the pair '(', '[', etc.
        :type startChar: str

        :param endChar: the character that closes the pair '(', '[', etc.
        :type endChar: str

        :returns: a list of index pairs
                  [(index of startChar, index of endChar), ...]
        :rtype: list(tuple(int))
        '''
        # init output
        output = []
        # startChar and endChar must have equal occurrence in rawString
        if rawString.count(startChar) != rawString.count(endChar):
            logging.warning("Unbalanced {} and {} in '{}'".format(startChar,
                endChar,rawString))
            return output
        # create a stack for index of startChars
        startCharStack = []
        for i,ch in enumerate(rawString):
            # add i to stack if encounters a startChar
            if ch == startChar:
                startCharStack.append(i)
            if ch == endChar:
                output.append((startCharStack.pop(),i))
        return output

    # xpath reader function
    def xpathReader(self, xpath):
        '''
        Reads xpath and determines subclasses for xName, xUnit, yName, yUnit individually

        :param xpath: xpath of the spectra data headers
        :type xpath: str

        :returns: a dictionary {'xName': {subclass1, subclass2,...}, 'xUnit': {subclass2}, 'yName': {subclass3}, 'yUnit': {subclass4}}
        :rtype: dict
        '''

        # remove '/data' and '/Data' from xpath, that's a schema thing
        xpath = xpath.replace('/data','').replace('/Data','')
        # remove brackets from xpath
        noBracketXpath = re.sub(r'\[.*?\]','',xpath)
        if noBracketXpath not in self.xpathSubclassPairs:
            return None
        return self.xpathSubclassPairs[noBracketXpath]

    # preload subclasses
    def __loadSC__(self, config):
        '''
        Load standard/non-standard name pairs and load subclasses with those pairs
        '''
        # load json
        with open(config,'r') as f:
            fullDict = json.load(f)
        # load namePairs for stdName and name mapping, X/Y both included
        nameStdzrs = {}
        stdNameName = fullDict['stdName-name']
        for stdName in stdNameName:
            # create the standardizer object and save it to the stdzrs dict
            nameStdzrs[stdName] = standardizer({stdName:stdNameName[stdName]})
        # load namePairs for stdUnit and unit mapping, X/Y both included
        # an extra layer is needed for unit standardizers because one unit type
        # could contain multiple stdUnits
        # example: frequencyUnit: Hz, kHz, MHz, GHz, rad/s
        unitTypeStdzrs = {}
        unitTypeStdUnit = fullDict['unitType-stdUnit']
        stdUnitUnit = fullDict['stdUnit-unit']
        for unitType in unitTypeStdUnit:
            # use unitType as the key, find all stdUnit mapped to the unitType,
            # create a unitType standardizer with all stdUnit-unit pairs
            allStdUnitUnitPairs = {}
            for stdUnit in unitTypeStdUnit[unitType]:
                allStdUnitUnitPairs[stdUnit] = stdUnitUnit[stdUnit]
            # create the standardizer object and save it to the stdzrs dict
            unitTypeStdzrs[unitType] = standardizer(allStdUnitUnitPairs)
        # an example of how xpath-subclass pairs should look like
        # xpathSubclassPairs = {
        #     'PROPERTIES/Viscoelastic/DynamicProperties/DynamicPropertyProfile': {
        #         'xName': {
        #             frequency standardizer object,
        #             temperature standardizer object,
        #             strain standardizer object
        #         },
        #         'xUnit': {
        #             frequencyUnit standardizer object,
        #             temperatureUnit standardizer object,
        #             strainUnit standardizer object,
        #             dimensionless standardizer object
        #         },
        #         'yName': {
        #             storageModulus standardizer object,
        #             lossModulus standardizer object,
        #             tanDelta standardizer object,
        #             normalizedStorageModulus standardizer object,
        #             normalizedLossModulus standardizer object,
        #             normalizedTanDelta standardizer object,
        #             shearStorageModulus standardizer object,
        #             shearLossModulus standardizer object
        #         },
        #         'yUnit': {
        #             modulusUnit standardizer object,
        #             dimensionless standardizer object
        #         }
        #     }
        # }
        xpathSubclassPairs = {}
        stdNameUnitType = fullDict['stdName-unitType']
        xpathStdXName = fullDict['xPath-stdXName']
        xpathStdYName = fullDict['xPath-stdYName']
        # xpathStdXName and xpathStdYName has the same set of keys
        for xpath in xpathStdXName:
            # create the set of standardizers for xName
            xNameStdzrs = set()
            for stdXName in xpathStdXName[xpath]:
                xNameStdzrs.add(nameStdzrs[stdXName])
            # repeat for yName
            yNameStdzrs = set()
            for stdYName in xpathStdYName[xpath]:
                yNameStdzrs.add(nameStdzrs[stdYName])
            # create the set of standardizers for xUnit, this set needs to be
            # created by this route:
            # xpath-stdXName -> stdName-UnitType -> unitTypeStdzrs[xUnitType]
            xUnitStdzrs = set()
            for stdXName in xpathStdXName[xpath]:
                for xUnitType in stdNameUnitType[stdXName]:
                    xUnitStdzrs.add(unitTypeStdzrs[xUnitType])
            # repeat for yUnit
            yUnitStdzrs = set()
            for stdYName in xpathStdYName[xpath]:
                for yUnitType in stdNameUnitType[stdYName]:
                    yUnitStdzrs.add(unitTypeStdzrs[yUnitType])
            # save to xpathSubClassPairs
            xpathSubclassPairs[xpath] = {'xName': xNameStdzrs,
                                         'xUnit': xUnitStdzrs,
                                         'yName': yNameStdzrs,
                                         'yUnit': yUnitStdzrs}
        # save to the class
        self.xpathSubclassPairs = xpathSubclassPairs
        return

    # parse function
    def parse(self, xpath, xheader, yheader):
        '''
        Parses the input raw data and returns the standardized x/yName/Unit

        :param xpath: xpath of the spectra data headers
        :type xpath: str

        :param xheader: raw header string for x axis
        :type xpath: str

        :param yheader: raw header string for y axis
        :type xpath: str

        :returns: a dictionary {'xName': std xName, 'xUnit': std xUnit, 'yName': std yName, 'yUnit': std yUnit (or None as the value if no standard expression could be found)}
        :rtype: dict
        '''
        # separate headers
        nameUnitDict = self.separator(xheader, yheader)
        print(nameUnitDict)
        # unpack nameUnitDict
        xNames = nameUnitDict['xName']
        xUnits = nameUnitDict['xUnit']
        yNames = nameUnitDict['yName']
        yUnits = nameUnitDict['yUnit']
        # call mapping function
        return self.mapping(xpath, xNames, xUnits, yNames, yUnits)

    # mapping function
    def mapping(self, xpath, xNames, xUnits, yNames, yUnits):
        '''
        Maps xName, xUnit, yName, yUnit with their corresponding std expression.
        Returns the standardized x/yName/Unit

        :param xpath: xpath of the spectra data headers
        :type xpath: str

        :param xNames: parameter name for x axis as splitted from raw header str
        :type xNames: list(str)

        :param xUnits: unit for x axis as splitted from raw header str
        :type xUnits: list(str)

        :param yNames: parameter name for y axis as splitted from raw header str
        :type yNames: list(str)

        :param yUnits: unit for y axis as splitted from raw header str
        :type yUnits: list(str)

        :returns: a dictionary {'xName': std xName, 'xUnit': std xUnit, 'yName': std yName, 'yUnit': std yUnit (or None as the value if no standard expression could be found)}
        :rtype: dict
        '''
        # init output
        output = {
            'xName': None,
            'xUnit': None,
            'yName': None,
            'yUnit': None
        }
        # init score books
        xNamesScores = {} # {1.0:{'xName1','xName2'}, 0.75:{'xName3'}, ...}
        xUnitsScores = {} # same format as xNamesScores
        yNamesScores = {} # same format as xNamesScores
        yUnitsScores = {} # same format as xNamesScores
        # read xpath to determine subclasses
        subclassPools = self.xpathReader(xpath)
        if subclassPools is None:
            return output
        # For cases where multiple paired subclasses, use the one with the
        # highest score
        # standardize xName
        for subclass in subclassPools['xName']:
            for xName in xNames:
                result, score = subclass.evaluate(xName)
                if score not in xNamesScores:
                    xNamesScores[score] = set()
                xNamesScores[score].add(result)
        # standardize xUnit
        for subclass in subclassPools['xUnit']:
            for xUnit in xUnits:
                result, score = subclass.evaluate(xUnit)
                if score not in xUnitsScores:
                    xUnitsScores[score] = set()
                xUnitsScores[score].add(result)
        # standardize yName
        print(yNames)
        for subclass in subclassPools['yName']:
            for yName in yNames:
                result, score = subclass.evaluate(yName)
                if score not in yNamesScores:
                    yNamesScores[score] = set()
                yNamesScores[score].add(result)
        # standardize yUnit
        for subclass in subclassPools['yUnit']:
            for yUnit in yUnits:
                result, score = subclass.evaluate(yUnit)
                if score not in yUnitsScores:
                    yUnitsScores[score] = set()
                yUnitsScores[score].add(result)
        # determine the stdX/YName/Unit by the scorebooks
        # xName
        stdXName = None    
        tieStdXName = False # flag for a tie
        topScoreXName = max(xNamesScores.keys()) # score as keys
        # if there is a tie in the top score
        if len(xNamesScores[topScoreXName]) > 1:
            tieStdXName = True
        else:
            stdXName = list(xNamesScores[topScoreXName])[0]
        # yName
        print(yNamesScores)
        stdYName = None    
        tieStdYName = False # flag for a tie
        topScoreYName = max(yNamesScores.keys()) # score as keys
        # if there is a tie in the top score
        if len(yNamesScores[topScoreYName]) > 1:
            tieStdYName = True
        else:
            stdYName = list(yNamesScores[topScoreYName])[0]
        # xUnit
        stdXUnit = None    
        tieStdXUnit = False # flag for a tie
        topScoreXUnit = max(xUnitsScores.keys()) # score as keys
        # if there is a tie in the top score
        if len(xUnitsScores[topScoreXUnit]) > 1:
            tieStdXUnit = True
        else:
            stdXUnit = list(xUnitsScores[topScoreXUnit])[0]
        # yUnit
        stdYUnit = None    
        tieStdYUnit = False # flag for a tie
        topScoreYUnit = max(yUnitsScores.keys()) # score as keys
        # if there is a tie in the top score
        if len(yUnitsScores[topScoreYUnit]) > 1:
            tieStdYUnit = True
        else:
            stdYUnit = list(yUnitsScores[topScoreYUnit])[0]
        # (TODO) use stdX/YName to aid standardizing x/yUnit
        # (TODO) use stdX/YUnit to aid breaking the tie
        # let's skip these special cases for now
        if tieStdXName:
            stdXName = list(xNamesScores[topScoreXName])[0]
        if tieStdYName:
            stdYName = list(yNamesScores[topScoreYName])[0]
        if tieStdXUnit:
            stdXUnit = list(xUnitsScores[topScoreXUnit])[0]
        if tieStdYUnit:
            stdYUnit = list(yUnitsScores[topScoreYUnit])[0]
        # save the results to output
        output['xName'] = stdXName
        output['xUnit'] = stdXUnit
        output['yName'] = stdYName
        output['yUnit'] = stdYUnit
        # return
        return output