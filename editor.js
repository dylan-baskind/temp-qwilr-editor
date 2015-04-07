/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	// Public exports
	window.qed = {
	  Editor: __webpack_require__(1),
	  Point: __webpack_require__(2),
	  Range: __webpack_require__(3),

	  // Plugins for core editor
	  Toolbar: __webpack_require__(4),
	  StemTracker: __webpack_require__(8),
	  InlineDecorator: __webpack_require__(5),
	  util: __webpack_require__(6),
	  keycodes: __webpack_require__(7)

	  // TODO: Just export all the classes so people can put them together
	  //       however they like.
	};



/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var util = __webpack_require__(6);
	var EventBus = __webpack_require__(9);
	var EventRouter = __webpack_require__(10);
	var Selection = __webpack_require__(11);
	var Registry = __webpack_require__(12);

	/**
	 * Editor class
	 *
	 * An editor may be attached to any DOM element, which will
	 * then become editable.  When the editor is detached, the element
	 * will cease to be editable.
	 *
	 * The editor emits a rich set of events which can be handled
	 * specially by users.
	 */
	module.exports = function Editor() {
	  var me = this;

	  var currentElem = null;

	  var bus = new EventBus();

	  var selection = new Selection(window.getSelection());

	  var registry = new Registry(bus);

	  var router = new EventRouter(getCurrentElem, registry, selection);

	  /**
	   * The editor's selection helper
	   *
	   * See the Selection class for details.
	   */
	  me.selection = function() {
	    return selection;
	  };

	  var detacher;

	  /**
	   * Attaches the editor to an element
	   */
	  me.attach = function(elem) {
	    me.detach();

	    currentElem = elem;
	    elem.contentEditable = true;
	    elem.style.outline = 'none';

	    detacher = attachHandlers(elem, router.handlers);

	    bus.post('attached');
	  };

	  /**
	   * Detaches the editor from its element
	   */
	  me.detach = function() {
	    if (!currentElem) {
	      return;
	    }

	    assert(detacher);

	    detacher();

	    currentElem.contentEditable = 'inherit';
	    bus.post('detached');

	    currentElem = null;
	  };

	  /**
	   * true if the editor is currently attached
	   */
	  me.attached = function() {
	    return currentElem !== null;
	  };

	  /**
	   * The element the editor is currently attached to (or null)
	   */
	  me.currentElem = getCurrentElem;
	  function getCurrentElem() {
	    return currentElem;
	  };

	  /**
	   * Focus the editor, put the cursor in it.
	   */
	  me.focus = function() {
	    if (!currentElem) {
	      return;
	    }

	    currentElem.focus();
	  };


	  /** See EventBus.on */
	  me.on = bus.on;

	  /** See EventBus.addListener */
	  me.addListener = bus.addListener;

	  /** Exposing registry **/
	  me.registry = registry;

	  // -- private -- //

	  /**
	   * Registers a map of handlers to an element after wrapping each one,
	   * and returns a function for unregistering them.
	   */
	  function attachHandlers(elem, handlerMap) {
	    var registered = {};

	    for (var type in handlerMap) {
	      var wrapped = registered[type] = wrapHandler(handlerMap[type]);
	      elem.addEventListener(type, wrapped);
	    }

	    return function() {
	      for (var type in registered) {
	        elem.removeEventListener(type, registered[type]);
	      }
	    };
	  }

	  function wrapHandler(func) {
	    return function(ev) {
	      beforeEvent();
	      try {
	        func(ev);

	        // TODO: error handling
	      } finally {
	        afterEvent();
	      }
	    };
	  }

	  // TODO: use these to cache things like selection, for optimisation.
	  function beforeEvent() {
	  }

	  function afterEvent() {
	  }
	}





