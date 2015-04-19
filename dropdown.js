(function() {
  
  var DEFAULT_BG_COLOR = [1, 1, 1];
  var DEFAULT_DROPDOWN_HEIGHT = 30;
  var DEFAULT_FONT_HEIGHT_RATIO = 18/30;
  var PAGE_MARGIN = 10;
  
  // A Dropdown generates and controls the elements involved with a dropdown.
  function Dropdown(width, bgcolor, height, fontSize) {
    bgcolor = bgcolor || DEFAULT_BG_COLOR;
    
    // This state can be changed later.
    this._optionNames = [];
    this._selected = 0;
    
    this._width = width;
    this._height = height || DEFAULT_DROPDOWN_HEIGHT;
    this._fontSize = fontSize || Math.round(DEFAULT_FONT_HEIGHT_RATIO *
      this._height);
    
    // Event handler for change events.
    this.onChange = null;
    
    // This is used to layout the dropdown.
    this._metrics = null;
    
    // This callback is used while the dropdown is showing.
    this._resizeCallback = this._resize.bind(this);
    
    this._label = $('<label></label>').css({
      height: this._height,
      fontSize: this._fontSize + 'px',
      lineHeight: this._height + 'px'
    });
    var arrow = $('<div class="arrow"></div>').css({
      marginTop: Math.ceil((this._height - 10) / 2),
    });
    this._preview = $('<div class="dropdownjs-preview"></div>').css({
      width: width,
      height: this._height,
      backgroundColor: colorToHTML(bgcolor)
    });
    this._preview.append([this._label, arrow]);
    this._preview.click(this.show.bind(this));
    
    // Generate the shielding element.
    this._shielding = $('<div class="dropdownjs-shielding"></div>');
    this._shielding.click(this.hide.bind(this));
    
    // Generate the menu which will popup.
    this._menuContainer = $('<div class="dropdownjs-menu-container"></div>');
    this._menu = $('<ul class="dropdownjs-menu"></ul>');
    this._options = $();
    this._menuContainer.append(this._menu);
  }
  
  // element returns an HTML element which can be displayed for the dropdown.
  Dropdown.prototype.element = function() {
    return this._preview[0];
  };
  
  // hide closes the dropdown if it was open.
  Dropdown.prototype.hide = function() {
    if (!this.isOpen()) {
      return;
    }
    
    this._metrics = null;
    this._shielding.detach();
    this._menuContainer.detach();
    
    $(window).off('resize', this._resizeCallback);
  };
  
  // isOpen returns true if the dropdown is open.
  Dropdown.prototype.isOpen = function() {
    return this._metrics !== null;
  };
  
  // selected returns the selected index.
  Dropdown.prototype.selected = function() {
    return this._selected;
  };
  
  // setOptions sets a list of options to show.
  Dropdown.prototype.setOptions = function(list, selected) {
    if (this.isOpen()) {
      throw new Error('cannot set options while open');
    }
    
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
      var element = $('<li></li>').css({
        height: this._height,
        lineHeight: this._height + 'px',
        fontSize: this._fontSize + 'px',
        backgroundSize: this._height + 'px ' + this._height + 'px'
      }).text(list[i]);
      this._options = this._options.add(element);
      this._menu.append(element);
      element.click(function(idx) {
        if (this.isOpen()) {
          this.hide();
          this.setSelected(idx);
          if ('function' === typeof this.onChange) {
            this.onChange();
          }
        }
      }.bind(this, i));
    }
    
    this._optionNames = list.slice();
    this.setSelected(selected || 0);
  };
  
  // setSelected selects an index in the dropdown.
  Dropdown.prototype.setSelected = function(selected) {
    if (this._optionNames === 0) {
      return;
    }
    
    this._label.text(this._optionNames[selected]);
    this._selected = selected;
    
    // Change the classes of all the options.
    this._options.removeClass('checked');
    this._options.eq(this._selected).addClass('checked');
  };
  
  // setSelectedValue selects an index in the dropdown given its name.
  Dropdown.prototype.setSelectedValue = function(v) {
    var idx = this._optionNames.indexOf(v);
    if (idx >= 0) {
      this.setSelected(idx);
    }
  };
  
  // show opens the dropdown if it was not already open.
  Dropdown.prototype.show = function() {
    if (this.isOpen() || this._optionNames.length === 0) {
      return;
    }
    
    // Setup the new state.
    this._metrics = new Metrics(this);
    this._menuContainer.css({
      left: this._metrics.left,
      top: this._metrics.top,
      width: this._metrics.width,
      height: this._metrics.viewHeight
    });
    
    // Add the elements to the DOM.
    $(document.body).append(this._shielding);
    $(document.body).append(this._menuContainer);
    
    // Setup resizing events.
    $(window).resize(this._resizeCallback);
  };
  
  // value returns the name of the selected element.
  Dropdown.prototype.value = function() {
    if (this._optionNames.length === 0) {
      return '';
    }
    return this._optionNames[this._selected];
  };
  
  Dropdown.prototype._resize = function() {
    this._metrics.resized();
    this._menuContainer.css({
      left: this._metrics.left,
      top: this._metrics.top,
      width: this._metrics.width,
      height: this._metrics.viewHeight
    });
  };
  
  // Metrics manages the layout of a dropdown menu.
  function Metrics(dropdown) {
    this.dropdown = dropdown;
    
    var itemHeight = dropdown._height;
    
    // Compute the position of the dropdown preview.
    var offset = dropdown._preview.offset();
    offset.bottom = offset.top + dropdown._height;
    
    // Compute the height of the document and the menu content.
    var docHeight = $(document.body).height();
    this.requestedHeight = dropdown._optionNames.length * itemHeight;
    
    // This is the ideal positioning for the dropdown.
    this.down = true;
    this.viewHeight = this.requestedHeight;
    this.scrolls = false;
    
    // Restrict the dropdown's size and possibly change the direction.
    var allowedHeight = docHeight - PAGE_MARGIN - offset.top;
    if (offset.bottom > docHeight-offset.top && allowedHeight < itemHeight*4) {
      this.down = false;
      if (this.requestedHeight > offset.bottom) {
        this.scrolls = true;
        this.viewHeight = offset.bottom - PAGE_MARGIN;
      } else {
        this.viewHeight = this.requestedHeight;
      }
    } else if (offset.top+this.requestedHeight > docHeight-PAGE_MARGIN) {
      this.viewHeight = docHeight - offset.top - PAGE_MARGIN;
      this.scrolls = true;
    } else {
      this.viewHeight = this.requestedHeight;
    }
    
    // Compute the width of the dropdown.
    var extraWidth = scrollbarWidth();
    this.width = dropdown._preview.width() + extraWidth;
    if (this.width + offset.left > $(document.body).width()) {
      offset.left -= extraWidth;
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
    offset.bottom = offset.top + this.dropdown._height;
    
    // Compute the new height.
    if (this.down) {
      this.viewHeight = Math.min(docHeight - offset.top - PAGE_MARGIN,
        this.requestedHeight);
    } else {
      this.viewHeight = Math.min(offset.bottom - PAGE_MARGIN,
        this.requestedHeight);
    }
    this.viewHeight = Math.max(this.viewHeight, this.dropdown._height*2);
    
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
