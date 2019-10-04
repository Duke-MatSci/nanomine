from flask import request
from flask_restplus import Resource, Namespace, fields
from flask_restplus import reqparse
from nmChemPropsAPI import nmChemPropsAPI

class ChemPropsDto:
  api = Namespace('chemprops', description='ChemProps REST operations')
  chemprops = api.model('chemprops', {
    'StandardName': fields.String(required=True, description='Standard Chemical Name'),
    'density': fields.String(required=True, description='Polymer Density')
  })
  # chemprops = api.model('chemprops', {
  #   'polfil': fields.String(required=True, description='Polymer or filler flag' ),
  #   'ChemicalName': fields.String(required=True, description='Chemical name to locate'),
  #   'Abbreviation': fields.String(required=False, description='Abbreviation to locate'),
  #   'TradeName': fields.String(required=False, description='Trade name to locate'),
  #   'uSMILES': fields.String(required=False, description='SMILES value to locate')
  #
  # })


api = ChemPropsDto.api
_chemprops = ChemPropsDto.chemprops

@api.route('/')
class ChemProps(Resource):
  @api.doc('Get ChemProps Information')
  @api.marshal_with(_chemprops, envelope='data')
  @api.doc(params={'polfil': 'Polymer (use pol) or Filler (use fil)'})
  @api.doc(params={'ChemicalName': 'Chemical name to locate'})
  @api.doc(params={'Abbreviation': 'Optional abbreviation to locate'})
  @api.doc(params={'TradeName': 'Optional trade name to locate'})
  @api.doc(params={'uSMILES': 'Optional specific SMILES value to locate'})
  def get(self):
    """get chemprops info based on search criteria"""
    parser = reqparse.RequestParser() # marshmallow is preferred parser, this is technically deprecated but supported long term
    parser.add_argument('polfil', required=True, help='Polymer (pol) or Filler (fil)')
    parser.add_argument('ChemicalName', required=True, help='Chemical name to locate')
    parser.add_argument('Abbreviation', help="Optional abbreviation to locate")
    parser.add_argument('TradeName', help="Optional trade name to locate")
    parser.add_argument('uSMILES', help="Optional specific SMILE to locate")
    args = parser.parse_args()
    nmId = 'restNmId'
    cp = nmChemPropsAPI(nmId)
    polfil = args['polfil']
    params = {'ChemicalName': args['ChemicalName'], 'Abbreviation': args['Abbreviation'], 'TradeName': args['TradeName'], 'uSMILES': args['uSMILES']}
    rv = {}
    if polfil == 'fil' :
      # filler
      rv = cp.searchFillers(params)
    else :
      # polymer
      rv = cp.searchPolymers(params)

    return rv, 200

  # @api.response(201, 'User successfully created.')
  # @api.doc('create a new user')
  # @api.expect(_user, validate=True)
  # def post(self):
  #   """Creates a new User """
  #   data = request.json
  #   return save_new_user(data=data)


