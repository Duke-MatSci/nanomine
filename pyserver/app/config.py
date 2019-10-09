import os

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
  SECRET_KEY = os.environ.get('NM_AUTH_SECRET', 'INVALID-KEY')
  DEBUG = False
  _app = None

  @staticmethod
  def setApp(app): # sets the flask app into the config
    Config._app = app

  @staticmethod
  def getApp(): # get the flask app
    return Config._app

class DevelopmentConfig(Config):
  DEBUG = True


class TestingConfig(Config):
  DEBUG = True
  TESTING = True
  PRESERVE_CONTEXT_ON_EXCEPTION = False


class ProductionConfig(Config):
  DEBUG = False


config_by_name = dict(
  dev=DevelopmentConfig,
  test=TestingConfig,
  prod=ProductionConfig
)
key = Config.SECRET_KEY