/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var util = __webpack_require__(6);
	var assert = util.assert;

	var TEXT   = 'text';
	var START  = 'start';
	var END    = 'end';
	var BEFORE = 'before';
	var AFTER  = 'after';

	/**
	 * A class that represents a location in the DOM, offering
	 * a more convenient interface to traverse, mutate, compare
	 * locations, etc, abstracting away the fairly fiddly code
	 * normally needed for complex low-level DOM manipulations.
	 *
	 * Points offer a semi-opaque abstraction over the multiple
	 * ways a particular DOM location can be represented. 
	 *
	 * For example, when comparing points, the "start" of a 
	 * paragraph, a point "before" its first text node, and 
	 * a point at offset 0 of the first text node, are all considered 
	 * equivalent -- althought, the differences in representation
	 * are accessible if needed.
	 */
	module.exports = Point;

	Point.text = text;
	Point.start = start;
	Point.end = end;
	Point.before = before;
	Point.after = after;
	Point.fromNodeOffset = fromNodeOffset;
	Point.of = of;
	Point.ofArgs = ofArgs;
	Point.check = checkPoint;

	Point.types = {
	  TEXT:TEXT,
	  START:START,
	  END:END,
	  BEFORE:BEFORE,
	  AFTER:AFTER
	};

	var magic = 'xx';

	/**
	 * A point at the given character offset within a text node
	 */
	function text(textNode, offset) {
	  return new Point(magic).moveToText(textNode, offset);
	}

	/**
	 * A point inside the start of an element
	 */
	function start(elem) {
	  return new Point(magic).moveToStart(elem);
	}

	/**
	 * A point inside the end of an element
	 */
	function end(elem) {
	  return new Point(magic).moveToEnd(elem);
	}

	/**
	 * A point before a node
	 */
	function before(node) {
	  return new Point(magic).moveToBefore(node);
	}

	/**
	 * A point after a node
	 */
	function after(node) {
	  return new Point(magic).moveToAfter(node);
	}

	/**
	 * A point equivalent to that represented by the standard browser node/offset pair idiom
	 */
	function fromNodeOffset(node, offset) {
	  if (node.nodeType === 3) {
	    return text(node, offset);
	  }

	  if (offset === node.childNodes.length) {
	    return end(node);
	  }

	  assert(offset >= 0 && offset < node.childNodes.length,
	      'invalid offset for', node, offset);

	  return before(node.childNodes[offset]);
	}

	function ofArgs(args) {
	  return of(args[0], args[1]);
	}

	/**
	 * An all-purpose adapter of either a Point, a node/offset pair, or
	 * a node/node pair
	 */
	function of(x, y) {
	  if (x instanceof Point) {
	    assert(y === undefined);
	    return x;
	  }

	  if (x.nodeType === 3) {
	    return text(x, y);
	  }

	  assert(x.nodeType === 1);
	  if (typeof y === 'number') {
	    return fromNodeOffset(x, y);
	  }

	  if (y === null) {
	    return end(x);
	  }

	  assert(checkNode(y).parentNode === x);

	  return before(y);
	}

	function Point(check) {
	  assert(check === magic, 'do not construct Point directly');
	};
	Point.prototype.toString = function() {
	  return '[' + this.type + ' ' + this.node + 
	      (this.type === TEXT ? ':' + this.offset : '') + ']';
	};


	Point.prototype.moveToText = function(node, offset) {
	  this.type = TEXT;
	  this.node = checkText(node);
	  assert(typeof offset === 'number', 'offset num required');

	  assert(offset >= 0 && offset <= node.data.length, 'offset out of range', node.data, offset);
	  this.offset = offset;
	  return this;
	};

	Point.prototype.moveToTextStart = function(node) {
	  this.moveToText(node, 0);
	};

	Point.prototype.moveToTextEnd = function(node) {
	  this.moveToText(node, node.length);
	};

	Point.prototype.moveToStart = function(elem) {
	  this.type = START;
	  this.node = checkElem(elem);
	  this.offset = null;
	  return this;
	};

	Point.prototype.moveToEnd = function(elem) {
	  this.type = END;
	  this.node = checkElem(elem);
	  this.offset = null;
	  return this;
	};

	Point.prototype.moveToBefore = function(node) {
	  this.type = BEFORE;
	  this.node = checkNode(node);
	  this.offset = null;
	  return this;
	};

	Point.prototype.moveToAfter = function(node) {
	  this.type = AFTER;
	  this.node = checkNode(node);
	  this.offset = null;
	  return this;
	};

	/**
	 * Returns a standard browser node/offset pair as a two element array.
	 */
	Point.prototype.toNodeOffset = function() {
	  switch (this.type) {
	    case TEXT: return [this.node, this.offset];
	    case START: return [this.node, 0];
	    case END: return [this.node, this.node.childNodes.length];
	    case BEFORE: return [
	        checkHasParent(this.node).parentNode, 
	        childIndex(this.node)];
	    case AFTER: return [
	        checkHasParent(this.node).parentNode, 
	        childIndex(this.node) + 1];
	    default: assert(false);
	  }
	};

	/**
	 * The index of the given node within its parent's children
	 */
	function childIndex(child) {
	  var elem = child.parentNode;
	  var children = elem.childNodes;
	  var len = children.length;
	  for (var i = 0; i < len; i++) {
	    if (children[i] === child) {
	      return i;
	    }
	  }

	  assert(false, 'not parent-child:', elem, child);
	}

	/**
	 * Ensures the point is suitable for element insertion, by splitting
	 * the text node it is within if necessary, otherwise does nothing.
	 * Either way, moves itself to a suitable insertion point.
	 * (and returns itself)
	 */
	Point.prototype.ensureInsertable = function() {
	  if (this.type === TEXT && this.offset > 0 && this.offset < this.node.length) {
	    return this.moveToBefore(this.node.splitText(this.offset));
	  }

	  return this;
	};

	/**
	 * Inserts the given node at this point.
	 */
	Point.prototype.insert = function(newChild) {
	  var p = this.rightNormalized();

	  if (p.type === TEXT) {
	    p.node.parentNode.insertBefore(newChild, p.node.splitText(p.offset));
	  } else if (p.type === BEFORE) {
	    p.node.parentNode.insertBefore(newChild, p.node);
	  } else if (p.type === END) {
	    p.node.appendChild(newChild);
	  } else {
	    assert(false);
	  }
	};


	/**
	 * Split at a point.
	 */
	Point.prototype.splitRight = function(splitWith) {
	  this.setTo(splitRight(this, splitWith).rightNormalized());
	}

	function splitRight(splitPoint, splitWith) {
	  splitPoint.ensureInsertable();
	  splitPoint = splitPoint.rightNormalized();
	  var avoidSplittingIfPossible = !splitWith;
	  
	  var resultPoint = Point.after(splitPoint.containingElement());
	  
	  if (resultPoint.type === END && avoidSplittingIfPossible) {
	    return resultPoint;
	  }

	  var originalElem = splitPoint.containingElement();
	  if (splitWith === true || !splitWith) {
	    splitWith = originalElem.cloneNode(false);
	  }
	  checkElem(splitWith);
	  resultPoint.insert(splitWith);

	  if (splitPoint.type === BEFORE) {
	    do {
	      var node = originalElem.lastChild;
	      splitWith.insertBefore(node, splitWith.firstChild);
	    } while (node != splitPoint.node);

	  } else if (splitPoint.type === END) {
	    // do nothing
	  } else {
	    assert(false);
	  }

	  return Point.before(splitWith);
	};

	/**
	 * Split at a point with left-bias
	 */
	Point.prototype.splitLeft = function(splitWith) {
	  this.setTo(splitLeft(this, splitWith).leftNormalized());
	};

	function splitLeft(splitPoint, splitWith) {
	  // Creates the actaul split
	  splitPoint.ensureInsertable();
	  // Normalizes the point with left-bias
	  splitPoint = splitPoint.leftNormalized();
	  var avoidSplittingIfPossible = !splitWith;

	  var resultPoint = Point.before(splitPoint.containingElement());

	  // This will never get called as resultPoint is always of type 'BEFORE' based on previous function call
	  if (resultPoint.type === START && avoidSplittingIfPossible) {
	    return resultPoint;
	  }

	  // Grabs the containing element and clones, unless alternative element is provided, and inserts the empty node
	  // before the original element
	  var originalElem = splitPoint.containingElement();
	  if (splitWith === true || !splitWith) {
	    splitWith = originalElem.cloneNode(false);
	  }
	  checkElem(splitWith);
	  resultPoint.insert(splitWith);

	  if (splitPoint.type === AFTER) {

	    // Move child elements of the original element that are left of the split point to the newly created node
	    do{
	      var node = originalElem.firstChild;
	      splitWith.appendChild(node);
	    } while (node != splitPoint.node);

	  } else if (splitPoint.type === START) {
	    // Do nothing
	  } else {
	    assert(false);
	  }

	  return Point.after(splitWith);
	};

	/*
	 * Joins at this point, preserving the right node. Expects point to be either BEFORE or AFTER a node
	 */
	Point.prototype.joinRight = function() {
	  this.setTo(joinRight(this).rightNormalized());
	};

	function joinRight(joinPoint) {
	  assert(joinPoint.type === BEFORE || joinPoint.type === AFTER);
	  joinPoint = joinPoint.rightNormalized();

	  source = joinPoint.node.previousSibling;
	  dest = source.nextSibling;
	  parentNode = dest.parentNode;

	  if (!source) {
	    return Point.before(joinPoint.node);
	  }

	  resultPoint = Point.before(dest.firstChild);

	  if (joinPoint.type === BEFORE) {
	    // Move each node from the sibling node to the left over to this node
	    while (source.hasChildNodes()) {
	      var node = source.lastChild;
	      dest.insertBefore(node, dest.firstChild);
	    }
	    // Remove the now empty node
	    parentNode.removeChild(source);
	  }
	  else if (joinPoint.type === END) {
	    // do nothing
	  } else {
	    assert(false);
	  }

	  // Before normalizing, check if the result point and the (new) previous sibling node are text.
	  // If so set the offset to the length of the previous sibling's text
	  if (resultPoint.node.nodeType === 3 && resultPoint.node.previousSibling.nodeType === 3) {
	    resultPoint.moveToText(resultPoint.node, resultPoint.node.previousSibling.length);
	  }

	  dest.normalize();

	  return resultPoint;
	};

	/*
	 * Joins at this point, preserving left node. Expects point to be either BEFORE or AFTER a node
	 */
	Point.prototype.joinLeft = function() {
	  this.setTo(joinLeft(this).leftNormalized());
	};

	function joinLeft(joinPoint) {
	  assert(joinPoint.type === BEFORE || joinPoint.type === AFTER);
	  joinPoint = joinPoint.leftNormalized();

	  source = joinPoint.node.nextSibling;
	  dest = source.previousSibling;
	  parentNode = dest.parentNode;


	  if (!source) {
	    return Point.after(joinPoint.node);
	  }

	  if (dest.lastChild.nodeType === 3) {
	    resultPoint = Point.text(dest.lastChild, dest.lastChild.textContent.length);
	  } else {
	    resultPoint = Point.after(dest.lastChild);
	  }

	  if (joinPoint.type === AFTER) {
	    while(source.hasChildNodes()) {
	      var node = source.firstChild;
	      dest.appendChild(node);
	    }
	    parentNode.removeChild(source);
	  }
	  else if (joinPoint.type === START) {
	    // do nothing
	  } else {
	    assert(false);
	  }

	  // Normalize the node to remove any inner adjacent text nodes
	  dest.normalize()

	  return resultPoint;
	};

	/**
	 * Adjusts the internal representation to be right-biased,
	 */
	Point.prototype.rightNormalized = function() {
	  var p = this.nodeNormalized();

	  if (p.type == TEXT) {
	    return p;
	  } else if (p.type == AFTER) {
	    var next = p.node.nextSibling;
	    if (next) {
	      return before(next);
	    } else {
	      return end(p.node.parentNode);
	    }
	  } else if (p.type == START) {
	    var child = p.node.firstChild;
	    if (child) {
	      return before(child);
	    } else {
	      return end(p.node);
	    }
	  }

	  assert(p.type === BEFORE || p.type === END);

	  return p;
	};

	/**
	 * Adjusts the internal representation to be left-biased,
	 */
	Point.prototype.leftNormalized = function() {
	  var p = this.nodeNormalized();
	  if (p.type == TEXT) {
	    return p;
	  } else if (p.type == BEFORE) {
	    var prev = p.node.previousSibling;
	    if (prev) {
	      return after(prev);
	    } else {
	      return start(p.node.parentNode);
	    }
	  } else if (p.type == END) {
	    var child = p.node.lastChild;
	    if (child) {
	      return after(child);
	    } else {
	      return start(p.node);
	    }
	  }

	  assert(p.type === AFTER || p.type === START);

	  return p;
	};


	/**
	 * Returns the containing element.
	 */
	Point.prototype.containingElement = function() {
	  switch (this.type) {
	    case TEXT:
	    case BEFORE:
	    case AFTER:
	      return this.node.parentNode;
	    case START:
	    case END:
	      return this.node;
	    default: assert(false);
	  }
	};



	/**
	 * Returns the containing element, if the point is at its start
	 * otherwise null.
	 */
	Point.prototype.elemStartingAt = function() {
	  if (this.type === TEXT) {
	    return this.offset === 0 && util.isFirstChild(this.node) || null;
	  } else if (this.type === BEFORE) {
	    return util.isFirstChild(this.node);
	  } else if (this.type === START) {
	    return this.node;
	  } else if (this.type === END) {
	    return this.node.firstChild ? null : this.node;
	  } else {
	    return null;
	  }
	};

	/**
	 * Returns the containing element, if the point is at its end
	 * otherwise null.
	 */
	Point.prototype.elemEndingAt = function() {
	  if (this.type === TEXT) {
	    return this.offset === this.node.length && util.isLastChild(this.node) || null;
	  } else if (this.type === AFTER) {
	    return util.isLastChild(this.node);
	  } else if (this.type === END) {
	    return this.node;
	  } else if (this.type === START) {
	    return this.node.firstChild ? null : this.node;
	  } else {
	    return null;
	  }
	};

	Point.prototype.nodeBefore = function() {
	  var left = this.leftNormalized();
	  switch (left.type) {
	    case TEXT: return null;
	    case START: return null;
	    case AFTER: return left.node;
	    default: assert(false);
	  }
	};
	Point.prototype.elemBefore = function() {
	  var node = this.nodeBefore();
	  return node && node.nodeType === 1 ? node : null;
	};
	Point.prototype.hasTextBefore = function() {
	  var left = this.leftNormalized();
	  switch (left.type) {
	    case TEXT: return true;
	    case START: return false;
	    case AFTER: return left.node.nodeType === 3;
	    default: assert(false);
	  }
	};

	Point.prototype.nodeAfter = function() {
	  var right = this.rightNormalized();
	  switch (right.type) {
	    case TEXT: return null;
	    case END: return null;
	    case BEFORE: return right.node;
	    default: assert(false);
	  }
	};
	Point.prototype.elemAfter = function() {
	  var node = this.nodeAfter();
	  return node && node.nodeType === 1 ? node : null;
	};
	Point.prototype.hasTextAfter = function() {
	  // NOTE: this won't handle comment nodes.
	  var right = this.rightNormalized();
	  switch (right.type) {
	    case TEXT: return true;
	    case END: return false;
	    case BEFORE: return right.node.nodeType === 3;
	    default: assert(false);
	  }
	};

	Point.prototype.isWithin = function(elem) {
	  assert(false, 'unimplemented');
	};

	Point.prototype.isEquivalentTo = function(point) {
	  return this.compare(point) === 0;
	};

	/**
	 * Returns a negative number if this point is before the
	 * other point in depth-first dom-traversal order, positive
	 * if it is after, or zero if the two points are equivalent.
	 *
	 * NB that a point at the "start" of a paragraph, a point
	 * "before" its first text node, and a point at offset 0 of
	 * the first text node, are all considered equivalent.
	 */
	Point.prototype.compare = function(point) {
	  Point.check(point);

	  var p1 = this.rightNormalized();
	  var p2 = point.rightNormalized();

	  var relationship = util.compareNodes(p1.node, p2.node);
	  if (relationship == 'before') {
	    return -1;
	  }
	  if (relationship == 'after') {
	    return 1;
	  }
	  if (relationship == 'parent') {
	    return p1.type !== END ? -1 : 1;
	  }
	  if (relationship == 'child') {
	    return p2.type === END ? -1 : 1;
	  }
	  if (relationship == 'same') {
	    if (p1.type === TEXT && p2.type === TEXT) {
	      return p1.offset - p2.offset;
	    } else if (p1.type === TEXT) {
	      return 1;
	    } else if (p2.type === TEXT) {
	      return -1;
	    } else if (p1.type === p2.type) {
	      return 0;
	    } else if (p1.type === BEFORE) {
	      assert(p2.type === END);
	      return -1;
	    } else if (p2.type === BEFORE) {
	      assert(p1.type === END);
	      return 1;
	    } else {
	      assert(false, p1.type, '!=', p2.type);
	    }
	  }

	  assert(false, 'unhandled situation - ', relationship);
	};

	Point.prototype.isInEmptyTextNode = function() {
	  return this.type === TEXT && this.node.length === 0;
	};

	/**
	 * Returns new point out of text nodes, into the gap between them
	 * if possible. If deep in a text node, returns original. If already
	 * a node point, returns self.
	 */
	Point.prototype.nodeNormalized = function(mustLeave) {
	  if (this.type == TEXT) {
	    if (this.offset === 0) {
	      return before(this.node);
	    }
	    if (this.offset === this.node.length) {
	      return after(this.node);
	    }
	    assert(this.offset > 0 && this.offset < this.node.length, this.offset, this.node.data);
	  }

	  return this;
	};

	Point.prototype.copy = function() {
	  var point = new Point(magic);
	  point.type = this.type;
	  point.node = this.node;
	  point.offset = this.offset;
	  return point;
	};


	Point.prototype.setTo = function(point) {
	  this.type = point.type;
	  this.node = point.node;
	  this.offset = point.offset;
	}

	//function rightNormalized0(func) {
	//  return function() {
	//    func(this.rightNormalized());
	//  };
	//}
	//function rightNormalized1(func) {
	//  return function(arg1) {
	//    func(this.rightNormalized(), arg1);
	//  };
	//}
	//
	//function leftNormalized0(func) {
	//  return function() {
	//    func(this.leftNormalized());
	//  };
	//}
	//function leftNormalized1(func) {
	//  return function(arg1) {
	//    func(this.leftNormalized(arg1));
	//  };
	//}

	function checkHasParent(node) {
	  assert(node.parentNode, 'node not attached to a parent', node);
	  return node;
	}

	function checkElem(node) {
	  assert(node.nodeType === 1, 'not an element', node);
	  return node;
	}
	function checkText(node) {
	  assert(node.nodeType === 3, 'not a text node', node);
	  return node;
	}
	function checkNode(node) {
	  assert(node.nodeType === 1 || node.nodeType === 3, 'invalid node', node);
	  return node;
	}
	function checkPoint(obj) {
	  assert(obj instanceof Point, 'object not a Point', obj);
	  return obj;
	}


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var util = __webpack_require__(6);
	var Point = __webpack_require__(2);
	var assert = util.assert;

	module.exports = Range;

	Range.collapsed = function(point) {
	  return new Range(point, point);
	};

	/**
	 * A pair of Points, representing a range.
	 */
	function Range(anchor, focus) {
	  this.anchor = Point.check(anchor);
	  this.focus = Point.check(focus);
	};

	Range.prototype.isCollapsed = function() {
	  return this.anchor.compare(this.focus) === 0;
	};

	/**
	 * Deep-copies the range (copies the underlying points too)
	 */
	Range.prototype.copy = function() {
	  return new Range(this.anchor.copy(), this.focus.copy());
	};

	/**
	 * True if the focus comes after (or is equivalent to) the anchor.
	 */
	Range.prototype.isOrdered = function() {
	  return this.anchor.compare(this.focus) <= 0;
	};

	Range.prototype.orderedCopy = function() {
	  var r = this.copy();
	  r.order();
	  return r;
	};

	Range.prototype.getStart = function() {
	  return this.isOrdered() ? this.anchor : this.focus;
	};

	Range.prototype.getEnd = function() {
	  return this.isOrdered() ? this.focus : this.anchor;
	};

	Range.prototype.order = function() {
	  if (!this.isOrdered()) {
	    var tmp = this.focus;
	    this.focus = this.anchor;
	    this.anchor = tmp;
	  }

	  return this;
	};

	Range.prototype.outwardNormalized = function() {
	  return (this.isOrdered() 
	      ? new Range(this.anchor.leftNormalized(), this.focus.rightNormalized())
	      : new Range(this.focus.leftNormalized(), this.anchor.rightNormalized())
	      );
	};

	Range.prototype.isEquivalentTo = function(other) {
	  return this.anchor.isEquivalentTo(other.anchor) &&
	         this.anchor.isEquivalentTo(other.anchor);
	};

	Range.prototype.isUnorderedEquivalentTo = function(other) {
	  return this.getStart().isEquivalentTo(other.getStart()) &&
	         this.getEnd().isEquivalentTo(other.getEnd());
	};

	/**
	 * Returns a left-to-right iterator (regardless of range's ordering).
	 */
	Range.prototype.iterateRight = function() {
	  return new RightIterator(this.getStart(), this.getEnd());
	};


	var RightIterator = function(start, end) {
	  this.start = start.leftNormalized();
	  this.end = end.rightNormalized();

	  this.point = start.rightNormalized();
	};

	RightIterator.prototype.isAtEnd = function() {
	  var cmp = this.point.compare(this.end);
	  assert(cmp <= 0);

	  return cmp === 0;
	};

	RightIterator.prototype.skipText = function() {
	  if (this.isAtEnd()) {
	    return null;
	  }

	  var original = this.point.leftNormalized();
	  var totalChars = 0;
	  while (!this.isAtEnd()) {
	    if (!this.point.hasTextAfter()) {
	      break;
	    }

	    // start offset within the text node we are entirely or partially skipping.
	    var startOffset;
	    var textNode = this.point.nodeAfter();

	    if (textNode) {
	      startOffset = 0;

	      // assume no comments, etc.
	      // will need to handle them if encountered,
	      // probably by skipping over but not updating count.

	      assert(textNode.nodeType === 3);
	    } else {
	      startOffset = this.point.offset;
	      textNode = this.point.node;
	    }

	    assert(typeof startOffset === 'number');

	    // end offset within the text node we are entirely or partially skipping.
	    var endOffset;
	    var endIsInSameNode = (this.end.type === Point.types.TEXT 
	                        && this.end.node === textNode);

	    endOffset = endIsInSameNode ? this.end.offset : textNode.length;


	    assert(endOffset >= startOffset);

	    totalChars += endOffset - startOffset;

	    if (endOffset === textNode.length) {
	      this.point.moveToAfter(textNode);
	    } else {
	      this.point.moveToText(textNode, endOffset);
	      assert(this.isAtEnd());
	    }
	  }

	  if (totalChars === 0) {
	    return null;
	  }
	  
	  return new FlatTextRange(original, this.point.rightNormalized(), totalChars);
	};

	RightIterator.prototype.enterElement = function() {
	  if (this.isAtEnd()) {
	    return null;
	  }

	  var node = this.point.nodeAfter();
	  if (node && node.nodeType === 1) {
	    this.point.moveToStart(node);
	    return node;
	  }

	  return null;
	};

	RightIterator.prototype.leaveElement = function() {
	  if (this.isAtEnd()) {
	    return null;
	  }

	  var container = this.point.containingElement();
	  assert(container); // not expecting to leave the dom, end point should have been well defined.

	  var after = Point.after(container);
	  if (after.compare(this.end) > 0) {
	    return null;
	  }

	  this.point = after;

	  return container;
	};

	var FlatTextRange = function(start, end, length) {
	  assert(length > 0);
	  this.start = start;
	  this.end = end;
	  this.length = length;
	};

	FlatTextRange.prototype.wrap = function(elem) {
	  this.start = this.start.ensureInsertable(this.start);
	  this.end   = this.end.ensureInsertable(this.end);

	  assert(false); // todo
	};



