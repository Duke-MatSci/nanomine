import os
import sys
from werkzeug.middleware.proxy_fix import ProxyFix

sys.path.insert(0, '/apps/nanomine/pyserver')
sys.path.insert(1, '/apps/chemprops') # TODO put this into a configuration

from app import create_app

app = create_app(os.environ.get('NM_RUNTIME_ENV', 'dev'))
app.app_context().push()
app = ProxyFix(app, x_for=1, x_host=1)
application = app
