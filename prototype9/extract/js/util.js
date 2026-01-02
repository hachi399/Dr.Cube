

// Object
Object.toQueryString = function (params) {
	var query = [];
	for (var name in params) {
		if (typeof name === 'undefined') continue;

		var value = params[name] || '';
		query.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
	}
	return query.join('&');
}

// String
String.prototype.toQueryParams = function () {
	var result = {};
	if (1 < this.length) {
		var query = this.substring(1);
		var parameters = query.split('&');

		for (var i = 0; i < parameters.length; i++) {
			var element = parameters[i].split('=');
			var paramName = decodeURIComponent(element[0]);
			var paramValue = decodeURIComponent(element[1]);

			result[paramName] = paramValue;
		}
	}
	return result;
}
String.prototype.unescapeHTML = function () {
	var htmlEntitySet = { '&#39;': '\'', '&apos;': '\'', '&quot;': '"', '&lt;': '<', '&gt;': '>', '&amp;': '&', '&nbsp;': ' ' };
	return this.replace(/&#39;|&apos;|&quot;|&lt;|&gt;|&amp;|&nbsp;/g, function (ch) { return htmlEntitySet[ch]; });
}
String.prototype.escapeHTML = function () {
	var htmlEntitySet = { '\'': '&apos;', '"': '&quot;', '<': '&lt;', '>': '&gt;', '&': '&amp;' };
	return this.replace(/['"<>&]/g, function (ch) { return htmlEntitySet[ch]; });
}
if (!String.prototype.codePointAt) {
	String.prototype.codePointAt = function (index) {
		var code = this.charCodeAt(index);
		if (0xd800 <= code && code <= 0xdbff && (index + 1 < this.length)) {
			var hi = code;
			var low = this.charCodeAt(index + 1);

			return (hi - 0xd800) * 0x0400 + (low - 0xdc00) + 0x10000;
		}
		return code;
	}
}
if (!String.fromCodePoint) {
	String.fromCodePoint = function (num) {
		if (num <= 0xffff) {
			return String.fromCharCode(num);
		}
		else {
			var highSurrogate = Math.floor((num - 0x10000) / 0x400) + 0xd800;
			var lowSurrogate = (num - 0x10000) % 0x400 + 0xdc00;

			return String.fromCharCode(highSurrogate, lowSurrogate);
		}
	}
}

// Array
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf#Browser_compatibility
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function (searchElement, fromIndex) {
		if (this == null) {
			throw new TypeError('"this" is null or not defined');
		}

		var O = Object(this);
		var len = O.length >>> 0;

		if (len === 0) {
			return -1;
		}

		var n = +fromIndex || 0;
		if (Math.abs(n) === Infinity) {
			n = 0;
		}

		if (n >= len) {
			return -1;
		}

		var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
		while (k < len) {
			if (k in O && O[k] === searchElement) {
				return k;
			}
			k++;
		}
		return -1;
	};
}

// Date
Date.prototype.toLocaleString = function () {
	return [
		this.getFullYear(),
		this.getMonth() + 1,
		this.getDate(),
	].join('/')
		+ ' ' + [
			this.getHours(),
			('00' + this.getMinutes()).slice(-2),
			('00' + this.getSeconds()).slice(-2)
		].join(':');
}
Date.prototype.toLocaleDateString = function () {
	return [
		this.getFullYear(), '年',
		this.getMonth() + 1, '月',
		this.getDate(), '日',
		'(', new String('日月火水木金土').charAt(this.getDay()), ')'
	].join('');
}
Date.prototype.elapsedTime = function () {
	var now = new Date();
	var elapsedSeconds = (now.getTime() - this.getTime()) / 1000;

	if (0 <= elapsedSeconds) {
		var year = elapsedSeconds / (3600 * 24 * 365);
		if (1 <= year) return Math.floor(year) + '年前';

		var month = elapsedSeconds / (3600 * 24 * 30);
		if (1 <= month) return Math.floor(month) + 'か月前';

		var day = elapsedSeconds / (3600 * 24);
		if (1 <= day) return Math.floor(day) + '日前';

		var hour = elapsedSeconds / 3600;
		if (1 <= hour) return Math.floor(hour) + '時間前';

		var minute = elapsedSeconds / 60;
		if (1 <= minute) return Math.floor(minute) + '分前';

		return Math.floor(elapsedSeconds) + '秒前';
	}
	return '?';
}

// Element
Element.prototype.delayLoad = function (box, obj, callback) {
	var self = this;
	var CheckVisibility = function () {
		var bottom;
		var elemTop;
		if (box == window) {
			var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
			bottom = scrollTop + document.documentElement.clientHeight;
			elemTop = self.offsetTop;
		}
		else {
			bottom = box.scrollTop + box.clientHeight;
			elemTop = self.offsetTop - box.offsetTop
		}

		if (elemTop < bottom) {
			box.removeEventListener('scroll', CheckVisibility, false);
			callback(self, obj);
		}
	}

	if (box.addEventListener) {
		box.addEventListener('scroll', CheckVisibility, false);
		window.setTimeout(CheckVisibility, 0);
	}
	else {
		callback(self, obj);
	}
}


// Ajax
var Ajax = {};
Ajax.Request = function (url, options) {
	options = options || {};
	options.method = options.method || 'post';
	options.asynchronous = options.asynchronous || true;
	options.parameters = options.parameters || {};

	var xmlHttpRequest = new XMLHttpRequest();
	xmlHttpRequest.onreadystatechange = function () {
		if (options.onInteractive) {
			options.onInteractive(new Ajax.Response(this, options));
		}

		if (this.readyState == 4) {
			if (options.onSuccess
				&& (!this.status || (200 <= this.status && this.status < 300) || this.status == 304)) {
				options.onSuccess(new Ajax.Response(this, options));
			}

			if (options.onFailure
				&& (this.status && (this.status < 200 || 300 <= this.status))) {
				options.onFailure(new Ajax.Response(this, options));
			}

			if (options.onComplete) {
				options.onComplete(new Ajax.Response(this, options));
			}
		}
	}

	var params = options.parameters;
	if (typeof params !== 'string') {
		params = Object.toQueryString(params);
	}

	if (options.method == 'get') {
		url += '?' + params;
	}
	xmlHttpRequest.open(options.method.toUpperCase(), url, options.asynchronous);

	if (options.method == 'post') {
		xmlHttpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		params = params.replace(/%20/g, '+');
	}
	xmlHttpRequest.send((options.method == 'post') ? params : null);
}
Ajax.Response = function (xhr, options) {
	this.readyState = xhr.readyState;
	this.status = xhr.status;
	this.statusText = xhr.statusText;
	this.request = options;

	if (xhr.readyState == 4) {
		this.responseText = xhr.responseText;
		if (xhr.getResponseHeader('Content-Type').indexOf('application/json') != -1) {
			try {
				this.responseJSON =
					(window.JSON) ? JSON.parse(xhr.responseText) : eval('(' + xhr.responseText + ')')
			}
			catch (e) {
				//
			}
		}
	}
}

// Cookie
function Cookie() { }
Cookie.Get = function (name, expire) {
	expire = typeof expire !== "undefined" ? expire : 3600 * 24 * 7;

	var result = null;
	var cookieName = name + '=';
	var allcookies = document.cookie;

	var position = allcookies.indexOf(cookieName);
	if (position != -1) {
		var start = position + cookieName.length;

		var end = allcookies.indexOf(';', start);
		if (end == -1) {
			end = allcookies.length;
		}
		result = decodeURIComponent(allcookies.substring(start, end));

		if (expire && result != '') {
			this.Set(name, result, expire);
		}
	}
	return result;
}
Cookie.Set = function (name, value, expire) {
	expire = typeof expire !== "undefined" ? expire : 3600 * 24 * 7;

	var param = name + '=' + encodeURIComponent(value) + '; samesite=strict';
	if (expire) {
		var date = new Date();
		date.setTime(date.getTime() + expire * 1000);

		param += '; expires=' + date.toUTCString();
	}
	document.cookie = param;
}
Cookie.GetAndUpdate = function (name, expire) // for compatibility
{
	return this.Get(name, expire);
}
Cookie.Delete = function (name) {
	var date = new Date();
	date.setTime(date.getTime() - 1);

	document.cookie = name + '=; expires=' + date.toUTCString();
}