/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var util = __webpack_require__(6);
	var Editor = __webpack_require__(9);
	var Selection = __webpack_require__(11);
	var InlineDecorator = __webpack_require__(5);

	module.exports = Toolbar;

	/**
	 * Default Toolbar
	 */
	function Toolbar(editor) {
	  var me = this;

	  me.editor = editor;

	  editor.addListener({
	    onSelection: function(selection) {
	      if (!selection.isCollapsed()) {
	        me.elem.style.display = 'block';

	        // Do it in a timeout so it can calculate accurately.
	        setTimeout(function() {
	          var coords = selection.getCoords();
	          console.log(coords);

	          me.elem.style.top = (coords.y + 40) + 'px';
	          me.elem.style.left = (coords.x - me.elem.offsetWidth/2) + 'px';

	          for (idx in me.actions) {
	            var action = me.actions[idx];
	            var isToggled = action.toggleCheck(me.editor);
	            if (isToggled) {
	              action.button.classList.add('qed-button-toggled');
	            } else {
	              action.button.classList.remove('qed-button-toggled');
	            }
	            action.button.onclick = action.toggle(isToggled);
	          }
	        })
	      } else {
	        me.elem.style.display = 'none';
	      }

	      return false;
	    }
	  });

	  // TODO: use dom DSL lib instead of all this boilerplate.
	  me.elem = document.createElement('div');
	  me.elem.className = 'qed-toolbar';

	  me.elem.style.position = 'fixed';
	  // Default width without any buttons
	  me.width = 2;
	  me.elem.style.width = me.width + 'px';
	  me.elem.style.height = '40px';
	  me.elem.style.zIndex = '10';
	  me.elem.style.border = '1px solid silver';
	  me.elem.style.background = 'white';
	  me.elem.style.boxShadow = '0px 3px 15px rgba(0,0,0,0.2)';

	  ul = document.createElement('ul');
	  ul.className = 'qed-toolbar-actions';

	  me.elem.appendChild(ul);

	  me.actions = [];

	  document.body.appendChild(me.elem);
	};

	/*
	 * Add a button to the toolbar
	 * label:    The text to show as a button label
	 * check:    A function that returns true if text nodes in current selection are wrapped in style
	 * callback: A function that takes the editor and result of check, adds style to current selection, or removes the style if check return false
	 */
	Toolbar.prototype.addButton = function(label, check, callback) {
	  var me = this;

	  var buttonWidth = 30;

	  // Create toolbar button
	  var li = document.createElement("li");
	  var newButton = document.createElement("button");
	  var buttonLabel = document.createTextNode(label);
	  newButton.appendChild(buttonLabel);
	  li.appendChild(newButton);

	  // Style it
	  newButton.style.width = buttonWidth + 'px';
	  newButton.style.height = '40px';
	  newButton.className = 'qed-toolbar-button';

	  li.style.float = 'left';

	  // Update toolbar
	  me.width = me.width + buttonWidth;
	  me.elem.style.width = me.width + 'px';

	  // Attach action to button
	  newButton.onclick=function(){
	    callback(me.editor, check(me.editor));
	  };

	  // Attach it to toolbar
	  me.elem.lastChild.appendChild(li);
	  me.actions.push({
	    button: newButton,
	    toggleCheck: check,
	    toggle: function(shouldToggle){
	      return function(){
	        callback(me.editor, shouldToggle);
	      };
	    }
	  });
	};

	/*
	 * Adds generic link button to toolbar with a default behaviour
	 * label: Can specify a custom label, or will use a default
	 */
	Toolbar.prototype.addDefaultLinkButton = function(label) {
	  var me = this;

	  if (!label) {
	    label = 'L';
	  }

	  var linkCheck = function(editor) {
	    var iDec = new InlineDecorator();

	    styles = iDec.getRangeAttributes(editor.selection().getRange());

	    return styles.href && styles.href.length > 0;
	  };

	  var linkCallback = function(editor, toggle) {

	    // Hide buttons
	    me.elem.firstChild.style.display = 'none';

	    // Save selection
	    var range = editor.selection().getRange();

	    // Show textbox
	    var urlTextbox = document.createElement("input");
	    me.elem.appendChild(urlTextbox);
	    urlTextbox.focus();
	    urlTextbox.onkeyup = function(e) {

	      if (e.keyCode === 13) {
	        // Set browsers selection back on what it was before
	        editor.selection().setEndpoints(range.anchor, range.focus);

	        // Add link to selection
	        document.execCommand('createLink', true, urlTextbox.value);

	        // Remove textbox
	        me.elem.removeChild(urlTextbox);

	        // Show buttons
	        me.elem.firstChild.style.display = 'block';

	        return true;
	      }

	      return;
	    };

	    return;
	  };

	  this.addButton(label, linkCheck, linkCallback);
	};



