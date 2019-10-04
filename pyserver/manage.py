import os
import unittest

from flask_script import Manager
from app import blueprint

from app.main import create_app

app = create_app(os.environ.get('NM_RUNTIME_ENV', 'dev'))
app.register_blueprint(blueprint)
app.app_context().push()

manager = Manager(app)

@manager.command
def run():
  app.run(host="0.0.0.0")

@manager.command
def test():
  tests = unittest.TestLoader().discover('app/test', pattern='test*.py')
  result = unittest.TextTestRunner(verbosity=2).run(tests)
  if result.wasSuccessful():
    return 0
  return 1

if __name__ == '__main__':
  manager.run()
