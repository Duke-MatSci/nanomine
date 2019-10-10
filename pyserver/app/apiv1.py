from flask import Blueprint
from flask_restplus import Api

# IMPORTANT!!! only v1 namespaces here.  For new versions, create an apivX.py module and add to app/__init__.py
# make sure to name everything appropriately for V1 (or Vx as needed in new apivX.py)

from .api.chemprops.chemprops_v1 import api as chemprops_v1_ns
#from .apis.namespace2 import api as ns2
# ...
#from .apis.namespaceX import api as nsX

blueprint = Blueprint('api', __name__, url_prefix='/v1')

api = Api(blueprint,
          # prefix='/api', # implied because of wsgi
          doc='/doc',
          title='MaterialsMine REST API',
          version='1.0',
          description='REST Services for MaterialsMine v1.0'
          )

api.add_namespace(chemprops_v1_ns, path='/chemprops')
# ...
#api.add_namespace(nsX)
