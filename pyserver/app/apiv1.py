from flask import Blueprint
from flask_restplus import Api

api = Api(blueprint)

from .apis.namespace1 import api as ns1
from .apis.namespace2 import api as ns2
# ...
from .apis.namespaceX import api as nsX

blueprint = Blueprint('api', __name__, url_prefix='/api/v1')
api = Api(blueprint,
  title='MaterialsMine API v1',
  version='1.0',
  description='REST Services'
  # All API metadata
)

api.add_namespace(ns1)
api.add_namespace(ns2)
# ...
api.add_namespace(nsX)
