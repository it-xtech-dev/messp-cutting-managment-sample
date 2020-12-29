function MessagePipe(targetWindow, targetOrigin, timeout) {
  var _sendQueue = [];
  var _isConnected = false;
  var _connectionTimer = null;
  var _timeout = timeout || 5000;
  var _connectedStartedOn = new Date();
  var onReceived = null
  var onConnected = null;

  // Adding listener to target window (will listen for incomming messages);
  targetWindow.addEventListener('message', function (event) {
      // verify message origin
      if (event.origin == targetOrigin) {
          if (event.data !== 'hello' && typeof onReceived === 'function') {
              // when non 'hello' message received process payload.
              onReceived(JSON.parse(event.data));
          }
          // when any message received set connected flag.
          _isConnected = true;
      }
  }, false);

  // Establishing the connection.
  _connect();

  /**
   * Ensures connection is established, and processed send queue;
   * */
  function _connect() {
      // awaits for window to be initialized by sending hello message
      _connectionTimer = setInterval(function () {
          if ((new Date()).getTime() - _connectedStartedOn.getTime() >= timeout) {
            // when time out reached, throw an exception;
            clearInterval(_connectionTimer);
            throw('Pipe timeout exceeded!');
          } else if (_isConnected) {
            // when 'hello' message received from other side _isConnected flag will be set and connection process can be terminated.
            clearInterval(_connectionTimer);
            // all queued messges will be processed now as connection is establised:
            for (var i = 0; i < _sendQueue.length; i++) {
              _sendNow(_sendQueue[i]);
            }
          } else {
            // send 'hello' message until other side hello received.
            _sendNow('hello');
          }
      }, 100);
  }

  /**
   * Sends message immediately to targetWindow.
   * */
  function _sendNow(command) {
      targetWindow
          .postMessage(JSON.stringify(command), targetOrigin);
  }

  /**
   * Sends message to targetWidow when connection established.
   * @@param command - the command object.
   */
  function send(command) {
      if (_isConnected) {
          _sendNow(command);
      } else {
          _sendQueue.push(command);
      }
  }

  return {
      send: send,
      onReceived: onReceived,
      onConnected: onConnected
  }
}