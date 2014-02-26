/*
	@overview
	ScrollMagic - The jQuery plugin for doing magical scroll animations
	by Jan Paepke 2013 (@janpaepke)

	Inspired by and partially based on the one and only SUPERSCROLLORAMA by John Polacek (@johnpolacek)
	johnpolacek.github.com/superscrollorama/

	Powered by the Greensock Tweening Platform
	http://www.greensock.com/js
	Greensock License info at http://www.greensock.com/licensing/

	Dual licensed under MIT and GPL.
	@author Jan Paepke, e-mail@janpaepke.de
*/

// TODO: test adding and removing scenes multiple times. (remove, then add back in, etc.)
// TODO: test what happens if triggers are tweened or pinned
// TODO: test / implement mobile capabilities
// TODO: test successive pins (animate, pin for a while, animate, pin...)
// TODO: make examples
// TODO: consider if and how globalSceneOptions should be set, if addScene is used instead of addNewScene
// TODO: consider how the scene should behave, if you start scrolling back up DURING the scene and reverse is false (ATM it will animate backwards)
// TODO: consider if the controller needs Events
// TODO: consider how to better control forward/backward animations (for example have different animations, when scrolling up, than when scrolling down)
// TODO: consider using 0, -1 and 1 for the scrollDirection instead of "PAUSED", "FORWARD" and "BACKWARD"
// TODO: consider logs - what should be logged and where
// TODO: consider if updating Scene immediately, when added to controller may cause problems or might not be desired in some cases
// TODO: consider better call circumstances for updateContainer. ATM. it's called onTick, but this may not be necessary (performance)
// TODO: consider setting startPoint and currScrollpoint instead of progress for ScrollScenes (startPoint won't have to be a public var anymore)
// TODO: consider making public ScrollScene variables private