/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var util = __webpack_require__(6);
	var assert = util.assert;

	/**
	 * Inline styles & attributes utility
	 *
	 * wnd - optional arg to override window for testing
	 */
	module.exports = function InlineDecorator(wnd) {
	  if (!wnd) {
	    wnd = window;
	  }

	  var me = this;

	  // TODO: Generalise the Registry class for use here.
	  // Decide if we want to allow extensible attribute definitions,
	  // or extensible element types, or both (kind of an m x n problem).
	  // For now, hard coding the behaviour.
	  // Note: possible way is to abolish any querying - inline attributes
	  // are sourced from the model only (can have some standard extraction
	  // logic for pasting of arbitrary rich text) - and rendering is
	  // registered with the attribute (cf annotation painting in wave editor).
	  var attrParsers = {
	  };

	  /**
	   * Returns a map of attrName -> [list of values] that apply over a given range
	   * in the document.
	   */
	  me.getRangeAttributes = function(range) {
	    assert(range && range.anchor && range.focus);

	    assert(util.isEditable(range.anchor.containingElement()));

	    var attrs = {};
	    for (var k in supportedAttributes) {
	      attrs[k] = [];
	    }

	    // Special case - if our range is collapsed,
	    // then we treat the
	    if (range.isCollapsed()) {
	      accumulate(range.getStart().containingElement());
	      return attrs;
	    }

	    var it = range.iterateRight();

	    // Here, we accumulate styles over all selectable content.
	    // That is, styles for text, and certain element boundaries
	    // like inter-paragraph newlines.
	    while (true) {
	      var el = it.enterElement();
	      if (el) {
	        if (isIgnored(el)) {
	          // jump back out to skip entire element contents.
	          el = it.leaveElement();

	          assert(el); // otherwise end is inside an ignored widget or something??
	        } else if (elementHasSelectableBoundary(el)) {
	          accumulate(el);
	        }

	        continue;
	      }

	      var txt = it.skipText();
	      if (txt) {
	        accumulate(txt.start.containingElement());
	        continue;
	      }

	      var el = it.leaveElement();
	      if (el) {
	        continue;
	      }

	      assert(it.isAtEnd());

	      return attrs;
	    }


	    function accumulate(elem) {
	      var computed = hackComputedStyle(elem, wnd);

	      for (var attr in supportedAttributes) {
	        var val = computed[attr];
	        if (val && attrs[attr].indexOf(val) < 0) {
	          attrs[attr].push(val);
	        } else if (elem[attr] && attrs[attr].indexOf(elem[attr]) < 0) {
	          attrs[attr].push(elem[attr]);
	        }
	      }
	    }

	    function hackComputedStyle(elem) {
	      var computed = util.computedStyle(elem, wnd);

	      // HACK(dan): jsdom doesn't seem to implement this properly for testing afaik
	      // quick hack, good enough for cases tested.
	      if (!computed['font-weight']) {
	        computed = util.shallowCopy(supportedAttributes);
	        if (util.isElemType(elem, 'i')) {
	          computed['font-style'] = 'italic';
	        }
	        if (util.isElemType(elem, 'b')) {
	          computed['font-weight'] = 'bold';
	        }
	      }

	      return computed;
	    }
	  };

	  var supportedAttributes = {     // defaults (unused for now?)
	    'font-weight'      : 'normal',
	    'font-style'       : 'normal',
	    'text-decoration'  : 'none',
	    'color'            : 'inherit',
	    'href'             : null
	  };

	  this.getDefaults = function() {
	    return util.shallowCopy(supportedAttributes);
	  };

	  /**
	   * Returns true if the element has a selectable boundary.
	   * E.g. the conceptual newline betwen paragraphs.
	   *
	   * An inline styling span does not have a selectable boundary.
	   */
	  function elementHasSelectableBoundary(el) {
	    return util.isBlock(el, wnd);
	  }

	  function isIgnored(el) {
	    // Probably some kind of fancy nested widget.
	    // Treat it as a style-inert black box.
	    if (!util.isEditable(el)) {
	      return true;
	    }

	    // Ignore BRs, don't let their state mess with the logic.
	    if (util.isElemType(el, 'br')) {
	      return true;
	    }

	    return false;
	  }

	};


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var assert = exports.assert = function(truth, msg) {
	  if (!truth) {
	    var info = Array.prototype.slice.call(arguments, 1);
	    throw new Error('Assertion failed' + (info.length > 0 ? ': ' + info.join(' ') : '!'));
	  }
	  return truth;
	};


	exports.isVanillaObj = function(x) {
	  return typeof x === 'object' && x.constructor == Object;
	};

	exports.args2array = function(x) {
	  return Array.prototype.slice.call(x);
	};

	exports.shallowCopy = function(obj) {
	  var copy = {};
	  for (var k in obj) {
	    copy[k] = obj[k];
	  }
	  return copy;
	};

	exports.isElement = function(node) {
	  return node.nodeType === 1;
	}

	exports.isOrHasChild = function(elem, maybeChild) {
	  while (maybeChild) {
	    if (maybeChild === elem) {
	      return true;
	    }

	    maybeChild = maybeChild.parentNode;
	  }

	  return false;
	};

	/**
	 * returns the node's parent if the node is its first child
	 */
	exports.isFirstChild = function(node) {
	  return !node.previousSibling && node.parentNode || null;
	};

	/**
	 * returns the node's parent if the node is its last child
	 */
	exports.isLastChild = function(node) {
	  return !node.nextSibling && node.parentNode || null;
	};

	exports.isEditable = function(elem) {
	  // first case is for jsdom
	  while (typeof elem.contentEditable === 'undefined' || elem.contentEditable == 'inherit') {
	    elem = elem.parentNode;
	    if (!elem) {
	      return false;
	    }
	  }

	  return elem.contentEditable == 'true';
	};

	exports.isElemType = function(elem, str) {
	  return elem.tagName.toLowerCase() === str.toLowerCase();
	};

	/**
	 * returns:
	 *   'parent' - if node1 is parent of node2
	 *   'child'  - if node1 is child of node2
	 *   'before' - if node1 is before node2
	 *   'after'  - if node1 is after node2
	 *   'same'   - if node1 is node2
	 *   assertion error - if nodes are not in same tree
	 */
	// TODO: maybe use compareDocumentPosition
	exports.compareNodes = function(node1, node2) {
	  var path1 = nodePath(node1);
	  var path2 = nodePath(node2);

	  assert(path1.length > 0 && path2.length > 0 && path1[0] === path2[0],
	      'Nodes not attached to same tree, incomparable', node1, node2);

	  var currentParent = path1[0];

	  var moreThanEnough = path1.length + path2.length;

	  for (var i = 1; i < moreThanEnough; i++) {
	    var n1 = path1[i];
	    var n2 = path2[i];

	    if (!n1 && !n2) {
	      return 'same';
	    }

	    if (!n1) {
	      return 'parent';
	    }

	    if (!n2) {
	      return 'child';
	    }

	    if (n1 != n2) {
	      for (var n = currentParent.firstChild; n; n = n.nextSibling) {
	        if (n === n1) {
	          return 'before';
	        }
	        if (n === n2) {
	          return 'after';
	        }
	      }
	      assert(false);
	    }

	    assert(n1 === n2);
	    currentParent = n1;
	  };

	  assert(false);
	};

	var nodePath = exports.nodePath = function(node) {
	  assert(node);

	  var path = [];
	  while (node) {
	    path.unshift(node);
	    node = node.parentNode;
	  }

	  return path;
	};

	exports.addClass = function(elem, klass) {
	  elem.className += ' ' + klass;
	};

	exports.removeClass = function(elem, klass) {
	  elem.className = elem.className.replace(new RegExp(' *' + klass + ' *'), ' ');
	};

	// TODO: Get rid of this wnd parameter threading,
	// and make a util class that contains wnd as a member var.
	exports.isBlock = function(elem, wnd) {
	  styles = exports.computedStyle(elem, wnd);
	  return styles.display === 'block' || styles.display === 'list-item';
	};

	/**
	 * wnd - optional arg to override window, for testing. not ideal but meh.
	 */
	exports.computedStyle = function(elem, wnd) {
	  if (!wnd) {
	    wnd = window;
	  }

	  return elem.currentStyle || wnd.getComputedStyle(elem, "");
	};

	exports.removeNode = function(node) {
	  if (!node || ! node.parentNode) {
	    return;
	  }

	  node.parentNode.removeChild(node);
	};

	exports.rateLimited = function(intervalMillis, func) {
	  if (!intervalMillis || intervalMillis < 0) {
	    intervalMillis = 0;
	  }

	  var scheduled = false;
	  var lastScheduled = 0;

	  function run() {
	    scheduled = false;
	    func();
	  }

	  function schedule() {
	    if (scheduled) {
	      return;
	    }

	    scheduled = true;

	    var now = Date.now();
	    var earliest = lastScheduled + intervalMillis;
	    var delay = earliest > now ? earliest - now : 0;

	    lastScheduled = now + delay;

	    setTimeout(run, delay);
	  };

	  return schedule;
	};

	/**
	 * Checks if elem is 'open', i.e. would have non-zero height (a completely empty
	 * paragraph has zero height, unless held 'open' by some text or an element)
	 */
	exports.isOpen = function(elem) {
	  if (elem.textContent.length > 0) {
	    return true;
	  }
	  // Check last child node for <br> tag, which opens the element but doesn't
	  // show in textContent check
	  if (elem.lastChild && elem.lastChild.tagName === "BR") {
	    return true;
	  }

	  return false;

	};

	/**
	 * If elem is not 'open' inserts <br>
	 */
	exports.ensureOpen = function(elem) {
	  if (!this.isOpen(elem)) {
	    elem.appendChild(document.createElement('br'));
	  }
	  return;
	};

	/**
	 * Ensure elem has only one <br> tag.
	 */
	exports.cleanOpenElem = function(elem) {
	  for (i = elem.childNodes.length - 1; i >= 0; i--) {
	    if (elem.childNodes[i].tagName === 'BR') {
	      elem.removeChild(elem.childNodes[i]);
	    }
	  }
	  this.ensureOpen(elem);
	  return;
	};

	/**
	 * Given a point, removes any br tags in the containing element and moves the
	 * point as necessary for any removed nodes.
	 */
	exports.removeBrTags = function(point) {
	  currNode = point.node.parentNode.firstChild;
	  while (currNode != null) {
	    // We remove nodes with BR tag name
	    if (currNode.tagName === 'BR') {
	      // However if we're at the node we're currently pointing to, we need to
	      // move
	      if (currNode.isSameNode(point.node)) {
	        if (currNode.nextSibling == null) {
	          point.moveToEnd(currNode.parentNode);
	        } else {
	          point.moveToBefore(currNode.nextSibling);
	        }
	      }

	      removeThis = currNode;
	      currNode = currNode.nextSibling;
	      removeThis.parentNode.removeChild(removeThis);
	    } else {
	      currNode = currNode.nextSibling;
	    }
	  }

	  return;
	}

	exports.noop = function(){};

	exports.map = function(arr, func) {
	  var result = [];
	  var len = arr.length;
	  for (var i = 0; i < len; i++) {
	    result.push(func(arr[i]));
	  }
	  return result;
	};


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	// Knicking some of the codes from Google wave-protocol
	module.exports.codes = {
	  BACKSPACE: 8,
	  TAB: 9,
	  ENTER: 13,
	  ESC: 27,
	  SPACE: 32,
	  LEFT : 37,
	  UP : 38,
	  RIGHT: 39,
	  DOWN: 40,
	  DELETE: 46
	};

	module.exports.types = {
	  DELETE: 0,
	  INPUT: 1,
	  ENTER: 2,
	  NAVIGATION: 3,
	  NOEFFECT: 4
	}

	// Returns true for a navigation key
	isNavigationKeyCode = function (key) {
	  me = module.exports;
	  return key >= me.codes.LEFT && key <= me.codes.DOWN;
	}

	// Given a keydown event, calculate the type of key that was pressed
	module.exports.computeKeyType = function (e) {
	  keycode = e.which !== null ? e.which : e.keyCode;
	  me = module.exports;

	  // Backspace/Delete
	  if (keycode === me.codes.BACKSPACE || keycode === me.codes.DELETE) {
	    type = me.types.DELETE;
	  // Navigation
	  } else if (isNavigationKeyCode(keycode)) {
	    type = me.types.NAVIGATION;
	  // Enter
	  } else if (keycode === me.codes.ENTER) {
	    type = me.types.ENTER;
	  // Input
	  } else if (e.keyIdentifier.match("^U\+")) {
	    type = me.types.INPUT;
	  // No effect
	  } else {
	    type = me.types.NOEFFECT;
	  }

	  return type;
	};


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var util = __webpack_require__(6);
	var Stem = __webpack_require__(13);

	/**
	 * Stem Tracking Utility.
	 *
	 * A stem is a widget insertion button. It signifies a potential widget.
	 * The tracking utility manages the absolute positioning of these stems,
	 * as well as their addition and removal from the DOM.
	 */

	function StemTracker(editor, onClick) {
	  var me = this;
	  var stems = [];
	  var topLevelTags = ['p', 'h1', 'h2', 'h3', 'div', 'section'];

	  this.editorElem = editor.currentElem();
	  this.containerElem = this.createDom();
	  this.reposition();

	  /** Listen for changes in content and update. */
	  editor.addListener({
	    onContent: function () {
	      updateStems( this.editorElem );
	      return false;
	    },
	  });


	  function updateStems(editorElem){
	    var previousStems = stems;
	    stems = [];

	    /** Loops through all top level elements */
	    var topLevelElems = getTopLevelElems( topLevelTags );
	    for (var i=0; i < topLevelElems.length; i++){
	      var elem = topLevelElems[i];
	      var stem = Stem.getOrCreate( elem, onClick, me.containerElem );
	      stems.push(stem);
	    }

	    /** Removes orphaned stems */
	    for (var i=0; i < previousStems.length; i++){
	      var previousStem = previousStems[i];
	      if (stems.indexOf(previousStem) < 0){
	        previousStem.remove();
	      }
	    }
	  }

	  function getTopLevelElems(tags){
	    var topLevelElems = [];
	    for (var node = me.editorElem.firstChild; node != null; node = node.nextSibling){
	      if (needsStem(node)) {
	        topLevelElems.push( node )
	      }
	    }
	    return topLevelElems;
	  }

	  function needsStem (elem) {
	    if (!canHaveStem(elem)){
	      return false;
	    } else {
	      return elem.textContent === '' && typeof elem.$stem === 'undefined';
	    }
	  }

	  function canHaveStem(elem) {
	    return util.isElement(elem) && util.isBlock(elem) && util.isEditable(elem);
	  }

	}

	/** Creates and Appends DOM for the Stem Tracker */
	StemTracker.prototype.createDom = function() {
	  var containerElem = document.createElement("div");
	  containerElem.className = "stem-tracker-container";
	  this.editorElem.parentNode.insertBefore( containerElem, this.editorElem );
	  return containerElem;
	}

	/** Positions the Stem Tracker's container div in the DOM */
	StemTracker.prototype.reposition = function() {
	  this.containerElem.style.position = 'relative';
	  this.containerElem.style.left = '-30px';
	  this.containerElem.style.top = '0px';
	}

	module.exports = StemTracker;



