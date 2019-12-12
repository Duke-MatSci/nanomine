from functools import wraps
from flask import request

from app.util.auth_helper import Auth
from app.config import Config
def token_required(f):
  @wraps(f)
  def decorated(*args, **kwargs):

    status, token_info = Auth.get_jwt_token_info(request)
    # at this point, we just need a valid token
    app = Config.getApp()
    app.logger.debug(__name__ + ' Auth.get_jwt_token_info returned status: ' + str(status) + ' token_info: ' + str(token_info))
    if status != 200:
      return token_info, status

    return f(*args, **kwargs)

  return decorated