(function($) {

/*
 * ----------------------------------------------------------------
 * avoid errors when using console
 * ----------------------------------------------------------------
 */
var console = (window.console = window.console || {});
if (!console['log']) {
	console.log = function () {};
}
if (!console['error']) {
	console.error = function (msg) {
		console.log(msg);
	};
}
if (!console['warn']) {
	console.warn = function (msg) {
		console.log(msg);
	};
}

     /**
     * CLASS ScrollMagic (main controller)
     *
     * (TODO: Description)
     *
     * @constructor
     *
	 * @param {object} [options] - An object containing one or more options for the controller.
	 * @param {(string|object)} [options.scrollContainer=$(window)] - A selector or a jQuery object that references the main container for scrolling.
     * @param {boolean} [options.isVertical=true] - Sets the scroll mode to vertical (true) or horizontal (false) scrolling.
	 * @param {object} [options.globalSceneOptions=true] - These options will be passed to every Scene that is added to the controller using the addScene method. For more information on Scene options @see {@link ScrollScene)
	 * @param {number} [options.loglevel=2] - Loglevel for debugging. 0: silent | 1: errors | 2: errors,warnings | 3: errors,warnings,debuginfo
     *
     */
	ScrollMagic = function(options) {

		/*
		 * ----------------------------------------------------------------
		 * settings
		 * ----------------------------------------------------------------
		 */
		var
			DEFAULT_OPTIONS = {
				scrollContainer: $(window),
				isVertical: true,
				globalSceneOptions: {},
				loglevel: 2
			};

		/*
		 * ----------------------------------------------------------------
		 * private vars
		 * ----------------------------------------------------------------
		 */

		var
			ScrollMagic = this,
			_options = $.extend({}, DEFAULT_OPTIONS, options),
			_sceneObjects = [],
			_updateScenesOnNextTick = false,		// can be boolean (true => all scenes) or an array of scenes to be updated
			_currScrollPoint = 0,
			_scrollDirection = "PAUSED",
			_containerInnerOffset = 0,
			_viewPortSize = 0;

		/*
		 * ----------------------------------------------------------------
		 * private functions
		 * ----------------------------------------------------------------
		 */

		/**
	     * Internal constructor function of ScrollMagic
	     * @private
	     */
		var construct = function () {
			// check ScrolContainer
			try {
				if ($.type(_options.scrollContainer) === "string")
					_options.scrollContainer = $(_options.scrollContainer).first();
				if (_options.scrollContainer.length == 0)
					throw "No valid scroll container supplied";
			} catch (e) {
				log(1, "ERROR: " + e, "error");
				return; // cancel
			}
			// update container vars immediately
			updateContainer();
			// set event handlers
			_options.scrollContainer.scroll(function() {
				_updateScenesOnNextTick = true;
			});
			_options.scrollContainer.resize(function() {
				_updateScenesOnNextTick = true;
			});
			TweenLite.ticker.addEventListener("tick", onTick);
		};

		/**
	     * Handle updates on tick instad of on scroll (performance)
	     * @private
	     */
		var onTick = function () {
			updateContainer();
			if (_updateScenesOnNextTick) {
				if ($.isArray(_updateScenesOnNextTick)) {
					// update specific scenes
					$.each(_updateScenesOnNextTick, function (index, scene) {
							ScrollMagic.updateScene(scene, true);
					});
				} else {
					// update all scenes
					ScrollMagic.updateAllScenes(true);
				}
				_updateScenesOnNextTick = false;
			}
		};

		/**
	     * Update container params.
	     * @private
	     */
		var updateContainer = function () {
			var
				vertical = _options.isVertical,
				$container = _options.scrollContainer,
				offset = $container.offset() || {top: 0, left: 0},
				oldScrollPoint = _currScrollPoint;
			
			_viewPortSize = vertical ? $container.height() : $container.width();
			_currScrollPoint = vertical ? $container.scrollTop() : $container.scrollLeft();
			var deltaScroll = _currScrollPoint - oldScrollPoint;
			_scrollDirection = (deltaScroll == 0) ? "PAUSED" : (deltaScroll > 0) ? "FORWARD" : "REVERSE";

			// TODO: check usage of inner offset. Not very elegant atm. How to make better?
			if (offset.top != 0 || offset.left != 0) { // the container is not the window or document, but a div container
				// calculate the inner offset of the container, if the scrollcontainer is not at the top left position
				_containerInnerOffset = (vertical ? offset.top : offset.left) - _currScrollPoint;
			} else {
				_containerInnerOffset = 0;
			}
		};

		/**
	     * Send a debug message to the console.
	     * @private
	     *
	     * @param {number} loglevel - The loglevel required to initiate output for the message.
	     * @param {mixed} output - A String or an object that is supposed to be logged.
	     * @param {ScrollScene} [method='log'] - The method used for output. Can be 'log', 'error' or 'warn'
	     */
		var log = function (loglevel, output, method) {
			if (_options.loglevel >= loglevel) {
				if (!$.isFunction(console[method])) {
					method = "log";
				}
				var now = new Date(),
					time = ("0"+now.getHours()).slice(-2) + ":" + ("0"+now.getMinutes()).slice(-2) + ":" + ("0"+now.getSeconds()).slice(-2) + ":" + ("00"+now.getMilliseconds()).slice(-3),
					func = console[method];
				func.call(console, time + " (ScrollContainer) ->", output);
			}
		}

		/*
		 * ----------------------------------------------------------------
		 * public functions
		 * ----------------------------------------------------------------
		 */

		/**
	     * Add a Scene to the controller.
	     * Usually this should not be used when adding the scene for the first time, because the globalSceneOptions will not be applied.
	     * This method should be used when a scene was removed from the controller and than should be re-added.
	     * @public
	     *
	     * @param {ScrollScene} scene - The ScollScene to be added.
	     * @return {ScrollMagic} - Parent object for chaining.
	     */
		this.addScene = function (ScrollScene) {
			if (ScrollScene.parent()) {
				if (ScrollScene.parent() == ScrollMagic) {
					// if it's me, do nothing.
					return ScrollMagic;
				} else {
					ScrollScene.parent().removeScene(ScrollScene);	
				}
			}
			ScrollScene.parent(ScrollMagic);
			_sceneObjects.push(ScrollScene);
			ScrollMagic.updateScene(ScrollScene, true);
			return ScrollMagic;
		};
		
		/**
	     * Shorthand function to add a scene to support easier chaining.
	     * Basically it's the same as doing controller.addScene(new ScrollScene(trigger, options));
	     * There is one big difference though: The globalSceneOptions will only be set, if this method is used.
	     * @see {@link ScrollScene}
	     * @public
	     *
	     * @param {(string|object)} trigger - @see {@link ScrollScene}
	     * @param {object} [options] - @see {@link ScrollScene}
	     * 
	     * @return {ScrollScene} New ScrollScene object for chaining.
	     */
		this.addNewScene = function (trigger, options) {
			options = $.extend({}, _options.globalSceneOptions, options);
			var newScene = new ScrollScene(trigger, options);
			ScrollMagic.addScene(newScene);
			return newScene;
		};

		/**
		 * Remove scene from the controller.
		 * @public

		 * @param {ScrollScene} scene - The ScollScene to be removed.
		 * @returns {ScrollMagic} Parent object for chaining.
		 */
		this.removeScene = function (ScrollScene) {
			var index = $.inArray(ScrollScene, _sceneObjects);
			if (index > -1) {
				_sceneObjects.splice(index, 1);
				ScrollScene.parent(null);
				ScrollScene.startPoint = 0;
			}
			return ScrollMagic;
		};



		/**
	     * Update a specific scene according to the scroll position of the container.
	     * @public
	     *
	     * @param {ScrollScene} scene - The ScollScene object that is supposed to be updated.
	     * @param {boolean} [immediately=false] - If true the update will be instantly, if false it will wait until next tweenmax tick (better performance);
	     * @return {ScrollMagic} Parent object for chaining.
	     */
		this.updateScene = function (scene, immediately) {
			if (immediately) {
				var
					startPoint,
					endPoint,
					newProgress;

				// get the start position
				startPoint = scene.getTriggerOffset();

				// add optional offset
				startPoint -= scene.offset();

				// account for the possibility that the parent is a div, not the document
				startPoint -= _containerInnerOffset;

				// calculate start point in relation to viewport trigger point
				startPoint -= _viewPortSize*scene.triggerHook();

				// where will the scene end?
				endPoint = startPoint + scene.duration();

				if (scene.duration() > 0) {
					newProgress = (_currScrollPoint - startPoint)/(endPoint - startPoint);
				} else {
					newProgress = _currScrollPoint > startPoint ? 1 : 0;
				}
				
				// startPoint is neccessary inside the class for the calculation of the fixed position for pins.
				scene.startPoint = startPoint;

				log(3, {"scene" : $.inArray(scene, _sceneObjects)+1, "startPoint" : startPoint, "endPoint" : endPoint,"curScrollPoint" : _currScrollPoint});

				scene.progress(newProgress);
			} else {
				if (!$.isArray(_updateScenesOnNextTick)) {
					_updateScenesOnNextTick = [];
				}
				if ($.inArray(scene, _updateScenesOnNextTick) == -1) {
					_updateScenesOnNextTick.push(scene);	
				}
			}
			return ScrollMagic;
		};

		/**
	     * Update all scenes according to their scroll position within the container.
	     * @public
	     *
	     * @param {boolean} [immediately=false] - If true the update will be instantly, if false it will wait until next tweenmax tick (better performance);
	     * @return {ScrollMagic} Parent object for chaining.
	     */
		this.updateAllScenes = function (immediately) {
			if (immediately) {
				$.each(_sceneObjects, function (index, scene) {
					ScrollMagic.updateScene(scene, true);
				});
			} else {
				_updateScenesOnNextTick = true;
			}
			return ScrollMagic;
		};

		/**
		 * Get the scroll mode.
		 * @public
		 *
		 * @returns {boolean} - true if vertical scrolling, false if horizontal.
		 */
		this.vertical = function () {
			return _options.isVertical;
		};

		/**
		 * Get the scroll direction.
		 * @public
		 *
		 * @returns {string} - "FORWARD", "REVERSE" or "PAUSED", depending on current scroll direction
		 */
		this.scrollDirection = function () {
			return _scrollDirection;
		};

		// INIT
		construct();
		return ScrollMagic;
	};


	/**
     * CLASS ScrollScene (scene controller)
     *
     * @constructor
     *
     * @param {(string|object)} trigger - The ScollScene object that is supposed to be updated.
     * @param {object} [options] - Options for the Scene. (Can be changed lateron)
     * @param {number} [options.duration=0] - The duration of the scene. If 0 tweens will auto-play when reaching the trigger, pins will be pinned indefinetly starting at the trigger position.
     * @param {number} [options.offset=0] - Offset Value for the Trigger Position
     * @param {(float|string)} [options.triggerHook="onEnter"] - Can be string "onCenter", "onEnter", "onLeave" or float (0 - 1), 0 = onLeave, 1 = onEnter
     * @param {boolean} [options.reverse=true] - Should the scene reverse, when scrolling up?
     * @param {boolean} [options.smoothTweening=false] - Tweens Animation to the progress target instead of setting it. Requires a TimelineMax Object for tweening. Does not affect animations where duration==0
     * @param {number} [options.loglevel=2] - Loglevel for debugging. 0: none | 1: errors | 2: errors,warnings | 3: errors,warnings,debuginfo
     * 
     */
	ScrollScene = function (trigger, options) {

		/*
		 * ----------------------------------------------------------------
		 * settings
		 * ----------------------------------------------------------------
		 */

		var
			TRIGGER_HOOK_STRINGS = ["onEnter", "onCenter", "onLeave"],
			DEFAULT_OPTIONS = {
				duration: 0,
				offset: 0,
				triggerHook: TRIGGER_HOOK_STRINGS[0],
				reverse: true,
				smoothTweening: false,
				loglevel: 2
			};

		/*
		 * ----------------------------------------------------------------
		 * private vars
		 * ----------------------------------------------------------------
		 */

		var
			ScrollScene = this,
			_trigger = $.type(trigger) === "string" ? $(trigger).first() : trigger,
			_options = $.extend({}, DEFAULT_OPTIONS, options),
			_state = 'BEFORE',
			_progress = 0,
			_parent = null,
			_tween,
			_pin;

		/*
		 * ----------------------------------------------------------------
		 * public vars
		 * ----------------------------------------------------------------
		 */

		 // not documented, because this should not be touched by user.
		 ScrollScene.startPoint = 0;

		/*
		 * ----------------------------------------------------------------
		 * private functions
		 * ----------------------------------------------------------------
		 */

		/**
	     * Internal constructor function of ScrollMagic
	     * @private
	     */
		var construct = function () {
			checkOptionsValidity();
		};

		/**
	     * Check the validity of all options and reset to default if neccessary.
	     * @private
	     */
		var checkOptionsValidity = function () {
			if (_options.duration < 0) {
				log(1, "ERROR: Invalid value for ScrollScene option \"duration\": " + _options.duration, "error");
				_options.duration = 0;
			}
			if (!$.isNumeric(_options.offset)) {
				log(1, "ERROR: Invalid value for ScrollScene option \"offset\": " + _options.offset, "error");
				_options.offset = 0;
			}
			if ($.isNumeric(_options.triggerHook) && $.inArray(_options.triggerHook, TRIGGER_HOOK_STRINGS) == -1) {
				log(1, "ERROR: Invalid value for ScrollScene option \"triggerHook\": " + _options.triggerHook, "error");
				_options.triggerHook = DEFAULT_OPTIONS.triggerHook;
			}
			if (_tween) {
				if (_options.smoothTweening && !_tween.tweenTo) {
					log(2, "WARNING: ScrollScene option \"smoothTweening = true\" only works with TimelineMax objects!", "warn");
				}
			}
		};

		/**
	     * Update the tween progress.
	     * @private
	     *
	     * @param {number} [to] - If not set the scene Progress will be used. (most cases)
	     * @return {boolean} true if the Tween was updated. 
	     */
		var updateTweenProgress = function (to) {
			var
				updated = false;
				progress = (to === undefined) ? _progress : to;
			if (_tween) {
				updated = true;
				// check if the tween is an infinite loop (possible with TweenMax / TimelineMax)
				var infiniteLoop = _tween.repeat ? (_tween.repeat() === -1) : false;
				if (infiniteLoop) {
					if ((_state === "DURING" || (_state === "AFTER" && _options.duration == 0)) && _tween.paused()) {
						_tween.play();
						// TODO: optional: think about running the animation in reverse (.reverse()) when starting scene from bottom. Desired behaviour? Might require tween.yoyo() to be true
					} else if (_state !== "DURING" && !_tween.paused()) {
						_tween.pause();
					} else {
						updated = false;
					}
				} else {
					// no infinite loop - so should we just play or go to a specific point in time?
					if (_options.duration == 0) {
						// play the animation
						if (_state == "AFTER") { // play from 0 to 1
							_tween.play();
						} else { // play from 1 to 0
							_tween.reverse();
						}
					} else {
						// go to a specific point in time
						if (_options.smoothTweening && _tween.tweenTo) {
							// only works for TimelineMax
							_tween.tweenTo(progress);
						} else if (_tween.totalProgress) {
							// use totalProgress for TweenMax and TimelineMax to include repeats
							_tween.totalProgress(progress).pause();
						} else {
							// everything else
							_tween.pause(progress);
						}
					}
				}
				return updated;
			}
		};

		/**
	     * Update the pin progress.
	     * @private
	     */
		var updatePinProgress = function () {
			// TODO: check/test functionality – especially for horizontal scrolling
			if (_pin && _parent) {
				var 
					css,
					spacer =  _pin.parent();

				if (_state === "BEFORE") {
					// original position
					css = {
						position: "absolute",
						top: 0,
						left: 0
					}
				} else if (_state === "AFTER" && _options.duration > 0) { // if duration is 0 - we just never unpin
					// position after pin
					css = {
						position: "absolute",
						top: _options.duration,
						left: 0
					}
				} else {
					// position during pin
					var
						spacerOffset = spacer.offset(),
						fixedPosTop,
						fixedPosLeft;
					if (_parent.vertical()) {
						fixedPosTop = spacerOffset.top - ScrollScene.startPoint;
						fixedPosLeft = spacerOffset.left;
					} else {
						fixedPosTop = spacerOffset.top;
						fixedPosLeft = spacerOffset.left - ScrollScene.startPoint;
					}
					// TODO: make sure calculation is correct for all scenarios.
					css = {
						position: "fixed",
						top: fixedPosTop,
						left: fixedPosLeft
					}
				}
				_pin.css(css);
			}
		};

		/**
		 * Update the pin spacer size.
		 * The size of the spacer needs to be updated whenever the duration of the scene changes, if it is to push down following elements.
		 * @private
		 */
		var updatePinSpacerSize = function () {
			if (_pin && _parent) {
				if (_pin.data("pushFollowers")) {
					var spacer = _pin.parent();
					if (_parent.vertical()) {
						spacer.height(_pin.data("startHeight") + _options.duration);
					} else {
						spacer.width(_pin.data("startWidth") + _options.duration);
					}
					// UPDATE progress, because when the spacer size is changed it may affect the pin state
					updatePinProgress();
				}
			}
		}

		/**
	     * Send a debug message to the console.
	     * @private
	     *
	     * @param {number} loglevel - The loglevel required to initiate output for the message.
	     * @param {mixed} output - A String or an object that is supposed to be logged.
	     * @param {ScrollScene} [method='log'] - The method used for output. Can be 'log', 'error' or 'warn'
	     */
		var log = function (loglevel, output, method) {
			if (_options.loglevel >= loglevel) {
				if (!$.isFunction(console[method])) {
					method = "log";
				}
				var now = new Date(),
					time = ("0"+now.getHours()).slice(-2) + ":" + ("0"+now.getMinutes()).slice(-2) + ":" + ("0"+now.getSeconds()).slice(-2) + ":" + ("00"+now.getMilliseconds()).slice(-3),
					func = console[method];
				func.call(console, time + " (ScrollScene) ->", output);
			}
		}

		/*
		 * ----------------------------------------------------------------
		 * public functions
		 * ----------------------------------------------------------------
		 */

		/**
		 * Get parent controller.
		 * @public
		 *
		 * @returns {(number|object)}
		 */
		 // Set function is not documented, because it should NOT be used, as this would break some stuff. Users should use addTo.
		this.parent = function (newParent) {
			if (!arguments.length) { // get
				return _parent;
			} else { // set
				_parent = newParent;
				updatePinSpacerSize();
				return ScrollScene;
			}
		};


		/**
		 * Get trigger.
		 * @public
		 *
		 * @returns {(number|object)}
		 *//**
		 * Set trigger.
		 * @public
		 *
		 * @fires ScrollScene.change
		 * @param {(number|object)} newTrigger - The new trigger of the scene.
		 * @returns {ScrollScene} Parent object for chaining.
		 */
		this.trigger = function (newTrigger) {
			if (!arguments.length) { // get
				return _trigger;
			} else { // set
				_trigger = $.type(newTrigger) === "string" ? $(newTrigger).first() : newTrigger;
				ScrollScene.dispatch("change", {what: "trigger"}); // fire event
				ScrollScene.update();
				return ScrollScene;
			}
		};

		/**
		 * Get duration option value.
		 * @public
		 *
		 * @returns {number}
		 *//**
		 * Set duration option value.
		 * @public
		 *
		 * @fires ScrollScene.change
		 * @param {number} newDuration - The new duration of the scene.
		 * @returns {ScrollScene} Parent object for chaining.
		 */
		this.duration = function (newDuration) {
			if (!arguments.length) { // get
				return _options.duration;
			} else { // set
				_options.duration = newDuration;
				checkOptionsValidity();
				ScrollScene.dispatch("change", {what: "duration"}); // fire event
				// update some shit
				updatePinSpacerSize();
				ScrollScene.update();
				return ScrollScene;
			}
		};

		/**
		 * Get offset option value.
		 * @public
		 *
		 * @returns {number}
		 *//**
		 * Set offset option value.
		 * @public
		 *
		 * @fires ScrollScene.change
		 * @param {number} newOffset - The new offset of the scene.
		 * @returns {ScrollScene} Parent object for chaining.
		 */
		this.offset = function (newOffset) {
			if (!arguments.length) { // get
				return _options.offset;
			} else { // set
				_options.offset = newOffset;
				checkOptionsValidity();
				ScrollScene.dispatch("change", {what: "offset"}); // fire event
				ScrollScene.update();
				return ScrollScene;
			}
		};

		/**
		 * Get triggerHook relative to viewport.
		 * @public
		 *
		 * @returns {number} A number from 0 to 1 that defines where on the viewport the offset and startPosition should be related to.
		 *//**
		 * Set triggerHook option value.
		 * @public
		 *
		 * @fires ScrollScene.change
		 * @param {(float|string)} newTriggerHook - The new triggerHook of the scene. @see {@link ScrollScene) parameter description for value options.
		 * @returns {ScrollScene} Parent object for chaining.
		 */
		this.triggerHook = function (newTriggerHook) {
			if (!arguments.length) { // get
				var triggerPoint;
				if ($.isNumeric(_options.triggerHook)) {
					triggerPoint = _options.triggerHook;
				} else {
					switch(_options.triggerHook) {
						case "onCenter":
							triggerPoint = 0.5;
							break;
						case "onLeave":
							triggerPoint = 0;
							break;
						case "onEnter":
						default:
							triggerPoint = 1;
							break;
					}
				}
				return triggerPoint;
			} else { // set
				_options.triggerHook = newTriggerHook;
				checkOptionsValidity();
				ScrollScene.dispatch("change", {what: "triggerHook"}); // fire event
				ScrollScene.update();
				return ScrollScene;
			}
		};

		/**
		 * Get reverse option value.
		 * @public
		 *
		 * @returns {boolean}
		 *//**
		 * Set reverse option value.
		 * @public
		 *
		 * @fires ScrollScene.change
		 * @param {boolean} newReverse - The new reverse setting of the scene.
		 * @returns {ScrollScene} Parent object for chaining.
		 */
		this.reverse = function (newReverse) {
			if (!arguments.length) { // get
				return _options.reverse;
			} else { // set
				_options.reverse = newReverse;
				checkOptionsValidity();
				ScrollScene.dispatch("change", {what: "reverse"}); // fire event
				ScrollScene.update();
				return ScrollScene;
			}
		};

		/**
		 * Get smoothTweening option value.
		 * @public
		 *
		 * @returns {boolean}
		 *//**
		 * Set smoothTweening option value.
		 * @public
		 *
		 * @fires ScrollScene.change
		 * @param {boolean} newSmoothTweening - The new smoothTweening setting of the scene.
		 * @returns {ScrollScene} Parent object for chaining.
		 */
		this.smoothTweening = function (newSmoothTweening) {
			if (!arguments.length) { // get
				return _options.smoothTweening;
			} else { // set
				_options.smoothTweening = newSmoothTweening;
				checkOptionsValidity();
				ScrollScene.dispatch("change", {what: "smoothTweening"}); // fire event
				ScrollScene.update();
				return ScrollScene;
			}
		};


		/**
		 * Get Scene progress (0 - 1). 
		 * @public
		 *
		 * @returns {number}
		 *//**
		 * Set Scene progress.
		 * @public
		 *
		 * @fires ScrollScene.enter
		 * @fires ScrollScene.start
		 * @fires ScrollScene.progress
		 * @fires ScrollScene.end
		 * @fires ScrollScene.leave
		 *
		 * @param {number} progress - The new progress value of the scene (0 - 1).
		 * @returns {ScrollScene} Parent object for chaining.
		 */
		this.progress = function (progress) {
			if (!arguments.length) { // get
				return _progress;
			} else { // set
				var
					doUpdate = false,
					oldState = _state,
					scrollDirection = _parent ? _parent.scrollDirection() : "PAUSED";
				if (progress <= 0 && _state !== 'BEFORE' && (_state !== 'AFTER' || _options.reverse)) {
					// go back to initial state
					_progress = 0;
					doUpdate = true;
					_state = 'BEFORE';
				} else if (progress >= 1 && _state !== 'AFTER') {
					_progress = 1;
					doUpdate = true;
					_state = 'AFTER';
				} else if (progress > 0 && progress < 1 && (_state !== 'AFTER' || _options.reverse)) {
					_progress = progress;
					doUpdate = true;
					_state = 'DURING';
				}
				if (doUpdate) {
					var eventVars = {scrollDirection: scrollDirection, state: _state};
					if (_state != oldState) { // fire state change events
						if (_state === 'DURING' || _options.duration == 0) {
							ScrollScene.dispatch("enter", eventVars);
						}
						if ((_state === 'DURING' && scrollDirection === 'FORWARD')|| _state === 'BEFORE') {
							ScrollScene.dispatch("start", eventVars);
						} else if (_options.duration == 0) {
							ScrollScene.dispatch((_state === 'AFTER') ? "start" : "end", eventVars);
						}
					}
					updateTweenProgress();
					updatePinProgress();
					ScrollScene.dispatch("progress", {progress: _progress, scrollDirection: scrollDirection});
					if (_state != oldState) { // fire state change events
						if ((_state === 'DURING' && scrollDirection === 'REVERSE')|| _state === 'AFTER') {
							ScrollScene.dispatch("end", {scrollDirection: scrollDirection});
						} else if (_options.duration == 0) {
							ScrollScene.dispatch((_state === 'AFTER') ? "start" : "end", eventVars);
						}
						if (_state !== 'DURING' || _options.duration == 0) {
							ScrollScene.dispatch("leave", eventVars);
						}
					}
				}

				log(3, {"progress" : _progress, "state" : _state, "reverse" : _options.reverse});

				return ScrollScene;
			}
		};

		/**
		 * Add a tween to the scene (one TweenMax object per scene!).
		 * @public
		 *
		 * @param {object} TweenMaxObject - A TweenMax object that should be animated during the scene.
		 * @returns {ScrollScene} Parent object for chaining.
		 */
		this.setTween = function (TweenMaxObject) {
			if (_tween) { // kill old tween?
				ScrollScene.removeTween();
			}
			try {
				_tween = TweenMaxObject.pause();
			} catch (e) {
				log(1, "ERROR: Supplied argument is not a valid TweenMaxObject", "error");
			} finally {
				checkOptionsValidity();
				updateTweenProgress();
				return ScrollScene;
			}
		};

		/**
		 * Remove the tween from the scene.
		 * @public
		 *
		 * @param {boolean} [reset=false] - If true the tween weill be reset to start values.
		 * @returns {ScrollScene} Parent object for chaining.
		 */
		this.removeTween = function (reset) {
			if (_tween) {
				if (reset) {
					updateTweenProgress(0);
				}
				_tween.kill();
				_tween = null;
			}
			return ScrollScene;
		};


		/**
		 * Pin an element for the duration of the tween.
		 * @public
		 *
		 * @param {(string|object)} element - A Selctor or a jQuery object for the object that is supposed to be pinned.
		 * @param {object} [settings.pushFollowers=true] - If true following elements will be "pushed" down, if false the pinned element will just scroll past them
		 * @param {object} [settings.spacerClass="superscrollorama-pin-spacer"] - Classname of the pin spacer element
		 * @returns {ScrollScene} Parent object for chaining.
		 */
		this.setPin = function (element, settings) {
			var defaultSettings = {
				pushFollowers: true,
				spacerClass: "superscrollorama-pin-spacer"
			};

			// validate Element
			try {
				if ($.type(element) === "string")
					element = $(element).first();
				if (element.length == 0)
					throw "Invalid pin element supplied.";
			} catch (e) {
				log(1, "ERROR: " + e, "error");
				return ScrollScene; // cancel
			}

			if (_pin) { // kill old pin?
				ScrollScene.removePin();
			}
			_pin = element;


			var
				settings = $.extend({}, defaultSettings, settings);


			// create spacer
			var spacer = $("<div>&nbsp;</div>") // for some reason a completely empty div can cause layout changes sometimes.
					.addClass(settings.spacerClass)
					.css({
						position: "relative",
						top: _pin.css("top"),
						left: _pin.css("left"),
						bottom: _pin.css("bottom"),
						right: _pin.css("right")
					});

			if (_pin.css("position") == "absolute") {
				// well this is easy.
				// TODO: Testing
				spacer.css({
						width: 0,
						height: 0
					});
			} else {
				// a little more challenging.
				spacer.css({
						display: _pin.css("display"),
						width: parseFloat(_pin.css("width")) + parseFloat(_pin.css("border-left")) + parseFloat(_pin.css("border-right")) + parseFloat(_pin.css("padding-left")) + parseFloat(_pin.css("padding-right")) + parseFloat(_pin.css("margin-left")) + parseFloat(_pin.css("margin-right")),
						height: parseFloat(_pin.css("height")) + parseFloat(_pin.css("border-top")) + parseFloat(_pin.css("border-bottom")) + parseFloat(_pin.css("padding-top")) + parseFloat(_pin.css("padding-bottom")) + parseFloat(_pin.css("margin-top")) + parseFloat(_pin.css("margin-bottom"))
					});
			}


			// now place the pin element inside the spacer	
			_pin.wrap(spacer)
					.data("style", _pin.attr("style") || "") // save old styles (for reset)
					.data("pushFollowers", settings.pushFollowers)
					.data("startWidth", spacer.width())
					.data("startHeight", spacer.height())
					.css({									// set new css
						position: "absolute",
						top: 0,
						left: 0
					});

			// update the size of the pin Spacer.
			// this also calls updatePinProgress
			updatePinSpacerSize();

			return ScrollScene;
		};

		
		/**
		 * Remove the pin from the scene.
		 * @public
		 *
		 * @param {boolean} [reset=false] - If false the spacer will not be removed and the element's position will not be reset.
		 * @returns {ScrollScene} Parent object for chaining.
		 */
		this.removePin = function (reset) {
			if (_pin) {
				var spacer = _pin.parent();
				if (reset || !_parent) { // if there's no parent no progress was made anyway...
					_pin.insertBefore(spacer)
						.attr("style", _pin.data("style"));
					spacer.remove();
				} else {
					var vertical = _parent.vertical();
					_pin.css({
						position: "absolute",
						top: vertical ? _options.duration * _progress : 0,
						left: vertical ? 0 : _options.duration * _progress
					});
				}
				_pin = null;
			}
			return ScrollScene;
		};
		
		/**
		 * Update the Scene in the parent Controller
		 * Can also be achieved using controller.update(scene);
		 * @public
		 *
		 * @param {boolean} [immediately=false] - If true the update will be instantly, if false it will wait until next tweenmax tick (better performance);
		 * @returns {ScrollScene}
		 */
		this.update = function (immediately) {
			if (_parent) {
				_parent.updateScene(ScrollScene, immediately);
			}
			return ScrollScene;
		};
		
		/**
		 * Remove the scene from its parent controller.
		 * Can also be achieved using controller.removeScene(scene);
		 * To remove the pin and/or pin spacer you need to call removePin
		 * @public
		 *
		 * @returns {null}
		 */
		this.remove = function () {
			if (_parent) {
				_parent.removeScene(ScrollScene);
			}
			return null;
		};

		/**
		 * Add the scene to a controller.
		 * Can also be achieved using controller.addScene(scene);
		 * @public
		 *
		 * @param {ScrollMagic} controller - The controller to which the scene should be added.
		 * @returns {ScrollScene}
		 */
		this.addTo = function (controller) {
			controller.addScene(ScrollScene);
			return ScrollScene;
		};
		
		/**
		 * Return the trigger offset.
		 * (always numerical, whereas trigger can also be a jQuery object)
		 * @public
		 *
		 * @returns {number} Numeric trigger offset, regardless if the trigger is an offset value or a jQuery object.
		 */
		this.getTriggerOffset = function () {
			if ($.isNumeric(_trigger)) {
				// numeric offset as trigger
                return _trigger
			} else {
				if (_parent) {
					// jQuery Object as trigger
					var targetOffset = _trigger.offset();
					return _parent.vertical() ? targetOffset.top : targetOffset.left;	
				} else {
					// if there's no parent yet we don't know if we're scrolling horizontally or vertically
					return 0;
				}
			}
		};


		/*
		 * ----------------------------------------------------------------
		 * EVENTS
		 * ----------------------------------------------------------------
		 */
		
		/**
	     * Scene start event.
	     * Fires whenever the scroll position its the starting point of the scene.
	     * It will also fire when scrolling back up going over the start position of the scene. If you want something to happen only when scrolling down/right, use the scrollDirection parameter passed to the callback.
	     *
	     * @event ScrollScene.start
	     *
	     * @property {object} event - The event Object passed to each callback.
	     * @property {string} event.type - The unique name of the event.
	     * @property {string} event.state - The new state of the scene. Will be "DURING" or "BEFORE"
	     * @property {string} event.scrollDirection - Indicates wether we hit the start position into the scene ("FORWARD") or backing up and scrolling out of it ("REVERSE").
	     */
		/**
	     * Scene end event.
	     * Fires whenever the scroll position its the ending point of the scene.
	     * It will also fire when scrolling back up from after the scene and going over its end position. If you want something to happen only when scrolling down/right, use the scrollDirection parameter passed to the callback.
	     *
	     * @event ScrollScene.end
	     *
	     * @property {object} event - The event Object passed to each callback.
	     * @property {string} event.type - The unique name of the event.
	     * @property {string} event.state - The new state of the scene. Will be "AFTER" or "DURING"
	     * @property {string} event.scrollDirection - Indicates wether we hit the end position scrolling out of the scene ("FORWARD") or backing up into it ("REVERSE").
	     */
		/**
	     * Scene enter event.
	     * Fires whenever the scene enters the "DURING" state.
	     * Keep in mind that it doesn't matter if the scene plays forward or backward: This event always fires when the scene enters its active scroll timeframe, regardless of the scroll-direction.
	     *
	     * @event ScrollScene.enter
	     *
	     * @property {object} event - The event Object passed to each callback.
	     * @property {string} event.type - The unique name of the event.
	     * @property {string} event.state - The new state of the scene. Will always be "DURING" (only included for consistency)
	     * @property {string} event.scrollDirection - Indicates from what side we enter the Scene. ("FORWARD") => from the top/left, ("REVERSE") => from the bottom/right.
	     */
		/**
	     * Scene leave event.
	     * Fires whenever the scene's state goes from "DURING" to either "BEFORE" or "AFTER".
	     * Keep in mind that it doesn't matter if the scene plays forward or backward: This event always fires when the scene leaves its active scroll timeframe, regardless of the scroll-direction.
	     *
	     * @event ScrollScene.leave
	     *
	     * @property {object} event - The event Object passed to each callback.
	     * @property {string} event.type - The unique name of the event.
	     * @property {string} event.state - The new state of the scene. Will be "AFTER" or "BEFORE"
	     * @property {string} event.scrollDirection - Indicates towards which side we leave the Scene. ("FORWARD") => going to state "BEFORE", ("REVERSE") => going to state "AFTER"
	     */
		/**
	     * Scene progress event.
	     * Fires whenever the progress of the scene changes.
	     *
	     * @event ScrollScene.progress
	     *
	     * @property {object} event - The event Object passed to each callback.
	     * @property {string} event.type - The unique name of the event.
	     * @property {number} event.progress - Reflects the current progress of the scene.
	     * @property {string} event.scrollDirection - Indicates which way we are scrolling "FORWARD" or "REVERSE"
	     */
		/**
	     * Scene change event.
	     * Fires whenvever a property of the scene is changed.
	     *
	     * @event ScrollScene.change
	     *
	     * @property {object} event - The event Object passed to each callback.
	     * @property {string} event.type - The unique name of the event.
	     * @property {string} event.what - Indicates what value has been changed.
	     */
		 
	     /**
		 * Add an event listener.
		 * The callback function will be fired at the respective event, and an object containing relevant data will be passed to the callback.
		 * @public
		 *
		 * @param {string} name - The name of the event the callback should be attached to.
		 * @param {function} callback - A function that should be executed, when the event is dispatched. An event object will be passed to the callback.
		 * @returns {ScrollScene} Parent object for chaining.
		 */
		 this.on = function (name, callback) {
			if ($.isFunction(callback)) {
		 		$(document).on($.trim(name.toLowerCase()) + ".ScrollScene", callback);
			} else {
				log(1, "ERROR: Supplied argument is not a valid callback!", "error");
			}
			return ScrollScene;
		 }

		 /**
		 * Remove an event listener.
		 * @public
		 *
		 * @param {string} [name] - The name of the event that should be removed. If none is passed, all event listeners will be removed.
		 * @param {object} [callback] - A specific callback function that should be removed. If none is passed all callbacks to the event listener will be removed.
		 * @returns {ScrollScene} Parent object for chaining.
		 */
		 this.unbind = function (name, callback) {
		 	// console.log(_events);
		 	$(document).off($.trim(name.toLowerCase()) + ".ScrollScene", callback)
		 	return ScrollScene;
		 }

	     /**
		 * Trigger an event.
		 * @public
		 *
		 * @param {string} name - The name of the event that should be fired.
		 * @param {object} [vars] - An object containing info that should be passed to the callback.
		 * @returns {ScrollScene} Parent object for chaining.
		 */
		 this.dispatch = function (name, vars) {
			log(3, 'Event Fired: ScrollScene.'+name);
			var event = {
				type: $.trim(name.toLowerCase()) + ".ScrollScene",
				target: ScrollScene
			}
	 		if ($.isPlainObject(vars)) {
				event = $.extend({}, vars, event);
			}
			// fire all callbacks of the event
			$.event.trigger(event);
			return ScrollScene;
		 }




		// INIT
		construct();
		return ScrollScene;
	}

})(jQuery);