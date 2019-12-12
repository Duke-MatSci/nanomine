import jwt
from app.config import key, Config

def remap_jwt_token(payload) :
  # not doing anything yet
  return payload

def decode_jwt_token(token):
  status = 'ok'
  payload = {}
  app = Config.getApp()
  try:
    payload = jwt.decode(token, key)
    payload = remap_jwt_token(payload)
    if payload['sub'] == 'anonymous' or payload['isAnonymous'] == 'true' :
      status = 'anonymous'
    app.logger.debug(__name__ + ' returning: ' + status + ' payload: ' + str(payload))
    return status, payload
  except jwt.ExpiredSignatureError:
    status = 'expired'
    app.logger.debug(__name__ + ' returning: ' + status + ' payload: ' + str(payload))
    return status, payload
  except jwt.InvalidTokenError:
    status = 'invalid'
    app.logger.debug(__name__ + ' returning: ' + status + ' payload: ' + str(payload))
    return status, payload
