(function() {
  
  var DROPDOWN_HEIGHT = 30;
  var ITEM_HEIGHT = 30;
  var ANIMATION_DURATION = 300;
  
  // The Animation object tracks the dropdown animation.
  function Animation(dropdown) {
    // this._dropdown is the dropdown to animate in.
    this._dropdown = dropdown;
    
    // this._cancelled is true if the animation was terminated (i.e. the
    // browser was resized while it was running.
    this._cancelled = false;
    
    // this._requestingFrame is true if the animation is already running.
    // This is useful for telling if this.reverse() was called mid-animation.
    this._requestingFrame = false;
    
    // this._reversed is true if the animation is going backwards.
    this._reversed = false;
    
    // this._skipTime is non-zero if the animation was reversed before it
    // finished.
    this._skipTime = 0;
    
    // this._startTime is the time when the current animation started.
    this._startTime = 0;
    
    // Event handlers.
    this.onDone = null;
  }
  
  // start begins the animation.
  Animation.prototype.start = function() {
    this._startTime = new Date().getTime();
    this._tick();
  };
  
  // _showFrame presents the user with a given percentage of completion.
  Animation.prototype._showFrame = function(pct) {
    if (pct === 1) {
      this._container.css({height: });
    }
  };
  
  // _tick causes the animation to run another frame.
  Animation.prototype._tick = function() {
    if (this._cancelled) {
      return;
    }
    var elapsed = Math.max(new Date().getTime() - this._startTime, 0);
    var pct = elapsed / ANIMATION_DURATION;
    if (pct > 1) {
      if (this._reversed) {
        this._showFrame(0);
      } else {
        this._showFrame(1);
      }
    }
  };
  
  // A Dropdown generates and controls the elements involved with a dropdown.
  function Dropdown(width, bgcolor) {
    // This information can be changed as elements are modified or selected.
    this._optionNames = [];
    this._selected = 0;
    
    // this._showing is true if the dropdown is showing.
    this._showing = false;
    
    // Event handler for change events.
    this.onChange = null;
    
    // Generate the label and arrow.
    this._label = $('<label></label>');
    this._arrow = $('<div></div>');
    
    // Generate the preview element.
    this._preview = $('<div class="dropdownjs-preview"></div>');
    this._preview.css({width: width, backgroundColor: bgcolor || 'white'});
    var content = $('<div class="dropdownjs-preview-content"></div>');
    content.append([this._label, this._arrow]);
    this._preview.append(content);
    this._preview.click(this._show.bind(this));
    
    // Generate the shielding element.
    this._shielding = $('<div class="dropdownjs-shielding"></div>');
    this._shielding.click(this._hide.bind(this));
    
    // Generate the menu.
    this._menuContainer = $('<div class="dropdownjs-menu-container"></div>');
    this._menu = $('<ul class="dropdownjs-menu"></ul>');
    this._options = $();
    this._menuContainer.append(this._menu);
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
      this._options.add(element);
      this._menu.append(element);
    }
    
    this._optionNames = list.slice();
    this.setSelected(selected || 0);
  };
  
  Dropdown.prototype.setSelected = function(selected) {
    this._label.text(this._optionNames[selected]);
    this._selected = selected;
  };
  
  Dropdown.prototype._hide = function() {
    if (!this._showing) {
      return;
    }
    this._showing = false;
  };
  
  Dropdown.prototype._show = function() {
    if (this._showing) {
      return;
    }
    this._showing = true;
    
    $(document.body).append(this._shielding);
    
  };
  
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