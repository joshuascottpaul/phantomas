/**
 * Analyzes DOM complexity
 *
 * Uses dom-monster bookmarklet
 *
 * @see http://mir.aculo.us/dom-monster
 * @see https://github.com/madrobby/dom-monster
 */
exports.version = '0.2';

exports.module = function(phantomas) {

	// inject DOM Monster
	phantomas.on('report', function() {
		var injectRes = phantomas.injectJs('./lib/dommonster.js');
		phantomas.log(injectRes ? 'DOM monster injected' : 'Unable to inject DOM monster!');
	});

	// JS global variables
	phantomas.on('report', function() {
		var globalVariables = phantomas.evaluate(function() {
			return JR.globals() || [];
		});

		phantomas.setMetric('globalVariables', globalVariables.length);
		phantomas.addNotice('JavaScript globals (' + (globalVariables.length) + '): ' + globalVariables.join(', '));
		phantomas.addNotice();
	});

	// HTML size
	phantomas.on('report', function() {
		phantomas.setMetricEvaluate('bodyHTMLSize', function() {
			return document.body.innerHTML.length;
		});

		phantomas.evaluate(function() {
			(function(phantomas) {
				var runner = new phantomas.nodeRunner(),
					whitespacesRegExp = /^\s+$/;

				var metrics = {
					comments: 0,
					hiddenContent: 0,
					whitespaces: 0
				};

				// include all nodes
				runner.isSkipped = function(node) {
					return false;
				};

				runner.walk(document.body, function(node) {
					switch (node.nodeType) {
						case Node.COMMENT_NODE:
							metrics.comments += node.textContent.length + 7; // '<!--' + '-->'.length
							break;

						case Node.ELEMENT_NODE:
							// ignore inline <script> tags
							if (node.nodeName === 'SCRIPT') {
								return false;
							}

							// @see https://developer.mozilla.org/en/DOM%3awindow.getComputedStyle
							var styles = window.getComputedStyle(node);

							if (styles && styles.getPropertyValue('display') === 'none') {
								//console.log(node.innerHTML);
								metrics.hiddenContent += node.innerHTML.length;

								// don't run for child nodes as they're hidden as well
								return false;
							}
							break;

						case Node.TEXT_NODE:
							if (whitespacesRegExp.test(node.textContent)) {
								metrics.whitespaces += node.textContent.length;
							}
							break;
					}
				});

				// store metrics
				phantomas.DOMmetrics = metrics;

			}(window.phantomas));
		});

		// total length of HTML comments (including <!-- --> brackets)
		phantomas.setMetricEvaluate('commentsSize', function() {
			return window.phantomas.DOMmetrics.comments;
		});

		// total length of HTML of hidden elements (i.e. display: none)
		phantomas.setMetricEvaluate('hiddenContentSize', function() {
			return window.phantomas.DOMmetrics.hiddenContent;
		});

		// total length of text nodes with whitespaces only (i.e. pretty formatting of HTML)
		phantomas.setMetricEvaluate('whiteSpacesSize', function() {
			return window.phantomas.DOMmetrics.whitespaces;
		});
	});
};