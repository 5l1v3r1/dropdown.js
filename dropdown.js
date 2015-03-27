(function() {
  
  var DROPDOWN_HEIGHT = 30;
  var ITEM_HEIGHT = 30;
  var ANIMATION_DURATION = 400;
  
  // NAME_FADE_PERCENT represents the fraction of the animation during which
  // the preview fades out and before the menu items start fading in.
  var NAME_FADE_PERCENT = 0.25;
  
  // PAGE_MARGIN is the closest a dropdown menu can get to the edge of the body,
  // measured in pixels.
  var PAGE_MARGIN = 10;
  
  var STATE_CLOSED = 0;
  var STATE_OPENING = 1;
  var STATE_OPEN = 2;
  var STATE_CLOSING = 3;
  
  // The Animation object tracks the dropdown animation.
  function Animation(dropdown) {
    // this._dropdown is the dropdown to animate in or out.
    this._dropdown = dropdown;
    
    // this._cancelled is true if the animation was terminated (i.e. the
    // browser was resized while it was running).
    this._cancelled = false;
    
    // this._requestingFrame is true if the animation is already running.
    // This is useful for telling if this.reverse() was called mid-animation.
    this._requestingFrame = false;
    
    // this._reversed is true if the animation is going backwards.
    this._reversed = false;
    
    // this._startTime is the time when the current animation started.
    this._startTime = 0;
    
    // Event handlers.
    this.onClose = null;
    this.onOpen = null;
  }
  
  Animation.prototype.cancel = function() {
    // Force the current animation to complete.
    this._startTime = 0;
    this._tick();
    this._cancelled = true;
  };
  
  // reverse begins reversing the animation.
  Animation.prototype.reverse = function() {
    // Figure out the time that the animation started. If the animation was
    // reversed while running forwards, part of it gets skipped.
    var sinceStart = new Date().getTime() - this._startTime;
    this._startTime = new Date().getTime();
    if (sinceStart < ANIMATION_DURATION) {
      this._startTime -= ANIMATION_DURATION - sinceStart;
    }
    this._cancelled = false;
    this._reversed = true;
    this._tick();
  };
  
  // start begins the animation.
  Animation.prototype.start = function() {
    this._startTime = new Date().getTime();
    this._tick();
  };
  
  // _requestFrame requests that this._tick() be called after a short delay.
  Animation.prototype._requestFrame = function() {
    // Make sure we have no overlapping frame requests.
    if (this._requestingFrame) {
      return;
    }
    this._requestingFrame = true;
    
    if ('function' === typeof window.requestAnimationFrame) {
      window.requestAnimationFrame(function() {
        this._requestingFrame = false;
        this._tick();
      }.bind(this));
    } else {
      setTimeout(function() {
        this._requestingFrame = false;
        this._tick();
      }.bind(this), 1000/60);
    }
  };
  
  // _showFrame presents the user with a given percentage of completion.
  Animation.prototype._showFrame = function(pct) {
    // Layout the menu container.
    this._showFrameMenu(pct);
    
    // Layout the menu options.
    this._showFrameItems(pct);
    
    // Change the preview opacity.
    this._dropdown._menuPreview.css({
      opacity: Math.max(1-pct/NAME_FADE_PERCENT, 0)
    });
  };
  
  // _showFrameItems lays out the list items.
  Animation.prototype._showFrameItems = function(pct) {
    if (pct === 1) {
      this._dropdown._options.css({
        transform: 'none',
        msTransform: 'none',
        WebkitTransform: 'none',
        opacity: 1
      });
    }
    
    if (pct < NAME_FADE_PERCENT) {
      pct = 0;
    } else {
      pct -= NAME_FADE_PERCENT;
      pct /= (1-NAME_FADE_PERCENT);
    }
    
    // Only bother animating the elements which are visible.
    var count = Math.ceil(this._dropdown._metrics.viewHeight / ITEM_HEIGHT);
    count = Math.min(count, this._dropdown._optionNames.length);
    
    // The delay between each element.
    var pctDuration = 1/(1+(count-1)/2);
    var pctOffset = pctDuration/2;
    for (var i = 0; i < count; ++i) {
      var element = this._dropdown._options.eq(i);
      
      var progress = Math.min(Math.max(pct, 0), pctDuration);
      pct -= pctOffset;
      if (progress === pctDuration) {
        element.css({
          transform: 'none',
          msTransform: 'none',
          WebkitTransform: 'none',
          opacity: 1
        });
      } else {
        progress /= pctDuration;
        var transform;
        if (this._dropdown._metrics.down) {
          transform = 'translateY(-' + (20-progress*20) + 'px)';
        } else {
          transform = 'translateY(' + (20-progress*20) + 'px)';
        }
        element.css({
          transform: transform,
          msTransform: transform,
          WebkitTransform: transform,
          opacity: progress
        });
      }
    }
  }
  
  // _showFrameMenu lays out the menu container.
  Animation.prototype._showFrameMenu = function(pct) {
    var style = {};
    
    // Resize the menu view.
    style.width = (this._dropdown._metrics.width-this._dropdown._width)*pct +
      this._dropdown._width;
    style.height = (this._dropdown._metrics.viewHeight-DROPDOWN_HEIGHT)*pct +
      DROPDOWN_HEIGHT;
    
    // Compute the background color of the menu view.
    var color = [];
    var namePct = Math.min(pct/NAME_FADE_PERCENT, 1);
    for (var i = 0; i < 3; ++i) {
      color[i] = 1 - (1-this._dropdown._bgColor[0])*(1-namePct);
    }
    style.backgroundColor = colorToHTML(color);
    
    // Set the coordinates.
    style.left = this._dropdown._metrics.left;
    if (this._dropdown._metrics.down) {
      style.top = this._dropdown._metrics.top;
    } else {
      var offsetHeight = this._dropdown._metrics.viewHeight - style.height;
      style.top = this._dropdown._metrics.top + offsetHeight;
    }
    
    // Set the glow.
    var shadow = '0px 0px 4px 2px rgba(144, 144, 144, ' + pct/2 + ')';
    style.boxShadow = shadow;
    
    // Show the scrollbar if the animation is done.
    if (pct === 1) {
      style.overflowY = 'auto';
    } else {
      style.overflowY = 'hidden';
    }
    
    this._dropdown._menuContainer.css(style);
  };
  
  // _tick causes the animation to run another frame.
  Animation.prototype._tick = function() {
    if (this._cancelled) {
      return;
    }
    
    var elapsed = Math.max(new Date().getTime() - this._startTime, 0);
    var pct = elapsed / ANIMATION_DURATION;
    if (pct >= 1) {
      if (this._reversed) {
        this._showFrame(0);
        if ('function' !== typeof this.onClose) {
          throw new Error('invalid onClose callback');
        }
        this.onClose();
      } else {
        this._showFrame(1);
        if ('function' !== typeof this.onOpen) {
          throw new Error('invalid onOpen callback');
        }
        this.onOpen();
      }
      return;
    }
    
    if (this._reversed) {
      this._showFrame(1 - pct);
    } else {
      this._showFrame(pct);
    }
    this._requestFrame();
  };
  
  // A Dropdown generates and controls the elements involved with a dropdown.
  function Dropdown(width, bgcolor) {
    // This information can be changed as elements are modified or selected.
    this._optionNames = [];
    this._selected = 0;
    this._width = width;
    this._bgColor = bgcolor || [1, 1, 1];
    
    // Event handler for change events.
    this.onChange = null;
    
    // This state is used while showing the dropdown menu.
    this._state = STATE_CLOSED;
    this._animation = null;
    this._metrics = null;
    
    // This callback is used while the dropdown is showing.
    this._resizeCallback = this._resize.bind(this);
    
    // Generate the preview element to show to the user before they click.
    this._label = $('<label></label>');
    this._arrow = $('<div></div>');
    this._preview = $('<div class="dropdownjs-preview"></div>').css({
      width: width,
      backgroundColor: colorToHTML(this._bgColor)
    });
    var content = $('<div class="dropdownjs-preview-content"></div>');
    content.append([this._label, this._arrow]);
    this._preview.append(content);
    this._preview.click(this._show.bind(this));
    
    // Generate the preview to show and fade out in the dropdown menu itself.
    var menuLabel = $('<label></label>');
    var menuArrow = $('<div></div>');
    this._menuPreview = $('<div class="dropdownjs-preview"></div>');
    this._menuPreview.css({width: width, backgroundColor: bgcolor || 'white'});
    content = $('<div class="dropdownjs-preview-content"></div>');
    content.append([menuLabel, menuArrow]);
    this._menuPreview.append(content);
    
    // Doing this._label.text() will update both labels.
    this._label = this._label.add(menuLabel);
    
    // Generate the shielding element.
    this._shielding = $('<div class="dropdownjs-shielding"></div>');
    this._shielding.click(this._hide.bind(this));
    
    // Generate the menu.
    this._menuContainer = $('<div class="dropdownjs-menu-container"></div>');
    this._menu = $('<ul class="dropdownjs-menu"></ul>');
    this._options = $();
    this._menuContainer.append(this._menu);
    this._menuContainer.append(this._menuPreview);
  }
  
  Dropdown.prototype.element = function() {
    return this._preview[0];
  };
  
  Dropdown.prototype.setOptions = function(list, selected) {
    if (list.length === 0) {
      this._optionNames = [];
      this._selected = 0;
      this._label.text('');
      return;
    }
    
    // Generate list elements.
    this._menu.empty();
    this._options = $();
    for (var i = 0, len = list.length; i < len; ++i) {
      var element = $('<li></li>');
      element.text(list[i]);
      this._options = this._options.add(element);
      this._menu.append(element);
    }
    
    this._optionNames = list.slice();
    this.setSelected(selected || 0);
  };
  
  Dropdown.prototype.setSelected = function(selected) {
    this._label.text(this._optionNames[selected]);
    this._selected = selected;
    
    // Change the classes of all the options.
    this._options.removeClass('checked');
    this._options.eq(this._selected).addClass('checked');
  };
  
  Dropdown.prototype._hide = function() {
    if (this._state !== STATE_OPEN && this._state !== STATE_OPENING) {
      return;
    }
    
    this._state = STATE_CLOSING;
    this._animation.onClose = function() {
      this._state = STATE_CLOSED;
      this._shielding.detach();
      this._menuContainer.detach();
    }.bind(this);
    this._animation.reverse();
    
    $(window).off('resize', this._resizeCallback);
  };
  
  Dropdown.prototype._resize = function() {
    switch (this._state) {
    case STATE_OPENING:
      this._state = STATE_OPEN;
      this._animation.cancel();
    case STATE_OPEN:
      this._metrics.resized();
      this._menuContainer.css({
        left: this._metrics.left,
        top: this._metrics.top,
        width: this._metrics.width,
        height: this._metrics.viewHeight
      });
      break;
    default:
      break;
    }
  };
  
  Dropdown.prototype._show = function() {
    if (this._state !== STATE_CLOSED) {
      return;
    }
    
    // Setup the new state.
    this._state = STATE_OPENING;
    this._metrics = new Metrics(this);
    this._animation = new Animation(this);
    
    this._animation.onOpen = function() {
      this._state = STATE_OPEN;
    }.bind(this);
    
    // Start the animation before adding the elements to the DOM so that they
    // are properly styled when they're displayed.
    this._animation.start();
    
    // Layout the menu preview in the correct place.
    if (this._metrics.down) {
      this._menuPreview.css({top: 0, bottom: 'auto'});
    } else {
      this._menuPreview.css({top: 'auto', bottom: 0});
    }
    
    // Add the elements to the DOM.
    $(document.body).append(this._shielding);
    $(document.body).append(this._menuContainer);
    
    // Setup resizing events.
    $(window).resize(this._resizeCallback);
  };
  
  // Metrics manages the layout of a dropdown menu.
  function Metrics(dropdown) {
    this.dropdown = dropdown;
    
    // Compute the position of the dropdown preview.
    var offset = dropdown._preview.offset();
    offset.bottom = offset.top + DROPDOWN_HEIGHT;
    
    // Compute the height of the document and the menu content.
    var docHeight = $(document.body).height();
    this.requestedHeight = dropdown._optionNames.length * ITEM_HEIGHT;
    
    // Compute the direction, height, and scrollability of the dropdown.
    this.down = true;
    this.viewHeight = this.requestedHeight;
    this.scrolls = false;
    if (offset.top + this.requestedHeight > docHeight - PAGE_MARGIN) {
      if (offset.bottom > docHeight - offset.top) {
        // Go up instead of down. 
        this.down = false;
        if (this.requestedHeight > offset.bottom) {
          this.scrolls = true;
          this.viewHeight = offset.bottom - PAGE_MARGIN;
        } else {
          this.viewHeight = this.requestedHeight - PAGE_MARGIN;
        }
      } else {
        // Go down but scroll
        this.viewHeight = docHeight - offset.top - PAGE_MARGIN;
        this.scrolls = true;
      }
    } else {
      this.viewHeight = this.requestedHeight;
    }
    
    // Compute the width of the dropdown.
    this.width = dropdown._preview.width();
    if (this.scrolls) {
      this.width += scrollbarWidth();
    }
    
    // Compute the coordinates of the dropdown.
    this.left = offset.left;
    if (this.down) {
      this.top = offset.top;
    } else {
      this.top = offset.bottom - this.viewHeight;
    }
  }
  
  Metrics.prototype.resized = function() {
    // Compute the height of the document and the menu content.
    var docHeight = $(document.body).height();
    
    // Compute the position of the dropdown preview.
    var offset = this.dropdown._preview.offset();
    offset.bottom = offset.top + DROPDOWN_HEIGHT;
    
    // Compute the new height.
    if (this.down) {
      this.viewHeight = Math.min(docHeight - offset.top - PAGE_MARGIN,
        this.requestedHeight);
    } else {
      this.viewHeight = Math.min(offset.bottom - PAGE_MARGIN,
        this.requestedHeight);
    }
    this.viewHeight = Math.max(this.viewHeight, ITEM_HEIGHT*2);
    
    // Compute the coordinates of the dropdown.
    this.left = offset.left;
    if (this.down) {
      this.top = offset.top;
    } else {
      this.top = offset.bottom - this.viewHeight;
    }
  };
  
  function colorToHTML(color) {
    return 'rgba(' + Math.floor(color[0]*255) + ', ' +
      Math.floor(color[1]*255) + ', ' + Math.floor(color[2]*255) + ', 1)';
  }
  
  function scrollbarWidth() {
    // Generate a small scrolling element.
    var element = $('<div></div>').css({
      width: 200,
      height: 100,
      overflowY: 'scroll',
      position: 'fixed',
      visibility: 'hidden'
    });
    
    // Generate a tall element to put inside the small one.
    var content = $('<div></div>').css({height: 300, width: '100%'});
    element.append(content);
    
    // Append the small element to the body and measure stuff.
    $(document.body).append(element);
    var result = element.width() - content.width();
    element.remove();
    
    return result;
  }
  
  window.dropdownjs = {
    Dropdown: Dropdown,
    scrollbarWidth: scrollbarWidth
  };
  
})();