/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * Event routing utility.
	 *
	 * Event handlers may return true, indicating they handled
	 * an event in which case no further handlers will be called.
	 */
	module.exports = function EventBus() {
	  var me = this;

	  var handlers = {};

	  /**
	   * Add a listener function for the given named event.
	   */
	  me.on = function(name, handler) {
	    if (!handlers[name]) {
	      handlers[name] = [];
	    }

	    if (handlers[name].indexOf(handler) >= 0) {
	      return;
	    }
	    
	    handlers[name].push(handler);
	  };

	  /**
	   * Adds a listener object that handles multiple events.
	   *
	   * The object's own properties will be traversed, looking
	   * for methods starting with "on" - they will all be added
	   * as listeners to their named event (e.g. "onChange" will
	   " receive "change" events)
	   */
	  me.addListener = function(object) {
	    for (var k in object) {
	      (function(k) {
	        if (k.match(/^on./)) {
	          var name = k.substring(2).toLowerCase();
	          me.on(name, function(dummy, data) {
	            return object[k](data);
	          });
	        }
	      })(k);
	    }
	  };

	  /**
	   * Posts an event with an optional data object.
	   */
	  me.post = function(name, data) {
	    var list = handlers[name];
	    if (!list) {
	      return false;
	    }

	    for (var i = 0; i < list.length; i++) {
	      var handled = list[i](name, data);
	      
	      if (typeof handled !== 'boolean') {
	        console.warn('handler return type was not boolean, instead got', 
	          handled, 'for event', name, data);
	      }
	      if (handled) {
	        return true;
	      }
	    }

	    return false;
	  };
	};


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var util = __webpack_require__(6);
	var keycodes = __webpack_require__(7);
	var Point = __webpack_require__(2);

	var assert = util.assert;

	/**
	 * Expands regular DOM events into a richer set of high-level
	 * semantic editing events that are more convenient to consume,
	 * and routes them to the context-appropriate handler.
	 */
	var EventRouter = module.exports = function EventRouter(getRootElem, registry, selection) {
	  var me = this;


	  var scheduleContentChangeNotifier = util.rateLimited(100, function() {
	    registry.defaultHandler().post('content');
	  });

	  var scheduleSelectionChangeNotifier = util.rateLimited(100, function() {
	    registry.defaultHandler().post('selection', selection);
	  });

	  function wrap(func) {
	    func = func || util.noop;

	    return function(e) {
	      if (func(e)) {
	        return true;
	      }

	      return handleEvent(registry.defaultHandler(), e.type, e);
	    };
	  };

	  function decorateKeyEvent(ev, keyType, point) {
	    ev.keyType = keyType;
	    ev.point = point;
	    return ev;
	  }

	  function decorateRangedKeyEvent(ev, keyType, range) {
	    ev.keyType     = keyType;
	    ev.range       = range;
	    ev.keyCategory = keycodes.computeKeyType(ev);
	    return ev;
	  }

	  function isAttached(node) {
	    return util.isOrHasChild(getRootElem(), node);
	  }

	  function handleEvent(handler, name, ev) {
	    var ret = handler.post(name, ev);
	    if (typeof ret !== 'boolean') {
	      console.warn('handler return type was not boolean, instead got', ret,
	          'for event', e);
	    }

	    return !!ret;
	  }

	  function handleCollapsedKeydown(e, point) {
	    var info = getKeyInfo(e.keyCode);
	    var dir = info.dir;

	    if (dir !== 'up') {
	      var currPoint = point.copy();
	      var count = 0;
	      while (true) {
	        if (count++ > 100) {
	          throw new Error("Couldn't resolve bubbling");
	        }
	        var next = bubblers[dir](currPoint);

	        // Loop over the fleet of busses, return true if one of them handles it
	        var fleet = registry.busFleetFor(currPoint.node);

	        for (var bus in fleet) {
	          var handled = handleEvent(fleet[bus], 'key', decorateKeyEvent(e, info.type, currPoint));

	          if (handled) {
	            return handled;
	          }
	        }

	        // If we reach editor node without handling, exit loop and use defaultBus
	        if (!next || !isAttached(next.node)) {
	          break;
	        }

	        currPoint = next;
	      }
	    } else {
	      var node = point.node;
	      var count = 0;
	      while (true) {
	        if (count++ > 100) {
	          throw new Error("Couldn't resolve bubbling");
	        }

	        var next = node.parentNode;
	        next = isAttached(next) ? next : null;

	        var fleet = registry.busFleetFor(node);

	        for (var bus in fleet) {
	          var handled = handleEvent(fleet[bus], 'key', decorateKeyEvent(e, info.type, point));

	          if (handled) {
	            return handled;
	          }
	        }

	        // If we reach editor node without handling, exit loop and use defaultBus
	        if (!isAttached(next)) {
	          break;
	        }

	        node = next;
	      }
	    }

	    // If we are no longer in the loop, we've exhausted handlers except for the
	    // defaultBus
	    var handled = handleEvent(registry.defaultHandler(), 'key',
	      decorateKeyEvent(e, info.type, point));
	    if (!handled) {
	      console.warn("No handlers handled event - handlers need to be fixed to return true");
	      return true;
	    }
	  }

	  function handleRangedKeydown(e, range) {
	    var info = getKeyInfo(e.keyCode);

	    // We just send this directly to default bus as there isn't a specific
	    // element to bubble up on
	    var handled = handleEvent(registry.defaultHandler(), 'rangedkey',
	      decorateRangedKeyEvent(e, info.type, range));
	    if (!handled) {
	      console.warn("No handlers handled rangedKeyDown event - handlers need to be fixed to return true");
	    }

	    return true;
	  }

	  me.handlers = {
	    mousedown: wrap(function(e) {
	      scheduleSelectionChangeNotifier();
	    }),

	    mouseup: wrap(function(e) {
	      scheduleSelectionChangeNotifier();
	    }),

	    keydown: wrap(function(e) {
	      scheduleSelectionChangeNotifier();

	      var range = selection.getRange();
	      if (!range) {
	        e.preventDefault();
	        return true;
	      }

	      if (range.isCollapsed()) {
	        return handleCollapsedKeydown(e, range.focus);
	      } else {
	        return handleRangedKeydown(e, range);
	      }
	    }),

	    keypress: wrap(function(e) {
	      scheduleSelectionChangeNotifier();
	    }),

	    keyup: wrap(function(e) {
	      scheduleSelectionChangeNotifier();
	    }),

	    input: wrap(function(e) {
	      scheduleContentChangeNotifier();
	      scheduleSelectionChangeNotifier();
	      return false;
	    }),

	    focus: wrap(function(e) {
	      scheduleSelectionChangeNotifier();
	    }),
	    blur: wrap(function(e) {
	      scheduleSelectionChangeNotifier();
	    }),
	    compositionstart: wrap(),
	    compositionend: wrap(),
	    DOMSubtreeModified: wrap(function(e) {
	      scheduleContentChangeNotifier();
	    })
	  };

	  // Logical directions (within the dom)
	  var BUBBLE_UP = 'up';
	  var BUBBLE_LEFT = 'left';
	  var BUBBLE_RIGHT = 'right';

	  var KEY_INFO = {};
	  KEY_INFO[keycodes.LEFT] =      keyInfo(BUBBLE_LEFT, 'left');
	  KEY_INFO[keycodes.BACKSPACE] = keyInfo(BUBBLE_LEFT, 'backspace');

	  KEY_INFO[keycodes.RIGHT] =     keyInfo(BUBBLE_RIGHT, 'right');
	  KEY_INFO[keycodes.DELETE] =    keyInfo(BUBBLE_RIGHT, 'delete');

	  ///**
	  // * {point:, next:}
	  // *
	  // * point is in the correct type form (start, before, after, end)
	  // * for applying a directional (left/right) event to its element.
	  // *
	  // * if there is no contextual element to apply a directional event
	  // * to, then the point will be in 'text' form.
	  // *
	  // *
	  // * where elem is the element in question, and
	  // * relation is the point based relation to the element
	  // * next is the next point to try in the bubble sequence.
	  // *
	  // * elem may be null if nothing to do here.
	  // * next may be null if nowhere to go next.
	  // */
	  //function bubbleStep(relation, elem, nextPoint) {
	  //  return {
	  //    relation: relation,
	  //    elem:     elem,
	  //    next:     nextPoint
	  //  };
	  //}

	  var bubblers = {
	    left: bubbleLeft,
	    right: bubbleRight
	  };

	  /**
	   * Alters the given point such that:
	   * - if there is a contextual element to apply a directional (left/right)
	   *   event, then it will be of the form (start, before, after, end) relative
	   *   to that element
	   * - otherwise, it will be in text form.
	   *
	   * returns the next point to investigate in the bubble direction.
	   */
	  function bubbleLeft(point) {
	    var next = EventRouter.bubbleLeft(point);

	    // Don't bubble out of our editing region.
	    if (isTerminal(point.node)) {
	      return null;
	    }

	    return next;
	  }


	  function bubbleRight(point) {
	    var next = EventRouter.bubbleRight(point);

	    // Don't bubble out of our editing region.
	    if (isTerminal(point.node)) {
	      return null;
	    }

	    return next;
	  }


	//  // TODO: bubble back into elements if they are inline, etc.
	//  function xbubbleLeft(point, func) {
	//    var elem;
	//
	//    point = point.leftNormalized();
	//
	//    elem = point.elemStartingAt();
	//    if (elem) {
	//      if (func(point, 'start', elem)) {
	//        return;
	//      }
	//      if (isTerminal(elem)) {
	//        return;
	//      }
	//      return
	//    } else {
	//      elem = point.elemBefore();
	//      if (func(point, 'before', elem)) {
	//        return;
	//      }
	//    }
	//
	//    xxx todo
	//    return bubbleLeft(point
	//  }

	  function isTerminal(elem) {
	    return !util.isEditable(elem.parentNode);
	  }

	  function getKeyInfo(keyCode) {
	    var info = KEY_INFO[keyCode];
	    if (info) {
	      return info;
	    }

	    return KEY_INFO[keyCode] = keyInfo(BUBBLE_UP, 'typing');
	  }

	  function keyInfo(bubbleDirection, keyType) {
	    return {
	      dir: bubbleDirection,
	      type: keyType
	    };
	  }
	};

	// TODO: possibly replace bubble utility functions with range iterators

	/**
	 * Alters the given point such that:
	 * - if there is a contextual element to apply a directional (left/right)
	 *   event, then it will be of the form (start, before, after, end) relative
	 *   to that element
	 * - otherwise, it will be in text form.
	 *
	 * returns the next point to investigate in the bubble direction.
	 */
	EventRouter.bubbleLeft = function bubbleLeft(point) {
	  var elem = point.elemStartingAt();
	  if (elem) {
	    point.moveToStart(elem);
	    return Point.before(elem);
	  }

	  var node = point.nodeBefore();
	  if (!node) {
	    assert(point.offset > 0);
	    return null;
	  }

	  if (node.nodeType === 1) {
	    point.moveToAfter(node);
	  } else {
	    point.moveToTextEnd(node);
	  }

	  // directional bubbling doesn't traverse into nodes, only outwards.
	  return null;
	}


	EventRouter.bubbleRight = function bubbleRight(point) {
	  var elem = point.elemEndingAt();
	  if (elem) {
	    point.moveToEnd(elem);
	    return Point.after(elem);
	  }

	  var node = point.nodeAfter();
	  if (!node) {
	    assert(point.offset > 0);
	    return null;
	  }

	  if (node.nodeType === 1) {
	    point.moveToBefore(node);
	  } else {
	    point.moveToTextStart(node);
	  }

	  // directional bubbling doesn't traverse into nodes, only outwards.
	  return null;
	}




