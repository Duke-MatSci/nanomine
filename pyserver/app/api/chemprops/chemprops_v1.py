from flask import request
from flask_restplus import Resource, Namespace, fields, marshal
from flask_restplus import reqparse
from nmChemPropsAPI import nmChemPropsAPI
from app.util.decorators import token_required
from app.config import Config
import traceback

class ChemPropsDto:
  api = Namespace('chemprops', description='ChemProps REST operations')
  chemprops = api.model('chemprops', {
    'StandardName': fields.String(required=True, description='Standard Chemical Name'),
    'density': fields.String(required=True, description='Chemical Density at 25 degree Celsius'),
    'uSMILES': fields.String(required=False, description='Polymer unique SMILES')
  })

api = ChemPropsDto.api

class ChemPropsApiDoc: # /api/doc
  doc = {
    'get': {
    '/' : {
      'polfil': 'Search type: Use \"pol\" for polymer or \"fil\" for filler',
      'ChemicalName': 'Chemical name to locate',
      'Abbreviation': 'Optional abbreviation to locate',
      'TradeName': 'Optional trade name to locate',
      'SMILES': 'Optional specific SMILES value to locate',
      'nmId': 'NanoMine id, required for XMLCONV calls'
      }
    }
  }

  @staticmethod
  def getDoc(method, path, key):
    return ChemPropsApiDoc.doc[method][path][key]

@api.route('/')
class ChemProps(Resource):
  @api.marshal_with(ChemPropsDto.chemprops)
  @api.doc('Get ChemProps Information')
  @api.doc(params={'polfil': ChemPropsApiDoc.getDoc('get','/','polfil')})
  @api.doc(params={'ChemicalName': ChemPropsApiDoc.getDoc('get','/','ChemicalName')})
  @api.doc(params={'Abbreviation': ChemPropsApiDoc.getDoc('get','/','Abbreviation')})
  @api.doc(params={'TradeName': ChemPropsApiDoc.getDoc('get','/','TradeName')})
  @api.doc(params={'SMILES': ChemPropsApiDoc.getDoc('get','/','SMILES')})
  @api.doc(params={'nmId': ChemPropsApiDoc.getDoc('get','/','nmId')})
  @api.response(400,'Incorrect request parameters')
  @api.response(401,'Authentication required')
  @api.response(403,'Not authorized')
  @api.response(404,'Unable to locate based on parameters given')
  @token_required # removed authentication requirement for now
  def get(self):
    """get chemprops info based on search criteria"""
    callParams = ('ChemicalName', 'Abbreviation', 'TradeName', 'SMILES')
    parser = reqparse.RequestParser() # marshmallow is preferred parser, this is technically deprecated but supported long term
    parser.add_argument('polfil', required=True, help=ChemPropsApiDoc.getDoc('get','/','polfil'))
    parser.add_argument('nmId', required=True, help=ChemPropsApiDoc.getDoc('get','/','nmId'))
    for p in callParams:
      parser.add_argument(p, required=(p == 'ChemicalName'), help=ChemPropsApiDoc.getDoc('get','/',p))

    args = parser.parse_args()
    cp = nmChemPropsAPI(args['nmId'])
    polfil = args['polfil']
    params = dict()
    for p in callParams:
      if args[p] is not None:
        params[p] = args[p]
    rv = {}
    data = None
    try:
      if polfil == 'fil' :
        # filler
        rv = cp.searchFillers(params)
        if rv is not None:
          data = {'StandardName': rv['_id'], 'density': rv['_density']}
          marshal(data, ChemPropsDto.chemprops)
          Config.getApp().logger.debug(__name__ + ' chemprops.get(\'' + polfil + '\', ' + str(params) + '): returned - ' + str(rv))
      elif polfil == 'pol':
        # polymer
        rv = cp.searchPolymers(params)
        if rv is not None:
          Config.getApp().logger.debug(__name__ + ' chemprops.get(\'' + polfil + '\', ' + str(params) + '): returned - ' + str(rv))
          data = {'StandardName': rv['_stdname'], 'density': rv['_density'], 'uSMILES': rv['_id']}
          marshal(data, ChemPropsDto.chemprops)
      else :
        return None, 400 # pol or fil required

      if data is not None:
        return data, 200
      else:
        return None, 404

    except:
      fullStr = traceback.format_exc()
      Config.getApp().logger.error(__name__ + 'error executing chemprops.get(\'' + polfil + '\', ' + str(params) + '): ' + fullStr)
      # data.StandardName = ''
      # data.density = float('nan')
      return None, 500


  # @api.response(201, 'User successfully created.')
  # @api.doc('create a new user')
  # @api.expect(_user, validate=True)
  # def post(self):
  #   """Creates a new User """
  #   data = request.json
  #   return save_new_user(data=data)


