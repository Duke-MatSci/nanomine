# app/__init__.py

from flask import Flask
from .apiv1 import blueprint as apiv1
# add new api version imports here and blueprint_register them below in create_app

from flask_bcrypt import Bcrypt

from .config import config_by_name, Config
import sys

flask_bcrypt = Bcrypt()

def create_app(config_name):
  app = Flask(__name__)
  app.register_blueprint(apiv1)
  # register new api versions with blueprint like statement above

  app.config.from_object(config_by_name[config_name])
  flask_bcrypt.init_app(app)
  Config.setApp(app)
  return app