/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var util = __webpack_require__(6);
	var Point = __webpack_require__(2);
	var Range = __webpack_require__(3);

	var assert = util.assert;

	module.exports = Selection;

	/**
	 * Abstraction over the editor selection, exposing
	 * methods in terms of Point objects, and providing
	 * facilities to manipulate, save, restore the
	 * selection, across DOM modifications.
	 */
	function Selection(nativeSelection) {
	  var me = this;

	  var native = me.native = assert(nativeSelection);

	  me.setCaret = function(point) {
	    var pair = Point.check(point).toNodeOffset();

	    native.setBaseAndExtent(pair[0], pair[1], pair[0], pair[1]);
	  };

	  me.setEndpoints = function(anchor, focus) {
	    var anchorPair = Point.check(anchor).toNodeOffset();
	    var focusPair = Point.check(focus).toNodeOffset();

	    native.setBaseAndExtent(anchorPair[0], anchorPair[1], focusPair[0], focusPair[1]);
	  };

	  /** Convenience function - returns true if the selection is collapsed */
	  me.isCollapsed = function() {
	    return me.getRange().isCollapsed();
	  };

	  me.getRange = function() {
	    // TODO: Check for selection within editor and return null if none.
	    if (!native.anchorNode) {
	      return null;
	    }
	    return new Range(
	        Point.fromNodeOffset(native.anchorNode, native.anchorOffset),
	        Point.fromNodeOffset(native.focusNode,  native.focusOffset));
	  };

	  var markers = [
	    document.createElement('span'),
	    document.createElement('span')
	  ];

	  // For debugging.
	  markers[0].setAttribute('data-marker', 'start');
	  markers[1].setAttribute('data-marker', 'end');

	  me.saveToMarkers = function() {
	    me.clearMarkers();

	    var sel = me.getRange();
	    sel.anchor.insert(markers[0]);
	    sel.focus.insert(markers[1]);
	  };

	  me.clearMarkers = function() {
	    util.removeNode(markers[0]);
	    util.removeNode(markers[1]);
	  };

	  me.getCoords = getSelectionCoords;
	};

	// TODO: implement wrapper to abstract browser variants.
	//function NativeSelection(browserSel) {
	//  var sel = window.selection || browserSel;
	//
	//  if (sel.setBaseAndExtent) {
	//    me.setBaseAndExtent = function(anchorNode, anchorOffset, focusNode, focusOffset) {
	//      sel.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
	//    };
	//  } else {
	//    me.setBaseAndExtent = function(anchorNode, anchorOffset, focusNode, focusOffset) {
	//      assert(false, 'not implemented');
	//    };
	//  }
	//
	//};


	// copy pasted from
	// http://stackoverflow.com/questions/6846230/coordinates-of-selected-text-in-browser-page
	// TODO: refactor as needed.
	function getSelectionCoords() {
	  var sel = document.selection, range, rects, rect;
	  var x = 0, y = 0;
	  if (sel) {
	    if (sel.type != "Control") {
	      range = sel.createRange();
	      range.collapse(true);
	      x = range.boundingLeft;
	      y = range.boundingTop;
	    }
	  } else if (window.getSelection) {
	    sel = window.getSelection();
	    if (sel.rangeCount) {
	      range = sel.getRangeAt(0).cloneRange();
	      if (range.getClientRects) {
	        range.collapse(true);
	        rects = range.getClientRects();
	        if (rects.length > 0) {
	          rect = range.getClientRects()[0];
	        }
	        x = rect.left;
	        y = rect.top;
	      }
	      // Fall back to inserting a temporary element
	      if (x == 0 && y == 0) {
	        var span = document.createElement("span");
	        if (span.getClientRects) {
	          // Ensure span has dimensions and position by
	          // adding a zero-width space character
	          span.appendChild( document.createTextNode("\u200b") );
	          range.insertNode(span);
	          rect = span.getClientRects()[0];
	          x = rect.left;
	          y = rect.top;
	          var spanParent = span.parentNode;
	          spanParent.removeChild(span);

	          // Glue any broken text nodes back together
	          spanParent.normalize();
	        }
	      }
	    }
	  }
	  return { x: x, y: y };
	}


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var EventBus = __webpack_require__(9);
	var util = __webpack_require__(6);
	var assert = util.assert;

	var PROP = '$qeh';

	module.exports = function Registry(defaultBus) {
	  var me = this;

	  var tagHandlers = {};

	  me.addNodeHandler = function(elem, handler) {
	    var bus = elem[PROP] || (elem[PROP] = new EventBus());
	    bus.addListener(handler);
	  };


	  me.addTagHandler = function(tagName, handler) {
	    tagName = tagName.toUpperCase();
	    var bus = tagHandlers[tagName] || (tagHandlers[tagName] = new EventBus());
	    bus.addListener(handler);
	  };

	  me.defaultHandler = function() {
	    return defaultBus;
	  };

	  // TODO: extendable handlers by other attributes, whether elem is block or not, etc.
	  me.busFleetFor = function(elem) {
	    var fleet = [];

	    if (elem.nodeType === 3) {
	      if (elem[PROP]) {
	        fleet.push(elem[PROP]);
	      }
	    } else {
	      assert(elem.nodeType === 1);
	      var tag = elem.tagName.toUpperCase();
	      if (elem[PROP]) {
	        fleet.push(elem[PROP]);
	      }
	      if (tagHandlers[tag]) {
	        fleet.push(tagHandlers[tag]);
	      }
	    }

	    return fleet;
	  };
	};


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var util = __webpack_require__(6);

	/***
	 * Stem
	 *
	 * A class that creates and manages the "insert widget here" buttons a.k.a "stems"
	 * that appear beside an empty block level element.
	 */

	 // Define the button height for use across the stem button
	 var buttonDiameter = 30;

	function Stem(blockElem, onClick, containerElem) {
	  util.assert(!blockElem.$stem);

	  this.blockElem = blockElem;
	  this.blockElem.$stem = this;
	  this.containerElem = containerElem;

	  this.stemButton = this.createDom();
	  this.reposition();
	  this.addStyles();

	  // Handle click event
	  this.stemButton.addEventListener( 'click', function(me) {
	    return function(e) {
	      onClick(e, me);
	    };
	  }(this), false);

	}

	/** Static idompotent function to retrive or create a Stem */
	Stem.getOrCreate = function(blockElem, onClick, containerElem) {
	  return blockElem.$stem || new Stem(blockElem, onClick, containerElem);
	}


	/** Remove the stem */
	Stem.prototype.remove = function() {
	  delete this.blockElem.$stem;
	  util.removeNode( this.stemButton );
	}

	/** Reposition the button. */
	Stem.prototype.reposition = function() {
	  var coords = this.blockElem.getBoundingClientRect();
	  var boundingCoords = this.blockElem.parentNode.getBoundingClientRect();
	  var centering = (coords.height / 2) - (buttonDiameter / 2);
	  //var centering = 0;
	  this.stemButton.style.top = (coords.top - boundingCoords.top + centering) + 'px';
	  //this.stemButton.style.top = (coords.top - (this.stemButton.offsetHeight * 4)) + 'px';
	}

	/** Adds a Stem Button to DOM */
	Stem.prototype.createDom = function() {
	  var button = document.createElement("div");
	  button.className = "stem-creator-button";
	  button.innerHTML = "<span class='symbol'>+</span>";
	  this.containerElem.appendChild(button);
	  return button;
	}

	/** Adds Basic styles */
	Stem.prototype.addStyles = function() {
	  this.stemButton.style.background = "#fff";
	  this.stemButton.style.border = "1px solid #ccc";
	  this.stemButton.style.position = "absolute";
	  this.stemButton.style.width = buttonDiameter + "px";
	  this.stemButton.style.height = buttonDiameter + "px";
	  this.stemButton.style['border-radius'] = "100px";
	  this.stemButton.style['line-height'] =  "30px";
	  this.stemButton.style['text-align'] =  "center";
	  this.stemButton.firstElementChild.style.color = '#ccc';
	}

	module.exports = Stem;


/***/ }
/******/ ])