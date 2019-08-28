(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ]

    var isDataView = function(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj)
    }

    var isArrayBufferView = ArrayBuffer.isView || function(obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
    }
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1])
      }, this)
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var oldValue = this.map[name]
    this.map[name] = oldValue ? oldValue+','+value : value
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    name = normalizeName(name)
    return this.has(name) ? this.map[name] : null
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value)
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this)
      }
    }
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsArrayBuffer(blob)
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsText(blob)
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf)
    var chars = new Array(view.length)

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i])
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength)
      view.set(new Uint8Array(buf))
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (!body) {
        this._bodyText = ''
      } else if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer)
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer])
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body)
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      }
    }

    this.text = function() {
      var rejected = consumed(this)
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = String(input)
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit })
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers()
    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
    // https://tools.ietf.org/html/rfc7230#section-3.2
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ')
    preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':')
      var key = parts.shift().trim()
      if (key) {
        var value = parts.join(':').trim()
        headers.append(key, value)
      }
    })
    return headers
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = options.status === undefined ? 200 : options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = 'statusText' in options ? options.statusText : 'OK'
    this.headers = new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init)
      var xhr = new XMLHttpRequest()

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        }
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL')
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      } else if (request.credentials === 'omit') {
        xhr.withCredentials = false
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
// Camera utility - based on https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Taking_still_photos

var width = 0;
var height = 0;
var streaming = false;

var video = null;
var canvas = null;
var startbutton = null;

var photoCallback = null;

function setup() {
	var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};


	width = config.width || screen.width;

	photoCallback = config.callback;

	video = document.getElementById('camera-view');
	canvas = document.getElementById('canvas');
	startbutton = document.getElementById('take-photo-btn');
	document.getElementById('save-photo-btn').addEventListener('click', function (evt) {
		evt.preventDefault();
		savePhoto();
	});
	document.getElementById('reject-photo-btn').addEventListener('click', function (evt) {
		evt.preventDefault();
		rejectPhoto();
	});

	navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(function (stream) {
		video.srcObject = stream;
		video.play();
	}).catch(function (err) {
		console.error('Error getting video', err);
	});

	video.addEventListener('canplay', function (evt) {
		if (!streaming) {
			height = video.videoHeight / (video.videoWidth / width);
			video.setAttribute('width', width);
			video.setAttribute('height', height);
			canvas.setAttribute('width', width);
			canvas.setAttribute('height', height);
			streaming = true;
		}
	}, false);

	startbutton.addEventListener('click', function (evt) {
		evt.preventDefault();
		takePicture();
	}, false);

	clearPhoto();
}

function clearPhoto() {
	var context = canvas.getContext('2d');
	context.fillStyle = '#AAA';
	context.fillRect(0, 0, canvas.width, canvas.height);

	canvas.parentNode.classList.remove('camera__preview');
}

function takePicture() {
	var context = canvas.getContext('2d');
	if (width && height) {
		canvas.width = width;
		canvas.height = height;
		context.drawImage(video, 0, 0, width, height);

		canvas.parentNode.classList.add('camera__preview');
	} else {
		clearPhoto();
	}
}

function savePhoto() {
	var data = canvas.toDataURL('image/png');

	if (photoCallback) {
		photoCallback(data);
	}

	canvas.parentNode.classList.remove('camera__preview');
}

function rejectPhoto() {
	clearPhoto();
	canvas.parentNode.classList.remove('camera__preview');
}

