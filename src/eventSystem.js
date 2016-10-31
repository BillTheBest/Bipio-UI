var queue = {};

  
export function publish(event, data) {
      var eventQueue = queue[event];

      if (typeof eventQueue === 'undefined') {
        return false;
      }

      for (var i=0; i < eventQueue.length > 0; i++) {
        (eventQueue[i])(data);
      }

      return true;
    };
export function subscribe(event, callback) {
      if (typeof queue[event] === 'undefined') {
        queue[event] = [];
      }

      queue[event].push(callback);
    };
export function unsubscribe(event, callback) {
      var eventQueue = queue[event];

      if (typeof eventQueue === 'undefined') {
        return false;
      }

      var index = eventQueue.indexOf(callback);
      if (index > -1) {
	eventQueue.splice(index, 1);
      }
    };

