// Copyright (c) BABA (https://so-zou.jp)

(function () {
	var form = document.getElementById('text-form');
	form.onsubmit = function () {
		Extract(this.text.value);
		return false;
	}

	form.onreset = function () {
		window.location.reload(false);
	}

	form.text.select();

	function Extract(text) {
		var loading = document.createElement('span');
		loading.className = 'loading';
		loading.appendChild(document.createTextNode('処理中'));

		var statusBox = document.getElementById('status');
		while (statusBox.firstChild) {
			statusBox.removeChild(statusBox.firstChild);
		}
		statusBox.appendChild(loading);

		new Ajax.Request('analyze.php',
			{
				method: 'post',
				parameters: { text: text },
				onSuccess: function (response) {
					if (response.responseJSON) {
						ShowResult(response.responseJSON);
					}
					else {
						var message = document.createElement('span');
						message.className = 'error-message';
						message.appendChild(document.createTextNode('予期しない問題が発生しました。'));

						statusBox.appendChild(message);
					}
				},
				onComplete: function (response) {
					statusBox.removeChild(loading);
				}
			});
	}

	function ShowResult(result) {
		var list = document.createElement('ol');
		for (var i = 0; i < result.length; i++) {
			var item = document.createElement('li');
			item.appendChild(document.createTextNode(result[i]));

			list.appendChild(item);
		}

		var resultBox = document.getElementById('result-box');
		resultBox.replaceChild(list, resultBox.firstChild);
	}
})();