exports.default = setup;

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Gallery = function () {
	function Gallery() {
		var target = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '#gallery';
		var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		_classCallCheck(this, Gallery);

		// Convert target selector to element if it is a string
		this.target = typeof target === 'string' ? document.querySelector(target) : target;

		this.maxCount = options.maxCount || 6;
		this.photos = [];
	}

	_createClass(Gallery, [{
		key: 'addPhoto',
		value: function addPhoto(src) {
			var _this = this;

			this.photos.push(src);

			var image = new Image();
			image.addEventListener('load', function () {
				var data = {
					src: src,
					width: image.width,
					height: image.height,
					image: image
				};
				_this.photos.push(data);
				_this.showPhoto(data);
			});
			image.src = src;
		}

		/**
   * Display the photo in the gallary
   * @param {Object} photoData Available data on the image;
   * @param {Image} photoData.image The image element to display
   * @param {number} photoData.width Image width in pixels
   * @param {number} photoData.height Image height in pixels
   **/

	}, {
		key: 'showPhoto',
		value: function showPhoto(photoData) {
			var image = photoData.image;
			image.className = 'gallery__image';
			// Insert in first position
			if (this.target.children.length) {
				this.target.insertBefore(image, this.target.firstChild);

				// If we have reached max length remove the last element
				if (this.target.children.length > this.maxCount) {
					var last = this.target.children[this.target.children.length - 1];
					this.target.removeChild(last);

					// Remove refence to element now it is removed
					var lastIndex = this.photos.findIndex(function (photo) {
						return photo.image === last;
					});
					console.log('Index', lastIndex);
					if (lastIndex) {
						this.photos[lastIndex].image = null;
					}
				}
			} else {
				this.target.appendChild(image);
			}
			this.scalePhotos(photoData);
		}

		/**
   * Scale the image width to match the current height
   **/

	}, {
		key: 'scalePhotos',
		value: function scalePhotos() {
			var activeImages = this.photos.filter(function (photo) {
				return photo.image;
			});
			var parentSize = this.target.getBoundingClientRect();

			// Reset sizes
			activeImages.forEach(function (photo) {
				photo.image.width = photo.width;
				photo.image.height = photo.height;

				var scale = photo.width / photo.height;
				if (photo.image.width / photo.image.height !== scale) {
					// Fix scale
					var image = photo.image;
					image.height = parentSize.height;
					image.width = parentSize.height * scale;
				}
			});
		}
	}]);

	return Gallery;
}();

