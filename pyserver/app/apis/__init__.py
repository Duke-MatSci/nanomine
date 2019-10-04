from flask_restplus import Api

from .chemprops_v1 import api as chemprops_v1
## from .namespace2 import api as ns2

api = Api(
  title='MaterialsMine REST API',
  version='1.0',
  description='MaterialsMine REST API documentation',
  # All API metadatas
)

api.add_namespace(chemprops_v1)
## api.add_namespace(ns2)
