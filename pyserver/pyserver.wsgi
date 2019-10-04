import os
import sys
sys.path.insert(0, '/apps/nanomine/pyserver')
sys.path.insert(1, '/apps/chemprops') # TODO put this into a configuration


from app import blueprint

from app.main import create_app

app = create_app(os.environ.get('NM_RUNTIME_ENV', 'dev'))
app.register_blueprint(blueprint)
app.app_context().push()
application = app
