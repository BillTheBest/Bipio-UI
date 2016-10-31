export function randomString(len, charSet) {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
    	var randomPoz = Math.floor(Math.random() * charSet.length);
    	randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
}

export function addEscapeChars(hub) {
  //Using regex to add escape characters to hub
  for (var key1 in hub) {
    if (hub.hasOwnProperty(key1)) {
      var val = hub[key1];
      for (var key2 in val.transforms) {
        if (val.transforms.hasOwnProperty(key2)) {
	  var element = val.transforms[key2];
	  for (var key3 in element) {
	    var prop = element[key3];
	    var newProp = prop.replace(/"/g, '\\"');
	    element[key3] = newProp;
	  }
        }
      }
    }
  }
  return hub;
}
