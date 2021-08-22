import numpy
import difflib

# A parent standardizer object
class standardizer(object):
    def __init__(self, namePairs, dlCutoff=0.6):
        '''
        Initialize and set up name pairs of non-standard and standard expressions

        :param namePairs: a dictionary with standard expressions as the key and a set of non-standard expressions as the value. Example: {'Storage Modulus': {"E'", "Storage Modulus", "Log-storage modulus", "Storage Modulus, E"}} or {'Hz': {'Hertz', 'Hz'}, 'kHz': {'kHz'}, 'GHz': {'GHz'}, 'rad/second': {'rad/s', 'rad/sec'}}
        :type namePairs: dict

        :param dlCutoff: cutoff value for difflib.get_close_matches()
        :type namePairs: float
        '''
        self.namePairs = namePairs
        self.dlCutoff = dlCutoff # optimize it (TODO)

    def evaluate(self, expression, keySet=None):
        '''
        Calls mapping algorithms to evaluate if a match in the standard
        expressions could be found for the given expression

        :param expression: could be raw xName, xUnit, yName, yUnit
        :type expression: str

        :param keySet: list of keys in namePairs to perform evaluation on,
                       default to use the full list of keys
        :type expression: list(str)

        :returns: a tuple of standard expression (or None if no match could be
                  found) and score of confidence
        :rtype: tuple(str, float)
        '''
        # by default use the full set of keys in namePairs
        if keySet is None:
            keySet = self.namePairs.keys()
        # init score
        score = 1.0
        # call algorithm 1
        raw = expression.lower().replace(" ","")
        for stdName in keySet:
            if raw == stdName.lower().replace(" ",""):
                return (stdName, score)
            for rawName in self.namePairs[stdName]:
                if raw == rawName.lower().replace(" ",""):
                    score = 0.95
                    return (stdName, score)

        # use difflib here and ratio() as scoring function
        # Ratcliff-Obershelp
        currentDLHighScore = -1
        currentDLMatch = None
        for stdName in keySet:
            # call get_close_matches
            result = difflib.get_close_matches(expression,
                self.namePairs[stdName],n=1,cutoff=self.dlCutoff)
            # check the score if result is not empty
            if len(result) > 0:
                currentDLScore = difflib.SequenceMatcher(None, expression,
                    result[0]).ratio()
                if currentDLScore > currentDLHighScore:
                    currentDLHighScore = currentDLScore
                    currentDLMatch = stdName
        # return if a match is found
        if currentDLMatch is not None:
            return (currentDLMatch, currentDLHighScore)

        # call algorithm 2 (e.g. levenshtein distance with a threshold)
        levenshteinMatch, levenshteinDist = self.levenshtein(expression, self.namePairs, thresh=2)
        if levenshteinMatch is not None:
            return (levenshteinMatch, 1-levenshteinDist/len(expression))
        
        # call algorithm 3 (e.g. tokenization)

        # etc.
        
        # summarize the results from the evaluations of all algorithms, think about some rules that could conclude whether a match could be found, return the match
            # Match: if match, return key
            # Distance: stated above
            # Token: if tokens are the same and distance is <= 2 or something like that

        # otherwise, return (None, -1)
        return (None, -1)

    # evaluation by levenshtein distance
    def levenshtein(self, expression, namePairs, thresh=2):
        '''
        Fill this in

        :param expression: could be raw xName, xUnit, yName, yUnit
        :type expression: str

        :param namePairs: 
        :type namePairs: 

        :param thresh:
        :type thresh:

        :returns: 
        :rtype: 
        '''
        currentMatch = None
        currentLowestDistance = 999
        token1 = expression
        for stdName in namePairs:
            token2Pool = {stdName}
            token2Pool.update(namePairs[stdName])
            for token2 in token2Pool:
                if len(token2) > 3: # magic number 3, make it a variable
                    distances = numpy.zeros((len(token1) + 1, len(token2) + 1))
                    for t1 in range(len(token1) + 1):
                        distances[t1][0] = t1
                    for t2 in range(len(token2) + 1):
                        distances[0][t2] = t2
                    a = 0
                    b = 0
                    c = 0
                    for t1 in range(1, len(token1) + 1):
                        for t2 in range(1, len(token2) + 1):
                            if (token1[t1-1] == token2[t2-1]):
                                distances[t1][t2] = distances[t1 - 1][t2 - 1]
                            else:
                                a = distances[t1][t2 - 1]
                                b = distances[t1 - 1][t2]
                                c = distances[t1 - 1][t2 - 1]
                                if (a <= b and a <= c):
                                    distances[t1][t2] = a + 1
                                elif (b <= a and b <= c):
                                    distances[t1][t2] = b + 1
                                else:
                                    distances[t1][t2] = c + 1
                    currentDistance = distances[len(token1)][len(token2)]
                    if currentDistance < currentLowestDistance:
                        currentMatch = stdName
                        currentLowestDistance = currentDistance
        if currentLowestDistance <= thresh:
            return (currentMatch, currentLowestDistance)
        return (None,-1)

if __name__ == '__main__':
    std = standardizer({'Standard Name': {'UPPERcaselowerCASE', 'white space', 'Typ0', 'more tip0'}})
    # test case 1, standard name
    assert std.evaluate('Standard Name') == 'Standard Name', 'Fail test case 1'
    # test case 2, upper/lower case
    assert std.evaluate('uPpErCaseLowercase') == 'Standard Name', 'Fail test case 2'
    # test case 3, white space
    assert std.evaluate('whitespace') == 'Standard Name', 'Fail test case 3'
    # test case 4, white space
    assert std.evaluate('  white  space  ') == 'Standard Name', 'Fail test case 4'
    # test case 5, typo (levenstein distance = 1)
    assert std.evaluate('typo') == 'Standard Name', 'Fail test case 5'
    # test case 6, typo (levenstein distance = 2)
    assert std.evaluate('more typo') == 'Standard Name', 'Fail test case 6'
    # test case 7, no match found
    assert std.evaluate('nonsense') is None, 'Fail test case 7'
    # test case 8, slightly modified standard name
    assert std.evaluate('Stanbard Name') == 'Standard Name', 'Fail test case 8'
    print("All tests passed")