exports.default = Gallery;

},{}],4:[function(require,module,exports){
'use strict';

require('whatwg-fetch');

var _camera = require('./camera');

var _camera2 = _interopRequireDefault(_camera);

var _gallery = require('./gallery');

var _gallery2 = _interopRequireDefault(_gallery);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var gallery = new _gallery2.default();

function photoCallback(photo) {
	gallery.addPhoto(photo);
}

(0, _camera2.default)({ callback: photoCallback });

},{"./camera":2,"./gallery":3,"whatwg-fetch":1}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2ZldGNoLmpzIiwic3JjL2pzL2NhbWVyYS5qcyIsInNyYy9qcy9nYWxsZXJ5LmpzIiwic3JjL2pzL3N0YXJ0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQ2xkQTs7QUFFQSxJQUFJLFFBQVEsQ0FBWjtBQUNBLElBQUksU0FBUyxDQUFiO0FBQ0EsSUFBSSxZQUFZLEtBQWhCOztBQUVBLElBQUksUUFBUSxJQUFaO0FBQ0EsSUFBSSxTQUFTLElBQWI7QUFDQSxJQUFJLGNBQWMsSUFBbEI7O0FBRUEsSUFBSSxnQkFBZ0IsSUFBcEI7O0FBRUEsU0FBUyxLQUFULEdB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QjtBQUNBLFdBQU0sS0FBTixHQUFjLFdBQVcsTUFBWCxHQUFvQixLQUFsQztBQUNBO0FBRUQsSUFaRDtBQWFBOzs7Ozs7a0JBR2EsTzs7Ozs7QUN0RmY7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUEsSUFBTSxVQUFVLElBQUksaUJBQUosRUFBaEI7O0FBRUEsU0FBUyxhQUFULENBQXVCLEtBQXZCLEVBQThCO0FBQzdCLFNBQVEsUUFBUixDQUFpQixLQUFqQjtBQUNBOztBQUVELHNCQUFPLEVBQUMsVUFBVSxhQUFYLEVBQVAiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIoZnVuY3Rpb24oc2VsZikge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIHNlYXJjaFBhcmFtczogJ1VSTFNlYXJjaFBhcmFtcycgaW4gc2VsZixcbiAgICBpdGVyYWJsZTogJ1N5bWJvbCcgaW4gc2VsZiAmJiAnaXRlcmF0b3InIGluIFN5bWJvbCxcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmLFxuICAgIGFycmF5QnVmZmVyOiAnQXJyYXlCdWZmZXInIGluIHNlbGZcbiAgfVxuXG4gIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyKSB7XG4gICAgdmFyIHZpZXdDbGFzc2VzID0gW1xuICAgICAgJ1tvYmplY3QgSW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OENsYW1wZWRBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0NjRBcnJheV0nXG4gICAgXVxuXG4gICAgdmFyIGlzRGF0YVZpZXcgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgRGF0YVZpZXcucHJvdG90eXBlLmlzUHJvdG90eXBlT2Yob2JqKVxuICAgIH1cblxuICAgIHZhciBpc0FycmF5QnVmZmVyVmlldyA9IEFycmF5QnVmZmVyLmlzVmlldyB8fCBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgdmlld0NsYXNzZXMuaW5kZXhPZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSkgPiAtMVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBTdHJpbmcobmFtZSlcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIC8vIEJ1aWxkIGEgZGVzdHJ1Y3RpdmUgaXRlcmF0b3IgZm9yIHRoZSB2YWx1ZSBsaXN0XG4gIGZ1bmN0aW9uIGl0ZXJhdG9yRm9yKGl0ZW1zKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0ge1xuICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGl0ZW1zLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIHtkb25lOiB2YWx1ZSA9PT0gdW5kZWZpbmVkLCB2YWx1ZTogdmFsdWV9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICAgIGl0ZXJhdG9yW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZXJhdG9yXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGhlYWRlcnMpKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24oaGVhZGVyKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKGhlYWRlclswXSwgaGVhZGVyWzFdKVxuICAgICAgfSwgdGhpcylcbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSwgdGhpcylcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgb2xkVmFsdWUgPSB0aGlzLm1hcFtuYW1lXVxuICAgIHRoaXMubWFwW25hbWVdID0gb2xkVmFsdWUgPyBvbGRWYWx1ZSsnLCcrdmFsdWUgOiB2YWx1ZVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgcmV0dXJuIHRoaXMuaGFzKG5hbWUpID8gdGhpcy5tYXBbbmFtZV0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBmb3IgKHZhciBuYW1lIGluIHRoaXMubWFwKSB7XG4gICAgICBpZiAodGhpcy5tYXAuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLm1hcFtuYW1lXSwgbmFtZSwgdGhpcylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChuYW1lKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7IGl0ZW1zLnB1c2godmFsdWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZW50cmllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2goW25hbWUsIHZhbHVlXSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgIEhlYWRlcnMucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzXG4gIH1cblxuICBmdW5jdGlvbiBjb25zdW1lZChib2R5KSB7XG4gICAgaWYgKGJvZHkuYm9keVVzZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKSlcbiAgICB9XG4gICAgYm9keS5ib2R5VXNlZCA9IHRydWVcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdClcbiAgICAgIH1cbiAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNBcnJheUJ1ZmZlcihibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNUZXh0KGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQXJyYXlCdWZmZXJBc1RleHQoYnVmKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgdmFyIGNoYXJzID0gbmV3IEFycmF5KHZpZXcubGVuZ3RoKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2aWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGFyc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUodmlld1tpXSlcbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzLmpvaW4oJycpXG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJDbG9uZShidWYpIHtcbiAgICBpZiAoYnVmLnNsaWNlKSB7XG4gICAgICByZXR1cm4gYnVmLnNsaWNlKDApXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmLmJ5dGVMZW5ndGgpXG4gICAgICB2aWV3LnNldChuZXcgVWludDhBcnJheShidWYpKVxuICAgICAgcmV0dXJuIHZpZXcuYnVmZmVyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gQm9keSgpIHtcbiAgICB0aGlzLmJvZHlVc2VkID0gZmFsc2VcblxuICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICBpZiAoIWJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYmxvYiAmJiBCbG9iLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlCbG9iID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlGb3JtRGF0YSA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keS50b1N0cmluZygpXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgc3VwcG9ydC5ibG9iICYmIGlzRGF0YVZpZXcoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keS5idWZmZXIpXG4gICAgICAgIC8vIElFIDEwLTExIGNhbid0IGhhbmRsZSBhIERhdGFWaWV3IGJvZHkuXG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gbmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgKEFycmF5QnVmZmVyLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpIHx8IGlzQXJyYXlCdWZmZXJWaWV3KGJvZHkpKSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSkge1xuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ3RleHQvcGxhaW47Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUJsb2IgJiYgdGhpcy5fYm9keUJsb2IudHlwZSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsIHRoaXMuX2JvZHlCbG9iLnR5cGUpXG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSkpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbnN1bWVkKHRoaXMpIHx8IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuYmxvYigpLnRoZW4ocmVhZEJsb2JBc0FycmF5QnVmZmVyKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZWFkQXJyYXlCdWZmZXJBc1RleHQodGhpcy5fYm9keUFycmF5QnVmZmVyKSlcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHZhciBib2R5ID0gb3B0aW9ucy5ib2R5XG5cbiAgICBpZiAoaW5wdXQgaW5zdGFuY2VvZiBSZXF1ZXN0KSB7XG4gICAgICBpZiAoaW5wdXQuYm9keVVzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJylcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gaW5wdXQudXJsXG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gaW5wdXQuY3JlZGVudGlhbHNcbiAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKGlucHV0LmhlYWRlcnMpXG4gICAgICB9XG4gICAgICB0aGlzLm1ldGhvZCA9IGlucHV0Lm1ldGhvZFxuICAgICAgdGhpcy5tb2RlID0gaW5wdXQubW9kZVxuICAgICAgaWYgKCFib2R5ICYmIGlucHV0Ll9ib2R5SW5pdCAhPSBudWxsKSB7XG4gICAgICAgIGJvZHkgPSBpbnB1dC5fYm9keUluaXRcbiAgICAgICAgaW5wdXQuYm9keVVzZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXJsID0gU3RyaW5nKGlucHV0KVxuICAgIH1cblxuICAgIHRoaXMuY3JlZGVudGlhbHMgPSBvcHRpb25zLmNyZWRlbnRpYWxzIHx8IHRoaXMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgaWYgKG9wdGlvbnMuaGVhZGVycyB8fCAhdGhpcy5oZWFkZXJzKSB7XG4gICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgfVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8IHRoaXMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCB0aGlzLm1vZGUgfHwgbnVsbFxuICAgIHRoaXMucmVmZXJyZXIgPSBudWxsXG5cbiAgICBpZiAoKHRoaXMubWV0aG9kID09PSAnR0VUJyB8fCB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSAmJiBib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb2R5IG5vdCBhbGxvd2VkIGZvciBHRVQgb3IgSEVBRCByZXF1ZXN0cycpXG4gICAgfVxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHkpXG4gIH1cblxuICBSZXF1ZXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVxdWVzdCh0aGlzLCB7IGJvZHk6IHRoaXMuX2JvZHlJbml0IH0pXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlSGVhZGVycyhyYXdIZWFkZXJzKSB7XG4gICAgdmFyIGhlYWRlcnMgPSBuZXcgSGVhZGVycygpXG4gICAgLy8gUmVwbGFjZSBpbnN0YW5jZXMgb2YgXFxyXFxuIGFuZCBcXG4gZm9sbG93ZWQgYnkgYXQgbGVhc3Qgb25lIHNwYWNlIG9yIGhvcml6b250YWwgdGFiIHdpdGggYSBzcGFjZVxuICAgIC8vIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM3MjMwI3NlY3Rpb24tMy4yXG4gICAgdmFyIHByZVByb2Nlc3NlZEhlYWRlcnMgPSByYXdIZWFkZXJzLnJlcGxhY2UoL1xccj9cXG5bXFx0IF0rL2csICcgJylcbiAgICBwcmVQcm9jZXNzZWRIZWFkZXJzLnNwbGl0KC9cXHI/XFxuLykuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICB2YXIgcGFydHMgPSBsaW5lLnNwbGl0KCc6JylcbiAgICAgIHZhciBrZXkgPSBwYXJ0cy5zaGlmdCgpLnRyaW0oKVxuICAgICAgaWYgKGtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwYXJ0cy5qb2luKCc6JykudHJpbSgpXG4gICAgICAgIGhlYWRlcnMuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gaGVhZGVyc1xuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzID09PSB1bmRlZmluZWQgPyAyMDAgOiBvcHRpb25zLnN0YXR1c1xuICAgIHRoaXMub2sgPSB0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDBcbiAgICB0aGlzLnN0YXR1c1RleHQgPSAnc3RhdHVzVGV4dCcgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzVGV4dCA6ICdPSydcbiAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KVxuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBSZXNwb25zZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKHRoaXMuX2JvZHlJbml0LCB7XG4gICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogdGhpcy5zdGF0dXNUZXh0LFxuICAgICAgaGVhZGVyczogbmV3IEhlYWRlcnModGhpcy5oZWFkZXJzKSxcbiAgICAgIHVybDogdGhpcy51cmxcbiAgICB9KVxuICB9XG5cbiAgUmVzcG9uc2UuZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogMCwgc3RhdHVzVGV4dDogJyd9KVxuICAgIHJlc3BvbnNlLnR5cGUgPSAnZXJyb3InXG4gICAgcmV0dXJuIHJlc3BvbnNlXG4gIH1cblxuICB2YXIgcmVkaXJlY3RTdGF0dXNlcyA9IFszMDEsIDMwMiwgMzAzLCAzMDcsIDMwOF1cblxuICBSZXNwb25zZS5yZWRpcmVjdCA9IGZ1bmN0aW9uKHVybCwgc3RhdHVzKSB7XG4gICAgaWYgKHJlZGlyZWN0U3RhdHVzZXMuaW5kZXhPZihzdGF0dXMpID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgc3RhdHVzIGNvZGUnKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogc3RhdHVzLCBoZWFkZXJzOiB7bG9jYXRpb246IHVybH19KVxuICB9XG5cbiAgc2VsZi5IZWFkZXJzID0gSGVhZGVyc1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0XG4gIHNlbGYuUmVzcG9uc2UgPSBSZXNwb25zZVxuXG4gIHNlbGYuZmV0Y2ggPSBmdW5jdGlvbihpbnB1dCwgaW5pdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIGluaXQpXG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICBzdGF0dXM6IHhoci5zdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHQsXG4gICAgICAgICAgaGVhZGVyczogcGFyc2VIZWFkZXJzKHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSB8fCAnJylcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zLnVybCA9ICdyZXNwb25zZVVSTCcgaW4geGhyID8geGhyLnJlc3BvbnNlVVJMIDogb3B0aW9ucy5oZWFkZXJzLmdldCgnWC1SZXF1ZXN0LVVSTCcpXG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0XG4gICAgICAgIHJlc29sdmUobmV3IFJlc3BvbnNlKGJvZHksIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKHJlcXVlc3QubWV0aG9kLCByZXF1ZXN0LnVybCwgdHJ1ZSlcblxuICAgICAgaWYgKHJlcXVlc3QuY3JlZGVudGlhbHMgPT09ICdpbmNsdWRlJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZVxuICAgICAgfSBlbHNlIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnb21pdCcpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IGZhbHNlXG4gICAgICB9XG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdC5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2YgcmVxdWVzdC5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHJlcXVlc3QuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzKTtcbiIsIi8vIENhbWVyYSB1dGlsaXR5IC0gYmFzZWQgb24gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1dlYlJUQ19BUEkvVGFraW5nX3N0aWxsX3Bob3Rvc1xuXG5sZXQgd2lkdGggPSAwO1xubGV0IGhlaWdodCA9IDA7XG5sZXQgc3RyZWFtaW5nID0gZmFsc2U7XG5cbmxldCB2aWRlbyA9IG51bGw7XG5sZXQgY2FudmFzID0gbnVsbDtcbmxldCBzdGFydGJ1dHRvbiA9IG51bGw7XG5cbmxldCBwaG90b0NhbGxiYWNrID0gbnVsbDtcblxuZnVuY3Rpb24gc2V0dXAoY29uZmlnID0ge30pIHtcblxuXHR3aWR0aCA9IGNvbmZpZy53aWR0aCB8fCBzY3JlZW4ud2lkdGg7XG5cblx0cGhvdG9DYWxsYmFjayA9IGNvbmZpZy5jYWxsYmFjaztcblxuXHR2aWRlbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW1lcmEtdmlldycpO1xuXHRjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XG5cdHN0YXJ0YnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Rha2UtcGhvdG8tYnRuJyk7XG5cdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzYXZlLXBob3RvLWJ0bicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2dCkgPT4ge1xuXHRcdGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdHNhdmVQaG90bygpO1xuXHR9KTtcblx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JlamVjdC1waG90by1idG4nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldnQpID0+IHtcblx0XHRldnQucHJldmVudERlZmF1bHQoKTtcblx0XHRyZWplY3RQaG90bygpO1xuXHR9KTtcblxuXHRuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7dmlkZW86IHRydWUsIGF1ZGlvOiBmYWxzZX0pXG5cdFx0LnRoZW4oKHN0cmVhbSkgPT4ge1xuXHRcdFx0dmlkZW8uc3JjT2JqZWN0ID0gc3RyZWFtO1xuXHRcdFx0dmlkZW8ucGxheSgpO1xuXHRcdH0pXG5cdC5jYXRjaCgoZXJyKSA9PiB7XG5cdFx0Y29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyB2aWRlbycsIGVycik7XG5cdH0pO1xuXG5cdHZpZGVvLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbnBsYXknLCAoZXZ0KSA9PiB7XG5cdFx0aWYoIXN0cmVhbWluZykge1xuXHRcdFx0aGVpZ2h0ID0gdmlkZW8udmlkZW9IZWlnaHQgLyAodmlkZW8udmlkZW9XaWR0aCAvIHdpZHRoKTtcblx0XHRcdHZpZGVvLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCB3aWR0aCk7XG5cdFx0XHR2aWRlby5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XG5cdFx0XHRjYW52YXMuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKTtcblx0XHRcdGNhbnZhcy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XG5cdFx0XHRzdHJlYW1pbmcgPSB0cnVlO1xuXHRcdH1cblx0fSwgZmFsc2UpO1xuXG5cdHN0YXJ0YnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2dCkgPT4ge1xuXHRcdGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdHRha2VQaWN0dXJlKCk7XG5cdH0sIGZhbHNlKTtcblxuXHRjbGVhclBob3RvKCk7XG59XG5cbmZ1bmN0aW9uIGNsZWFyUGhvdG8oKSB7XG5cdGNvbnN0IGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblx0Y29udGV4dC5maWxsU3R5bGUgPSAnI0FBQSc7XG5cdGNvbnRleHQuZmlsbFJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcblxuXHRjYW52YXMucGFyZW50Tm9kZS5jbGFzc0xpc3QucmVtb3ZlKCdjYW1lcmFfX3ByZXZpZXcnKTtcbn1cblxuZnVuY3Rpb24gdGFrZVBpY3R1cmUoKSB7XG5cdGNvbnN0IGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblx0aWYod2lkdGggJiYgaGVpZ2h0KSB7XG5cdFx0Y2FudmFzLndpZHRoID0gd2lkdGg7XG5cdFx0Y2FudmFzLmhlaWdodCA9IGhlaWdodDtcblx0XHRjb250ZXh0LmRyYXdJbWFnZSh2aWRlbywgMCwgMCwgd2lkdGgsIGhlaWdodCk7XG5cblxuXHRcdGNhbnZhcy5wYXJlbnROb2RlLmNsYXNzTGlzdC5hZGQoJ2NhbWVyYV9fcHJldmlldycpO1xuXHR9IGVsc2Uge1xuXHRcdGNsZWFyUGhvdG8oKTtcblx0fVxufVxuXG5mdW5jdGlvbiBzYXZlUGhvdG8oKSB7XG5cdGNvbnN0IGRhdGEgPSBjYW52YXMudG9EYXRhVVJMKCdpbWFnZS9wbmcnKTtcblxuXHRpZihwaG90b0NhbGxiYWNrKSB7XG5cdFx0cGhvdG9DYWxsYmFjayhkYXRhKTtcblx0fVxuXG5cdGNhbnZhcy5wYXJlbnROb2RlLmNsYXNzTGlzdC5yZW1vdmUoJ2NhbWVyYV9fcHJldmlldycpO1xufVxuXG5mdW5jdGlvbiByZWplY3RQaG90bygpIHtcblx0Y2xlYXJQaG90bygpO1xuXHRjYW52YXMucGFyZW50Tm9kZS5jbGFzc0xpc3QucmVtb3ZlKCdjYW1lcmFfX3ByZXZpZXcnKTtcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBzZXR1cDtcblxuIiwiXG5jbGFzcyBHYWxsZXJ5IHtcblxuXHRjb25zdHJ1Y3Rvcih0YXJnZXQgPSAnI2dhbGxlcnknLCBvcHRpb25zID0ge30pIHtcblx0XHQvLyBDb252ZXJ0IHRhcmdldCBzZWxlY3RvciB0byBlbGVtZW50IGlmIGl0IGlzIGEgc3RyaW5nXG5cdFx0dGhpcy50YXJnZXQgPSB0eXBlb2YgdGFyZ2V0ID09PSAnc3RyaW5nJ1xuXHRcdFx0PyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHRhcmdldClcblx0XHRcdDogdGFyZ2V0O1xuXG5cdFx0dGhpcy5tYXhDb3VudCA9IG9wdGlvbnMubWF4Q291bnQgfHwgNjtcblx0XHR0aGlzLnBob3RvcyA9IFtdO1xuXHR9XG5cblx0YWRkUGhvdG8oc3JjKSB7XG5cdFx0dGhpcy5waG90b3MucHVzaChzcmMpO1xuXG5cdFx0Y29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcblx0XHRpbWFnZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdFx0c3JjLFxuXHRcdFx0XHR3aWR0aDogaW1hZ2Uud2lkdGgsXG5cdFx0XHRcdGhlaWdodDogaW1hZ2UuaGVpZ2h0LFxuXHRcdFx0XHRpbWFnZVxuXHRcdFx0fTtcblx0XHRcdHRoaXMucGhvdG9zLnB1c2goZGF0YSk7XG5cdFx0XHR0aGlzLnNob3dQaG90byhkYXRhKTtcblx0XHR9KTtcblx0XHRpbWFnZS5zcmMgPSBzcmM7XG5cdH1cblxuXHQvKipcblx0ICogRGlzcGxheSB0aGUgcGhvdG8gaW4gdGhlIGdhbGxhcnlcblx0ICogQHBhcmFtIHtPYmplY3R9IHBob3RvRGF0YSBBdmFpbGFibGUgZGF0YSBvbiB0aGUgaW1hZ2U7XG5cdCAqIEBwYXJhbSB7SW1hZ2V9IHBob3RvRGF0YS5pbWFnZSBUaGUgaW1hZ2UgZWxlbWVudCB0byBkaXNwbGF5XG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBwaG90b0RhdGEud2lkdGggSW1hZ2Ugd2lkdGggaW4gcGl4ZWxzXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBwaG90b0RhdGEuaGVpZ2h0IEltYWdlIGhlaWdodCBpbiBwaXhlbHNcblx0ICoqL1xuXHRzaG93UGhvdG8ocGhvdG9EYXRhKSB7XG5cdFx0Y29uc3QgaW1hZ2UgPSBwaG90b0RhdGEuaW1hZ2U7XG5cdFx0aW1hZ2UuY2xhc3NOYW1lID0gJ2dhbGxlcnlfX2ltYWdlJztcblx0XHQvLyBJbnNlcnQgaW4gZmlyc3QgcG9zaXRpb25cblx0XHRpZih0aGlzLnRhcmdldC5jaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdHRoaXMudGFyZ2V0Lmluc2VydEJlZm9yZShpbWFnZSwgdGhpcy50YXJnZXQuZmlyc3RDaGlsZCk7XG5cblx0XHRcdC8vIElmIHdlIGhhdmUgcmVhY2hlZCBtYXggbGVuZ3RoIHJlbW92ZSB0aGUgbGFzdCBlbGVtZW50XG5cdFx0XHRpZih0aGlzLnRhcmdldC5jaGlsZHJlbi5sZW5ndGggPiB0aGlzLm1heENvdW50KSB7XG5cdFx0XHRcdGNvbnN0IGxhc3QgPSB0aGlzLnRhcmdldC5jaGlsZHJlblt0aGlzLnRhcmdldC5jaGlsZHJlbi5sZW5ndGggLSAxXTtcblx0XHRcdFx0dGhpcy50YXJnZXQucmVtb3ZlQ2hpbGQobGFzdCk7XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBSZW1vdmUgcmVmZW5jZSB0byBlbGVtZW50IG5vdyBpdCBpcyByZW1vdmVkXG5cdFx0XHRcdGNvbnN0IGxhc3RJbmRleCA9IHRoaXMucGhvdG9zLmZpbmRJbmRleCgocGhvdG8pID0+IHBob3RvLmltYWdlID09PSBsYXN0KTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0luZGV4JywgbGFzdEluZGV4KTtcblx0XHRcdFx0aWYobGFzdEluZGV4KSB7XG5cdFx0XHRcdFx0dGhpcy5waG90b3NbbGFzdEluZGV4XS5pbWFnZSA9IG51bGw7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy50YXJnZXQuYXBwZW5kQ2hpbGQoaW1hZ2UpO1xuXHRcdH1cblx0XHR0aGlzLnNjYWxlUGhvdG9zKHBob3RvRGF0YSk7XG5cdH1cblxuXHQvKipcblx0ICogU2NhbGUgdGhlIGltYWdlIHdpZHRoIHRvIG1hdGNoIHRoZSBjdXJyZW50IGhlaWdodFxuXHQgKiovXG5cdHNjYWxlUGhvdG9zKCkge1xuXHRcdGNvbnN0IGFjdGl2ZUltYWdlcyA9IHRoaXMucGhvdG9zLmZpbHRlcigocGhvdG8pID0+IHBob3RvLmltYWdlKTtcblx0XHRjb25zdCBwYXJlbnRTaXplID0gdGhpcy50YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cblx0XHQvLyBSZXNldCBzaXplc1xuXHRcdGFjdGl2ZUltYWdlcy5mb3JFYWNoKChwaG90bykgPT4ge1xuXHRcdFx0cGhvdG8uaW1hZ2Uud2lkdGggPSBwaG90by53aWR0aDtcblx0XHRcdHBob3RvLmltYWdlLmhlaWdodCA9IHBob3RvLmhlaWdodDtcblxuXHRcdFx0Y29uc3Qgc2NhbGUgPSBwaG90by53aWR0aCAvIHBob3RvLmhlaWdodDtcblx0XHRcdGlmKHBob3RvLmltYWdlLndpZHRoIC8gcGhvdG8uaW1hZ2UuaGVpZ2h0ICE9PSBzY2FsZSkge1xuXHRcdFx0XHQvLyBGaXggc2NhbGVcblx0XHRcdFx0Y29uc3QgaW1hZ2UgPSBwaG90by5pbWFnZTtcblx0XHRcdFx0aW1hZ2UuaGVpZ2h0ID0gcGFyZW50U2l6ZS5oZWlnaHQ7XG5cdFx0XHRcdGltYWdlLndpZHRoID0gcGFyZW50U2l6ZS5oZWlnaHQgKiBzY2FsZTtcblx0XHRcdH1cblxuXHRcdH0pO1xuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEdhbGxlcnk7XG4iLCJpbXBvcnQgJ3doYXR3Zy1mZXRjaCc7XG5pbXBvcnQgY2FtZXJhIGZyb20gJy4vY2FtZXJhJztcbmltcG9ydCBHYWxsZXJ5IGZyb20gJy4vZ2FsbGVyeSc7XG5cbmNvbnN0IGdhbGxlcnkgPSBuZXcgR2FsbGVyeSgpO1xuXG5mdW5jdGlvbiBwaG90b0NhbGxiYWNrKHBob3RvKSB7XG5cdGdhbGxlcnkuYWRkUGhvdG8ocGhvdG8pO1xufVxuXG5jYW1lcmEoe2NhbGxiYWNrOiBwaG90b0NhbGxiYWNrfSk7XG5cbiJdfQ==
