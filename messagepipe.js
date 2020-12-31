function MessagePipe(targetWindow, targetOrigin, timeout) {
  var _targetWindow = targetWindow;
  var _sendQueue = [];
  var _isConnected = false;
  var _isConnecting = false;
  var _connectionTimer = null;
  var _timeout = timeout || 5000;
  var _connectedStartedOn = new Date();
  var _connectionErrorStack = [];
  var _api;


  // Adding listener to target window (will listen for incomming messages);
  window.addEventListener('message', _listener, false);

  /**
   * Handles new message arrival.
   * @param {any} event - the postMessage event object.
   */
  function _listener(event) {
      // verify message origin
      if (event.origin == targetOrigin) {
          if (event.data === '":>hello"' || event.data === '":>hi"') {
              // respond to 'hello' message
              if (event.data === '":>hello"') _sendNow(':>hi');
              // when any message received set connected flag and raise connected event.
              if (_isConnected === false && typeof _api.onConnected === 'function') _api.onConnected();
              _isConnected = true;
              _isConnecting = false;
          } else {
              if (typeof _api.onReceived === 'function') {
                  if (!_isConnected) console.warn('Received payload message before connection was established!', event)
                  // when non 'hello' message received process payload.
                  _api.onReceived(JSON.parse(event.data));
              }
          }
      }
  }

  /**
   * Establishes pipe connection, and processed send queue;
   * */
  function connect() {
      if (_isConnected) throw new Error('Pipe already connected');
      _connectedStartedOn = new Date();
      _isConnecting = true;
      // awaits for window to be initialized by sending hello message
      _connectionTimer = setInterval(function () {
          if (new Date().getTime() - _connectedStartedOn.getTime() >= _timeout) {
              // when time out reached, throw an exception;
              clearInterval(_connectionTimer);
              _isConnected = false;
              _isConnecting = false;
              console.error('Pipe connection timeout exceeded! Target origin (' + targetOrigin + ') did not responded with "hello" message.', { errorStack: _connectionErrorStack });
              //throw new Error('Pipe timeout exceeded!');
          } else if (_isConnected) {
              // when 'hello' message received from other side _isConnected flag will be set and connection process can be terminated.
              clearInterval(_connectionTimer);
              // all queued messges will be processed now as connection is establised:
              for (var i = 0; i < _sendQueue.length; i++) {
                  _sendNow(_sendQueue[i]);
              }
          } else {
              // send 'hello' message until other side hello received.
              try {
                  // NOT FRAME SECNARIO ONLY:
                  // When parent origin is different from specified targetOrigin DOM exception will occur in asyc manner when calling postMessage().
                  // To detect this scenario and handle an error synchronously origin check is done before _sendNow can be executed.
                  // Supressed error message: VM878:1 Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('http://some.domain') does not match the recipient window's origin ('https://some.domain1').
                  if (self === top) {
                      _isParentOriginValid(true)
                  }
                  // send hellow message to pipe
                  _sendNow(':>hello');
              } catch (error) {
                  _connectionErrorStack.push(error);
              }
          }
      }, 100);
  }

  /**
   * Releases pipe resources.
   * */
  function dispose() {
      clearInterval(_connectionTimer);
      window.removeEventListener('message', _listener, false);
      _connectionErrorStack = null;
      _targetWindow = null;
      _sendQueue = null;
      _api = null;
  }

  /**
   * Validates whether targetWindow origin matches 
   * @param {any} beVerbose - when true throws an error if not valid.
   */
  function _isParentOriginValid(beVerbose) {
      // https://stackoverflow.com/questions/4594492/check-if-parent-window-is-iframe-or-not/4594531
      var result = _targetWindow.location.href.substring(0, targetOrigin.length) === targetOrigin.length;
      if (beVerbose === true && result === false) throw new Error('TargetOrigin mismatch actual:"' + _targetWindow.location.href + '", expected:"' + targetOrigin + '"');
      return result;
  }

  /**
   * Sends message immediately to targetWindow.
   * @param {object} command - the command object.
   * */
  function _sendNow(command) {
      var data = JSON.stringify(command);
      _targetWindow
          .postMessage(data, targetOrigin);
  }

  /**
   * Sends message to targetWidow when connection established.
   * @param command - the command object.
   */
  function send(command) {
      if (!_isConnected && !_isConnecting) throw new Error("Cannot send any message because pipe is not connected. Use .connect() method and check for expections.")
      if (_isConnected) {
          _sendNow(command);
      } else {
          _sendQueue.push(command);
      }
  }

  _api = {
      connect: connect,
      send: send,
      onReceived: null,
      onConnected: null,
      dispose: dispose
  }

  return _api;
}