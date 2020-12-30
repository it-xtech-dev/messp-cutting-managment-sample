function MessagePipe(targetWindow, targetOrigin, timeout) {
  var _sendQueue = [];
  var _isConnected = false;
  var _connectionTimer = null;
  var _timeout = timeout || 5000;
  var _connectedStartedOn = new Date();
  var _connectionErrorStack = [];
  var _api;


  // Adding listener to target window (will listen for incomming messages);
  window.addEventListener('message', function (event) {
      // verify message origin
      if (event.origin == targetOrigin) {
          if (event.data !== '":>hello"' && typeof _api.onReceived === 'function') {
              // when non 'hello' message received process payload.
              _api.onReceived(JSON.parse(event.data));
          }
          // when any message received set connected flag and raise connected event.
          if (_isConnected === false && typeof _api.onConnected === 'function') _api.onConnected();
          _isConnected = true;
      }
  }, false);

  /**
   * Establishes pipe connection, and processed send queue;
   * */
  function connect() {
      if (_isConnected) throw new Error('Pipe already connected');
      _connectedStartedOn = new Date();
      // awaits for window to be initialized by sending hello message
      _connectionTimer = setInterval(function () {
          if (new Date().getTime() - _connectedStartedOn.getTime() >= _timeout) {
              // when time out reached, throw an exception;
              clearInterval(_connectionTimer);
              console.error('Pipe timeout exceeded!', { errorStack: _connectionErrorStack });
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
                  _isTargetOriginValid(true)
                  _sendNow(':>hello');
              } catch (error) {
                  _connectionErrorStack.push(error);
              }
          }
      }, 100);
  }

  function _isTargetOriginValid(beVerbose) {
      var result = targetWindow.location.href.substring(0, targetOrigin.length) === targetOrigin.length;
      if (beVerbose === true && result === false) throw new Error('TargetOrigin mismatch actual:"' + targetWindow.location.href + '", expected:"' + targetOrigin + '"');
      return result;
  }

  /**
   * Sends message immediately to targetWindow.
   * @param {object} command - the command object.
   * */
  function _sendNow(command) {
      var data = JSON.stringify(command);
      targetWindow
          .postMessage(data, targetOrigin);
  }

  /**
   * Sends message to targetWidow when connection established.
   * @param command - the command object.
   */
  function send(command) {
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
  }

  return _api;
}