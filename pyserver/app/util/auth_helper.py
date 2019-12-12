from app.util.jwt_token import decode_jwt_token
from app.config import Config

class Auth:

  @staticmethod
  def get_jwt_token_info(request):
    status = 200
    token_info = {}
    token = request.cookies.get('token')
    app = Config.getApp()
    if not token:
      app.logger.debug(__name__ + ' token is NOT available')
      status = 401
      return status, token_info
    else:
      status_str, token_info = decode_jwt_token(token)
      app.logger.debug(__name__ + ' obtained token info: ' + str(token_info) + ' status: ' + status_str)
      if status_str != 'ok' : # could be anonymous, but they're still not logged in
        status = 401
      return status, token_info
