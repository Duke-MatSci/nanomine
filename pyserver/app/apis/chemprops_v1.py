from flask_restplus import Namespace, Resource, fields

api = Namespace('chemprops', description='ChemProps REST API')

chemprops = api.model('ChemProps', {
  'id': fields.String(required=True, description='The identifier'),
  'name': fields.String(required=True, description='The name'),
})

CHEMPROPS = [
  {'id': '1', 'name': 'cp1'},
]

@api.route('/')
class ChemPropsList(Resource):
  @api.doc('List chemprops')
  @api.marshal_list_with(chemprops)
  def get(self):
    '''List all chemprops'''
    return CHEMPROPS

@api.route('/<id>')
@api.param('id', 'The chemprop identifier')
@api.response(404, 'chemprop not found')
class Cat(Resource):
  @api.doc('get_chemprop')
  @api.marshal_with(chemprops)
  def get(self, id):
    '''Fetch a chemprop given its identifier'''
    for chemprop in CHEMPROPS:
      if chemprop['id'] == id:
        return chemprops
    api.abort(404)
