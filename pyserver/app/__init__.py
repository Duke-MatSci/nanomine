# app/__init__.py

from flask_restplus import Api
from flask import Blueprint

from .main.controller.chemprops import api as chemprops_ns

blueprint = Blueprint('api', __name__)

# wsgi path to this is /api, so the /api is implied and not configured in flask/restplus
api = Api(blueprint,
          # prefix='/api', # implied because of wsgi
          doc='/doc',
          title='MaterialsMine REST API',
          version='1.0',
          description='REST Services for MaterialsMine'
          )

api.add_namespace(chemprops_ns, path='/v1/chemprops')
