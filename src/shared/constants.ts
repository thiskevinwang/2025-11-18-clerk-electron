export const APP_PROTOCOL = 'myapp'
export const PRODUCTION_CALLBACK_URL = `${APP_PROTOCOL}://sso-callback`

export const channels = {
  AUTH_TOKEN_SET: 'auth:token:set',
  AUTH_TOKEN_GET: 'auth:token:get',
  AUTH_TOKEN_CLEAR: 'auth:token:clear',

  AUTH_OPENED_POPUP: 'auth:opened-popup',
  AUTH_CLOSED_POPUP: 'auth:closed-popup',
  AUTH_CALLBACK: 'auth:callback',

  HTTP_REQUEST: 'http:request'
}
