/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

(function (scope) {
    'use strict';

    // feature detect for URL constructor
    var hasWorkingUrl = false;
    if (!scope.forceJURL) {
        try {
            var u = new URL('b', 'http://a');
            u.pathname = 'c%20d';
            hasWorkingUrl = u.href === 'http://a/c%20d';
        } catch (e) {
        }
    }

    if (hasWorkingUrl)
        return;

    var relative = Object.create(null);
    relative['ftp'] = 21;
    relative['file'] = 0;
    relative['gopher'] = 70;
    relative['http'] = 80;
    relative['https'] = 443;
    relative['ws'] = 80;
    relative['wss'] = 443;

    var relativePathDotMapping = Object.create(null);
    relativePathDotMapping['%2e'] = '.';
    relativePathDotMapping['.%2e'] = '..';
    relativePathDotMapping['%2e.'] = '..';
    relativePathDotMapping['%2e%2e'] = '..';

    function isRelativeScheme(scheme) {
        return relative[scheme] !== undefined;
    }

    function invalid() {
        clear.call(this);
        this._isInvalid = true;
    }

    function IDNAToASCII(h) {
        if ('' == h) {
            invalid.call(this)
        }
        // XXX
        return h.toLowerCase()
    }

    function percentEscape(c) {
        var unicode = c.charCodeAt(0);
        if (unicode > 0x20 &&
            unicode < 0x7F &&
            // " # < > ? `
            [0x22, 0x23, 0x3C, 0x3E, 0x3F, 0x60].indexOf(unicode) == -1
        ) {
            return c;
        }
        return encodeURIComponent(c);
    }

    function percentEscapeQuery(c) {
        // XXX This actually needs to encode c using encoding and then
        // convert the bytes one-by-one.

        var unicode = c.charCodeAt(0);
        if (unicode > 0x20 &&
            unicode < 0x7F &&
            // " # < > ` (do not escape '?')
            [0x22, 0x23, 0x3C, 0x3E, 0x60].indexOf(unicode) == -1
        ) {
            return c;
        }
        return encodeURIComponent(c);
    }

    var EOF = undefined,
        ALPHA = /[a-zA-Z]/,
        ALPHANUMERIC = /[a-zA-Z0-9\+\-\.]/;

    function parse(input, stateOverride, base) {
        function err(message) {
            errors.push(message)
        }

        var state = stateOverride || 'scheme start',
            cursor = 0,
            buffer = '',
            seenAt = false,
            seenBracket = false,
            errors = [];

        loop: while ((input[cursor - 1] != EOF || cursor == 0) && !this._isInvalid) {
            var c = input[cursor];
            switch (state) {
                case 'scheme start':
                    if (c && ALPHA.test(c)) {
                        buffer += c.toLowerCase(); // ASCII-safe
                        state = 'scheme';
                    } else if (!stateOverride) {
                        buffer = '';
                        state = 'no scheme';
                        continue;
                    } else {
                        err('Invalid scheme.');
                        break loop;
                    }
                    break;

                case 'scheme':
                    if (c && ALPHANUMERIC.test(c)) {
                        buffer += c.toLowerCase(); // ASCII-safe
                    } else if (':' == c) {
                        this._scheme = buffer;
                        buffer = '';
                        if (stateOverride) {
                            break loop;
                        }
                        if (isRelativeScheme(this._scheme)) {
                            this._isRelative = true;
                        }
                        if ('file' == this._scheme) {
                            state = 'relative';
                        } else if (this._isRelative && base && base._scheme == this._scheme) {
                            state = 'relative or authority';
                        } else if (this._isRelative) {
                            state = 'authority first slash';
                        } else {
                            state = 'scheme data';
                        }
                    } else if (!stateOverride) {
                        buffer = '';
                        cursor = 0;
                        state = 'no scheme';
                        continue;
                    } else if (EOF == c) {
                        break loop;
                    } else {
                        err('Code point not allowed in scheme: ' + c)
                        break loop;
                    }
                    break;

                case 'scheme data':
                    if ('?' == c) {
                        query = '?';
                        state = 'query';
                    } else if ('#' == c) {
                        this._fragment = '#';
                        state = 'fragment';
                    } else {
                        // XXX error handling
                        if (EOF != c && '\t' != c && '\n' != c && '\r' != c) {
                            this._schemeData += percentEscape(c);
                        }
                    }
                    break;

                case 'no scheme':
                    if (!base || !(isRelativeScheme(base._scheme))) {
                        err('Missing scheme.');
                        invalid.call(this);
                    } else {
                        state = 'relative';
                        continue;
                    }
                    break;

                case 'relative or authority':
                    if ('/' == c && '/' == input[cursor + 1]) {
                        state = 'authority ignore slashes';
                    } else {
                        err('Expected /, got: ' + c);
                        state = 'relative';
                        continue
                    }
                    break;

                case 'relative':
                    this._isRelative = true;
                    if ('file' != this._scheme)
                        this._scheme = base._scheme;
                    if (EOF == c) {
                        this._host = base._host;
                        this._port = base._port;
                        this._path = base._path.slice();
                        this._query = base._query;
                        break loop;
                    } else if ('/' == c || '\\' == c) {
                        if ('\\' == c)
                            err('\\ is an invalid code point.');
                        state = 'relative slash';
                    } else if ('?' == c) {
                        this._host = base._host;
                        this._port = base._port;
                        this._path = base._path.slice();
                        this._query = '?';
                        state = 'query';
                    } else if ('#' == c) {
                        this._host = base._host;
                        this._port = base._port;
                        this._path = base._path.slice();
                        this._query = base._query;
                        this._fragment = '#';
                        state = 'fragment';
                    } else {
                        var nextC = input[cursor + 1]
                        var nextNextC = input[cursor + 2]
                        if (
                            'file' != this._scheme || !ALPHA.test(c) ||
                            (nextC != ':' && nextC != '|') ||
                            (EOF != nextNextC && '/' != nextNextC && '\\' != nextNextC && '?' != nextNextC && '#' != nextNextC)) {
                            this._host = base._host;
                            this._port = base._port;
                            this._path = base._path.slice();
                            this._path.pop();
                        }
                        state = 'relative path';
                        continue;
                    }
                    break;

                case 'relative slash':
                    if ('/' == c || '\\' == c) {
                        if ('\\' == c) {
                            err('\\ is an invalid code point.');
                        }
                        if ('file' == this._scheme) {
                            state = 'file host';
                        } else {
                            state = 'authority ignore slashes';
                        }
                    } else {
                        if ('file' != this._scheme) {
                            this._host = base._host;
                            this._port = base._port;
                        }
                        state = 'relative path';
                        continue;
                    }
                    break;

                case 'authority first slash':
                    if ('/' == c) {
                        state = 'authority second slash';
                    } else {
                        err("Expected '/', got: " + c);
                        state = 'authority ignore slashes';
                        continue;
                    }
                    break;

                case 'authority second slash':
                    state = 'authority ignore slashes';
                    if ('/' != c) {
                        err("Expected '/', got: " + c);
                        continue;
                    }
                    break;

                case 'authority ignore slashes':
                    if ('/' != c && '\\' != c) {
                        state = 'authority';
                        continue;
                    } else {
                        err('Expected authority, got: ' + c);
                    }
                    break;

                case 'authority':
                    if ('@' == c) {
                        if (seenAt) {
                            err('@ already seen.');
                            buffer += '%40';
                        }
                        seenAt = true;
                        for (var i = 0; i < buffer.length; i++) {
                            var cp = buffer[i];
                            if ('\t' == cp || '\n' == cp || '\r' == cp) {
                                err('Invalid whitespace in authority.');
                                continue;
                            }
                            // XXX check URL code points
                            if (':' == cp && null === this._password) {
                                this._password = '';
                                continue;
                            }
                            var tempC = percentEscape(cp);
                            (null !== this._password) ? this._password += tempC : this._username += tempC;
                        }
                        buffer = '';
                    } else if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c) {
                        cursor -= buffer.length;
                        buffer = '';
                        state = 'host';
                        continue;
                    } else {
                        buffer += c;
                    }
                    break;

                case 'file host':
                    if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c) {
                        if (buffer.length == 2 && ALPHA.test(buffer[0]) && (buffer[1] == ':' || buffer[1] == '|')) {
                            state = 'relative path';
                        } else if (buffer.length == 0) {
                            state = 'relative path start';
                        } else {
                            this._host = IDNAToASCII.call(this, buffer);
                            buffer = '';
                            state = 'relative path start';
                        }
                        continue;
                    } else if ('\t' == c || '\n' == c || '\r' == c) {
                        err('Invalid whitespace in file host.');
                    } else {
                        buffer += c;
                    }
                    break;

                case 'host':
                case 'hostname':
                    if (':' == c && !seenBracket) {
                        // XXX host parsing
                        this._host = IDNAToASCII.call(this, buffer);
                        buffer = '';
                        state = 'port';
                        if ('hostname' == stateOverride) {
                            break loop;
                        }
                    } else if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c) {
                        this._host = IDNAToASCII.call(this, buffer);
                        buffer = '';
                        state = 'relative path start';
                        if (stateOverride) {
                            break loop;
                        }
                        continue;
                    } else if ('\t' != c && '\n' != c && '\r' != c) {
                        if ('[' == c) {
                            seenBracket = true;
                        } else if (']' == c) {
                            seenBracket = false;
                        }
                        buffer += c;
                    } else {
                        err('Invalid code point in host/hostname: ' + c);
                    }
                    break;

                case 'port':
                    if (/[0-9]/.test(c)) {
                        buffer += c;
                    } else if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c || stateOverride) {
                        if ('' != buffer) {
                            var temp = parseInt(buffer, 10);
                            if (temp != relative[this._scheme]) {
                                this._port = temp + '';
                            }
                            buffer = '';
                        }
                        if (stateOverride) {
                            break loop;
                        }
                        state = 'relative path start';
                        continue;
                    } else if ('\t' == c || '\n' == c || '\r' == c) {
                        err('Invalid code point in port: ' + c);
                    } else {
                        invalid.call(this);
                    }
                    break;

                case 'relative path start':
                    if ('\\' == c)
                        err("'\\' not allowed in path.");
                    state = 'relative path';
                    if ('/' != c && '\\' != c) {
                        continue;
                    }
                    break;

                case 'relative path':
                    if (EOF == c || '/' == c || '\\' == c || (!stateOverride && ('?' == c || '#' == c))) {
                        if ('\\' == c) {
                            err('\\ not allowed in relative path.');
                        }
                        var tmp;
                        if (tmp = relativePathDotMapping[buffer.toLowerCase()]) {
                            buffer = tmp;
                        }
                        if ('..' == buffer) {
                            this._path.pop();
                            if ('/' != c && '\\' != c) {
                                this._path.push('');
                            }
                        } else if ('.' == buffer && '/' != c && '\\' != c) {
                            this._path.push('');
                        } else if ('.' != buffer) {
                            if ('file' == this._scheme && this._path.length == 0 && buffer.length == 2 && ALPHA.test(buffer[0]) && buffer[1] == '|') {
                                buffer = buffer[0] + ':';
                            }
                            this._path.push(buffer);
                        }
                        buffer = '';
                        if ('?' == c) {
                            this._query = '?';
                            state = 'query';
                        } else if ('#' == c) {
                            this._fragment = '#';
                            state = 'fragment';
                        }
                    } else if ('\t' != c && '\n' != c && '\r' != c) {
                        buffer += percentEscape(c);
                    }
                    break;

                case 'query':
                    if (!stateOverride && '#' == c) {
                        this._fragment = '#';
                        state = 'fragment';
                    } else if (EOF != c && '\t' != c && '\n' != c && '\r' != c) {
                        this._query += percentEscapeQuery(c);
                    }
                    break;

                case 'fragment':
                    if (EOF != c && '\t' != c && '\n' != c && '\r' != c) {
                        this._fragment += c;
                    }
                    break;
            }

            cursor++;
        }
    }

    function clear() {
        this._scheme = '';
        this._schemeData = '';
        this._username = '';
        this._password = null;
        this._host = '';
        this._port = '';
        this._path = [];
        this._query = '';
        this._fragment = '';
        this._isInvalid = false;
        this._isRelative = false;
    }

    // Does not process domain names or IP addresses.
    // Does not handle encoding for the query parameter.
    function jURL(url, base /* , encoding */) {
        if (base !== undefined && !(base instanceof jURL))
            base = new jURL(String(base));

        this._url = url;
        clear.call(this);

        var input = url.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, '');
        // encoding = encoding || 'utf-8'

        parse.call(this, input, null, base);
    }

    jURL.prototype = {
        get href() {
            if (this._isInvalid)
                return this._url;

            var authority = '';
            if ('' != this._username || null != this._password) {
                authority = this._username +
                    (null != this._password ? ':' + this._password : '') + '@';
            }

            return this.protocol +
                (this._isRelative ? '//' + authority + this.host : '') +
                this.pathname + this._query + this._fragment;
        },
        set href(href) {
            clear.call(this);
            parse.call(this, href);
        },

        get protocol() {
            return this._scheme + ':';
        },
        set protocol(protocol) {
            if (this._isInvalid)
                return;
            parse.call(this, protocol + ':', 'scheme start');
        },

        get host() {
            return this._isInvalid ? '' : this._port ?
                this._host + ':' + this._port : this._host;
        },
        set host(host) {
            if (this._isInvalid || !this._isRelative)
                return;
            parse.call(this, host, 'host');
        },

        get hostname() {
            return this._host;
        },
        set hostname(hostname) {
            if (this._isInvalid || !this._isRelative)
                return;
            parse.call(this, hostname, 'hostname');
        },

        get port() {
            return this._port;
        },
        set port(port) {
            if (this._isInvalid || !this._isRelative)
                return;
            parse.call(this, port, 'port');
        },

        get pathname() {
            return this._isInvalid ? '' : this._isRelative ?
                '/' + this._path.join('/') : this._schemeData;
        },
        set pathname(pathname) {
            if (this._isInvalid || !this._isRelative)
                return;
            this._path = [];
            parse.call(this, pathname, 'relative path start');
        },

        get search() {
            return this._isInvalid || !this._query || '?' == this._query ?
                '' : this._query;
        },
        set search(search) {
            if (this._isInvalid || !this._isRelative)
                return;
            this._query = '?';
            if ('?' == search[0])
                search = search.slice(1);
            parse.call(this, search, 'query');
        },

        get hash() {
            return this._isInvalid || !this._fragment || '#' == this._fragment ?
                '' : this._fragment;
        },
        set hash(hash) {
            if (this._isInvalid)
                return;
            this._fragment = '#';
            if ('#' == hash[0])
                hash = hash.slice(1);
            parse.call(this, hash, 'fragment');
        },

        get origin() {
            var host;
            if (this._isInvalid || !this._scheme) {
                return '';
            }
            // javascript: Gecko returns String(""), WebKit/Blink String("null")
            // Gecko throws error for "data://"
            // data: Gecko returns "", Blink returns "data://", WebKit returns "null"
            // Gecko returns String("") for file: mailto:
            // WebKit/Blink returns String("SCHEME://") for file: mailto:
            switch (this._scheme) {
                case 'data':
                case 'file':
                case 'javascript':
                case 'mailto':
                    return 'null';
            }
            host = this.host;
            if (!host) {
                return '';
            }
            return this._scheme + '://' + host;
        }
    };

    // Copy over the static methods
    var OriginalURL = scope.URL;
    if (OriginalURL) {
        jURL.createObjectURL = function (blob) {
            // IE extension allows a second optional options argument.
            // http://msdn.microsoft.com/en-us/library/ie/hh772302(v=vs.85).aspx
            return OriginalURL.createObjectURL.apply(OriginalURL, arguments);
        };
        jURL.revokeObjectURL = function (url) {
            OriginalURL.revokeObjectURL(url);
        };
    }

    scope.URL = jURL;

})(this);

/*!
 * Bootstrap v3.4.1 (https://getbootstrap.com/)
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under the MIT license
 */

if (typeof jQuery === 'undefined') {
  throw new Error('Bootstrap\'s JavaScript requires jQuery')
}

+function ($) {
  'use strict';
  var version = $.fn.jquery.split(' ')[0].split('.')
  if ((version[0] < 2 && version[1] < 9) || (version[0] == 1 && version[1] == 9 && version[2] < 1) || (version[0] > 3)) {
    throw new Error('Bootstrap\'s JavaScript requires jQuery version 1.9.1 or higher, but lower than version 4')
  }
}(jQuery);

/* ========================================================================
 * Bootstrap: transition.js v3.4.1
 * https://getbootstrap.com/docs/3.4/javascript/#transitions
 * ========================================================================
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // CSS TRANSITION SUPPORT (Shoutout: https://modernizr.com/)
  // ============================================================

  function transitionEnd() {
    var el = document.createElement('bootstrap')

    var transEndEventNames = {
      WebkitTransition : 'webkitTransitionEnd',
      MozTransition    : 'transitionend',
      OTransition      : 'oTransitionEnd otransitionend',
      transition       : 'transitionend'
    }

    for (var name in transEndEventNames) {
      if (el.style[name] !== undefined) {
        return { end: transEndEventNames[name] }
      }
    }

    return false // explicit for ie8 (  ._.)
  }

  // https://blog.alexmaccaw.com/css-transitions
  $.fn.emulateTransitionEnd = function (duration) {
    var called = false
    var $el = this
    $(this).one('bsTransitionEnd', function () { called = true })
    var callback = function () { if (!called) $($el).trigger($.support.transition.end) }
    setTimeout(callback, duration)
    return this
  }

  $(function () {
    $.support.transition = transitionEnd()

    if (!$.support.transition) return

    $.event.special.bsTransitionEnd = {
      bindType: $.support.transition.end,
      delegateType: $.support.transition.end,
      handle: function (e) {
        if ($(e.target).is(this)) return e.handleObj.handler.apply(this, arguments)
      }
    }
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: alert.js v3.4.1
 * https://getbootstrap.com/docs/3.4/javascript/#alerts
 * ========================================================================
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // ALERT CLASS DEFINITION
  // ======================

  var dismiss = '[data-dismiss="alert"]'
  var Alert   = function (el) {
    $(el).on('click', dismiss, this.close)
  }

  Alert.VERSION = '3.4.1'

  Alert.TRANSITION_DURATION = 150

  Alert.prototype.close = function (e) {
    var $this    = $(this)
    var selector = $this.attr('data-target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
    }

    selector    = selector === '#' ? [] : selector
    var $parent = $(document).find(selector)

    if (e) e.preventDefault()

    if (!$parent.length) {
      $parent = $this.closest('.alert')
    }

    $parent.trigger(e = $.Event('close.bs.alert'))

    if (e.isDefaultPrevented()) return

    $parent.removeClass('in')

    function removeElement() {
      // detach from parent, fire event then clean up data
      $parent.detach().trigger('closed.bs.alert').remove()
    }

    $.support.transition && $parent.hasClass('fade') ?
      $parent
        .one('bsTransitionEnd', removeElement)
        .emulateTransitionEnd(Alert.TRANSITION_DURATION) :
      removeElement()
  }


  // ALERT PLUGIN DEFINITION
  // =======================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.alert')

      if (!data) $this.data('bs.alert', (data = new Alert(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  var old = $.fn.alert

  $.fn.alert             = Plugin
  $.fn.alert.Constructor = Alert


  // ALERT NO CONFLICT
  // =================

  $.fn.alert.noConflict = function () {
    $.fn.alert = old
    return this
  }


  // ALERT DATA-API
  // ==============

  $(document).on('click.bs.alert.data-api', dismiss, Alert.prototype.close)

}(jQuery);

/* ========================================================================
 * Bootstrap: button.js v3.4.1
 * https://getbootstrap.com/docs/3.4/javascript/#buttons
 * ========================================================================
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // BUTTON PUBLIC CLASS DEFINITION
  // ==============================

  var Button = function (element, options) {
    this.$element  = $(element)
    this.options   = $.extend({}, Button.DEFAULTS, options)
    this.isLoading = false
  }

  Button.VERSION  = '3.4.1'

  Button.DEFAULTS = {
    loadingText: 'loading...'
  }

  Button.prototype.setState = function (state) {
    var d    = 'disabled'
    var $el  = this.$element
    var val  = $el.is('input') ? 'val' : 'html'
    var data = $el.data()

    state += 'Text'

    if (data.resetText == null) $el.data('resetText', $el[val]())

    // push to event loop to allow forms to submit
    setTimeout($.proxy(function () {
      $el[val](data[state] == null ? this.options[state] : data[state])

      if (state == 'loadingText') {
        this.isLoading = true
        $el.addClass(d).attr(d, d).prop(d, true)
      } else if (this.isLoading) {
        this.isLoading = false
        $el.removeClass(d).removeAttr(d).prop(d, false)
      }
    }, this), 0)
  }

  Button.prototype.toggle = function () {
    var changed = true
    var $parent = this.$element.closest('[data-toggle="buttons"]')

    if ($parent.length) {
      var $input = this.$element.find('input')
      if ($input.prop('type') == 'radio') {
        if ($input.prop('checked')) changed = false
        $parent.find('.active').removeClass('active')
        this.$element.addClass('active')
      } else if ($input.prop('type') == 'checkbox') {
        if (($input.prop('checked')) !== this.$element.hasClass('active')) changed = false
        this.$element.toggleClass('active')
      }
      $input.prop('checked', this.$element.hasClass('active'))
      if (changed) $input.trigger('change')
    } else {
      this.$element.attr('aria-pressed', !this.$element.hasClass('active'))
      this.$element.toggleClass('active')
    }
  }


  // BUTTON PLUGIN DEFINITION
  // ========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.button')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.button', (data = new Button(this, options)))

      if (option == 'toggle') data.toggle()
      else if (option) data.setState(option)
    })
  }

  var old = $.fn.button

  $.fn.button             = Plugin
  $.fn.button.Constructor = Button


  // BUTTON NO CONFLICT
  // ==================

  $.fn.button.noConflict = function () {
    $.fn.button = old
    return this
  }


  // BUTTON DATA-API
  // ===============

  $(document)
    .on('click.bs.button.data-api', '[data-toggle^="button"]', function (e) {
      var $btn = $(e.target).closest('.btn')
      Plugin.call($btn, 'toggle')
      if (!($(e.target).is('input[type="radio"], input[type="checkbox"]'))) {
        // Prevent double click on radios, and the double selections (so cancellation) on checkboxes
        e.preventDefault()
        // The target component still receive the focus
        if ($btn.is('input,button')) $btn.trigger('focus')
        else $btn.find('input:visible,button:visible').first().trigger('focus')
      }
    })
    .on('focus.bs.button.data-api blur.bs.button.data-api', '[data-toggle^="button"]', function (e) {
      $(e.target).closest('.btn').toggleClass('focus', /^focus(in)?$/.test(e.type))
    })

}(jQuery);

/* ========================================================================
 * Bootstrap: carousel.js v3.4.1
 * https://getbootstrap.com/docs/3.4/javascript/#carousel
 * ========================================================================
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // CAROUSEL CLASS DEFINITION
  // =========================

  var Carousel = function (element, options) {
    this.$element    = $(element)
    this.$indicators = this.$element.find('.carousel-indicators')
    this.options     = options
    this.paused      = null
    this.sliding     = null
    this.interval    = null
    this.$active     = null
    this.$items      = null

    this.options.keyboard && this.$element.on('keydown.bs.carousel', $.proxy(this.keydown, this))

    this.options.pause == 'hover' && !('ontouchstart' in document.documentElement) && this.$element
      .on('mouseenter.bs.carousel', $.proxy(this.pause, this))
      .on('mouseleave.bs.carousel', $.proxy(this.cycle, this))
  }

  Carousel.VERSION  = '3.4.1'

  Carousel.TRANSITION_DURATION = 600

  Carousel.DEFAULTS = {
    interval: 5000,
    pause: 'hover',
    wrap: true,
    keyboard: true
  }

  Carousel.prototype.keydown = function (e) {
    if (/input|textarea/i.test(e.target.tagName)) return
    switch (e.which) {
      case 37: this.prev(); break
      case 39: this.next(); break
      default: return
    }

    e.preventDefault()
  }

  Carousel.prototype.cycle = function (e) {
    e || (this.paused = false)

    this.interval && clearInterval(this.interval)

    this.options.interval
      && !this.paused
      && (this.interval = setInterval($.proxy(this.next, this), this.options.interval))

    return this
  }

  Carousel.prototype.getItemIndex = function (item) {
    this.$items = item.parent().children('.item')
    return this.$items.index(item || this.$active)
  }

  Carousel.prototype.getItemForDirection = function (direction, active) {
    var activeIndex = this.getItemIndex(active)
    var willWrap = (direction == 'prev' && activeIndex === 0)
                || (direction == 'next' && activeIndex == (this.$items.length - 1))
    if (willWrap && !this.options.wrap) return active
    var delta = direction == 'prev' ? -1 : 1
    var itemIndex = (activeIndex + delta) % this.$items.length
    return this.$items.eq(itemIndex)
  }

  Carousel.prototype.to = function (pos) {
    var that        = this
    var activeIndex = this.getItemIndex(this.$active = this.$element.find('.item.active'))

    if (pos > (this.$items.length - 1) || pos < 0) return

    if (this.sliding)       return this.$element.one('slid.bs.carousel', function () { that.to(pos) }) // yes, "slid"
    if (activeIndex == pos) return this.pause().cycle()

    return this.slide(pos > activeIndex ? 'next' : 'prev', this.$items.eq(pos))
  }

  Carousel.prototype.pause = function (e) {
    e || (this.paused = true)

    if (this.$element.find('.next, .prev').length && $.support.transition) {
      this.$element.trigger($.support.transition.end)
      this.cycle(true)
    }

    this.interval = clearInterval(this.interval)

    return this
  }

  Carousel.prototype.next = function () {
    if (this.sliding) return
    return this.slide('next')
  }

  Carousel.prototype.prev = function () {
    if (this.sliding) return
    return this.slide('prev')
  }

  Carousel.prototype.slide = function (type, next) {
    var $active   = this.$element.find('.item.active')
    var $next     = next || this.getItemForDirection(type, $active)
    var isCycling = this.interval
    var direction = type == 'next' ? 'left' : 'right'
    var that      = this

    if ($next.hasClass('active')) return (this.sliding = false)

    var relatedTarget = $next[0]
    var slideEvent = $.Event('slide.bs.carousel', {
      relatedTarget: relatedTarget,
      direction: direction
    })
    this.$element.trigger(slideEvent)
    if (slideEvent.isDefaultPrevented()) return

    this.sliding = true

    isCycling && this.pause()

    if (this.$indicators.length) {
      this.$indicators.find('.active').removeClass('active')
      var $nextIndicator = $(this.$indicators.children()[this.getItemIndex($next)])
      $nextIndicator && $nextIndicator.addClass('active')
    }

    var slidEvent = $.Event('slid.bs.carousel', { relatedTarget: relatedTarget, direction: direction }) // yes, "slid"
    if ($.support.transition && this.$element.hasClass('slide')) {
      $next.addClass(type)
      if (typeof $next === 'object' && $next.length) {
        $next[0].offsetWidth // force reflow
      }
      $active.addClass(direction)
      $next.addClass(direction)
      $active
        .one('bsTransitionEnd', function () {
          $next.removeClass([type, direction].join(' ')).addClass('active')
          $active.removeClass(['active', direction].join(' '))
          that.sliding = false
          setTimeout(function () {
            that.$element.trigger(slidEvent)
          }, 0)
        })
        .emulateTransitionEnd(Carousel.TRANSITION_DURATION)
    } else {
      $active.removeClass('active')
      $next.addClass('active')
      this.sliding = false
      this.$element.trigger(slidEvent)
    }

    isCycling && this.cycle()

    return this
  }


  // CAROUSEL PLUGIN DEFINITION
  // ==========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.carousel')
      var options = $.extend({}, Carousel.DEFAULTS, $this.data(), typeof option == 'object' && option)
      var action  = typeof option == 'string' ? option : options.slide

      if (!data) $this.data('bs.carousel', (data = new Carousel(this, options)))
      if (typeof option == 'number') data.to(option)
      else if (action) data[action]()
      else if (options.interval) data.pause().cycle()
    })
  }

  var old = $.fn.carousel

  $.fn.carousel             = Plugin
  $.fn.carousel.Constructor = Carousel


  // CAROUSEL NO CONFLICT
  // ====================

  $.fn.carousel.noConflict = function () {
    $.fn.carousel = old
    return this
  }


  // CAROUSEL DATA-API
  // =================

  var clickHandler = function (e) {
    var $this   = $(this)
    var href    = $this.attr('href')
    if (href) {
      href = href.replace(/.*(?=#[^\s]+$)/, '') // strip for ie7
    }

    var target  = $this.attr('data-target') || href
    var $target = $(document).find(target)

    if (!$target.hasClass('carousel')) return

    var options = $.extend({}, $target.data(), $this.data())
    var slideIndex = $this.attr('data-slide-to')
    if (slideIndex) options.interval = false

    Plugin.call($target, options)

    if (slideIndex) {
      $target.data('bs.carousel').to(slideIndex)
    }

    e.preventDefault()
  }

  $(document)
    .on('click.bs.carousel.data-api', '[data-slide]', clickHandler)
    .on('click.bs.carousel.data-api', '[data-slide-to]', clickHandler)

  $(window).on('load', function () {
    $('[data-ride="carousel"]').each(function () {
      var $carousel = $(this)
      Plugin.call($carousel, $carousel.data())
    })
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: collapse.js v3.4.1
 * https://getbootstrap.com/docs/3.4/javascript/#collapse
 * ========================================================================
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

/* jshint latedef: false */

+function ($) {
  'use strict';

  // COLLAPSE PUBLIC CLASS DEFINITION
  // ================================

  var Collapse = function (element, options) {
    this.$element      = $(element)
    this.options       = $.extend({}, Collapse.DEFAULTS, options)
    this.$trigger      = $('[data-toggle="collapse"][href="#' + element.id + '"],' +
                           '[data-toggle="collapse"][data-target="#' + element.id + '"]')
    this.transitioning = null

    if (this.options.parent) {
      this.$parent = this.getParent()
    } else {
      this.addAriaAndCollapsedClass(this.$element, this.$trigger)
    }

    if (this.options.toggle) this.toggle()
  }

  Collapse.VERSION  = '3.4.1'

  Collapse.TRANSITION_DURATION = 350

  Collapse.DEFAULTS = {
    toggle: true
  }

  Collapse.prototype.dimension = function () {
    var hasWidth = this.$element.hasClass('width')
    return hasWidth ? 'width' : 'height'
  }

  Collapse.prototype.show = function () {
    if (this.transitioning || this.$element.hasClass('in')) return

    var activesData
    var actives = this.$parent && this.$parent.children('.panel').children('.in, .collapsing')

    if (actives && actives.length) {
      activesData = actives.data('bs.collapse')
      if (activesData && activesData.transitioning) return
    }

    var startEvent = $.Event('show.bs.collapse')
    this.$element.trigger(startEvent)
    if (startEvent.isDefaultPrevented()) return

    if (actives && actives.length) {
      Plugin.call(actives, 'hide')
      activesData || actives.data('bs.collapse', null)
    }

    var dimension = this.dimension()

    this.$element
      .removeClass('collapse')
      .addClass('collapsing')[dimension](0)
      .attr('aria-expanded', true)

    this.$trigger
      .removeClass('collapsed')
      .attr('aria-expanded', true)

    this.transitioning = 1

    var complete = function () {
      this.$element
        .removeClass('collapsing')
        .addClass('collapse in')[dimension]('')
      this.transitioning = 0
      this.$element
        .trigger('shown.bs.collapse')
    }

    if (!$.support.transition) return complete.call(this)

    var scrollSize = $.camelCase(['scroll', dimension].join('-'))

    this.$element
      .one('bsTransitionEnd', $.proxy(complete, this))
      .emulateTransitionEnd(Collapse.TRANSITION_DURATION)[dimension](this.$element[0][scrollSize])
  }

  Collapse.prototype.hide = function () {
    if (this.transitioning || !this.$element.hasClass('in')) return

    var startEvent = $.Event('hide.bs.collapse')
    this.$element.trigger(startEvent)
    if (startEvent.isDefaultPrevented()) return

    var dimension = this.dimension()

    this.$element[dimension](this.$element[dimension]())[0].offsetHeight

    this.$element
      .addClass('collapsing')
      .removeClass('collapse in')
      .attr('aria-expanded', false)

    this.$trigger
      .addClass('collapsed')
      .attr('aria-expanded', false)

    this.transitioning = 1

    var complete = function () {
      this.transitioning = 0
      this.$element
        .removeClass('collapsing')
        .addClass('collapse')
        .trigger('hidden.bs.collapse')
    }

    if (!$.support.transition) return complete.call(this)

    this.$element
      [dimension](0)
      .one('bsTransitionEnd', $.proxy(complete, this))
      .emulateTransitionEnd(Collapse.TRANSITION_DURATION)
  }

  Collapse.prototype.toggle = function () {
    this[this.$element.hasClass('in') ? 'hide' : 'show']()
  }

  Collapse.prototype.getParent = function () {
    return $(document).find(this.options.parent)
      .find('[data-toggle="collapse"][data-parent="' + this.options.parent + '"]')
      .each($.proxy(function (i, element) {
        var $element = $(element)
        this.addAriaAndCollapsedClass(getTargetFromTrigger($element), $element)
      }, this))
      .end()
  }

  Collapse.prototype.addAriaAndCollapsedClass = function ($element, $trigger) {
    var isOpen = $element.hasClass('in')

    $element.attr('aria-expanded', isOpen)
    $trigger
      .toggleClass('collapsed', !isOpen)
      .attr('aria-expanded', isOpen)
  }

  function getTargetFromTrigger($trigger) {
    var href
    var target = $trigger.attr('data-target')
      || (href = $trigger.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '') // strip for ie7

    return $(document).find(target)
  }


  // COLLAPSE PLUGIN DEFINITION
  // ==========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.collapse')
      var options = $.extend({}, Collapse.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data && options.toggle && /show|hide/.test(option)) options.toggle = false
      if (!data) $this.data('bs.collapse', (data = new Collapse(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.collapse

  $.fn.collapse             = Plugin
  $.fn.collapse.Constructor = Collapse


  // COLLAPSE NO CONFLICT
  // ====================

  $.fn.collapse.noConflict = function () {
    $.fn.collapse = old
    return this
  }


  // COLLAPSE DATA-API
  // =================

  $(document).on('click.bs.collapse.data-api', '[data-toggle="collapse"]', function (e) {
    var $this   = $(this)

    if (!$this.attr('data-target')) e.preventDefault()

    var $target = getTargetFromTrigger($this)
    var data    = $target.data('bs.collapse')
    var option  = data ? 'toggle' : $this.data()

    Plugin.call($target, option)
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: dropdown.js v3.4.1
 * https://getbootstrap.com/docs/3.4/javascript/#dropdowns
 * ========================================================================
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // DROPDOWN CLASS DEFINITION
  // =========================

  var backdrop = '.dropdown-backdrop'
  var toggle   = '[data-toggle="dropdown"]'
  var Dropdown = function (element) {
    $(element).on('click.bs.dropdown', this.toggle)
  }

  Dropdown.VERSION = '3.4.1'

  function getParent($this) {
    var selector = $this.attr('data-target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
    }

    var $parent = selector !== '#' ? $(document).find(selector) : null

    return $parent && $parent.length ? $parent : $this.parent()
  }

  function clearMenus(e) {
    if (e && e.which === 3) return
    $(backdrop).remove()
    $(toggle).each(function () {
      var $this         = $(this)
      var $parent       = getParent($this)
      var relatedTarget = { relatedTarget: this }

      if (!$parent.hasClass('open')) return

      if (e && e.type == 'click' && /input|textarea/i.test(e.target.tagName) && $.contains($parent[0], e.target)) return

      $parent.trigger(e = $.Event('hide.bs.dropdown', relatedTarget))

      if (e.isDefaultPrevented()) return

      $this.attr('aria-expanded', 'false')
      $parent.removeClass('open').trigger($.Event('hidden.bs.dropdown', relatedTarget))
    })
  }

  Dropdown.prototype.toggle = function (e) {
    var $this = $(this)

    if ($this.is('.disabled, :disabled')) return

    var $parent  = getParent($this)
    var isActive = $parent.hasClass('open')

    clearMenus()

    if (!isActive) {
      if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
        // if mobile we use a backdrop because click events don't delegate
        $(document.createElement('div'))
          .addClass('dropdown-backdrop')
          .insertAfter($(this))
          .on('click', clearMenus)
      }

      var relatedTarget = { relatedTarget: this }
      $parent.trigger(e = $.Event('show.bs.dropdown', relatedTarget))

      if (e.isDefaultPrevented()) return

      $this
        .trigger('focus')
        .attr('aria-expanded', 'true')

      $parent
        .toggleClass('open')
        .trigger($.Event('shown.bs.dropdown', relatedTarget))
    }

    return false
  }

  Dropdown.prototype.keydown = function (e) {
    if (!/(38|40|27|32)/.test(e.which) || /input|textarea/i.test(e.target.tagName)) return

    var $this = $(this)

    e.preventDefault()
    e.stopPropagation()

    if ($this.is('.disabled, :disabled')) return

    var $parent  = getParent($this)
    var isActive = $parent.hasClass('open')

    if (!isActive && e.which != 27 || isActive && e.which == 27) {
      if (e.which == 27) $parent.find(toggle).trigger('focus')
      return $this.trigger('click')
    }

    var desc = ' li:not(.disabled):visible a'
    var $items = $parent.find('.dropdown-menu' + desc)

    if (!$items.length) return

    var index = $items.index(e.target)

    if (e.which == 38 && index > 0)                 index--         // up
    if (e.which == 40 && index < $items.length - 1) index++         // down
    if (!~index)                                    index = 0

    $items.eq(index).trigger('focus')
  }


  // DROPDOWN PLUGIN DEFINITION
  // ==========================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.dropdown')

      if (!data) $this.data('bs.dropdown', (data = new Dropdown(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  var old = $.fn.dropdown

  $.fn.dropdown             = Plugin
  $.fn.dropdown.Constructor = Dropdown


  // DROPDOWN NO CONFLICT
  // ====================

  $.fn.dropdown.noConflict = function () {
    $.fn.dropdown = old
    return this
  }


  // APPLY TO STANDARD DROPDOWN ELEMENTS
  // ===================================

  $(document)
    .on('click.bs.dropdown.data-api', clearMenus)
    .on('click.bs.dropdown.data-api', '.dropdown form', function (e) { e.stopPropagation() })
    .on('click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle)
    .on('keydown.bs.dropdown.data-api', toggle, Dropdown.prototype.keydown)
    .on('keydown.bs.dropdown.data-api', '.dropdown-menu', Dropdown.prototype.keydown)

}(jQuery);

/* ========================================================================
 * Bootstrap: modal.js v3.4.1
 * https://getbootstrap.com/docs/3.4/javascript/#modals
 * ========================================================================
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // MODAL CLASS DEFINITION
  // ======================

  var Modal = function (element, options) {
    this.options = options
    this.$body = $(document.body)
    this.$element = $(element)
    this.$dialog = this.$element.find('.modal-dialog')
    this.$backdrop = null
    this.isShown = null
    this.originalBodyPad = null
    this.scrollbarWidth = 0
    this.ignoreBackdropClick = false
    this.fixedContent = '.navbar-fixed-top, .navbar-fixed-bottom'

    if (this.options.remote) {
      this.$element
        .find('.modal-content')
        .load(this.options.remote, $.proxy(function () {
          this.$element.trigger('loaded.bs.modal')
        }, this))
    }
  }

  Modal.VERSION = '3.4.1'

  Modal.TRANSITION_DURATION = 300
  Modal.BACKDROP_TRANSITION_DURATION = 150

  Modal.DEFAULTS = {
    backdrop: true,
    keyboard: true,
    show: true
  }

  Modal.prototype.toggle = function (_relatedTarget) {
    return this.isShown ? this.hide() : this.show(_relatedTarget)
  }

  Modal.prototype.show = function (_relatedTarget) {
    var that = this
    var e = $.Event('show.bs.modal', { relatedTarget: _relatedTarget })

    this.$element.trigger(e)

    if (this.isShown || e.isDefaultPrevented()) return

    this.isShown = true

    this.checkScrollbar()
    this.setScrollbar()
    this.$body.addClass('modal-open')

    this.escape()
    this.resize()

    this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this))

    this.$dialog.on('mousedown.dismiss.bs.modal', function () {
      that.$element.one('mouseup.dismiss.bs.modal', function (e) {
        if ($(e.target).is(that.$element)) that.ignoreBackdropClick = true
      })
    })

    this.backdrop(function () {
      var transition = $.support.transition && that.$element.hasClass('fade')

      if (!that.$element.parent().length) {
        that.$element.appendTo(that.$body) // don't move modals dom position
      }

      that.$element
        .show()
        .scrollTop(0)

      that.adjustDialog()

      if (transition) {
        that.$element[0].offsetWidth // force reflow
      }

      that.$element.addClass('in')

      that.enforceFocus()

      var e = $.Event('shown.bs.modal', { relatedTarget: _relatedTarget })

      transition ?
        that.$dialog // wait for modal to slide in
          .one('bsTransitionEnd', function () {
            that.$element.trigger('focus').trigger(e)
          })
          .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
        that.$element.trigger('focus').trigger(e)
    })
  }

  Modal.prototype.hide = function (e) {
    if (e) e.preventDefault()

    e = $.Event('hide.bs.modal')

    this.$element.trigger(e)

    if (!this.isShown || e.isDefaultPrevented()) return

    this.isShown = false

    this.escape()
    this.resize()

    $(document).off('focusin.bs.modal')

    this.$element
      .removeClass('in')
      .off('click.dismiss.bs.modal')
      .off('mouseup.dismiss.bs.modal')

    this.$dialog.off('mousedown.dismiss.bs.modal')

    $.support.transition && this.$element.hasClass('fade') ?
      this.$element
        .one('bsTransitionEnd', $.proxy(this.hideModal, this))
        .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
      this.hideModal()
  }

  Modal.prototype.enforceFocus = function () {
    $(document)
      .off('focusin.bs.modal') // guard against infinite focus loop
      .on('focusin.bs.modal', $.proxy(function (e) {
        if (document !== e.target &&
          this.$element[0] !== e.target &&
          !this.$element.has(e.target).length) {
          this.$element.trigger('focus')
        }
      }, this))
  }

  Modal.prototype.escape = function () {
    if (this.isShown && this.options.keyboard) {
      this.$element.on('keydown.dismiss.bs.modal', $.proxy(function (e) {
        e.which == 27 && this.hide()
      }, this))
    } else if (!this.isShown) {
      this.$element.off('keydown.dismiss.bs.modal')
    }
  }

  Modal.prototype.resize = function () {
    if (this.isShown) {
      $(window).on('resize.bs.modal', $.proxy(this.handleUpdate, this))
    } else {
      $(window).off('resize.bs.modal')
    }
  }

  Modal.prototype.hideModal = function () {
    var that = this
    this.$element.hide()
    this.backdrop(function () {
      that.$body.removeClass('modal-open')
      that.resetAdjustments()
      that.resetScrollbar()
      that.$element.trigger('hidden.bs.modal')
    })
  }

  Modal.prototype.removeBackdrop = function () {
    this.$backdrop && this.$backdrop.remove()
    this.$backdrop = null
  }

  Modal.prototype.backdrop = function (callback) {
    var that = this
    var animate = this.$element.hasClass('fade') ? 'fade' : ''

    if (this.isShown && this.options.backdrop) {
      var doAnimate = $.support.transition && animate

      this.$backdrop = $(document.createElement('div'))
        .addClass('modal-backdrop ' + animate)
        .appendTo(this.$body)

      this.$element.on('click.dismiss.bs.modal', $.proxy(function (e) {
        if (this.ignoreBackdropClick) {
          this.ignoreBackdropClick = false
          return
        }
        if (e.target !== e.currentTarget) return
        this.options.backdrop == 'static'
          ? this.$element[0].focus()
          : this.hide()
      }, this))

      if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

      this.$backdrop.addClass('in')

      if (!callback) return

      doAnimate ?
        this.$backdrop
          .one('bsTransitionEnd', callback)
          .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
        callback()

    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass('in')

      var callbackRemove = function () {
        that.removeBackdrop()
        callback && callback()
      }
      $.support.transition && this.$element.hasClass('fade') ?
        this.$backdrop
          .one('bsTransitionEnd', callbackRemove)
          .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
        callbackRemove()

    } else if (callback) {
      callback()
    }
  }

  // these following methods are used to handle overflowing modals

  Modal.prototype.handleUpdate = function () {
    this.adjustDialog()
  }

  Modal.prototype.adjustDialog = function () {
    var modalIsOverflowing = this.$element[0].scrollHeight > document.documentElement.clientHeight

    this.$element.css({
      paddingLeft: !this.bodyIsOverflowing && modalIsOverflowing ? this.scrollbarWidth : '',
      paddingRight: this.bodyIsOverflowing && !modalIsOverflowing ? this.scrollbarWidth : ''
    })
  }

  Modal.prototype.resetAdjustments = function () {
    this.$element.css({
      paddingLeft: '',
      paddingRight: ''
    })
  }

  Modal.prototype.checkScrollbar = function () {
    var fullWindowWidth = window.innerWidth
    if (!fullWindowWidth) { // workaround for missing window.innerWidth in IE8
      var documentElementRect = document.documentElement.getBoundingClientRect()
      fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left)
    }
    this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth
    this.scrollbarWidth = this.measureScrollbar()
  }

  Modal.prototype.setScrollbar = function () {
    var bodyPad = parseInt((this.$body.css('padding-right') || 0), 10)
    this.originalBodyPad = document.body.style.paddingRight || ''
    var scrollbarWidth = this.scrollbarWidth
    if (this.bodyIsOverflowing) {
      this.$body.css('padding-right', bodyPad + scrollbarWidth)
      $(this.fixedContent).each(function (index, element) {
        var actualPadding = element.style.paddingRight
        var calculatedPadding = $(element).css('padding-right')
        $(element)
          .data('padding-right', actualPadding)
          .css('padding-right', parseFloat(calculatedPadding) + scrollbarWidth + 'px')
      })
    }
  }

  Modal.prototype.resetScrollbar = function () {
    this.$body.css('padding-right', this.originalBodyPad)
    $(this.fixedContent).each(function (index, element) {
      var padding = $(element).data('padding-right')
      $(element).removeData('padding-right')
      element.style.paddingRight = padding ? padding : ''
    })
  }

  Modal.prototype.measureScrollbar = function () { // thx walsh
    var scrollDiv = document.createElement('div')
    scrollDiv.className = 'modal-scrollbar-measure'
    this.$body.append(scrollDiv)
    var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
    this.$body[0].removeChild(scrollDiv)
    return scrollbarWidth
  }


  // MODAL PLUGIN DEFINITION
  // =======================

  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this = $(this)
      var data = $this.data('bs.modal')
      var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('bs.modal', (data = new Modal(this, options)))
      if (typeof option == 'string') data[option](_relatedTarget)
      else if (options.show) data.show(_relatedTarget)
    })
  }

  var old = $.fn.modal

  $.fn.modal = Plugin
  $.fn.modal.Constructor = Modal


  // MODAL NO CONFLICT
  // =================

  $.fn.modal.noConflict = function () {
    $.fn.modal = old
    return this
  }


  // MODAL DATA-API
  // ==============

  $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
    var $this = $(this)
    var href = $this.attr('href')
    var target = $this.attr('data-target') ||
      (href && href.replace(/.*(?=#[^\s]+$)/, '')) // strip for ie7

    var $target = $(document).find(target)
    var option = $target.data('bs.modal') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href }, $target.data(), $this.data())

    if ($this.is('a')) e.preventDefault()

    $target.one('show.bs.modal', function (showEvent) {
      if (showEvent.isDefaultPrevented()) return // only register focus restorer if modal will actually get shown
      $target.one('hidden.bs.modal', function () {
        $this.is(':visible') && $this.trigger('focus')
      })
    })
    Plugin.call($target, option, this)
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: tooltip.js v3.4.1
 * https://getbootstrap.com/docs/3.4/javascript/#tooltip
 * Inspired by the original jQuery.tipsy by Jason Frame
 * ========================================================================
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

+function ($) {
  'use strict';

  var DISALLOWED_ATTRIBUTES = ['sanitize', 'whiteList', 'sanitizeFn']

  var uriAttrs = [
    'background',
    'cite',
    'href',
    'itemtype',
    'longdesc',
    'poster',
    'src',
    'xlink:href'
  ]

  var ARIA_ATTRIBUTE_PATTERN = /^aria-[\w-]*$/i

  var DefaultWhitelist = {
    // Global attributes allowed on any supplied element below.
    '*': ['class', 'dir', 'id', 'lang', 'role', ARIA_ATTRIBUTE_PATTERN],
    a: ['target', 'href', 'title', 'rel'],
    area: [],
    b: [],
    br: [],
    col: [],
    code: [],
    div: [],
    em: [],
    hr: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    i: [],
    img: ['src', 'alt', 'title', 'width', 'height'],
    li: [],
    ol: [],
    p: [],
    pre: [],
    s: [],
    small: [],
    span: [],
    sub: [],
    sup: [],
    strong: [],
    u: [],
    ul: []
  }

  /**
   * A pattern that recognizes a commonly useful subset of URLs that are safe.
   *
   * Shoutout to Angular 7 https://github.com/angular/angular/blob/7.2.4/packages/core/src/sanitization/url_sanitizer.ts
   */
  var SAFE_URL_PATTERN = /^(?:(?:https?|mailto|ftp|tel|file):|[^&:/?#]*(?:[/?#]|$))/gi

  /**
   * A pattern that matches safe data URLs. Only matches image, video and audio types.
   *
   * Shoutout to Angular 7 https://github.com/angular/angular/blob/7.2.4/packages/core/src/sanitization/url_sanitizer.ts
   */
  var DATA_URL_PATTERN = /^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[a-z0-9+/]+=*$/i

  function allowedAttribute(attr, allowedAttributeList) {
    var attrName = attr.nodeName.toLowerCase()

    if ($.inArray(attrName, allowedAttributeList) !== -1) {
      if ($.inArray(attrName, uriAttrs) !== -1) {
        return Boolean(attr.nodeValue.match(SAFE_URL_PATTERN) || attr.nodeValue.match(DATA_URL_PATTERN))
      }

      return true
    }

    var regExp = $(allowedAttributeList).filter(function (index, value) {
      return value instanceof RegExp
    })

    // Check if a regular expression validates the attribute.
    for (var i = 0, l = regExp.length; i < l; i++) {
      if (attrName.match(regExp[i])) {
        return true
      }
    }

    return false
  }

  function sanitizeHtml(unsafeHtml, whiteList, sanitizeFn) {
    if (unsafeHtml.length === 0) {
      return unsafeHtml
    }

    if (sanitizeFn && typeof sanitizeFn === 'function') {
      return sanitizeFn(unsafeHtml)
    }

    // IE 8 and below don't support createHTMLDocument
    if (!document.implementation || !document.implementation.createHTMLDocument) {
      return unsafeHtml
    }

    var createdDocument = document.implementation.createHTMLDocument('sanitization')
    createdDocument.body.innerHTML = unsafeHtml

    var whitelistKeys = $.map(whiteList, function (el, i) { return i })
    var elements = $(createdDocument.body).find('*')

    for (var i = 0, len = elements.length; i < len; i++) {
      var el = elements[i]
      var elName = el.nodeName.toLowerCase()

      if ($.inArray(elName, whitelistKeys) === -1) {
        el.parentNode.removeChild(el)

        continue
      }

      var attributeList = $.map(el.attributes, function (el) { return el })
      var whitelistedAttributes = [].concat(whiteList['*'] || [], whiteList[elName] || [])

      for (var j = 0, len2 = attributeList.length; j < len2; j++) {
        if (!allowedAttribute(attributeList[j], whitelistedAttributes)) {
          el.removeAttribute(attributeList[j].nodeName)
        }
      }
    }

    return createdDocument.body.innerHTML
  }

  // TOOLTIP PUBLIC CLASS DEFINITION
  // ===============================

  var Tooltip = function (element, options) {
    this.type       = null
    this.options    = null
    this.enabled    = null
    this.timeout    = null
    this.hoverState = null
    this.$element   = null
    this.inState    = null

    this.init('tooltip', element, options)
  }

  Tooltip.VERSION  = '3.4.1'

  Tooltip.TRANSITION_DURATION = 150

  Tooltip.DEFAULTS = {
    animation: true,
    placement: 'top',
    selector: false,
    template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
    trigger: 'hover focus',
    title: '',
    delay: 0,
    html: false,
    container: false,
    viewport: {
      selector: 'body',
      padding: 0
    },
    sanitize : true,
    sanitizeFn : null,
    whiteList : DefaultWhitelist
  }

  Tooltip.prototype.init = function (type, element, options) {
    this.enabled   = true
    this.type      = type
    this.$element  = $(element)
    this.options   = this.getOptions(options)
    this.$viewport = this.options.viewport && $(document).find($.isFunction(this.options.viewport) ? this.options.viewport.call(this, this.$element) : (this.options.viewport.selector || this.options.viewport))
    this.inState   = { click: false, hover: false, focus: false }

    if (this.$element[0] instanceof document.constructor && !this.options.selector) {
      throw new Error('`selector` option must be specified when initializing ' + this.type + ' on the window.document object!')
    }

    var triggers = this.options.trigger.split(' ')

    for (var i = triggers.length; i--;) {
      var trigger = triggers[i]

      if (trigger == 'click') {
        this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this))
      } else if (trigger != 'manual') {
        var eventIn  = trigger == 'hover' ? 'mouseenter' : 'focusin'
        var eventOut = trigger == 'hover' ? 'mouseleave' : 'focusout'

        this.$element.on(eventIn  + '.' + this.type, this.options.selector, $.proxy(this.enter, this))
        this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this))
      }
    }

    this.options.selector ?
      (this._options = $.extend({}, this.options, { trigger: 'manual', selector: '' })) :
      this.fixTitle()
  }

  Tooltip.prototype.getDefaults = function () {
    return Tooltip.DEFAULTS
  }

  Tooltip.prototype.getOptions = function (options) {
    var dataAttributes = this.$element.data()

    for (var dataAttr in dataAttributes) {
      if (dataAttributes.hasOwnProperty(dataAttr) && $.inArray(dataAttr, DISALLOWED_ATTRIBUTES) !== -1) {
        delete dataAttributes[dataAttr]
      }
    }

    options = $.extend({}, this.getDefaults(), dataAttributes, options)

    if (options.delay && typeof options.delay == 'number') {
      options.delay = {
        show: options.delay,
        hide: options.delay
      }
    }

    if (options.sanitize) {
      options.template = sanitizeHtml(options.template, options.whiteList, options.sanitizeFn)
    }

    return options
  }

  Tooltip.prototype.getDelegateOptions = function () {
    var options  = {}
    var defaults = this.getDefaults()

    this._options && $.each(this._options, function (key, value) {
      if (defaults[key] != value) options[key] = value
    })

    return options
  }

  Tooltip.prototype.enter = function (obj) {
    var self = obj instanceof this.constructor ?
      obj : $(obj.currentTarget).data('bs.' + this.type)

    if (!self) {
      self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
      $(obj.currentTarget).data('bs.' + this.type, self)
    }

    if (obj instanceof $.Event) {
      self.inState[obj.type == 'focusin' ? 'focus' : 'hover'] = true
    }

    if (self.tip().hasClass('in') || self.hoverState == 'in') {
      self.hoverState = 'in'
      return
    }

    clearTimeout(self.timeout)

    self.hoverState = 'in'

    if (!self.options.delay || !self.options.delay.show) return self.show()

    self.timeout = setTimeout(function () {
      if (self.hoverState == 'in') self.show()
    }, self.options.delay.show)
  }

  Tooltip.prototype.isInStateTrue = function () {
    for (var key in this.inState) {
      if (this.inState[key]) return true
    }

    return false
  }

  Tooltip.prototype.leave = function (obj) {
    var self = obj instanceof this.constructor ?
      obj : $(obj.currentTarget).data('bs.' + this.type)

    if (!self) {
      self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
      $(obj.currentTarget).data('bs.' + this.type, self)
    }

    if (obj instanceof $.Event) {
      self.inState[obj.type == 'focusout' ? 'focus' : 'hover'] = false
    }

    if (self.isInStateTrue()) return

    clearTimeout(self.timeout)

    self.hoverState = 'out'

    if (!self.options.delay || !self.options.delay.hide) return self.hide()

    self.timeout = setTimeout(function () {
      if (self.hoverState == 'out') self.hide()
    }, self.options.delay.hide)
  }

  Tooltip.prototype.show = function () {
    var e = $.Event('show.bs.' + this.type)

    if (this.hasContent() && this.enabled) {
      this.$element.trigger(e)

      var inDom = $.contains(this.$element[0].ownerDocument.documentElement, this.$element[0])
      if (e.isDefaultPrevented() || !inDom) return
      var that = this

      var $tip = this.tip()

      var tipId = this.getUID(this.type)

      this.setContent()
      $tip.attr('id', tipId)
      this.$element.attr('aria-describedby', tipId)

      if (this.options.animation) $tip.addClass('fade')

      var placement = typeof this.options.placement == 'function' ?
        this.options.placement.call(this, $tip[0], this.$element[0]) :
        this.options.placement

      var autoToken = /\s?auto?\s?/i
      var autoPlace = autoToken.test(placement)
      if (autoPlace) placement = placement.replace(autoToken, '') || 'top'

      $tip
        .detach()
        .css({ top: 0, left: 0, display: 'block' })
        .addClass(placement)
        .data('bs.' + this.type, this)

      this.options.container ? $tip.appendTo($(document).find(this.options.container)) : $tip.insertAfter(this.$element)
      this.$element.trigger('inserted.bs.' + this.type)

      var pos          = this.getPosition()
      var actualWidth  = $tip[0].offsetWidth
      var actualHeight = $tip[0].offsetHeight

      if (autoPlace) {
        var orgPlacement = placement
        var viewportDim = this.getPosition(this.$viewport)

        placement = placement == 'bottom' && pos.bottom + actualHeight > viewportDim.bottom ? 'top'    :
                    placement == 'top'    && pos.top    - actualHeight < viewportDim.top    ? 'bottom' :
                    placement == 'right'  && pos.right  + actualWidth  > viewportDim.width  ? 'left'   :
                    placement == 'left'   && pos.left   - actualWidth  < viewportDim.left   ? 'right'  :
                    placement

        $tip
          .removeClass(orgPlacement)
          .addClass(placement)
      }

      var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight)

      this.applyPlacement(calculatedOffset, placement)

      var complete = function () {
        var prevHoverState = that.hoverState
        that.$element.trigger('shown.bs.' + that.type)
        that.hoverState = null

        if (prevHoverState == 'out') that.leave(that)
      }

      $.support.transition && this.$tip.hasClass('fade') ?
        $tip
          .one('bsTransitionEnd', complete)
          .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
        complete()
    }
  }

  Tooltip.prototype.applyPlacement = function (offset, placement) {
    var $tip   = this.tip()
    var width  = $tip[0].offsetWidth
    var height = $tip[0].offsetHeight

    // manually read margins because getBoundingClientRect includes difference
    var marginTop = parseInt($tip.css('margin-top'), 10)
    var marginLeft = parseInt($tip.css('margin-left'), 10)

    // we must check for NaN for ie 8/9
    if (isNaN(marginTop))  marginTop  = 0
    if (isNaN(marginLeft)) marginLeft = 0

    offset.top  += marginTop
    offset.left += marginLeft

    // $.fn.offset doesn't round pixel values
    // so we use setOffset directly with our own function B-0
    $.offset.setOffset($tip[0], $.extend({
      using: function (props) {
        $tip.css({
          top: Math.round(props.top),
          left: Math.round(props.left)
        })
      }
    }, offset), 0)

    $tip.addClass('in')

    // check to see if placing tip in new offset caused the tip to resize itself
    var actualWidth  = $tip[0].offsetWidth
    var actualHeight = $tip[0].offsetHeight

    if (placement == 'top' && actualHeight != height) {
      offset.top = offset.top + height - actualHeight
    }

    var delta = this.getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight)

    if (delta.left) offset.left += delta.left
    else offset.top += delta.top

    var isVertical          = /top|bottom/.test(placement)
    var arrowDelta          = isVertical ? delta.left * 2 - width + actualWidth : delta.top * 2 - height + actualHeight
    var arrowOffsetPosition = isVertical ? 'offsetWidth' : 'offsetHeight'

    $tip.offset(offset)
    this.replaceArrow(arrowDelta, $tip[0][arrowOffsetPosition], isVertical)
  }

  Tooltip.prototype.replaceArrow = function (delta, dimension, isVertical) {
    this.arrow()
      .css(isVertical ? 'left' : 'top', 50 * (1 - delta / dimension) + '%')
      .css(isVertical ? 'top' : 'left', '')
  }

  Tooltip.prototype.setContent = function () {
    var $tip  = this.tip()
    var title = this.getTitle()

    if (this.options.html) {
      if (this.options.sanitize) {
        title = sanitizeHtml(title, this.options.whiteList, this.options.sanitizeFn)
      }

      $tip.find('.tooltip-inner').html(title)
    } else {
      $tip.find('.tooltip-inner').text(title)
    }

    $tip.removeClass('fade in top bottom left right')
  }

  Tooltip.prototype.hide = function (callback) {
    var that = this
    var $tip = $(this.$tip)
    var e    = $.Event('hide.bs.' + this.type)

    function complete() {
      if (that.hoverState != 'in') $tip.detach()
      if (that.$element) { // TODO: Check whether guarding this code with this `if` is really necessary.
        that.$element
          .removeAttr('aria-describedby')
          .trigger('hidden.bs.' + that.type)
      }
      callback && callback()
    }

    this.$element.trigger(e)

    if (e.isDefaultPrevented()) return

    $tip.removeClass('in')

    $.support.transition && $tip.hasClass('fade') ?
      $tip
        .one('bsTransitionEnd', complete)
        .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
      complete()

    this.hoverState = null

    return this
  }

  Tooltip.prototype.fixTitle = function () {
    var $e = this.$element
    if ($e.attr('title') || typeof $e.attr('data-original-title') != 'string') {
      $e.attr('data-original-title', $e.attr('title') || '').attr('title', '')
    }
  }

  Tooltip.prototype.hasContent = function () {
    return this.getTitle()
  }

  Tooltip.prototype.getPosition = function ($element) {
    $element   = $element || this.$element

    var el     = $element[0]
    var isBody = el.tagName == 'BODY'

    var elRect    = el.getBoundingClientRect()
    if (elRect.width == null) {
      // width and height are missing in IE8, so compute them manually; see https://github.com/twbs/bootstrap/issues/14093
      elRect = $.extend({}, elRect, { width: elRect.right - elRect.left, height: elRect.bottom - elRect.top })
    }
    var isSvg = window.SVGElement && el instanceof window.SVGElement
    // Avoid using $.offset() on SVGs since it gives incorrect results in jQuery 3.
    // See https://github.com/twbs/bootstrap/issues/20280
    var elOffset  = isBody ? { top: 0, left: 0 } : (isSvg ? null : $element.offset())
    var scroll    = { scroll: isBody ? document.documentElement.scrollTop || document.body.scrollTop : $element.scrollTop() }
    var outerDims = isBody ? { width: $(window).width(), height: $(window).height() } : null

    return $.extend({}, elRect, scroll, outerDims, elOffset)
  }

  Tooltip.prototype.getCalculatedOffset = function (placement, pos, actualWidth, actualHeight) {
    return placement == 'bottom' ? { top: pos.top + pos.height,   left: pos.left + pos.width / 2 - actualWidth / 2 } :
           placement == 'top'    ? { top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2 } :
           placement == 'left'   ? { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth } :
        /* placement == 'right' */ { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width }

  }

  Tooltip.prototype.getViewportAdjustedDelta = function (placement, pos, actualWidth, actualHeight) {
    var delta = { top: 0, left: 0 }
    if (!this.$viewport) return delta

    var viewportPadding = this.options.viewport && this.options.viewport.padding || 0
    var viewportDimensions = this.getPosition(this.$viewport)

    if (/right|left/.test(placement)) {
      var topEdgeOffset    = pos.top - viewportPadding - viewportDimensions.scroll
      var bottomEdgeOffset = pos.top + viewportPadding - viewportDimensions.scroll + actualHeight
      if (topEdgeOffset < viewportDimensions.top) { // top overflow
        delta.top = viewportDimensions.top - topEdgeOffset
      } else if (bottomEdgeOffset > viewportDimensions.top + viewportDimensions.height) { // bottom overflow
        delta.top = viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset
      }
    } else {
      var leftEdgeOffset  = pos.left - viewportPadding
      var rightEdgeOffset = pos.left + viewportPadding + actualWidth
      if (leftEdgeOffset < viewportDimensions.left) { // left overflow
        delta.left = viewportDimensions.left - leftEdgeOffset
      } else if (rightEdgeOffset > viewportDimensions.right) { // right overflow
        delta.left = viewportDimensions.left + viewportDimensions.width - rightEdgeOffset
      }
    }

    return delta
  }

  Tooltip.prototype.getTitle = function () {
    var title
    var $e = this.$element
    var o  = this.options

    title = $e.attr('data-original-title')
      || (typeof o.title == 'function' ? o.title.call($e[0]) :  o.title)

    return title
  }

  Tooltip.prototype.getUID = function (prefix) {
    do prefix += ~~(Math.random() * 1000000)
    while (document.getElementById(prefix))
    return prefix
  }

  Tooltip.prototype.tip = function () {
    if (!this.$tip) {
      this.$tip = $(this.options.template)
      if (this.$tip.length != 1) {
        throw new Error(this.type + ' `template` option must consist of exactly 1 top-level element!')
      }
    }
    return this.$tip
  }

  Tooltip.prototype.arrow = function () {
    return (this.$arrow = this.$arrow || this.tip().find('.tooltip-arrow'))
  }

  Tooltip.prototype.enable = function () {
    this.enabled = true
  }

  Tooltip.prototype.disable = function () {
    this.enabled = false
  }

  Tooltip.prototype.toggleEnabled = function () {
    this.enabled = !this.enabled
  }

  Tooltip.prototype.toggle = function (e) {
    var self = this
    if (e) {
      self = $(e.currentTarget).data('bs.' + this.type)
      if (!self) {
        self = new this.constructor(e.currentTarget, this.getDelegateOptions())
        $(e.currentTarget).data('bs.' + this.type, self)
      }
    }

    if (e) {
      self.inState.click = !self.inState.click
      if (self.isInStateTrue()) self.enter(self)
      else self.leave(self)
    } else {
      self.tip().hasClass('in') ? self.leave(self) : self.enter(self)
    }
  }

  Tooltip.prototype.destroy = function () {
    var that = this
    clearTimeout(this.timeout)
    this.hide(function () {
      that.$element.off('.' + that.type).removeData('bs.' + that.type)
      if (that.$tip) {
        that.$tip.detach()
      }
      that.$tip = null
      that.$arrow = null
      that.$viewport = null
      that.$element = null
    })
  }

  Tooltip.prototype.sanitizeHtml = function (unsafeHtml) {
    return sanitizeHtml(unsafeHtml, this.options.whiteList, this.options.sanitizeFn)
  }

  // TOOLTIP PLUGIN DEFINITION
  // =========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.tooltip')
      var options = typeof option == 'object' && option

      if (!data && /destroy|hide/.test(option)) return
      if (!data) $this.data('bs.tooltip', (data = new Tooltip(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.tooltip

  $.fn.tooltip             = Plugin
  $.fn.tooltip.Constructor = Tooltip


  // TOOLTIP NO CONFLICT
  // ===================

  $.fn.tooltip.noConflict = function () {
    $.fn.tooltip = old
    return this
  }

}(jQuery);

/* ========================================================================
 * Bootstrap: popover.js v3.4.1
 * https://getbootstrap.com/docs/3.4/javascript/#popovers
 * ========================================================================
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // POPOVER PUBLIC CLASS DEFINITION
  // ===============================

  var Popover = function (element, options) {
    this.init('popover', element, options)
  }

  if (!$.fn.tooltip) throw new Error('Popover requires tooltip.js')

  Popover.VERSION  = '3.4.1'

  Popover.DEFAULTS = $.extend({}, $.fn.tooltip.Constructor.DEFAULTS, {
    placement: 'right',
    trigger: 'click',
    content: '',
    template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
  })


  // NOTE: POPOVER EXTENDS tooltip.js
  // ================================

  Popover.prototype = $.extend({}, $.fn.tooltip.Constructor.prototype)

  Popover.prototype.constructor = Popover

  Popover.prototype.getDefaults = function () {
    return Popover.DEFAULTS
  }

  Popover.prototype.setContent = function () {
    var $tip    = this.tip()
    var title   = this.getTitle()
    var content = this.getContent()

    if (this.options.html) {
      var typeContent = typeof content

      if (this.options.sanitize) {
        title = this.sanitizeHtml(title)

        if (typeContent === 'string') {
          content = this.sanitizeHtml(content)
        }
      }

      $tip.find('.popover-title').html(title)
      $tip.find('.popover-content').children().detach().end()[
        typeContent === 'string' ? 'html' : 'append'
      ](content)
    } else {
      $tip.find('.popover-title').text(title)
      $tip.find('.popover-content').children().detach().end().text(content)
    }

    $tip.removeClass('fade top bottom left right in')

    // IE8 doesn't accept hiding via the `:empty` pseudo selector, we have to do
    // this manually by checking the contents.
    if (!$tip.find('.popover-title').html()) $tip.find('.popover-title').hide()
  }

  Popover.prototype.hasContent = function () {
    return this.getTitle() || this.getContent()
  }

  Popover.prototype.getContent = function () {
    var $e = this.$element
    var o  = this.options

    return $e.attr('data-content')
      || (typeof o.content == 'function' ?
        o.content.call($e[0]) :
        o.content)
  }

  Popover.prototype.arrow = function () {
    return (this.$arrow = this.$arrow || this.tip().find('.arrow'))
  }


  // POPOVER PLUGIN DEFINITION
  // =========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.popover')
      var options = typeof option == 'object' && option

      if (!data && /destroy|hide/.test(option)) return
      if (!data) $this.data('bs.popover', (data = new Popover(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.popover

  $.fn.popover             = Plugin
  $.fn.popover.Constructor = Popover


  // POPOVER NO CONFLICT
  // ===================

  $.fn.popover.noConflict = function () {
    $.fn.popover = old
    return this
  }

}(jQuery);

/* ========================================================================
 * Bootstrap: scrollspy.js v3.4.1
 * https://getbootstrap.com/docs/3.4/javascript/#scrollspy
 * ========================================================================
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // SCROLLSPY CLASS DEFINITION
  // ==========================

  function ScrollSpy(element, options) {
    this.$body          = $(document.body)
    this.$scrollElement = $(element).is(document.body) ? $(window) : $(element)
    this.options        = $.extend({}, ScrollSpy.DEFAULTS, options)
    this.selector       = (this.options.target || '') + ' .nav li > a'
    this.offsets        = []
    this.targets        = []
    this.activeTarget   = null
    this.scrollHeight   = 0

    this.$scrollElement.on('scroll.bs.scrollspy', $.proxy(this.process, this))
    this.refresh()
    this.process()
  }

  ScrollSpy.VERSION  = '3.4.1'

  ScrollSpy.DEFAULTS = {
    offset: 10
  }

  ScrollSpy.prototype.getScrollHeight = function () {
    return this.$scrollElement[0].scrollHeight || Math.max(this.$body[0].scrollHeight, document.documentElement.scrollHeight)
  }

  ScrollSpy.prototype.refresh = function () {
    var that          = this
    var offsetMethod  = 'offset'
    var offsetBase    = 0

    this.offsets      = []
    this.targets      = []
    this.scrollHeight = this.getScrollHeight()

    if (!$.isWindow(this.$scrollElement[0])) {
      offsetMethod = 'position'
      offsetBase   = this.$scrollElement.scrollTop()
    }

    this.$body
      .find(this.selector)
      .map(function () {
        var $el   = $(this)
        var href  = $el.data('target') || $el.attr('href')
        var $href = /^#./.test(href) && $(href)

        return ($href
          && $href.length
          && $href.is(':visible')
          && [[$href[offsetMethod]().top + offsetBase, href]]) || null
      })
      .sort(function (a, b) { return a[0] - b[0] })
      .each(function () {
        that.offsets.push(this[0])
        that.targets.push(this[1])
      })
  }

  ScrollSpy.prototype.process = function () {
    var scrollTop    = this.$scrollElement.scrollTop() + this.options.offset
    var scrollHeight = this.getScrollHeight()
    var maxScroll    = this.options.offset + scrollHeight - this.$scrollElement.height()
    var offsets      = this.offsets
    var targets      = this.targets
    var activeTarget = this.activeTarget
    var i

    if (this.scrollHeight != scrollHeight) {
      this.refresh()
    }

    if (scrollTop >= maxScroll) {
      return activeTarget != (i = targets[targets.length - 1]) && this.activate(i)
    }

    if (activeTarget && scrollTop < offsets[0]) {
      this.activeTarget = null
      return this.clear()
    }

    for (i = offsets.length; i--;) {
      activeTarget != targets[i]
        && scrollTop >= offsets[i]
        && (offsets[i + 1] === undefined || scrollTop < offsets[i + 1])
        && this.activate(targets[i])
    }
  }

  ScrollSpy.prototype.activate = function (target) {
    this.activeTarget = target

    this.clear()

    var selector = this.selector +
      '[data-target="' + target + '"],' +
      this.selector + '[href="' + target + '"]'

    var active = $(selector)
      .parents('li')
      .addClass('active')

    if (active.parent('.dropdown-menu').length) {
      active = active
        .closest('li.dropdown')
        .addClass('active')
    }

    active.trigger('activate.bs.scrollspy')
  }

  ScrollSpy.prototype.clear = function () {
    $(this.selector)
      .parentsUntil(this.options.target, '.active')
      .removeClass('active')
  }


  // SCROLLSPY PLUGIN DEFINITION
  // ===========================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.scrollspy')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.scrollspy', (data = new ScrollSpy(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.scrollspy

  $.fn.scrollspy             = Plugin
  $.fn.scrollspy.Constructor = ScrollSpy


  // SCROLLSPY NO CONFLICT
  // =====================

  $.fn.scrollspy.noConflict = function () {
    $.fn.scrollspy = old
    return this
  }


  // SCROLLSPY DATA-API
  // ==================

  $(window).on('load.bs.scrollspy.data-api', function () {
    $('[data-spy="scroll"]').each(function () {
      var $spy = $(this)
      Plugin.call($spy, $spy.data())
    })
  })

}(jQuery);

/* ========================================================================
 * Bootstrap: tab.js v3.4.1
 * https://getbootstrap.com/docs/3.4/javascript/#tabs
 * ========================================================================
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // TAB CLASS DEFINITION
  // ====================

  var Tab = function (element) {
    // jscs:disable requireDollarBeforejQueryAssignment
    this.element = $(element)
    // jscs:enable requireDollarBeforejQueryAssignment
  }

  Tab.VERSION = '3.4.1'

  Tab.TRANSITION_DURATION = 150

  Tab.prototype.show = function () {
    var $this    = this.element
    var $ul      = $this.closest('ul:not(.dropdown-menu)')
    var selector = $this.data('target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
    }

    if ($this.parent('li').hasClass('active')) return

    var $previous = $ul.find('.active:last a')
    var hideEvent = $.Event('hide.bs.tab', {
      relatedTarget: $this[0]
    })
    var showEvent = $.Event('show.bs.tab', {
      relatedTarget: $previous[0]
    })

    $previous.trigger(hideEvent)
    $this.trigger(showEvent)

    if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) return

    var $target = $(document).find(selector)

    this.activate($this.closest('li'), $ul)
    this.activate($target, $target.parent(), function () {
      $previous.trigger({
        type: 'hidden.bs.tab',
        relatedTarget: $this[0]
      })
      $this.trigger({
        type: 'shown.bs.tab',
        relatedTarget: $previous[0]
      })
    })
  }

  Tab.prototype.activate = function (element, container, callback) {
    var $active    = container.find('> .active')
    var transition = callback
      && $.support.transition
      && ($active.length && $active.hasClass('fade') || !!container.find('> .fade').length)

    function next() {
      $active
        .removeClass('active')
        .find('> .dropdown-menu > .active')
        .removeClass('active')
        .end()
        .find('[data-toggle="tab"]')
        .attr('aria-expanded', false)

      element
        .addClass('active')
        .find('[data-toggle="tab"]')
        .attr('aria-expanded', true)

      if (transition) {
        element[0].offsetWidth // reflow for transition
        element.addClass('in')
      } else {
        element.removeClass('fade')
      }

      if (element.parent('.dropdown-menu').length) {
        element
          .closest('li.dropdown')
          .addClass('active')
          .end()
          .find('[data-toggle="tab"]')
          .attr('aria-expanded', true)
      }

      callback && callback()
    }

    $active.length && transition ?
      $active
        .one('bsTransitionEnd', next)
        .emulateTransitionEnd(Tab.TRANSITION_DURATION) :
      next()

    $active.removeClass('in')
  }


  // TAB PLUGIN DEFINITION
  // =====================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.tab')

      if (!data) $this.data('bs.tab', (data = new Tab(this)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.tab

  $.fn.tab             = Plugin
  $.fn.tab.Constructor = Tab


  // TAB NO CONFLICT
  // ===============

  $.fn.tab.noConflict = function () {
    $.fn.tab = old
    return this
  }


  // TAB DATA-API
  // ============

  var clickHandler = function (e) {
    e.preventDefault()
    Plugin.call($(this), 'show')
  }

  $(document)
    .on('click.bs.tab.data-api', '[data-toggle="tab"]', clickHandler)
    .on('click.bs.tab.data-api', '[data-toggle="pill"]', clickHandler)

}(jQuery);

/* ========================================================================
 * Bootstrap: affix.js v3.4.1
 * https://getbootstrap.com/docs/3.4/javascript/#affix
 * ========================================================================
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // AFFIX CLASS DEFINITION
  // ======================

  var Affix = function (element, options) {
    this.options = $.extend({}, Affix.DEFAULTS, options)

    var target = this.options.target === Affix.DEFAULTS.target ? $(this.options.target) : $(document).find(this.options.target)

    this.$target = target
      .on('scroll.bs.affix.data-api', $.proxy(this.checkPosition, this))
      .on('click.bs.affix.data-api',  $.proxy(this.checkPositionWithEventLoop, this))

    this.$element     = $(element)
    this.affixed      = null
    this.unpin        = null
    this.pinnedOffset = null

    this.checkPosition()
  }

  Affix.VERSION  = '3.4.1'

  Affix.RESET    = 'affix affix-top affix-bottom'

  Affix.DEFAULTS = {
    offset: 0,
    target: window
  }

  Affix.prototype.getState = function (scrollHeight, height, offsetTop, offsetBottom) {
    var scrollTop    = this.$target.scrollTop()
    var position     = this.$element.offset()
    var targetHeight = this.$target.height()

    if (offsetTop != null && this.affixed == 'top') return scrollTop < offsetTop ? 'top' : false

    if (this.affixed == 'bottom') {
      if (offsetTop != null) return (scrollTop + this.unpin <= position.top) ? false : 'bottom'
      return (scrollTop + targetHeight <= scrollHeight - offsetBottom) ? false : 'bottom'
    }

    var initializing   = this.affixed == null
    var colliderTop    = initializing ? scrollTop : position.top
    var colliderHeight = initializing ? targetHeight : height

    if (offsetTop != null && scrollTop <= offsetTop) return 'top'
    if (offsetBottom != null && (colliderTop + colliderHeight >= scrollHeight - offsetBottom)) return 'bottom'

    return false
  }

  Affix.prototype.getPinnedOffset = function () {
    if (this.pinnedOffset) return this.pinnedOffset
    this.$element.removeClass(Affix.RESET).addClass('affix')
    var scrollTop = this.$target.scrollTop()
    var position  = this.$element.offset()
    return (this.pinnedOffset = position.top - scrollTop)
  }

  Affix.prototype.checkPositionWithEventLoop = function () {
    setTimeout($.proxy(this.checkPosition, this), 1)
  }

  Affix.prototype.checkPosition = function () {
    if (!this.$element.is(':visible')) return

    var height       = this.$element.height()
    var offset       = this.options.offset
    var offsetTop    = offset.top
    var offsetBottom = offset.bottom
    var scrollHeight = Math.max($(document).height(), $(document.body).height())

    if (typeof offset != 'object')         offsetBottom = offsetTop = offset
    if (typeof offsetTop == 'function')    offsetTop    = offset.top(this.$element)
    if (typeof offsetBottom == 'function') offsetBottom = offset.bottom(this.$element)

    var affix = this.getState(scrollHeight, height, offsetTop, offsetBottom)

    if (this.affixed != affix) {
      if (this.unpin != null) this.$element.css('top', '')

      var affixType = 'affix' + (affix ? '-' + affix : '')
      var e         = $.Event(affixType + '.bs.affix')

      this.$element.trigger(e)

      if (e.isDefaultPrevented()) return

      this.affixed = affix
      this.unpin = affix == 'bottom' ? this.getPinnedOffset() : null

      this.$element
        .removeClass(Affix.RESET)
        .addClass(affixType)
        .trigger(affixType.replace('affix', 'affixed') + '.bs.affix')
    }

    if (affix == 'bottom') {
      this.$element.offset({
        top: scrollHeight - height - offsetBottom
      })
    }
  }


  // AFFIX PLUGIN DEFINITION
  // =======================

  function Plugin(option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.affix')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.affix', (data = new Affix(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.affix

  $.fn.affix             = Plugin
  $.fn.affix.Constructor = Affix


  // AFFIX NO CONFLICT
  // =================

  $.fn.affix.noConflict = function () {
    $.fn.affix = old
    return this
  }


  // AFFIX DATA-API
  // ==============

  $(window).on('load', function () {
    $('[data-spy="affix"]').each(function () {
      var $spy = $(this)
      var data = $spy.data()

      data.offset = data.offset || {}

      if (data.offsetBottom != null) data.offset.bottom = data.offsetBottom
      if (data.offsetTop    != null) data.offset.top    = data.offsetTop

      Plugin.call($spy, data)
    })
  })

}(jQuery);

/*! Copyright (c) 2011 Piotr Rochala (http://rocha.la)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Version: 1.3.8
 *
 */
(function (e) {
    e.fn.extend({
        slimScroll: function (f) {
            var a = e.extend({
                width: "auto",
                height: "250px",
                size: "7px",
                color: "#000",
                position: "right",
                distance: "1px",
                start: "top",
                opacity: .4,
                alwaysVisible: !1,
                disableFadeOut: !1,
                railVisible: !1,
                railColor: "#333",
                railOpacity: .2,
                railDraggable: !0,
                railClass: "slimScrollRail",
                barClass: "slimScrollBar",
                wrapperClass: "slimScrollDiv",
                allowPageScroll: !1,
                wheelStep: 20,
                touchScrollStep: 200,
                borderRadius: "7px",
                railBorderRadius: "7px"
            }, f);
            this.each(function () {
                function v(d) {
                    if (r) {
                        d = d || window.event;
                        var c = 0;
                        d.wheelDelta && (c = -d.wheelDelta / 120);
                        d.detail && (c = d.detail / 3);
                        e(d.target || d.srcTarget || d.srcElement).closest("." + a.wrapperClass).is(b.parent()) && n(c, !0);
                        d.preventDefault && !k && d.preventDefault();
                        k || (d.returnValue = !1)
                    }
                }

                function n(d, g, e) {
                    k = !1;
                    var f = b.outerHeight() - c.outerHeight();
                    g && (g = parseInt(c.css("top")) + d * parseInt(a.wheelStep) / 100 * c.outerHeight(), g = Math.min(Math.max(g, 0), f), g = 0 < d ? Math.ceil(g) : Math.floor(g), c.css({top: g + "px"}));
                    l = parseInt(c.css("top")) / (b.outerHeight() - c.outerHeight());
                    g =
                        l * (b[0].scrollHeight - b.outerHeight());
                    e && (g = d, d = g / b[0].scrollHeight * b.outerHeight(), d = Math.min(Math.max(d, 0), f), c.css({top: d + "px"}));
                    b.scrollTop(g);
                    b.trigger("slimscrolling", ~~g);
                    w();
                    p()
                }

                function x() {
                    u = Math.max(b.outerHeight() / b[0].scrollHeight * b.outerHeight(), 30);
                    c.css({height: u + "px"});
                    var a = u == b.outerHeight() ? "none" : "block";
                    c.css({display: a})
                }

                function w() {
                    x();
                    clearTimeout(B);
                    l == ~~l ? (k = a.allowPageScroll, C != l && b.trigger("slimscroll", 0 == ~~l ? "top" : "bottom")) : k = !1;
                    C = l;
                    u >= b.outerHeight() ? k = !0 : (c.stop(!0,
                        !0).fadeIn("fast"), a.railVisible && m.stop(!0, !0).fadeIn("fast"))
                }

                function p() {
                    a.alwaysVisible || (B = setTimeout(function () {
                        a.disableFadeOut && r || y || z || (c.fadeOut("slow"), m.fadeOut("slow"))
                    }, 1E3))
                }

                var r, y, z, B, A, u, l, C, k = !1, b = e(this);
                if (b.parent().hasClass(a.wrapperClass)) {
                    var q = b.scrollTop(), c = b.siblings("." + a.barClass), m = b.siblings("." + a.railClass);
                    x();
                    if (e.isPlainObject(f)) {
                        if ("height" in f && "auto" == f.height) {
                            b.parent().css("height", "auto");
                            b.css("height", "auto");
                            var h = b.parent().parent().height();
                            b.parent().css("height",
                                h);
                            b.css("height", h)
                        } else "height" in f && (h = f.height, b.parent().css("height", h), b.css("height", h));
                        if ("scrollTo" in f) q = parseInt(a.scrollTo); else if ("scrollBy" in f) q += parseInt(a.scrollBy); else if ("destroy" in f) {
                            c.remove();
                            m.remove();
                            b.unwrap();
                            return
                        }
                        n(q, !1, !0)
                    }
                } else if (!(e.isPlainObject(f) && "destroy" in f)) {
                    a.height = "auto" == a.height ? b.parent().height() : a.height;
                    q = e("<div></div>").addClass(a.wrapperClass).css({
                        position: "relative",
                        overflow: "hidden",
                        width: a.width,
                        height: a.height
                    });
                    b.css({
                        overflow: "hidden",
                        width: a.width, height: a.height
                    });
                    var m = e("<div></div>").addClass(a.railClass).css({
                        width: a.size,
                        height: "100%",
                        position: "absolute",
                        top: 0,
                        display: a.alwaysVisible && a.railVisible ? "block" : "none",
                        "border-radius": a.railBorderRadius,
                        background: a.railColor,
                        opacity: a.railOpacity,
                        zIndex: 90
                    }), c = e("<div></div>").addClass(a.barClass).css({
                        background: a.color,
                        width: a.size,
                        position: "absolute",
                        top: 0,
                        opacity: a.opacity,
                        display: a.alwaysVisible ? "block" : "none",
                        "border-radius": a.borderRadius,
                        BorderRadius: a.borderRadius,
                        MozBorderRadius: a.borderRadius,
                        WebkitBorderRadius: a.borderRadius,
                        zIndex: 99
                    }), h = "right" == a.position ? {right: a.distance} : {left: a.distance};
                    m.css(h);
                    c.css(h);
                    b.wrap(q);
                    b.parent().append(c);
                    b.parent().append(m);
                    a.railDraggable && c.bind("mousedown", function (a) {
                        var b = e(document);
                        z = !0;
                        t = parseFloat(c.css("top"));
                        pageY = a.pageY;
                        b.bind("mousemove.slimscroll", function (a) {
                            currTop = t + a.pageY - pageY;
                            c.css("top", currTop);
                            n(0, c.position().top, !1)
                        });
                        b.bind("mouseup.slimscroll", function (a) {
                            z = !1;
                            p();
                            b.unbind(".slimscroll")
                        });
                        return !1
                    }).bind("selectstart.slimscroll",
                        function (a) {
                            a.stopPropagation();
                            a.preventDefault();
                            return !1
                        });
                    m.hover(function () {
                        w()
                    }, function () {
                        p()
                    });
                    c.hover(function () {
                        y = !0
                    }, function () {
                        y = !1
                    });
                    b.hover(function () {
                        r = !0;
                        w();
                        p()
                    }, function () {
                        r = !1;
                        p()
                    });
                    b.bind("touchstart", function (a, b) {
                        a.originalEvent.touches.length && (A = a.originalEvent.touches[0].pageY)
                    });
                    b.bind("touchmove", function (b) {
                        k || b.originalEvent.preventDefault();
                        b.originalEvent.touches.length && (n((A - b.originalEvent.touches[0].pageY) / a.touchScrollStep, !0), A = b.originalEvent.touches[0].pageY)
                    });
                    x();
                    "bottom" === a.start ? (c.css({top: b.outerHeight() - c.outerHeight()}), n(0, !0)) : "top" !== a.start && (n(e(a.start).position().top, null, !0), a.alwaysVisible || c.hide());
                    window.addEventListener ? (this.addEventListener("DOMMouseScroll", v, !1), this.addEventListener("mousewheel", v, !1)) : document.attachEvent("onmousewheel", v)
                }
            });
            return this
        }
    });
    e.fn.extend({slimscroll: e.fn.slimScroll})
})(jQuery);

// ==================================================
// fancyBox v3.1.20
//
// Licensed GPLv3 for open source use
// or fancyBox Commercial License for commercial use
//
// http://fancyapps.com/fancybox/
// Copyright 2017 fancyApps
//
// ==================================================
!function (t, e, n, o) {
    "use strict";

    function i(t) {
        var e = t.currentTarget, o = t.data ? t.data.options : {}, i = t.data ? t.data.items : [],
            a = n(e).attr("data-fancybox") || "", s = 0;
        t.preventDefault(), t.stopPropagation(), a ? (i = i.length ? i.filter('[data-fancybox="' + a + '"]') : n('[data-fancybox="' + a + '"]'), s = i.index(e), s < 0 && (s = 0)) : i = [e], n.fancybox.open(i, o, s)
    }

    if (n) {
        if (n.fn.fancybox) return void n.error("fancyBox already initialized");
        var a = {
            loop: !1,
            margin: [44, 0],
            gutter: 50,
            keyboard: !0,
            arrows: !0,
            infobar: !1,
            toolbar: !0,
            buttons: ["slideShow", "fullScreen", "thumbs", "close"],
            idleTime: 4,
            smallBtn: "auto",
            protect: !1,
            modal: !1,
            image: {preload: "auto"},
            ajax: {settings: {data: {fancybox: !0}}},
            iframe: {
                tpl: '<iframe id="fancybox-frame{rnd}" name="fancybox-frame{rnd}" class="fancybox-iframe" frameborder="0" vspace="0" hspace="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen allowtransparency="true" src=""></iframe>',
                preload: !0,
                css: {},
                attr: {scrolling: "auto"}
            },
            animationEffect: "zoom",
            animationDuration: 366,
            zoomOpacity: "auto",
            transitionEffect: "fade",
            transitionDuration: 366,
            slideClass: "",
            baseClass: "",
            baseTpl: '<div class="fancybox-container" role="dialog" tabindex="-1"><div class="fancybox-bg"></div><div class="fancybox-inner"><div class="fancybox-infobar"><button data-fancybox-prev title="{{PREV}}" class="fancybox-button fancybox-button--left"></button><div class="fancybox-infobar__body"><span data-fancybox-index></span>&nbsp;/&nbsp;<span data-fancybox-count></span></div><button data-fancybox-next title="{{NEXT}}" class="fancybox-button fancybox-button--right"></button></div><div class="fancybox-toolbar">{{BUTTONS}}</div><div class="fancybox-navigation"><button data-fancybox-prev title="{{PREV}}" class="fancybox-arrow fancybox-arrow--left" /><button data-fancybox-next title="{{NEXT}}" class="fancybox-arrow fancybox-arrow--right" /></div><div class="fancybox-stage"></div><div class="fancybox-caption-wrap"><div class="fancybox-caption"></div></div></div></div>',
            spinnerTpl: '<div class="fancybox-loading"></div>',
            errorTpl: '<div class="fancybox-error"><p>{{ERROR}}<p></div>',
            btnTpl: {
                slideShow: '<button data-fancybox-play class="fancybox-button fancybox-button--play" title="{{PLAY_START}}"></button>',
                fullScreen: '<button data-fancybox-fullscreen class="fancybox-button fancybox-button--fullscreen" title="{{FULL_SCREEN}}"></button>',
                thumbs: '<button data-fancybox-thumbs class="fancybox-button fancybox-button--thumbs" title="{{THUMBS}}"></button>',
                close: '<button data-fancybox-close class="fancybox-button fancybox-button--close" title="{{CLOSE}}"></button>',
                smallBtn: '<button data-fancybox-close class="fancybox-close-small" title="{{CLOSE}}"></button>'
            },
            parentEl: "body",
            autoFocus: !0,
            backFocus: !0,
            trapFocus: !0,
            fullScreen: {autoStart: !1},
            touch: {vertical: !0, momentum: !0},
            hash: null,
            media: {},
            slideShow: {autoStart: !1, speed: 4e3},
            thumbs: {autoStart: !1, hideOnClose: !0},
            onInit: n.noop,
            beforeLoad: n.noop,
            afterLoad: n.noop,
            beforeShow: n.noop,
            afterShow: n.noop,
            beforeClose: n.noop,
            afterClose: n.noop,
            onActivate: n.noop,
            onDeactivate: n.noop,
            clickContent: function (t, e) {
                return "image" === t.type && "zoom"
            },
            clickSlide: "close",
            clickOutside: "close",
            dblclickContent: !1,
            dblclickSlide: !1,
            dblclickOutside: !1,
            mobile: {
                clickContent: function (t, e) {
                    return "image" === t.type && "toggleControls"
                }, clickSlide: function (t, e) {
                    return "image" === t.type ? "toggleControls" : "close"
                }, dblclickContent: function (t, e) {
                    return "image" === t.type && "zoom"
                }, dblclickSlide: function (t, e) {
                    return "image" === t.type && "zoom"
                }
            },
            lang: "en",
            i18n: {
                en: {
                    CLOSE: "Close",
                    NEXT: "Next",
                    PREV: "Previous",
                    ERROR: "The requested content cannot be loaded. <br/> Please try again later.",
                    PLAY_START: "Start slideshow",
                    PLAY_STOP: "Pause slideshow",
                    FULL_SCREEN: "Full screen",
                    THUMBS: "Thumbnails"
                },
                de: {
                    CLOSE: "Schliessen",
                    NEXT: "Weiter",
                    PREV: "Zurück",
                    ERROR: "Die angeforderten Daten konnten nicht geladen werden. <br/> Bitte versuchen Sie es später nochmal.",
                    PLAY_START: "Diaschau starten",
                    PLAY_STOP: "Diaschau beenden",
                    FULL_SCREEN: "Vollbild",
                    THUMBS: "Vorschaubilder"
                }
            }
        }, s = n(t), r = n(e), c = 0, l = function (t) {
            return t && t.hasOwnProperty && t instanceof n
        }, u = function () {
            return t.requestAnimationFrame || t.webkitRequestAnimationFrame || t.mozRequestAnimationFrame || t.oRequestAnimationFrame || function (e) {
                return t.setTimeout(e, 1e3 / 60)
            }
        }(), d = function () {
            var t, n = e.createElement("fakeelement"), i = {
                transition: "transitionend",
                OTransition: "oTransitionEnd",
                MozTransition: "transitionend",
                WebkitTransition: "webkitTransitionEnd"
            };
            for (t in i) if (n.style[t] !== o) return i[t]
        }(), f = function (t) {
            return t && t.length && t[0].offsetHeight
        }, h = function (t, o, i) {
            var s = this;
            s.opts = n.extend(!0, {index: i}, a, o || {}), o && n.isArray(o.buttons) && (s.opts.buttons = o.buttons), s.id = s.opts.id || ++c, s.group = [], s.currIndex = parseInt(s.opts.index, 10) || 0, s.prevIndex = null, s.prevPos = null, s.currPos = 0, s.firstRun = null, s.createGroup(t), s.group.length && (s.$lastFocus = n(e.activeElement).blur(), s.slides = {}, s.init(t))
        };
        n.extend(h.prototype, {
            init: function () {
                var t, e, o, i = this, a = i.group[i.currIndex].opts;
                i.scrollTop = r.scrollTop(), i.scrollLeft = r.scrollLeft(), n.fancybox.getInstance() || n.fancybox.isMobile || "hidden" === n("body").css("overflow") || (t = n("body").width(), n("html").addClass("fancybox-enabled"), t = n("body").width() - t, t > 1 && n("head").append('<style id="fancybox-style-noscroll" type="text/css">.compensate-for-scrollbar, .fancybox-enabled body { margin-right: ' + t + "px; }</style>")), o = "", n.each(a.buttons, function (t, e) {
                    o += a.btnTpl[e] || ""
                }), e = n(i.translate(i, a.baseTpl.replace("{{BUTTONS}}", o))).addClass("fancybox-is-hidden").attr("id", "fancybox-container-" + i.id).addClass(a.baseClass).data("FancyBox", i).prependTo(a.parentEl), i.$refs = {container: e}, ["bg", "inner", "infobar", "toolbar", "stage", "caption"].forEach(function (t) {
                    i.$refs[t] = e.find(".fancybox-" + t)
                }), (!a.arrows || i.group.length < 2) && e.find(".fancybox-navigation").remove(), a.infobar || i.$refs.infobar.remove(), a.toolbar || i.$refs.toolbar.remove(), i.trigger("onInit"), i.activate(), i.jumpTo(i.currIndex)
            }, translate: function (t, e) {
                var n = t.opts.i18n[t.opts.lang];
                return e.replace(/\{\{(\w+)\}\}/g, function (t, e) {
                    var i = n[e];
                    return i === o ? t : i
                })
            }, createGroup: function (t) {
                var e = this, i = n.makeArray(t);
                n.each(i, function (t, i) {
                    var a, s, r, c, l = {}, u = {}, d = [];
                    n.isPlainObject(i) ? (l = i, u = i.opts || i) : "object" === n.type(i) && n(i).length ? (a = n(i), d = a.data(), u = "options" in d ? d.options : {}, u = "object" === n.type(u) ? u : {}, l.src = "src" in d ? d.src : u.src || a.attr("href"), ["width", "height", "thumb", "type", "filter"].forEach(function (t) {
                        t in d && (u[t] = d[t])
                    }), "srcset" in d && (u.image = {srcset: d.srcset}), u.$orig = a, l.type || l.src || (l.type = "inline", l.src = i)) : l = {
                        type: "html",
                        src: i + ""
                    }, l.opts = n.extend(!0, {}, e.opts, u), n.fancybox.isMobile && (l.opts = n.extend(!0, {}, l.opts, l.opts.mobile)), s = l.type || l.opts.type, r = l.src || "", !s && r && (r.match(/(^data:image\/[a-z0-9+\/=]*,)|(\.(jp(e|g|eg)|gif|png|bmp|webp|svg|ico)((\?|#).*)?$)/i) ? s = "image" : r.match(/\.(pdf)((\?|#).*)?$/i) ? s = "pdf" : "#" === r.charAt(0) && (s = "inline")), l.type = s, l.index = e.group.length, l.opts.$orig && !l.opts.$orig.length && delete l.opts.$orig, !l.opts.$thumb && l.opts.$orig && (l.opts.$thumb = l.opts.$orig.find("img:first")), l.opts.$thumb && !l.opts.$thumb.length && delete l.opts.$thumb, "function" === n.type(l.opts.caption) ? l.opts.caption = l.opts.caption.apply(i, [e, l]) : "caption" in d && (l.opts.caption = d.caption), l.opts.caption = l.opts.caption === o ? "" : l.opts.caption + "", "ajax" === s && (c = r.split(/\s+/, 2), c.length > 1 && (l.src = c.shift(), l.opts.filter = c.shift())), "auto" == l.opts.smallBtn && (n.inArray(s, ["html", "inline", "ajax"]) > -1 ? (l.opts.toolbar = !1, l.opts.smallBtn = !0) : l.opts.smallBtn = !1), "pdf" === s && (l.type = "iframe", l.opts.iframe.preload = !1), l.opts.modal && (l.opts = n.extend(!0, l.opts, {
                        infobar: 0,
                        toolbar: 0,
                        smallBtn: 0,
                        keyboard: 0,
                        slideShow: 0,
                        fullScreen: 0,
                        thumbs: 0,
                        touch: 0,
                        clickContent: !1,
                        clickSlide: !1,
                        clickOutside: !1,
                        dblclickContent: !1,
                        dblclickSlide: !1,
                        dblclickOutside: !1
                    })), e.group.push(l)
                })
            }, addEvents: function () {
                var o = this;
                o.removeEvents(), o.$refs.container.on("click.fb-close", "[data-fancybox-close]", function (t) {
                    t.stopPropagation(), t.preventDefault(), o.close(t)
                }).on("click.fb-prev touchend.fb-prev", "[data-fancybox-prev]", function (t) {
                    t.stopPropagation(), t.preventDefault(), o.previous()
                }).on("click.fb-next touchend.fb-next", "[data-fancybox-next]", function (t) {
                    t.stopPropagation(), t.preventDefault(), o.next()
                }), s.on("orientationchange.fb resize.fb", function (t) {
                    t && t.originalEvent && "resize" === t.originalEvent.type ? u(function () {
                        o.update()
                    }) : (o.$refs.stage.hide(), setTimeout(function () {
                        o.$refs.stage.show(), o.update()
                    }, 500))
                }), r.on("focusin.fb", function (t) {
                    var i = n.fancybox ? n.fancybox.getInstance() : null;
                    i.isClosing || !i.current || !i.current.opts.trapFocus || n(t.target).hasClass("fancybox-container") || n(t.target).is(e) || i && "fixed" !== n(t.target).css("position") && !i.$refs.container.has(t.target).length && (t.stopPropagation(), i.focus(), s.scrollTop(o.scrollTop).scrollLeft(o.scrollLeft))
                }), r.on("keydown.fb", function (t) {
                    var e = o.current, i = t.keyCode || t.which;
                    if (e && e.opts.keyboard && !n(t.target).is("input") && !n(t.target).is("textarea")) return 8 === i || 27 === i ? (t.preventDefault(), void o.close(t)) : 37 === i || 38 === i ? (t.preventDefault(), void o.previous()) : 39 === i || 40 === i ? (t.preventDefault(), void o.next()) : void o.trigger("afterKeydown", t, i)
                }), o.group[o.currIndex].opts.idleTime && (o.idleSecondsCounter = 0, r.on("mousemove.fb-idle mouseenter.fb-idle mouseleave.fb-idle mousedown.fb-idle touchstart.fb-idle touchmove.fb-idle scroll.fb-idle keydown.fb-idle", function () {
                    o.idleSecondsCounter = 0, o.isIdle && o.showControls(), o.isIdle = !1
                }), o.idleInterval = t.setInterval(function () {
                    o.idleSecondsCounter++, o.idleSecondsCounter >= o.group[o.currIndex].opts.idleTime && (o.isIdle = !0, o.idleSecondsCounter = 0, o.hideControls())
                }, 1e3))
            }, removeEvents: function () {
                var e = this;
                s.off("orientationchange.fb resize.fb"), r.off("focusin.fb keydown.fb .fb-idle"), this.$refs.container.off(".fb-close .fb-prev .fb-next"), e.idleInterval && (t.clearInterval(e.idleInterval), e.idleInterval = null)
            }, previous: function (t) {
                return this.jumpTo(this.currPos - 1, t)
            }, next: function (t) {
                return this.jumpTo(this.currPos + 1, t)
            }, jumpTo: function (t, e, i) {
                var a, s, r, c, l, u, d, h = this, p = h.group.length;
                if (!(h.isSliding || h.isClosing || h.isAnimating && h.firstRun)) {
                    if (t = parseInt(t, 10), s = h.current ? h.current.opts.loop : h.opts.loop, !s && (t < 0 || t >= p)) return !1;
                    if (a = h.firstRun = null === h.firstRun, !(p < 2 && !a && h.isSliding)) {
                        if (c = h.current, h.prevIndex = h.currIndex, h.prevPos = h.currPos, r = h.createSlide(t), p > 1 && ((s || r.index > 0) && h.createSlide(t - 1), (s || r.index < p - 1) && h.createSlide(t + 1)), h.current = r, h.currIndex = r.index, h.currPos = r.pos, h.trigger("beforeShow", a), h.updateControls(), u = n.fancybox.getTranslate(r.$slide), r.isMoved = (0 !== u.left || 0 !== u.top) && !r.$slide.hasClass("fancybox-animated"), r.forcedDuration = o, n.isNumeric(e) ? r.forcedDuration = e : e = r.opts[a ? "animationDuration" : "transitionDuration"], e = parseInt(e, 10), a) return r.opts.animationEffect && e && h.$refs.container.css("transition-duration", e + "ms"), h.$refs.container.removeClass("fancybox-is-hidden"), f(h.$refs.container), h.$refs.container.addClass("fancybox-is-open"), r.$slide.addClass("fancybox-slide--current"), h.loadSlide(r), void h.preload();
                        n.each(h.slides, function (t, e) {
                            n.fancybox.stop(e.$slide)
                        }), r.$slide.removeClass("fancybox-slide--next fancybox-slide--previous").addClass("fancybox-slide--current"), r.isMoved ? (l = Math.round(r.$slide.width()), n.each(h.slides, function (t, o) {
                            var i = o.pos - r.pos;
                            n.fancybox.animate(o.$slide, {top: 0, left: i * l + i * o.opts.gutter}, e, function () {
                                o.$slide.removeAttr("style").removeClass("fancybox-slide--next fancybox-slide--previous"), o.pos === h.currPos && (r.isMoved = !1, h.complete())
                            })
                        })) : h.$refs.stage.children().removeAttr("style"), r.isLoaded ? h.revealContent(r) : h.loadSlide(r), h.preload(), c.pos !== r.pos && (d = "fancybox-slide--" + (c.pos > r.pos ? "next" : "previous"), c.$slide.removeClass("fancybox-slide--complete fancybox-slide--current fancybox-slide--next fancybox-slide--previous"), c.isComplete = !1, e && (r.isMoved || r.opts.transitionEffect) && (r.isMoved ? c.$slide.addClass(d) : (d = "fancybox-animated " + d + " fancybox-fx-" + r.opts.transitionEffect, n.fancybox.animate(c.$slide, d, e, function () {
                            c.$slide.removeClass(d).removeAttr("style")
                        }))))
                    }
                }
            }, createSlide: function (t) {
                var e, o, i = this;
                return o = t % i.group.length, o = o < 0 ? i.group.length + o : o, !i.slides[t] && i.group[o] && (e = n('<div class="fancybox-slide"></div>').appendTo(i.$refs.stage), i.slides[t] = n.extend(!0, {}, i.group[o], {
                    pos: t,
                    $slide: e,
                    isLoaded: !1
                }), i.updateSlide(i.slides[t])), i.slides[t]
            }, scaleToActual: function (t, e, i) {
                var a, s, r, c, l, u = this, d = u.current, f = d.$content, h = parseInt(d.$slide.width(), 10),
                    p = parseInt(d.$slide.height(), 10), g = d.width, b = d.height;
                "image" != d.type || d.hasError || !f || u.isAnimating || (n.fancybox.stop(f), u.isAnimating = !0, t = t === o ? .5 * h : t, e = e === o ? .5 * p : e, a = n.fancybox.getTranslate(f), c = g / a.width, l = b / a.height, s = .5 * h - .5 * g, r = .5 * p - .5 * b, g > h && (s = a.left * c - (t * c - t), s > 0 && (s = 0), s < h - g && (s = h - g)), b > p && (r = a.top * l - (e * l - e), r > 0 && (r = 0), r < p - b && (r = p - b)), u.updateCursor(g, b), n.fancybox.animate(f, {
                    top: r,
                    left: s,
                    scaleX: c,
                    scaleY: l
                }, i || 330, function () {
                    u.isAnimating = !1
                }), u.SlideShow && u.SlideShow.isActive && u.SlideShow.stop())
            }, scaleToFit: function (t) {
                var e, o = this, i = o.current, a = i.$content;
                "image" != i.type || i.hasError || !a || o.isAnimating || (n.fancybox.stop(a), o.isAnimating = !0, e = o.getFitPos(i), o.updateCursor(e.width, e.height), n.fancybox.animate(a, {
                    top: e.top,
                    left: e.left,
                    scaleX: e.width / a.width(),
                    scaleY: e.height / a.height()
                }, t || 330, function () {
                    o.isAnimating = !1
                }))
            }, getFitPos: function (t) {
                var e, o, i, a, r, c = this, l = t.$content, u = t.width, d = t.height, f = t.opts.margin;
                return !(!l || !l.length || !u && !d) && ("number" === n.type(f) && (f = [f, f]), 2 == f.length && (f = [f[0], f[1], f[0], f[1]]), s.width() < 800 && (f = [0, 0, 0, 0]), e = parseInt(c.$refs.stage.width(), 10) - (f[1] + f[3]), o = parseInt(c.$refs.stage.height(), 10) - (f[0] + f[2]), i = Math.min(1, e / u, o / d), a = Math.floor(i * u), r = Math.floor(i * d), {
                    top: Math.floor(.5 * (o - r)) + f[0],
                    left: Math.floor(.5 * (e - a)) + f[3],
                    width: a,
                    height: r
                })
            }, update: function () {
                var t = this;
                n.each(t.slides, function (e, n) {
                    t.updateSlide(n)
                })
            }, updateSlide: function (t) {
                var e = this, o = t.$content;
                o && (t.width || t.height) && (n.fancybox.stop(o), n.fancybox.setTranslate(o, e.getFitPos(t)), t.pos === e.currPos && e.updateCursor()), t.$slide.trigger("refresh"), e.trigger("onUpdate", t)
            }, updateCursor: function (t, e) {
                var n, i = this,
                    a = i.$refs.container.removeClass("fancybox-is-zoomable fancybox-can-zoomIn fancybox-can-drag fancybox-can-zoomOut");
                i.current && !i.isClosing && (i.isZoomable() ? (a.addClass("fancybox-is-zoomable"), n = t !== o && e !== o ? t < i.current.width && e < i.current.height : i.isScaledDown(), n ? a.addClass("fancybox-can-zoomIn") : i.current.opts.touch ? a.addClass("fancybox-can-drag") : a.addClass("fancybox-can-zoomOut")) : i.current.opts.touch && a.addClass("fancybox-can-drag"))
            }, isZoomable: function () {
                var t, e = this, o = e.current;
                if (o && !e.isClosing) return !!("image" === o.type && o.isLoaded && !o.hasError && ("zoom" === o.opts.clickContent || n.isFunction(o.opts.clickContent) && "zoom" === o.opts.clickContent(o)) && (t = e.getFitPos(o), o.width > t.width || o.height > t.height))
            }, isScaledDown: function () {
                var t = this, e = t.current, o = e.$content, i = !1;
                return o && (i = n.fancybox.getTranslate(o), i = i.width < e.width || i.height < e.height), i
            }, canPan: function () {
                var t = this, e = t.current, n = e.$content, o = !1;
                return n && (o = t.getFitPos(e), o = Math.abs(n.width() - o.width) > 1 || Math.abs(n.height() - o.height) > 1), o
            }, loadSlide: function (t) {
                var e, o, i, a = this;
                if (!t.isLoading && !t.isLoaded) {
                    switch (t.isLoading = !0, a.trigger("beforeLoad", t), e = t.type, o = t.$slide, o.off("refresh").trigger("onReset").addClass("fancybox-slide--" + (e || "unknown")).addClass(t.opts.slideClass), e) {
                        case"image":
                            a.setImage(t);
                            break;
                        case"iframe":
                            a.setIframe(t);
                            break;
                        case"html":
                            a.setContent(t, t.src || t.content);
                            break;
                        case"inline":
                            n(t.src).length ? a.setContent(t, n(t.src)) : a.setError(t);
                            break;
                        case"ajax":
                            a.showLoading(t), i = n.ajax(n.extend({}, t.opts.ajax.settings, {
                                url: t.src,
                                success: function (e, n) {
                                    "success" === n && a.setContent(t, e)
                                },
                                error: function (e, n) {
                                    e && "abort" !== n && a.setError(t)
                                }
                            })), o.one("onReset", function () {
                                i.abort()
                            });
                            break;
                        default:
                            a.setError(t)
                    }
                    return !0
                }
            }, setImage: function (e) {
                var o, i, a, s, r = this, c = e.opts.image.srcset;
                if (c) {
                    a = t.devicePixelRatio || 1, s = t.innerWidth * a, i = c.split(",").map(function (t) {
                        var e = {};
                        return t.trim().split(/\s+/).forEach(function (t, n) {
                            var o = parseInt(t.substring(0, t.length - 1), 10);
                            return 0 === n ? e.url = t : void (o && (e.value = o, e.postfix = t[t.length - 1]))
                        }), e
                    }), i.sort(function (t, e) {
                        return t.value - e.value
                    });
                    for (var l = 0; l < i.length; l++) {
                        var u = i[l];
                        if ("w" === u.postfix && u.value >= s || "x" === u.postfix && u.value >= a) {
                            o = u;
                            break
                        }
                    }
                    !o && i.length && (o = i[i.length - 1]), o && (e.src = o.url, e.width && e.height && "w" == o.postfix && (e.height = e.width / e.height * o.value, e.width = o.value))
                }
                e.$content = n('<div class="fancybox-image-wrap"></div>').addClass("fancybox-is-hidden").appendTo(e.$slide), e.opts.preload !== !1 && e.opts.width && e.opts.height && (e.opts.thumb || e.opts.$thumb) ? (e.width = e.opts.width, e.height = e.opts.height, e.$ghost = n("<img />").one("error", function () {
                    n(this).remove(), e.$ghost = null, r.setBigImage(e)
                }).one("load", function () {
                    r.afterLoad(e), r.setBigImage(e)
                }).addClass("fancybox-image").appendTo(e.$content).attr("src", e.opts.thumb || e.opts.$thumb.attr("src"))) : r.setBigImage(e)
            }, setBigImage: function (t) {
                var e = this, o = n("<img />");
                t.$image = o.one("error", function () {
                    e.setError(t)
                }).one("load", function () {
                    clearTimeout(t.timouts), t.timouts = null, e.isClosing || (t.width = this.naturalWidth, t.height = this.naturalHeight, t.opts.image.srcset && o.attr("sizes", "100vw").attr("srcset", t.opts.image.srcset), e.hideLoading(t), t.$ghost ? t.timouts = setTimeout(function () {
                        t.timouts = null, t.$ghost.hide()
                    }, Math.min(300, Math.max(1e3, t.height / 1600))) : e.afterLoad(t))
                }).addClass("fancybox-image").attr("src", t.src).appendTo(t.$content), o[0].complete ? o.trigger("load") : o[0].error ? o.trigger("error") : t.timouts = setTimeout(function () {
                    o[0].complete || t.hasError || e.showLoading(t)
                }, 100)
            }, setIframe: function (t) {
                var e, i = this, a = t.opts.iframe, s = t.$slide;
                t.$content = n('<div class="fancybox-content' + (a.preload ? " fancybox-is-hidden" : "") + '"></div>').css(a.css).appendTo(s), e = n(a.tpl.replace(/\{rnd\}/g, (new Date).getTime())).attr(a.attr).appendTo(t.$content), a.preload ? (i.showLoading(t), e.on("load.fb error.fb", function (e) {
                    this.isReady = 1, t.$slide.trigger("refresh"), i.afterLoad(t)
                }), s.on("refresh.fb", function () {
                    var n, i, s, r, c, l = t.$content;
                    if (1 === e[0].isReady) {
                        try {
                            n = e.contents(), i = n.find("body")
                        } catch (t) {
                        }
                        i && i.length && (a.css.width === o || a.css.height === o) && (s = e[0].contentWindow.document.documentElement.scrollWidth, r = Math.ceil(i.outerWidth(!0) + (l.width() - s)), c = Math.ceil(i.outerHeight(!0)), l.css({
                            width: a.css.width === o ? r + (l.outerWidth() - l.innerWidth()) : a.css.width,
                            height: a.css.height === o ? c + (l.outerHeight() - l.innerHeight()) : a.css.height
                        })), l.removeClass("fancybox-is-hidden")
                    }
                })) : this.afterLoad(t), e.attr("src", t.src), t.opts.smallBtn === !0 && t.$content.prepend(i.translate(t, t.opts.btnTpl.smallBtn)), s.one("onReset", function () {
                    try {
                        n(this).find("iframe").hide().attr("src", "//about:blank")
                    } catch (t) {
                    }
                    n(this).empty(), t.isLoaded = !1
                })
            }, setContent: function (t, e) {
                var o = this;
                o.isClosing || (o.hideLoading(t), t.$slide.empty(), l(e) && e.parent().length ? (e.parent(".fancybox-slide--inline").trigger("onReset"), t.$placeholder = n("<div></div>").hide().insertAfter(e), e.css("display", "inline-block")) : t.hasError || ("string" === n.type(e) && (e = n("<div>").append(n.trim(e)).contents(), 3 === e[0].nodeType && (e = n("<div>").html(e))), t.opts.filter && (e = n("<div>").html(e).find(t.opts.filter))), t.$slide.one("onReset", function () {
                    t.$placeholder && (t.$placeholder.after(e.hide()).remove(), t.$placeholder = null), t.$smallBtn && (t.$smallBtn.remove(), t.$smallBtn = null), t.hasError || (n(this).empty(), t.isLoaded = !1)
                }), t.$content = n(e).appendTo(t.$slide), t.opts.smallBtn && !t.$smallBtn && (t.$smallBtn = n(o.translate(t, t.opts.btnTpl.smallBtn)).appendTo(t.$content)), this.afterLoad(t))
            }, setError: function (t) {
                t.hasError = !0, t.$slide.removeClass("fancybox-slide--" + t.type), this.setContent(t, this.translate(t, t.opts.errorTpl))
            }, showLoading: function (t) {
                var e = this;
                t = t || e.current, t && !t.$spinner && (t.$spinner = n(e.opts.spinnerTpl).appendTo(t.$slide))
            }, hideLoading: function (t) {
                var e = this;
                t = t || e.current, t && t.$spinner && (t.$spinner.remove(), delete t.$spinner)
            }, afterLoad: function (t) {
                var e = this;
                e.isClosing || (t.isLoading = !1, t.isLoaded = !0, e.trigger("afterLoad", t), e.hideLoading(t), t.opts.protect && t.$content && !t.hasError && (t.$content.on("contextmenu.fb", function (t) {
                    return 2 == t.button && t.preventDefault(), !0
                }), "image" === t.type && n('<div class="fancybox-spaceball"></div>').appendTo(t.$content)), e.revealContent(t))
            }, revealContent: function (t) {
                var e, i, a, s, r, c = this, l = t.$slide, u = !1;
                return e = t.opts[c.firstRun ? "animationEffect" : "transitionEffect"], a = t.opts[c.firstRun ? "animationDuration" : "transitionDuration"], a = parseInt(t.forcedDuration === o ? a : t.forcedDuration, 10), !t.isMoved && t.pos === c.currPos && a || (e = !1), "zoom" !== e || t.pos === c.currPos && a && "image" === t.type && !t.hasError && (u = c.getThumbPos(t)) || (e = "fade"), "zoom" === e ? (r = c.getFitPos(t), r.scaleX = Math.round(r.width / u.width * 100) / 100, r.scaleY = Math.round(r.height / u.height * 100) / 100, delete r.width, delete r.height, s = t.opts.zoomOpacity, "auto" == s && (s = Math.abs(t.width / t.height - u.width / u.height) > .1), s && (u.opacity = .1, r.opacity = 1), n.fancybox.setTranslate(t.$content.removeClass("fancybox-is-hidden"), u), f(t.$content), void n.fancybox.animate(t.$content, r, a, function () {
                    c.complete()
                })) : (c.updateSlide(t), e ? (n.fancybox.stop(l), i = "fancybox-animated fancybox-slide--" + (t.pos > c.prevPos ? "next" : "previous") + " fancybox-fx-" + e, l.removeAttr("style").removeClass("fancybox-slide--current fancybox-slide--next fancybox-slide--previous").addClass(i), t.$content.removeClass("fancybox-is-hidden"), f(l), void n.fancybox.animate(l, "fancybox-slide--current", a, function (e) {
                    l.removeClass(i).removeAttr("style"), t.pos === c.currPos && c.complete()
                }, !0)) : (f(l), t.$content.removeClass("fancybox-is-hidden"), void (t.pos === c.currPos && c.complete())))
            }, getThumbPos: function (o) {
                var i, a = this, s = !1, r = function (e) {
                    for (var o, i = e[0], a = i.getBoundingClientRect(), s = []; null !== i.parentElement;) "hidden" !== n(i.parentElement).css("overflow") && "auto" !== n(i.parentElement).css("overflow") || s.push(i.parentElement.getBoundingClientRect()), i = i.parentElement;
                    return o = s.every(function (t) {
                        var e = Math.min(a.right, t.right) - Math.max(a.left, t.left),
                            n = Math.min(a.bottom, t.bottom) - Math.max(a.top, t.top);
                        return e > 0 && n > 0
                    }), o && a.bottom > 0 && a.right > 0 && a.left < n(t).width() && a.top < n(t).height()
                }, c = o.opts.$thumb, l = c ? c.offset() : 0;
                return l && c[0].ownerDocument === e && r(c) && (i = a.$refs.stage.offset(), s = {
                    top: l.top - i.top + parseFloat(c.css("border-top-width") || 0),
                    left: l.left - i.left + parseFloat(c.css("border-left-width") || 0),
                    width: c.width(),
                    height: c.height(),
                    scaleX: 1,
                    scaleY: 1
                }), s
            }, complete: function () {
                var t = this, o = t.current, i = {};
                o.isMoved || !o.isLoaded || o.isComplete || (o.isComplete = !0, o.$slide.siblings().trigger("onReset"), f(o.$slide), o.$slide.addClass("fancybox-slide--complete"), n.each(t.slides, function (e, o) {
                    o.pos >= t.currPos - 1 && o.pos <= t.currPos + 1 ? i[o.pos] = o : o && (n.fancybox.stop(o.$slide), o.$slide.unbind().remove())
                }), t.slides = i, t.updateCursor(), t.trigger("afterShow"), (n(e.activeElement).is("[disabled]") || o.opts.autoFocus && "image" != o.type && "iframe" !== o.type) && t.focus())
            }, preload: function () {
                var t, e, n = this;
                n.group.length < 2 || (t = n.slides[n.currPos + 1], e = n.slides[n.currPos - 1], t && "image" === t.type && n.loadSlide(t), e && "image" === e.type && n.loadSlide(e))
            }, focus: function () {
                var t, e = this.current;
                this.isClosing || (t = e && e.isComplete ? e.$slide.find("button,:input,[tabindex],a").filter(":not([disabled]):visible:first") : null, t = t && t.length ? t : this.$refs.container, t.focus())
            }, activate: function () {
                var t = this;
                n(".fancybox-container").each(function () {
                    var e = n(this).data("FancyBox");
                    e && e.uid !== t.uid && !e.isClosing && e.trigger("onDeactivate")
                }), t.current && (t.$refs.container.index() > 0 && t.$refs.container.prependTo(e.body), t.updateControls()), t.trigger("onActivate"), t.addEvents()
            }, close: function (t, e) {
                var o, i, a, s, r, c, l = this, f = l.current, h = function () {
                    l.cleanUp(t)
                };
                return !l.isClosing && (l.isClosing = !0, l.trigger("beforeClose", t) === !1 ? (l.isClosing = !1, u(function () {
                    l.update()
                }), !1) : (l.removeEvents(), f.timouts && clearTimeout(f.timouts), a = f.$content, o = f.opts.animationEffect, i = n.isNumeric(e) ? e : o ? f.opts.animationDuration : 0, f.$slide.off(d).removeClass("fancybox-slide--complete fancybox-slide--next fancybox-slide--previous fancybox-animated"), f.$slide.siblings().trigger("onReset").remove(), i && l.$refs.container.removeClass("fancybox-is-open").addClass("fancybox-is-closing"), l.hideLoading(f), l.hideControls(), l.updateCursor(), "zoom" !== o || t !== !0 && a && i && "image" === f.type && !f.hasError && (c = l.getThumbPos(f)) || (o = "fade"), "zoom" === o ? (n.fancybox.stop(a), r = n.fancybox.getTranslate(a), r.width = r.width * r.scaleX, r.height = r.height * r.scaleY, s = f.opts.zoomOpacity, "auto" == s && (s = Math.abs(f.width / f.height - c.width / c.height) > .1), s && (c.opacity = 0), r.scaleX = r.width / c.width, r.scaleY = r.height / c.height, r.width = c.width, r.height = c.height, n.fancybox.setTranslate(f.$content, r), n.fancybox.animate(f.$content, c, i, h), !0) : (o && i ? t === !0 ? setTimeout(h, i) : n.fancybox.animate(f.$slide.removeClass("fancybox-slide--current"), "fancybox-animated fancybox-slide--previous fancybox-fx-" + o, i, h) : h(), !0)))
            }, cleanUp: function (t) {
                var e, o = this;
                o.current.$slide.trigger("onReset"), o.$refs.container.empty().remove(), o.trigger("afterClose", t), o.$lastFocus && !o.current.focusBack && o.$lastFocus.focus(), o.current = null, e = n.fancybox.getInstance(), e ? e.activate() : (s.scrollTop(o.scrollTop).scrollLeft(o.scrollLeft), n("html").removeClass("fancybox-enabled"), n("#fancybox-style-noscroll").remove())
            }, trigger: function (t, e) {
                var o, i = Array.prototype.slice.call(arguments, 1), a = this, s = e && e.opts ? e : a.current;
                return s ? i.unshift(s) : s = a, i.unshift(a), n.isFunction(s.opts[t]) && (o = s.opts[t].apply(s, i)), o === !1 ? o : void ("afterClose" === t ? r.trigger(t + ".fb", i) : a.$refs.container.trigger(t + ".fb", i))
            }, updateControls: function (t) {
                var e = this, o = e.current, i = o.index, a = o.opts, s = a.caption, r = e.$refs.caption;
                o.$slide.trigger("refresh"), e.$caption = s && s.length ? r.html(s) : null, e.isHiddenControls || e.showControls(), n("[data-fancybox-count]").html(e.group.length), n("[data-fancybox-index]").html(i + 1), n("[data-fancybox-prev]").prop("disabled", !a.loop && i <= 0), n("[data-fancybox-next]").prop("disabled", !a.loop && i >= e.group.length - 1)
            }, hideControls: function () {
                this.isHiddenControls = !0, this.$refs.container.removeClass("fancybox-show-infobar fancybox-show-toolbar fancybox-show-caption fancybox-show-nav")
            }, showControls: function () {
                var t = this, e = t.current ? t.current.opts : t.opts, n = t.$refs.container;
                t.isHiddenControls = !1, t.idleSecondsCounter = 0, n.toggleClass("fancybox-show-toolbar", !(!e.toolbar || !e.buttons)).toggleClass("fancybox-show-infobar", !!(e.infobar && t.group.length > 1)).toggleClass("fancybox-show-nav", !!(e.arrows && t.group.length > 1)).toggleClass("fancybox-is-modal", !!e.modal), t.$caption ? n.addClass("fancybox-show-caption ") : n.removeClass("fancybox-show-caption")
            }, toggleControls: function () {
                this.isHiddenControls ? this.showControls() : this.hideControls()
            }
        }), n.fancybox = {
            version: "3.1.20",
            defaults: a,
            getInstance: function (t) {
                var e = n('.fancybox-container:not(".fancybox-is-closing"):first').data("FancyBox"),
                    o = Array.prototype.slice.call(arguments, 1);
                return e instanceof h && ("string" === n.type(t) ? e[t].apply(e, o) : "function" === n.type(t) && t.apply(e, o), e)
            },
            open: function (t, e, n) {
                return new h(t, e, n)
            },
            close: function (t) {
                var e = this.getInstance();
                e && (e.close(), t === !0 && this.close())
            },
            destroy: function () {
                this.close(!0), r.off("click.fb-start")
            },
            isMobile: e.createTouch !== o && /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent),
            use3d: function () {
                var n = e.createElement("div");
                return t.getComputedStyle && t.getComputedStyle(n).getPropertyValue("transform") && !(e.documentMode && e.documentMode < 11)
            }(),
            getTranslate: function (t) {
                var e;
                if (!t || !t.length) return !1;
                if (e = t.eq(0).css("transform"), e && e.indexOf("matrix") !== -1 ? (e = e.split("(")[1], e = e.split(")")[0], e = e.split(",")) : e = [], e.length) e = e.length > 10 ? [e[13], e[12], e[0], e[5]] : [e[5], e[4], e[0], e[3]], e = e.map(parseFloat); else {
                    e = [0, 0, 1, 1];
                    var n = /\.*translate\((.*)px,(.*)px\)/i, o = n.exec(t.eq(0).attr("style"));
                    o && (e[0] = parseFloat(o[2]), e[1] = parseFloat(o[1]))
                }
                return {
                    top: e[0],
                    left: e[1],
                    scaleX: e[2],
                    scaleY: e[3],
                    opacity: parseFloat(t.css("opacity")),
                    width: t.width(),
                    height: t.height()
                }
            },
            setTranslate: function (t, e) {
                var n = "", i = {};
                if (t && e) return e.left === o && e.top === o || (n = (e.left === o ? t.position().left : e.left) + "px, " + (e.top === o ? t.position().top : e.top) + "px", n = this.use3d ? "translate3d(" + n + ", 0px)" : "translate(" + n + ")"), e.scaleX !== o && e.scaleY !== o && (n = (n.length ? n + " " : "") + "scale(" + e.scaleX + ", " + e.scaleY + ")"), n.length && (i.transform = n), e.opacity !== o && (i.opacity = e.opacity), e.width !== o && (i.width = e.width), e.height !== o && (i.height = e.height), t.css(i)
            },
            animate: function (t, e, i, a, s) {
                var r = d || "transitionend";
                n.isFunction(i) && (a = i, i = null), n.isPlainObject(e) || t.removeAttr("style"), t.on(r, function (i) {
                    (!i || !i.originalEvent || t.is(i.originalEvent.target) && "z-index" != i.originalEvent.propertyName) && (t.off(r), n.isPlainObject(e) ? e.scaleX !== o && e.scaleY !== o && (t.css("transition-duration", "0ms"), e.width = t.width() * e.scaleX, e.height = t.height() * e.scaleY, e.scaleX = 1, e.scaleY = 1, n.fancybox.setTranslate(t, e)) : s !== !0 && t.removeClass(e), n.isFunction(a) && a(i))
                }), n.isNumeric(i) && t.css("transition-duration", i + "ms"), n.isPlainObject(e) ? n.fancybox.setTranslate(t, e) : t.addClass(e), t.data("timer", setTimeout(function () {
                    t.trigger("transitionend")
                }, i + 16))
            },
            stop: function (t) {
                clearTimeout(t.data("timer")), t.off(d)
            }
        }, n.fn.fancybox = function (t) {
            var e;
            return t = t || {}, e = t.selector || !1, e ? n("body").off("click.fb-start", e).on("click.fb-start", e, {
                items: n(e),
                options: t
            }, i) : this.off("click.fb-start").on("click.fb-start", {items: this, options: t}, i), this
        }, r.on("click.fb-start", "[data-fancybox]", i)
    }
}(window, document, window.jQuery), function (t) {
    "use strict";
    var e = function (e, n, o) {
        if (e) return o = o || "", "object" === t.type(o) && (o = t.param(o, !0)), t.each(n, function (t, n) {
            e = e.replace("$" + t, n || "")
        }), o.length && (e += (e.indexOf("?") > 0 ? "&" : "?") + o), e
    }, n = {
        youtube: {
            matcher: /(youtube\.com|youtu\.be|youtube\-nocookie\.com)\/(watch\?(.*&)?v=|v\/|u\/|embed\/?)?(videoseries\?list=(.*)|[\w-]{11}|\?listType=(.*)&list=(.*))(.*)/i,
            params: {autoplay: 1, autohide: 1, fs: 1, rel: 0, hd: 1, wmode: "transparent", enablejsapi: 1, html5: 1},
            paramPlace: 8,
            type: "iframe",
            url: "//www.youtube.com/embed/$4",
            thumb: "//img.youtube.com/vi/$4/hqdefault.jpg"
        },
        vimeo: {
            matcher: /^.+vimeo.com\/(.*\/)?([\d]+)(.*)?/,
            params: {autoplay: 1, hd: 1, show_title: 1, show_byline: 1, show_portrait: 0, fullscreen: 1, api: 1},
            paramPlace: 3,
            type: "iframe",
            url: "//player.vimeo.com/video/$2"
        },
        metacafe: {
            matcher: /metacafe.com\/watch\/(\d+)\/(.*)?/,
            type: "iframe",
            url: "//www.metacafe.com/embed/$1/?ap=1"
        },
        dailymotion: {
            matcher: /dailymotion.com\/video\/(.*)\/?(.*)/,
            params: {additionalInfos: 0, autoStart: 1},
            type: "iframe",
            url: "//www.dailymotion.com/embed/video/$1"
        },
        vine: {matcher: /vine.co\/v\/([a-zA-Z0-9\?\=\-]+)/, type: "iframe", url: "//vine.co/v/$1/embed/simple"},
        instagram: {
            matcher: /(instagr\.am|instagram\.com)\/p\/([a-zA-Z0-9_\-]+)\/?/i,
            type: "image",
            url: "//$1/p/$2/media/?size=l"
        },
        google_maps: {
            matcher: /(maps\.)?google\.([a-z]{2,3}(\.[a-z]{2})?)\/(((maps\/(place\/(.*)\/)?\@(.*),(\d+.?\d+?)z))|(\?ll=))(.*)?/i,
            type: "iframe",
            url: function (t) {
                return "//maps.google." + t[2] + "/?ll=" + (t[9] ? t[9] + "&z=" + Math.floor(t[10]) + (t[12] ? t[12].replace(/^\//, "&") : "") : t[12]) + "&output=" + (t[12] && t[12].indexOf("layer=c") > 0 ? "svembed" : "embed")
            }
        }
    };
    t(document).on("onInit.fb", function (o, i) {
        t.each(i.group, function (o, i) {
            var a, s, r, c, l, u, d, f = i.src || "", h = !1;
            i.type || (a = t.extend(!0, {}, n, i.opts.media), t.each(a, function (n, o) {
                if (r = f.match(o.matcher), u = {}, d = n, r) {
                    if (h = o.type, o.paramPlace && r[o.paramPlace]) {
                        l = r[o.paramPlace], "?" == l[0] && (l = l.substring(1)), l = l.split("&");
                        for (var a = 0; a < l.length; ++a) {
                            var p = l[a].split("=", 2);
                            2 == p.length && (u[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " ")))
                        }
                    }
                    return c = t.extend(!0, {}, o.params, i.opts[n], u), f = "function" === t.type(o.url) ? o.url.call(this, r, c, i) : e(o.url, r, c), s = "function" === t.type(o.thumb) ? o.thumb.call(this, r, c, i) : e(o.thumb, r), "vimeo" === d && (f = f.replace("&%23", "#")), !1
                }
            }), h ? (i.src = f, i.type = h, i.opts.thumb || i.opts.$thumb && i.opts.$thumb.length || (i.opts.thumb = s), "iframe" === h && (t.extend(!0, i.opts, {
                iframe: {
                    preload: !1,
                    attr: {scrolling: "no"}
                }
            }), i.contentProvider = d, i.opts.slideClass += " fancybox-slide--" + ("google_maps" == d ? "map" : "video"))) : i.type = "image")
        })
    })
}(window.jQuery), function (t, e, n) {
    "use strict";
    var o = function () {
        return t.requestAnimationFrame || t.webkitRequestAnimationFrame || t.mozRequestAnimationFrame || t.oRequestAnimationFrame || function (e) {
            return t.setTimeout(e, 1e3 / 60)
        }
    }(), i = function () {
        return t.cancelAnimationFrame || t.webkitCancelAnimationFrame || t.mozCancelAnimationFrame || t.oCancelAnimationFrame || function (e) {
            t.clearTimeout(e)
        }
    }(), a = function (e) {
        var n = [];
        e = e.originalEvent || e || t.e, e = e.touches && e.touches.length ? e.touches : e.changedTouches && e.changedTouches.length ? e.changedTouches : [e];
        for (var o in e) e[o].pageX ? n.push({x: e[o].pageX, y: e[o].pageY}) : e[o].clientX && n.push({
            x: e[o].clientX,
            y: e[o].clientY
        });
        return n
    }, s = function (t, e, n) {
        return e && t ? "x" === n ? t.x - e.x : "y" === n ? t.y - e.y : Math.sqrt(Math.pow(t.x - e.x, 2) + Math.pow(t.y - e.y, 2)) : 0
    }, r = function (t) {
        if (t.is("a,button,input,select,textarea") || n.isFunction(t.get(0).onclick)) return !0;
        for (var e = 0, o = t[0].attributes, i = o.length; e < i; e++) if ("data-fancybox-" === o[e].nodeName.substr(0, 14)) return !0;
        return !1
    }, c = function (e) {
        var n = t.getComputedStyle(e)["overflow-y"], o = t.getComputedStyle(e)["overflow-x"],
            i = ("scroll" === n || "auto" === n) && e.scrollHeight > e.clientHeight,
            a = ("scroll" === o || "auto" === o) && e.scrollWidth > e.clientWidth;
        return i || a
    }, l = function (t) {
        for (var e = !1; ;) {
            if (e = c(t.get(0))) break;
            if (t = t.parent(), !t.length || t.hasClass("fancybox-stage") || t.is("body")) break
        }
        return e
    }, u = function (t) {
        var e = this;
        e.instance = t, e.$bg = t.$refs.bg, e.$stage = t.$refs.stage, e.$container = t.$refs.container, e.destroy(), e.$container.on("touchstart.fb.touch mousedown.fb.touch", n.proxy(e, "ontouchstart"))
    };
    u.prototype.destroy = function () {
        this.$container.off(".fb.touch")
    }, u.prototype.ontouchstart = function (o) {
        var i = this, c = n(o.target), u = i.instance, d = u.current, f = d.$content, h = "touchstart" == o.type;
        if (h && i.$container.off("mousedown.fb.touch"), !d || i.instance.isAnimating || i.instance.isClosing) return o.stopPropagation(), void o.preventDefault();
        if ((!o.originalEvent || 2 != o.originalEvent.button) && c.length && !r(c) && !r(c.parent()) && !(o.originalEvent.clientX > c[0].clientWidth + c.offset().left) && (i.startPoints = a(o), i.startPoints && !(i.startPoints.length > 1 && u.isSliding))) {
            if (i.$target = c, i.$content = f, i.canTap = !0, n(e).off(".fb.touch"), n(e).on(h ? "touchend.fb.touch touchcancel.fb.touch" : "mouseup.fb.touch mouseleave.fb.touch", n.proxy(i, "ontouchend")), n(e).on(h ? "touchmove.fb.touch" : "mousemove.fb.touch", n.proxy(i, "ontouchmove")), o.stopPropagation(), !u.current.opts.touch && !u.canPan() || !c.is(i.$stage) && !i.$stage.find(c).length) return void (c.is("img") && o.preventDefault());
            n.fancybox.isMobile && (l(i.$target) || l(i.$target.parent())) || o.preventDefault(), i.canvasWidth = Math.round(d.$slide[0].clientWidth), i.canvasHeight = Math.round(d.$slide[0].clientHeight), i.startTime = (new Date).getTime(), i.distanceX = i.distanceY = i.distance = 0, i.isPanning = !1, i.isSwiping = !1, i.isZooming = !1, i.sliderStartPos = i.sliderLastPos || {
                top: 0,
                left: 0
            }, i.contentStartPos = n.fancybox.getTranslate(i.$content), i.contentLastPos = null, 1 !== i.startPoints.length || i.isZooming || (i.canTap = !u.isSliding, "image" === d.type && (i.contentStartPos.width > i.canvasWidth + 1 || i.contentStartPos.height > i.canvasHeight + 1) ? (n.fancybox.stop(i.$content), i.$content.css("transition-duration", "0ms"), i.isPanning = !0) : i.isSwiping = !0, i.$container.addClass("fancybox-controls--isGrabbing")), 2 !== i.startPoints.length || u.isAnimating || d.hasError || "image" !== d.type || !d.isLoaded && !d.$ghost || (i.isZooming = !0, i.isSwiping = !1, i.isPanning = !1, n.fancybox.stop(i.$content), i.$content.css("transition-duration", "0ms"), i.centerPointStartX = .5 * (i.startPoints[0].x + i.startPoints[1].x) - n(t).scrollLeft(), i.centerPointStartY = .5 * (i.startPoints[0].y + i.startPoints[1].y) - n(t).scrollTop(), i.percentageOfImageAtPinchPointX = (i.centerPointStartX - i.contentStartPos.left) / i.contentStartPos.width, i.percentageOfImageAtPinchPointY = (i.centerPointStartY - i.contentStartPos.top) / i.contentStartPos.height, i.startDistanceBetweenFingers = s(i.startPoints[0], i.startPoints[1]))
        }
    }, u.prototype.ontouchmove = function (t) {
        var e = this;
        if (e.newPoints = a(t), n.fancybox.isMobile && (l(e.$target) || l(e.$target.parent()))) return t.stopPropagation(), void (e.canTap = !1);
        if ((e.instance.current.opts.touch || e.instance.canPan()) && e.newPoints && e.newPoints.length && (e.distanceX = s(e.newPoints[0], e.startPoints[0], "x"), e.distanceY = s(e.newPoints[0], e.startPoints[0], "y"), e.distance = s(e.newPoints[0], e.startPoints[0]), e.distance > 0)) {
            if (!e.$target.is(e.$stage) && !e.$stage.find(e.$target).length) return;
            t.stopPropagation(), t.preventDefault(), e.isSwiping ? e.onSwipe() : e.isPanning ? e.onPan() : e.isZooming && e.onZoom()
        }
    }, u.prototype.onSwipe = function () {
        var e, a = this, s = a.isSwiping, r = a.sliderStartPos.left || 0;
        s === !0 ? Math.abs(a.distance) > 10 && (a.canTap = !1, a.instance.group.length < 2 && a.instance.opts.touch.vertical ? a.isSwiping = "y" : a.instance.isSliding || a.instance.opts.touch.vertical === !1 || "auto" === a.instance.opts.touch.vertical && n(t).width() > 800 ? a.isSwiping = "x" : (e = Math.abs(180 * Math.atan2(a.distanceY, a.distanceX) / Math.PI), a.isSwiping = e > 45 && e < 135 ? "y" : "x"), a.instance.isSliding = a.isSwiping, a.startPoints = a.newPoints, n.each(a.instance.slides, function (t, e) {
            n.fancybox.stop(e.$slide), e.$slide.css("transition-duration", "0ms"), e.inTransition = !1, e.pos === a.instance.current.pos && (a.sliderStartPos.left = n.fancybox.getTranslate(e.$slide).left)
        }), a.instance.SlideShow && a.instance.SlideShow.isActive && a.instance.SlideShow.stop()) : ("x" == s && (a.distanceX > 0 && (a.instance.group.length < 2 || 0 === a.instance.current.index && !a.instance.current.opts.loop) ? r += Math.pow(a.distanceX, .8) : a.distanceX < 0 && (a.instance.group.length < 2 || a.instance.current.index === a.instance.group.length - 1 && !a.instance.current.opts.loop) ? r -= Math.pow(-a.distanceX, .8) : r += a.distanceX), a.sliderLastPos = {
            top: "x" == s ? 0 : a.sliderStartPos.top + a.distanceY,
            left: r
        }, a.requestId && (i(a.requestId), a.requestId = null), a.requestId = o(function () {
            a.sliderLastPos && (n.each(a.instance.slides, function (t, e) {
                var o = e.pos - a.instance.currPos;
                n.fancybox.setTranslate(e.$slide, {
                    top: a.sliderLastPos.top,
                    left: a.sliderLastPos.left + o * a.canvasWidth + o * e.opts.gutter
                })
            }), a.$container.addClass("fancybox-is-sliding"))
        }))
    }, u.prototype.onPan = function () {
        var t, e, a, s = this;
        s.canTap = !1, t = s.contentStartPos.width > s.canvasWidth ? s.contentStartPos.left + s.distanceX : s.contentStartPos.left, e = s.contentStartPos.top + s.distanceY, a = s.limitMovement(t, e, s.contentStartPos.width, s.contentStartPos.height), a.scaleX = s.contentStartPos.scaleX, a.scaleY = s.contentStartPos.scaleY, s.contentLastPos = a, s.requestId && (i(s.requestId), s.requestId = null), s.requestId = o(function () {
            n.fancybox.setTranslate(s.$content, s.contentLastPos)
        })
    }, u.prototype.limitMovement = function (t, e, n, o) {
        var i, a, s, r, c = this, l = c.canvasWidth, u = c.canvasHeight, d = c.contentStartPos.left,
            f = c.contentStartPos.top, h = c.distanceX, p = c.distanceY;
        return i = Math.max(0, .5 * l - .5 * n), a = Math.max(0, .5 * u - .5 * o), s = Math.min(l - n, .5 * l - .5 * n), r = Math.min(u - o, .5 * u - .5 * o), n > l && (h > 0 && t > i && (t = i - 1 + Math.pow(-i + d + h, .8) || 0), h < 0 && t < s && (t = s + 1 - Math.pow(s - d - h, .8) || 0)), o > u && (p > 0 && e > a && (e = a - 1 + Math.pow(-a + f + p, .8) || 0), p < 0 && e < r && (e = r + 1 - Math.pow(r - f - p, .8) || 0)), {
            top: e,
            left: t
        }
    }, u.prototype.limitPosition = function (t, e, n, o) {
        var i = this, a = i.canvasWidth, s = i.canvasHeight;
        return n > a ? (t = t > 0 ? 0 : t, t = t < a - n ? a - n : t) : t = Math.max(0, a / 2 - n / 2), o > s ? (e = e > 0 ? 0 : e, e = e < s - o ? s - o : e) : e = Math.max(0, s / 2 - o / 2), {
            top: e,
            left: t
        }
    }, u.prototype.onZoom = function () {
        var e = this, a = e.contentStartPos.width, r = e.contentStartPos.height, c = e.contentStartPos.left,
            l = e.contentStartPos.top, u = s(e.newPoints[0], e.newPoints[1]), d = u / e.startDistanceBetweenFingers,
            f = Math.floor(a * d), h = Math.floor(r * d), p = (a - f) * e.percentageOfImageAtPinchPointX,
            g = (r - h) * e.percentageOfImageAtPinchPointY,
            b = (e.newPoints[0].x + e.newPoints[1].x) / 2 - n(t).scrollLeft(),
            m = (e.newPoints[0].y + e.newPoints[1].y) / 2 - n(t).scrollTop(), y = b - e.centerPointStartX,
            v = m - e.centerPointStartY, x = c + (p + y), w = l + (g + v),
            $ = {top: w, left: x, scaleX: e.contentStartPos.scaleX * d, scaleY: e.contentStartPos.scaleY * d};
        e.canTap = !1, e.newWidth = f, e.newHeight = h, e.contentLastPos = $, e.requestId && (i(e.requestId), e.requestId = null), e.requestId = o(function () {
            n.fancybox.setTranslate(e.$content, e.contentLastPos)
        })
    }, u.prototype.ontouchend = function (t) {
        var o = this, s = Math.max((new Date).getTime() - o.startTime, 1), r = o.isSwiping, c = o.isPanning,
            l = o.isZooming;
        return o.endPoints = a(t), o.$container.removeClass("fancybox-controls--isGrabbing"), n(e).off(".fb.touch"), o.requestId && (i(o.requestId), o.requestId = null), o.isSwiping = !1, o.isPanning = !1, o.isZooming = !1, o.canTap ? o.onTap(t) : (o.speed = 366, o.velocityX = o.distanceX / s * .5, o.velocityY = o.distanceY / s * .5, o.speedX = Math.max(.5 * o.speed, Math.min(1.5 * o.speed, 1 / Math.abs(o.velocityX) * o.speed)), void (c ? o.endPanning() : l ? o.endZooming() : o.endSwiping(r)))
    }, u.prototype.endSwiping = function (t) {
        var e = this, o = !1;
        e.instance.isSliding = !1, e.sliderLastPos = null, "y" == t && Math.abs(e.distanceY) > 50 ? (n.fancybox.animate(e.instance.current.$slide, {
            top: e.sliderStartPos.top + e.distanceY + 150 * e.velocityY,
            opacity: 0
        }, 150), o = e.instance.close(!0, 300)) : "x" == t && e.distanceX > 50 && e.instance.group.length > 1 ? o = e.instance.previous(e.speedX) : "x" == t && e.distanceX < -50 && e.instance.group.length > 1 && (o = e.instance.next(e.speedX)), o !== !1 || "x" != t && "y" != t || e.instance.jumpTo(e.instance.current.index, 150), e.$container.removeClass("fancybox-is-sliding")
    }, u.prototype.endPanning = function () {
        var t, e, o, i = this;
        i.contentLastPos && (i.instance.current.opts.touch.momentum === !1 ? (t = i.contentLastPos.left, e = i.contentLastPos.top) : (t = i.contentLastPos.left + i.velocityX * i.speed, e = i.contentLastPos.top + i.velocityY * i.speed), o = i.limitPosition(t, e, i.contentStartPos.width, i.contentStartPos.height), o.width = i.contentStartPos.width, o.height = i.contentStartPos.height, n.fancybox.animate(i.$content, o, 330))
    }, u.prototype.endZooming = function () {
        var t, e, o, i, a = this, s = a.instance.current, r = a.newWidth, c = a.newHeight;
        a.contentLastPos && (t = a.contentLastPos.left, e = a.contentLastPos.top, i = {
            top: e,
            left: t,
            width: r,
            height: c,
            scaleX: 1,
            scaleY: 1
        }, n.fancybox.setTranslate(a.$content, i), r < a.canvasWidth && c < a.canvasHeight ? a.instance.scaleToFit(150) : r > s.width || c > s.height ? a.instance.scaleToActual(a.centerPointStartX, a.centerPointStartY, 150) : (o = a.limitPosition(t, e, r, c), n.fancybox.setTranslate(a.content, n.fancybox.getTranslate(a.$content)), n.fancybox.animate(a.$content, o, 150)))
    }, u.prototype.onTap = function (t) {
        var e, o = this, i = n(t.target), s = o.instance, r = s.current, c = t && a(t) || o.startPoints,
            l = c[0] ? c[0].x - o.$stage.offset().left : 0, u = c[0] ? c[0].y - o.$stage.offset().top : 0,
            d = function (e) {
                var i = r.opts[e];
                if (n.isFunction(i) && (i = i.apply(s, [r, t])), i) switch (i) {
                    case"close":
                        s.close(o.startEvent);
                        break;
                    case"toggleControls":
                        s.toggleControls(!0);
                        break;
                    case"next":
                        s.next();
                        break;
                    case"nextOrClose":
                        s.group.length > 1 ? s.next() : s.close(o.startEvent);
                        break;
                    case"zoom":
                        "image" == r.type && (r.isLoaded || r.$ghost) && (s.canPan() ? s.scaleToFit() : s.isScaledDown() ? s.scaleToActual(l, u) : s.group.length < 2 && s.close(o.startEvent))
                }
            };
        if (!(t.originalEvent && 2 == t.originalEvent.button || s.isSliding || l > i[0].clientWidth + i.offset().left)) {
            if (i.is(".fancybox-bg,.fancybox-inner,.fancybox-outer,.fancybox-container")) e = "Outside"; else if (i.is(".fancybox-slide")) e = "Slide"; else {
                if (!s.current.$content || !s.current.$content.has(t.target).length) return;
                e = "Content"
            }
            if (o.tapped) {
                if (clearTimeout(o.tapped), o.tapped = null, Math.abs(l - o.tapX) > 50 || Math.abs(u - o.tapY) > 50 || s.isSliding) return this;
                d("dblclick" + e)
            } else o.tapX = l, o.tapY = u, r.opts["dblclick" + e] && r.opts["dblclick" + e] !== r.opts["click" + e] ? o.tapped = setTimeout(function () {
                o.tapped = null, d("click" + e)
            }, 300) : d("click" + e);
            return this
        }
    }, n(e).on("onActivate.fb", function (t, e) {
        e && !e.Guestures && (e.Guestures = new u(e))
    }), n(e).on("beforeClose.fb", function (t, e) {
        e && e.Guestures && e.Guestures.destroy()
    })
}(window, document, window.jQuery), function (t, e) {
    "use strict";
    var n = function (t) {
        this.instance = t, this.init()
    };
    e.extend(n.prototype, {
        timer: null, isActive: !1, $button: null, speed: 3e3, init: function () {
            var t = this;
            t.$button = t.instance.$refs.toolbar.find("[data-fancybox-play]").on("click", function () {
                t.toggle()
            }), (t.instance.group.length < 2 || !t.instance.group[t.instance.currIndex].opts.slideShow) && t.$button.hide()
        }, set: function () {
            var t = this;
            t.instance && t.instance.current && (t.instance.current.opts.loop || t.instance.currIndex < t.instance.group.length - 1) ? t.timer = setTimeout(function () {
                t.instance.next()
            }, t.instance.current.opts.slideShow.speed || t.speed) : (t.stop(), t.instance.idleSecondsCounter = 0, t.instance.showControls())
        }, clear: function () {
            var t = this;
            clearTimeout(t.timer), t.timer = null
        }, start: function () {
            var t = this, e = t.instance.current;
            t.instance && e && (e.opts.loop || e.index < t.instance.group.length - 1) && (t.isActive = !0, t.$button.attr("title", e.opts.i18n[e.opts.lang].PLAY_STOP).addClass("fancybox-button--pause"), e.isComplete && t.set())
        }, stop: function () {
            var t = this, e = t.instance.current;
            t.clear(), t.$button.attr("title", e.opts.i18n[e.opts.lang].PLAY_START).removeClass("fancybox-button--pause"), t.isActive = !1
        }, toggle: function () {
            var t = this;
            t.isActive ? t.stop() : t.start()
        }
    }), e(t).on({
        "onInit.fb": function (t, e) {
            e && !e.SlideShow && (e.SlideShow = new n(e))
        }, "beforeShow.fb": function (t, e, n, o) {
            var i = e && e.SlideShow;
            o ? i && n.opts.slideShow.autoStart && i.start() : i && i.isActive && i.clear()
        }, "afterShow.fb": function (t, e, n) {
            var o = e && e.SlideShow;
            o && o.isActive && o.set()
        }, "afterKeydown.fb": function (n, o, i, a, s) {
            var r = o && o.SlideShow;
            !r || !i.opts.slideShow || 80 !== s && 32 !== s || e(t.activeElement).is("button,a,input") || (a.preventDefault(), r.toggle())
        }, "beforeClose.fb onDeactivate.fb": function (t, e) {
            var n = e && e.SlideShow;
            n && n.stop()
        }
    }), e(t).on("visibilitychange", function () {
        var n = e.fancybox.getInstance(), o = n && n.SlideShow;
        o && o.isActive && (t.hidden ? o.clear() : o.set())
    })
}(document, window.jQuery), function (t, e) {
    "use strict";
    var n = function () {
        var e, n, o,
            i = [["requestFullscreen", "exitFullscreen", "fullscreenElement", "fullscreenEnabled", "fullscreenchange", "fullscreenerror"], ["webkitRequestFullscreen", "webkitExitFullscreen", "webkitFullscreenElement", "webkitFullscreenEnabled", "webkitfullscreenchange", "webkitfullscreenerror"], ["webkitRequestFullScreen", "webkitCancelFullScreen", "webkitCurrentFullScreenElement", "webkitCancelFullScreen", "webkitfullscreenchange", "webkitfullscreenerror"], ["mozRequestFullScreen", "mozCancelFullScreen", "mozFullScreenElement", "mozFullScreenEnabled", "mozfullscreenchange", "mozfullscreenerror"], ["msRequestFullscreen", "msExitFullscreen", "msFullscreenElement", "msFullscreenEnabled", "MSFullscreenChange", "MSFullscreenError"]],
            a = {};
        for (n = 0; n < i.length; n++) if (e = i[n], e && e[1] in t) {
            for (o = 0; o < e.length; o++) a[i[0][o]] = e[o];
            return a
        }
        return !1
    }();
    if (!n) return void (e.fancybox.defaults.btnTpl.fullScreen = !1);
    var o = {
        request: function (e) {
            e = e || t.documentElement, e[n.requestFullscreen](e.ALLOW_KEYBOARD_INPUT)
        }, exit: function () {
            t[n.exitFullscreen]()
        }, toggle: function (e) {
            e = e || t.documentElement, this.isFullscreen() ? this.exit() : this.request(e)
        }, isFullscreen: function () {
            return Boolean(t[n.fullscreenElement])
        }, enabled: function () {
            return Boolean(t[n.fullscreenEnabled])
        }
    };
    e(t).on({
        "onInit.fb": function (t, e) {
            var n, i = e.$refs.toolbar.find("[data-fancybox-fullscreen]");
            e && !e.FullScreen && e.group[e.currIndex].opts.fullScreen ? (n = e.$refs.container, n.on("click.fb-fullscreen", "[data-fancybox-fullscreen]", function (t) {
                t.stopPropagation(), t.preventDefault(), o.toggle(n[0])
            }), e.opts.fullScreen && e.opts.fullScreen.autoStart === !0 && o.request(n[0]), e.FullScreen = o) : i.hide()
        }, "afterKeydown.fb": function (t, e, n, o, i) {
            e && e.FullScreen && 70 === i && (o.preventDefault(), e.FullScreen.toggle(e.$refs.container[0]))
        }, "beforeClose.fb": function (t) {
            t && t.FullScreen && o.exit()
        }
    }), e(t).on(n.fullscreenchange, function () {
        var t = e.fancybox.getInstance();
        t.current && "image" === t.current.type && t.isAnimating && (t.current.$content.css("transition", "none"), t.isAnimating = !1, t.update(!0, !0, 0))
    })
}(document, window.jQuery), function (t, e) {
    "use strict";
    var n = function (t) {
        this.instance = t, this.init()
    };
    e.extend(n.prototype, {
        $button: null, $grid: null, $list: null, isVisible: !1, init: function () {
            var t = this, e = t.instance.group[0], n = t.instance.group[1];
            t.$button = t.instance.$refs.toolbar.find("[data-fancybox-thumbs]"), t.instance.group.length > 1 && t.instance.group[t.instance.currIndex].opts.thumbs && ("image" == e.type || e.opts.thumb || e.opts.$thumb) && ("image" == n.type || n.opts.thumb || n.opts.$thumb) ? (t.$button.on("click", function () {
                t.toggle()
            }), t.isActive = !0) : (t.$button.hide(), t.isActive = !1)
        }, create: function () {
            var t, n, o = this.instance;
            this.$grid = e('<div class="fancybox-thumbs"></div>').appendTo(o.$refs.container), t = "<ul>", e.each(o.group, function (e, o) {
                n = o.opts.thumb || (o.opts.$thumb ? o.opts.$thumb.attr("src") : null), n || "image" !== o.type || (n = o.src), n && n.length && (t += '<li data-index="' + e + '"  tabindex="0" class="fancybox-thumbs-loading"><img data-src="' + n + '" /></li>')
            }), t += "</ul>", this.$list = e(t).appendTo(this.$grid).on("click", "li", function () {
                o.jumpTo(e(this).data("index"))
            }), this.$list.find("img").hide().one("load", function () {
                var t, n, o, i, a = e(this).parent().removeClass("fancybox-thumbs-loading"), s = a.outerWidth(),
                    r = a.outerHeight();
                t = this.naturalWidth || this.width, n = this.naturalHeight || this.height, o = t / s, i = n / r, o >= 1 && i >= 1 && (o > i ? (t /= i, n = r) : (t = s, n /= o)), e(this).css({
                    width: Math.floor(t),
                    height: Math.floor(n),
                    "margin-top": Math.min(0, Math.floor(.3 * r - .3 * n)),
                    "margin-left": Math.min(0, Math.floor(.5 * s - .5 * t))
                }).show()
            }).each(function () {
                this.src = e(this).data("src")
            })
        }, focus: function () {
            this.instance.current && this.$list.children().removeClass("fancybox-thumbs-active").filter('[data-index="' + this.instance.current.index + '"]').addClass("fancybox-thumbs-active").focus()
        }, close: function () {
            this.$grid.hide()
        }, update: function () {
            this.instance.$refs.container.toggleClass("fancybox-show-thumbs", this.isVisible), this.isVisible ? (this.$grid || this.create(), this.instance.trigger("onThumbsShow"), this.focus()) : this.$grid && this.instance.trigger("onThumbsHide"), this.instance.update()
        }, hide: function () {
            this.isVisible = !1, this.update()
        }, show: function () {
            this.isVisible = !0, this.update()
        }, toggle: function () {
            this.isVisible = !this.isVisible, this.update()
        }
    }), e(t).on({
        "onInit.fb": function (t, e) {
            e && !e.Thumbs && (e.Thumbs = new n(e))
        }, "beforeShow.fb": function (t, e, n, o) {
            var i = e && e.Thumbs;
            if (i && i.isActive) {
                if (n.modal) return i.$button.hide(), void i.hide();
                o && e.opts.thumbs.autoStart === !0 && i.show(), i.isVisible && i.focus()
            }
        }, "afterKeydown.fb": function (t, e, n, o, i) {
            var a = e && e.Thumbs;
            a && a.isActive && 71 === i && (o.preventDefault(), a.toggle())
        }, "beforeClose.fb": function (t, e) {
            var n = e && e.Thumbs;
            n && n.isVisible && e.opts.thumbs.hideOnClose !== !1 && n.close()
        }
    })
}(document, window.jQuery), function (t, e, n) {
    "use strict";

    function o() {
        var t = e.location.hash.substr(1), n = t.split("-"),
            o = n.length > 1 && /^\+?\d+$/.test(n[n.length - 1]) ? parseInt(n.pop(-1), 10) || 1 : 1, i = n.join("-");
        return o < 1 && (o = 1), {hash: t, index: o, gallery: i}
    }

    function i(t) {
        var e;
        "" !== t.gallery && (e = n("[data-fancybox='" + n.escapeSelector(t.gallery) + "']").eq(t.index - 1), e.length ? e.trigger("click") : n("#" + n.escapeSelector(t.gallery)).trigger("click"))
    }

    function a(t) {
        var e;
        return !!t && (e = t.current ? t.current.opts : t.opts, e.$orig ? e.$orig.data("fancybox") : e.hash || "")
    }

    n.escapeSelector || (n.escapeSelector = function (t) {
        var e = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\x80-\uFFFF\w-]/g, n = function (t, e) {
            return e ? "\0" === t ? "�" : t.slice(0, -1) + "\\" + t.charCodeAt(t.length - 1).toString(16) + " " : "\\" + t
        };
        return (t + "").replace(e, n)
    });
    var s = null, r = null;
    n(function () {
        setTimeout(function () {
            n.fancybox.defaults.hash !== !1 && (n(t).on({
                "onInit.fb": function (t, e) {
                    var n, i;
                    e.group[e.currIndex].opts.hash !== !1 && (n = o(), i = a(e), i && n.gallery && i == n.gallery && (e.currIndex = n.index - 1))
                }, "beforeShow.fb": function (n, o, i, c) {
                    var l;
                    i.opts.hash !== !1 && (l = a(o), l && "" !== l && (e.location.hash.indexOf(l) < 0 && (o.opts.origHash = e.location.hash), s = l + (o.group.length > 1 ? "-" + (i.index + 1) : ""), "replaceState" in e.history ? (r && clearTimeout(r), r = setTimeout(function () {
                        e.history[c ? "pushState" : "replaceState"]({}, t.title, e.location.pathname + e.location.search + "#" + s), r = null
                    }, 300)) : e.location.hash = s))
                }, "beforeClose.fb": function (o, i, c) {
                    var l, u;
                    r && clearTimeout(r), c.opts.hash !== !1 && (l = a(i), u = i && i.opts.origHash ? i.opts.origHash : "", l && "" !== l && ("replaceState" in history ? e.history.replaceState({}, t.title, e.location.pathname + e.location.search + u) : (e.location.hash = u, n(e).scrollTop(i.scrollTop).scrollLeft(i.scrollLeft))), s = null)
                }
            }), n(e).on("hashchange.fb", function () {
                var t = o();
                n.fancybox.getInstance() ? !s || s === t.gallery + "-" + t.index || 1 === t.index && s == t.gallery || (s = null, n.fancybox.close()) : "" !== t.gallery && i(t)
            }), n(e).one("unload.fb popstate.fb", function () {
                n.fancybox.getInstance("close", !0, 0)
            }), i(o()))
        }, 50)
    })
}(document, window, window.jQuery);

/*
     _ _      _       _
 ___| (_) ___| | __  (_)___
/ __| | |/ __| |/ /  | / __|
\__ \ | | (__|   < _ | \__ \
|___/_|_|\___|_|\_(_)/ |___/
                   |__/

 Version: 1.6.0
  Author: Ken Wheeler
 Website: http://kenwheeler.github.io
    Docs: http://kenwheeler.github.io/slick
    Repo: http://github.com/kenwheeler/slick
  Issues: http://github.com/kenwheeler/slick/issues

 */
!function (a) {
    "use strict";
    "function" == typeof define && define.amd ? define(["jquery"], a) : "undefined" != typeof exports ? module.exports = a(require("jquery")) : a(jQuery)
}(function (a) {
    "use strict";
    var b = window.Slick || {};
    b = function () {
        function c(c, d) {
            var f, e = this;
            e.defaults = {
                accessibility: !0,
                adaptiveHeight: !1,
                appendArrows: a(c),
                appendDots: a(c),
                arrows: !0,
                asNavFor: null,
                prevArrow: '<button type="button" data-role="none" class="slick-prev" aria-label="Previous" tabindex="0" role="button">Previous</button>',
                nextArrow: '<button type="button" data-role="none" class="slick-next" aria-label="Next" tabindex="0" role="button">Next</button>',
                autoplay: !1,
                autoplaySpeed: 3e3,
                centerMode: !1,
                centerPadding: "50px",
                cssEase: "ease",
                customPaging: function (b, c) {
                    return a('<button type="button" data-role="none" role="button" tabindex="0" />').text(c + 1)
                },
                dots: !1,
                dotsClass: "slick-dots",
                draggable: !0,
                easing: "linear",
                edgeFriction: .35,
                fade: !1,
                focusOnSelect: !1,
                infinite: !0,
                initialSlide: 0,
                lazyLoad: "ondemand",
                mobileFirst: !1,
                pauseOnHover: !0,
                pauseOnFocus: !0,
                pauseOnDotsHover: !1,
                respondTo: "window",
                responsive: null,
                rows: 1,
                rtl: !1,
                slide: "",
                slidesPerRow: 1,
                slidesToShow: 1,
                slidesToScroll: 1,
                speed: 500,
                swipe: !0,
                swipeToSlide: !1,
                touchMove: !0,
                touchThreshold: 5,
                useCSS: !0,
                useTransform: !0,
                variableWidth: !1,
                vertical: !1,
                verticalSwiping: !1,
                waitForAnimate: !0,
                zIndex: 1e3
            }, e.initials = {
                animating: !1,
                dragging: !1,
                autoPlayTimer: null,
                currentDirection: 0,
                currentLeft: null,
                currentSlide: 0,
                direction: 1,
                $dots: null,
                listWidth: null,
                listHeight: null,
                loadIndex: 0,
                $nextArrow: null,
                $prevArrow: null,
                slideCount: null,
                slideWidth: null,
                $slideTrack: null,
                $slides: null,
                sliding: !1,
                slideOffset: 0,
                swipeLeft: null,
                $list: null,
                touchObject: {},
                transformsEnabled: !1,
                unslicked: !1
            }, a.extend(e, e.initials), e.activeBreakpoint = null, e.animType = null, e.animProp = null, e.breakpoints = [], e.breakpointSettings = [], e.cssTransitions = !1, e.focussed = !1, e.interrupted = !1, e.hidden = "hidden", e.paused = !0, e.positionProp = null, e.respondTo = null, e.rowCount = 1, e.shouldClick = !0, e.$slider = a(c), e.$slidesCache = null, e.transformType = null, e.transitionType = null, e.visibilityChange = "visibilitychange", e.windowWidth = 0, e.windowTimer = null, f = a(c).data("slick") || {}, e.options = a.extend({}, e.defaults, d, f), e.currentSlide = e.options.initialSlide, e.originalSettings = e.options, "undefined" != typeof document.mozHidden ? (e.hidden = "mozHidden", e.visibilityChange = "mozvisibilitychange") : "undefined" != typeof document.webkitHidden && (e.hidden = "webkitHidden", e.visibilityChange = "webkitvisibilitychange"), e.autoPlay = a.proxy(e.autoPlay, e), e.autoPlayClear = a.proxy(e.autoPlayClear, e), e.autoPlayIterator = a.proxy(e.autoPlayIterator, e), e.changeSlide = a.proxy(e.changeSlide, e), e.clickHandler = a.proxy(e.clickHandler, e), e.selectHandler = a.proxy(e.selectHandler, e), e.setPosition = a.proxy(e.setPosition, e), e.swipeHandler = a.proxy(e.swipeHandler, e), e.dragHandler = a.proxy(e.dragHandler, e), e.keyHandler = a.proxy(e.keyHandler, e), e.instanceUid = b++, e.htmlExpr = /^(?:\s*(<[\w\W]+>)[^>]*)$/, e.registerBreakpoints(), e.init(!0)
        }

        var b = 0;
        return c
    }(), b.prototype.activateADA = function () {
        var a = this;
        a.$slideTrack.find(".slick-active").attr({"aria-hidden": "false"}).find("a, input, button, select").attr({tabindex: "0"})
    }, b.prototype.addSlide = b.prototype.slickAdd = function (b, c, d) {
        var e = this;
        if ("boolean" == typeof c) d = c, c = null; else if (0 > c || c >= e.slideCount) return !1;
        e.unload(), "number" == typeof c ? 0 === c && 0 === e.$slides.length ? a(b).appendTo(e.$slideTrack) : d ? a(b).insertBefore(e.$slides.eq(c)) : a(b).insertAfter(e.$slides.eq(c)) : d === !0 ? a(b).prependTo(e.$slideTrack) : a(b).appendTo(e.$slideTrack), e.$slides = e.$slideTrack.children(this.options.slide), e.$slideTrack.children(this.options.slide).detach(), e.$slideTrack.append(e.$slides), e.$slides.each(function (b, c) {
            a(c).attr("data-slick-index", b)
        }), e.$slidesCache = e.$slides, e.reinit()
    }, b.prototype.animateHeight = function () {
        var a = this;
        if (1 === a.options.slidesToShow && a.options.adaptiveHeight === !0 && a.options.vertical === !1) {
            var b = a.$slides.eq(a.currentSlide).outerHeight(!0);
            a.$list.animate({height: b}, a.options.speed)
        }
    }, b.prototype.animateSlide = function (b, c) {
        var d = {}, e = this;
        e.animateHeight(), e.options.rtl === !0 && e.options.vertical === !1 && (b = -b), e.transformsEnabled === !1 ? e.options.vertical === !1 ? e.$slideTrack.animate({left: b}, e.options.speed, e.options.easing, c) : e.$slideTrack.animate({top: b}, e.options.speed, e.options.easing, c) : e.cssTransitions === !1 ? (e.options.rtl === !0 && (e.currentLeft = -e.currentLeft), a({animStart: e.currentLeft}).animate({animStart: b}, {
            duration: e.options.speed,
            easing: e.options.easing,
            step: function (a) {
                a = Math.ceil(a), e.options.vertical === !1 ? (d[e.animType] = "translate(" + a + "px, 0px)", e.$slideTrack.css(d)) : (d[e.animType] = "translate(0px," + a + "px)", e.$slideTrack.css(d))
            },
            complete: function () {
                c && c.call()
            }
        })) : (e.applyTransition(), b = Math.ceil(b), e.options.vertical === !1 ? d[e.animType] = "translate3d(" + b + "px, 0px, 0px)" : d[e.animType] = "translate3d(0px," + b + "px, 0px)", e.$slideTrack.css(d), c && setTimeout(function () {
            e.disableTransition(), c.call()
        }, e.options.speed))
    }, b.prototype.getNavTarget = function () {
        var b = this, c = b.options.asNavFor;
        return c && null !== c && (c = a(c).not(b.$slider)), c
    }, b.prototype.asNavFor = function (b) {
        var c = this, d = c.getNavTarget();
        null !== d && "object" == typeof d && d.each(function () {
            var c = a(this).slick("getSlick");
            c.unslicked || c.slideHandler(b, !0)
        })
    }, b.prototype.applyTransition = function (a) {
        var b = this, c = {};
        b.options.fade === !1 ? c[b.transitionType] = b.transformType + " " + b.options.speed + "ms " + b.options.cssEase : c[b.transitionType] = "opacity " + b.options.speed + "ms " + b.options.cssEase, b.options.fade === !1 ? b.$slideTrack.css(c) : b.$slides.eq(a).css(c)
    }, b.prototype.autoPlay = function () {
        var a = this;
        a.autoPlayClear(), a.slideCount > a.options.slidesToShow && (a.autoPlayTimer = setInterval(a.autoPlayIterator, a.options.autoplaySpeed))
    }, b.prototype.autoPlayClear = function () {
        var a = this;
        a.autoPlayTimer && clearInterval(a.autoPlayTimer)
    }, b.prototype.autoPlayIterator = function () {
        var a = this, b = a.currentSlide + a.options.slidesToScroll;
        a.paused || a.interrupted || a.focussed || (a.options.infinite === !1 && (1 === a.direction && a.currentSlide + 1 === a.slideCount - 1 ? a.direction = 0 : 0 === a.direction && (b = a.currentSlide - a.options.slidesToScroll, a.currentSlide - 1 === 0 && (a.direction = 1))), a.slideHandler(b))
    }, b.prototype.buildArrows = function () {
        var b = this;
        b.options.arrows === !0 && (b.$prevArrow = a(b.options.prevArrow).addClass("slick-arrow"), b.$nextArrow = a(b.options.nextArrow).addClass("slick-arrow"), b.slideCount > b.options.slidesToShow ? (b.$prevArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"), b.$nextArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"), b.htmlExpr.test(b.options.prevArrow) && b.$prevArrow.prependTo(b.options.appendArrows), b.htmlExpr.test(b.options.nextArrow) && b.$nextArrow.appendTo(b.options.appendArrows), b.options.infinite !== !0 && b.$prevArrow.addClass("slick-disabled").attr("aria-disabled", "true")) : b.$prevArrow.add(b.$nextArrow).addClass("slick-hidden").attr({
            "aria-disabled": "true",
            tabindex: "-1"
        }))
    }, b.prototype.buildDots = function () {
        var c, d, b = this;
        if (b.options.dots === !0 && b.slideCount > b.options.slidesToShow) {
            for (b.$slider.addClass("slick-dotted"), d = a("<ul />").addClass(b.options.dotsClass), c = 0; c <= b.getDotCount(); c += 1) d.append(a("<li />").append(b.options.customPaging.call(this, b, c)));
            b.$dots = d.appendTo(b.options.appendDots), b.$dots.find("li").first().addClass("slick-active").attr("aria-hidden", "false")
        }
    }, b.prototype.buildOut = function () {
        var b = this;
        b.$slides = b.$slider.children(b.options.slide + ":not(.slick-cloned)").addClass("slick-slide"), b.slideCount = b.$slides.length, b.$slides.each(function (b, c) {
            a(c).attr("data-slick-index", b).data("originalStyling", a(c).attr("style") || "")
        }), b.$slider.addClass("slick-slider"), b.$slideTrack = 0 === b.slideCount ? a('<div class="slick-track"/>').appendTo(b.$slider) : b.$slides.wrapAll('<div class="slick-track"/>').parent(), b.$list = b.$slideTrack.wrap('<div aria-live="polite" class="slick-list"/>').parent(), b.$slideTrack.css("opacity", 0), (b.options.centerMode === !0 || b.options.swipeToSlide === !0) && (b.options.slidesToScroll = 1), a("img[data-lazy]", b.$slider).not("[src]").addClass("slick-loading"), b.setupInfinite(), b.buildArrows(), b.buildDots(), b.updateDots(), b.setSlideClasses("number" == typeof b.currentSlide ? b.currentSlide : 0), b.options.draggable === !0 && b.$list.addClass("draggable")
    }, b.prototype.buildRows = function () {
        var b, c, d, e, f, g, h, a = this;
        if (e = document.createDocumentFragment(), g = a.$slider.children(), a.options.rows > 1) {
            for (h = a.options.slidesPerRow * a.options.rows, f = Math.ceil(g.length / h), b = 0; f > b; b++) {
                var i = document.createElement("div");
                for (c = 0; c < a.options.rows; c++) {
                    var j = document.createElement("div");
                    for (d = 0; d < a.options.slidesPerRow; d++) {
                        var k = b * h + (c * a.options.slidesPerRow + d);
                        g.get(k) && j.appendChild(g.get(k))
                    }
                    i.appendChild(j)
                }
                e.appendChild(i)
            }
            a.$slider.empty().append(e), a.$slider.children().children().children().css({
                width: 100 / a.options.slidesPerRow + "%",
                display: "inline-block"
            })
        }
    }, b.prototype.checkResponsive = function (b, c) {
        var e, f, g, d = this, h = !1, i = d.$slider.width(), j = window.innerWidth || a(window).width();
        if ("window" === d.respondTo ? g = j : "slider" === d.respondTo ? g = i : "min" === d.respondTo && (g = Math.min(j, i)), d.options.responsive && d.options.responsive.length && null !== d.options.responsive) {
            f = null;
            for (e in d.breakpoints) d.breakpoints.hasOwnProperty(e) && (d.originalSettings.mobileFirst === !1 ? g < d.breakpoints[e] && (f = d.breakpoints[e]) : g > d.breakpoints[e] && (f = d.breakpoints[e]));
            null !== f ? null !== d.activeBreakpoint ? (f !== d.activeBreakpoint || c) && (d.activeBreakpoint = f, "unslick" === d.breakpointSettings[f] ? d.unslick(f) : (d.options = a.extend({}, d.originalSettings, d.breakpointSettings[f]), b === !0 && (d.currentSlide = d.options.initialSlide), d.refresh(b)), h = f) : (d.activeBreakpoint = f, "unslick" === d.breakpointSettings[f] ? d.unslick(f) : (d.options = a.extend({}, d.originalSettings, d.breakpointSettings[f]), b === !0 && (d.currentSlide = d.options.initialSlide), d.refresh(b)), h = f) : null !== d.activeBreakpoint && (d.activeBreakpoint = null, d.options = d.originalSettings, b === !0 && (d.currentSlide = d.options.initialSlide), d.refresh(b), h = f), b || h === !1 || d.$slider.trigger("breakpoint", [d, h])
        }
    }, b.prototype.changeSlide = function (b, c) {
        var f, g, h, d = this, e = a(b.currentTarget);
        switch (e.is("a") && b.preventDefault(), e.is("li") || (e = e.closest("li")), h = d.slideCount % d.options.slidesToScroll !== 0, f = h ? 0 : (d.slideCount - d.currentSlide) % d.options.slidesToScroll, b.data.message) {
            case"previous":
                g = 0 === f ? d.options.slidesToScroll : d.options.slidesToShow - f, d.slideCount > d.options.slidesToShow && d.slideHandler(d.currentSlide - g, !1, c);
                break;
            case"next":
                g = 0 === f ? d.options.slidesToScroll : f, d.slideCount > d.options.slidesToShow && d.slideHandler(d.currentSlide + g, !1, c);
                break;
            case"index":
                var i = 0 === b.data.index ? 0 : b.data.index || e.index() * d.options.slidesToScroll;
                d.slideHandler(d.checkNavigable(i), !1, c), e.children().trigger("focus");
                break;
            default:
                return
        }
    }, b.prototype.checkNavigable = function (a) {
        var c, d, b = this;
        if (c = b.getNavigableIndexes(), d = 0, a > c[c.length - 1]) a = c[c.length - 1]; else for (var e in c) {
            if (a < c[e]) {
                a = d;
                break
            }
            d = c[e]
        }
        return a
    }, b.prototype.cleanUpEvents = function () {
        var b = this;
        b.options.dots && null !== b.$dots && a("li", b.$dots).off("click.slick", b.changeSlide).off("mouseenter.slick", a.proxy(b.interrupt, b, !0)).off("mouseleave.slick", a.proxy(b.interrupt, b, !1)), b.$slider.off("focus.slick blur.slick"), b.options.arrows === !0 && b.slideCount > b.options.slidesToShow && (b.$prevArrow && b.$prevArrow.off("click.slick", b.changeSlide), b.$nextArrow && b.$nextArrow.off("click.slick", b.changeSlide)), b.$list.off("touchstart.slick mousedown.slick", b.swipeHandler), b.$list.off("touchmove.slick mousemove.slick", b.swipeHandler), b.$list.off("touchend.slick mouseup.slick", b.swipeHandler), b.$list.off("touchcancel.slick mouseleave.slick", b.swipeHandler), b.$list.off("click.slick", b.clickHandler), a(document).off(b.visibilityChange, b.visibility), b.cleanUpSlideEvents(), b.options.accessibility === !0 && b.$list.off("keydown.slick", b.keyHandler), b.options.focusOnSelect === !0 && a(b.$slideTrack).children().off("click.slick", b.selectHandler), a(window).off("orientationchange.slick.slick-" + b.instanceUid, b.orientationChange), a(window).off("resize.slick.slick-" + b.instanceUid, b.resize), a("[draggable!=true]", b.$slideTrack).off("dragstart", b.preventDefault), a(window).off("load.slick.slick-" + b.instanceUid, b.setPosition), a(document).off("ready.slick.slick-" + b.instanceUid, b.setPosition)
    }, b.prototype.cleanUpSlideEvents = function () {
        var b = this;
        b.$list.off("mouseenter.slick", a.proxy(b.interrupt, b, !0)), b.$list.off("mouseleave.slick", a.proxy(b.interrupt, b, !1))
    }, b.prototype.cleanUpRows = function () {
        var b, a = this;
        a.options.rows > 1 && (b = a.$slides.children().children(), b.removeAttr("style"), a.$slider.empty().append(b))
    }, b.prototype.clickHandler = function (a) {
        var b = this;
        b.shouldClick === !1 && (a.stopImmediatePropagation(), a.stopPropagation(), a.preventDefault())
    }, b.prototype.destroy = function (b) {
        var c = this;
        c.autoPlayClear(), c.touchObject = {}, c.cleanUpEvents(), a(".slick-cloned", c.$slider).detach(), c.$dots && c.$dots.remove(), c.$prevArrow && c.$prevArrow.length && (c.$prevArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display", ""), c.htmlExpr.test(c.options.prevArrow) && c.$prevArrow.remove()), c.$nextArrow && c.$nextArrow.length && (c.$nextArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display", ""), c.htmlExpr.test(c.options.nextArrow) && c.$nextArrow.remove()), c.$slides && (c.$slides.removeClass("slick-slide slick-active slick-center slick-visible slick-current").removeAttr("aria-hidden").removeAttr("data-slick-index").each(function () {
            a(this).attr("style", a(this).data("originalStyling"))
        }), c.$slideTrack.children(this.options.slide).detach(), c.$slideTrack.detach(), c.$list.detach(), c.$slider.append(c.$slides)), c.cleanUpRows(), c.$slider.removeClass("slick-slider"), c.$slider.removeClass("slick-initialized"), c.$slider.removeClass("slick-dotted"), c.unslicked = !0, b || c.$slider.trigger("destroy", [c])
    }, b.prototype.disableTransition = function (a) {
        var b = this, c = {};
        c[b.transitionType] = "", b.options.fade === !1 ? b.$slideTrack.css(c) : b.$slides.eq(a).css(c)
    }, b.prototype.fadeSlide = function (a, b) {
        var c = this;
        c.cssTransitions === !1 ? (c.$slides.eq(a).css({zIndex: c.options.zIndex}), c.$slides.eq(a).animate({opacity: 1}, c.options.speed, c.options.easing, b)) : (c.applyTransition(a), c.$slides.eq(a).css({
            opacity: 1,
            zIndex: c.options.zIndex
        }), b && setTimeout(function () {
            c.disableTransition(a), b.call()
        }, c.options.speed))
    }, b.prototype.fadeSlideOut = function (a) {
        var b = this;
        b.cssTransitions === !1 ? b.$slides.eq(a).animate({
            opacity: 0,
            zIndex: b.options.zIndex - 2
        }, b.options.speed, b.options.easing) : (b.applyTransition(a), b.$slides.eq(a).css({
            opacity: 0,
            zIndex: b.options.zIndex - 2
        }))
    }, b.prototype.filterSlides = b.prototype.slickFilter = function (a) {
        var b = this;
        null !== a && (b.$slidesCache = b.$slides, b.unload(), b.$slideTrack.children(this.options.slide).detach(), b.$slidesCache.filter(a).appendTo(b.$slideTrack), b.reinit())
    }, b.prototype.focusHandler = function () {
        var b = this;
        b.$slider.off("focus.slick blur.slick").on("focus.slick blur.slick", "*:not(.slick-arrow)", function (c) {
            c.stopImmediatePropagation();
            var d = a(this);
            setTimeout(function () {
                b.options.pauseOnFocus && (b.focussed = d.is(":focus"), b.autoPlay())
            }, 0)
        })
    }, b.prototype.getCurrent = b.prototype.slickCurrentSlide = function () {
        var a = this;
        return a.currentSlide
    }, b.prototype.getDotCount = function () {
        var a = this, b = 0, c = 0, d = 0;
        if (a.options.infinite === !0) for (; b < a.slideCount;) ++d, b = c + a.options.slidesToScroll, c += a.options.slidesToScroll <= a.options.slidesToShow ? a.options.slidesToScroll : a.options.slidesToShow; else if (a.options.centerMode === !0) d = a.slideCount; else if (a.options.asNavFor) for (; b < a.slideCount;) ++d, b = c + a.options.slidesToScroll, c += a.options.slidesToScroll <= a.options.slidesToShow ? a.options.slidesToScroll : a.options.slidesToShow; else d = 1 + Math.ceil((a.slideCount - a.options.slidesToShow) / a.options.slidesToScroll);
        return d - 1
    }, b.prototype.getLeft = function (a) {
        var c, d, f, b = this, e = 0;
        return b.slideOffset = 0, d = b.$slides.first().outerHeight(!0), b.options.infinite === !0 ? (b.slideCount > b.options.slidesToShow && (b.slideOffset = b.slideWidth * b.options.slidesToShow * -1, e = d * b.options.slidesToShow * -1), b.slideCount % b.options.slidesToScroll !== 0 && a + b.options.slidesToScroll > b.slideCount && b.slideCount > b.options.slidesToShow && (a > b.slideCount ? (b.slideOffset = (b.options.slidesToShow - (a - b.slideCount)) * b.slideWidth * -1, e = (b.options.slidesToShow - (a - b.slideCount)) * d * -1) : (b.slideOffset = b.slideCount % b.options.slidesToScroll * b.slideWidth * -1, e = b.slideCount % b.options.slidesToScroll * d * -1))) : a + b.options.slidesToShow > b.slideCount && (b.slideOffset = (a + b.options.slidesToShow - b.slideCount) * b.slideWidth, e = (a + b.options.slidesToShow - b.slideCount) * d), b.slideCount <= b.options.slidesToShow && (b.slideOffset = 0, e = 0), b.options.centerMode === !0 && b.options.infinite === !0 ? b.slideOffset += b.slideWidth * Math.floor(b.options.slidesToShow / 2) - b.slideWidth : b.options.centerMode === !0 && (b.slideOffset = 0, b.slideOffset += b.slideWidth * Math.floor(b.options.slidesToShow / 2)), c = b.options.vertical === !1 ? a * b.slideWidth * -1 + b.slideOffset : a * d * -1 + e, b.options.variableWidth === !0 && (f = b.slideCount <= b.options.slidesToShow || b.options.infinite === !1 ? b.$slideTrack.children(".slick-slide").eq(a) : b.$slideTrack.children(".slick-slide").eq(a + b.options.slidesToShow), c = b.options.rtl === !0 ? f[0] ? -1 * (b.$slideTrack.width() - f[0].offsetLeft - f.width()) : 0 : f[0] ? -1 * f[0].offsetLeft : 0, b.options.centerMode === !0 && (f = b.slideCount <= b.options.slidesToShow || b.options.infinite === !1 ? b.$slideTrack.children(".slick-slide").eq(a) : b.$slideTrack.children(".slick-slide").eq(a + b.options.slidesToShow + 1), c = b.options.rtl === !0 ? f[0] ? -1 * (b.$slideTrack.width() - f[0].offsetLeft - f.width()) : 0 : f[0] ? -1 * f[0].offsetLeft : 0, c += (b.$list.width() - f.outerWidth()) / 2)), c
    }, b.prototype.getOption = b.prototype.slickGetOption = function (a) {
        var b = this;
        return b.options[a]
    }, b.prototype.getNavigableIndexes = function () {
        var e, a = this, b = 0, c = 0, d = [];
        for (a.options.infinite === !1 ? e = a.slideCount : (b = -1 * a.options.slidesToScroll, c = -1 * a.options.slidesToScroll, e = 2 * a.slideCount); e > b;) d.push(b), b = c + a.options.slidesToScroll, c += a.options.slidesToScroll <= a.options.slidesToShow ? a.options.slidesToScroll : a.options.slidesToShow;
        return d
    }, b.prototype.getSlick = function () {
        return this
    }, b.prototype.getSlideCount = function () {
        var c, d, e, b = this;
        return e = b.options.centerMode === !0 ? b.slideWidth * Math.floor(b.options.slidesToShow / 2) : 0, b.options.swipeToSlide === !0 ? (b.$slideTrack.find(".slick-slide").each(function (c, f) {
            return f.offsetLeft - e + a(f).outerWidth() / 2 > -1 * b.swipeLeft ? (d = f, !1) : void 0
        }), c = Math.abs(a(d).attr("data-slick-index") - b.currentSlide) || 1) : b.options.slidesToScroll
    }, b.prototype.goTo = b.prototype.slickGoTo = function (a, b) {
        var c = this;
        c.changeSlide({data: {message: "index", index: parseInt(a)}}, b)
    }, b.prototype.init = function (b) {
        var c = this;
        a(c.$slider).hasClass("slick-initialized") || (a(c.$slider).addClass("slick-initialized"), c.buildRows(), c.buildOut(), c.setProps(), c.startLoad(), c.loadSlider(), c.initializeEvents(), c.updateArrows(), c.updateDots(), c.checkResponsive(!0), c.focusHandler()), b && c.$slider.trigger("init", [c]), c.options.accessibility === !0 && c.initADA(), c.options.autoplay && (c.paused = !1, c.autoPlay())
    }, b.prototype.initADA = function () {
        var b = this;
        b.$slides.add(b.$slideTrack.find(".slick-cloned")).attr({
            "aria-hidden": "true",
            tabindex: "-1"
        }).find("a, input, button, select").attr({tabindex: "-1"}), b.$slideTrack.attr("role", "listbox"), b.$slides.not(b.$slideTrack.find(".slick-cloned")).each(function (c) {
            a(this).attr({role: "option", "aria-describedby": "slick-slide" + b.instanceUid + c})
        }), null !== b.$dots && b.$dots.attr("role", "tablist").find("li").each(function (c) {
            a(this).attr({
                role: "presentation",
                "aria-selected": "false",
                "aria-controls": "navigation" + b.instanceUid + c,
                id: "slick-slide" + b.instanceUid + c
            })
        }).first().attr("aria-selected", "true").end().find("button").attr("role", "button").end().closest("div").attr("role", "toolbar"), b.activateADA()
    }, b.prototype.initArrowEvents = function () {
        var a = this;
        a.options.arrows === !0 && a.slideCount > a.options.slidesToShow && (a.$prevArrow.off("click.slick").on("click.slick", {message: "previous"}, a.changeSlide), a.$nextArrow.off("click.slick").on("click.slick", {message: "next"}, a.changeSlide))
    }, b.prototype.initDotEvents = function () {
        var b = this;
        b.options.dots === !0 && b.slideCount > b.options.slidesToShow && a("li", b.$dots).on("click.slick", {message: "index"}, b.changeSlide), b.options.dots === !0 && b.options.pauseOnDotsHover === !0 && a("li", b.$dots).on("mouseenter.slick", a.proxy(b.interrupt, b, !0)).on("mouseleave.slick", a.proxy(b.interrupt, b, !1))
    }, b.prototype.initSlideEvents = function () {
        var b = this;
        b.options.pauseOnHover && (b.$list.on("mouseenter.slick", a.proxy(b.interrupt, b, !0)), b.$list.on("mouseleave.slick", a.proxy(b.interrupt, b, !1)))
    }, b.prototype.initializeEvents = function () {
        var b = this;
        b.initArrowEvents(), b.initDotEvents(), b.initSlideEvents(), b.$list.on("touchstart.slick mousedown.slick", {action: "start"}, b.swipeHandler), b.$list.on("touchmove.slick mousemove.slick", {action: "move"}, b.swipeHandler), b.$list.on("touchend.slick mouseup.slick", {action: "end"}, b.swipeHandler), b.$list.on("touchcancel.slick mouseleave.slick", {action: "end"}, b.swipeHandler), b.$list.on("click.slick", b.clickHandler), a(document).on(b.visibilityChange, a.proxy(b.visibility, b)), b.options.accessibility === !0 && b.$list.on("keydown.slick", b.keyHandler), b.options.focusOnSelect === !0 && a(b.$slideTrack).children().on("click.slick", b.selectHandler), a(window).on("orientationchange.slick.slick-" + b.instanceUid, a.proxy(b.orientationChange, b)), a(window).on("resize.slick.slick-" + b.instanceUid, a.proxy(b.resize, b)), a("[draggable!=true]", b.$slideTrack).on("dragstart", b.preventDefault), a(window).on("load.slick.slick-" + b.instanceUid, b.setPosition), a(document).on("ready.slick.slick-" + b.instanceUid, b.setPosition)
    }, b.prototype.initUI = function () {
        var a = this;
        a.options.arrows === !0 && a.slideCount > a.options.slidesToShow && (a.$prevArrow.show(), a.$nextArrow.show()), a.options.dots === !0 && a.slideCount > a.options.slidesToShow && a.$dots.show()
    }, b.prototype.keyHandler = function (a) {
        var b = this;
        a.target.tagName.match("TEXTAREA|INPUT|SELECT") || (37 === a.keyCode && b.options.accessibility === !0 ? b.changeSlide({data: {message: b.options.rtl === !0 ? "next" : "previous"}}) : 39 === a.keyCode && b.options.accessibility === !0 && b.changeSlide({data: {message: b.options.rtl === !0 ? "previous" : "next"}}))
    }, b.prototype.lazyLoad = function () {
        function g(c) {
            a("img[data-lazy]", c).each(function () {
                var c = a(this), d = a(this).attr("data-lazy"), e = document.createElement("img");
                e.onload = function () {
                    c.animate({opacity: 0}, 100, function () {
                        c.attr("src", d).animate({opacity: 1}, 200, function () {
                            c.removeAttr("data-lazy").removeClass("slick-loading")
                        }), b.$slider.trigger("lazyLoaded", [b, c, d])
                    })
                }, e.onerror = function () {
                    c.removeAttr("data-lazy").removeClass("slick-loading").addClass("slick-lazyload-error"), b.$slider.trigger("lazyLoadError", [b, c, d])
                }, e.src = d
            })
        }

        var c, d, e, f, b = this;
        b.options.centerMode === !0 ? b.options.infinite === !0 ? (e = b.currentSlide + (b.options.slidesToShow / 2 + 1), f = e + b.options.slidesToShow + 2) : (e = Math.max(0, b.currentSlide - (b.options.slidesToShow / 2 + 1)), f = 2 + (b.options.slidesToShow / 2 + 1) + b.currentSlide) : (e = b.options.infinite ? b.options.slidesToShow + b.currentSlide : b.currentSlide, f = Math.ceil(e + b.options.slidesToShow), b.options.fade === !0 && (e > 0 && e--, f <= b.slideCount && f++)), c = b.$slider.find(".slick-slide").slice(e, f), g(c), b.slideCount <= b.options.slidesToShow ? (d = b.$slider.find(".slick-slide"), g(d)) : b.currentSlide >= b.slideCount - b.options.slidesToShow ? (d = b.$slider.find(".slick-cloned").slice(0, b.options.slidesToShow), g(d)) : 0 === b.currentSlide && (d = b.$slider.find(".slick-cloned").slice(-1 * b.options.slidesToShow), g(d))
    }, b.prototype.loadSlider = function () {
        var a = this;
        a.setPosition(), a.$slideTrack.css({opacity: 1}), a.$slider.removeClass("slick-loading"), a.initUI(), "progressive" === a.options.lazyLoad && a.progressiveLazyLoad()
    }, b.prototype.next = b.prototype.slickNext = function () {
        var a = this;
        a.changeSlide({data: {message: "next"}})
    }, b.prototype.orientationChange = function () {
        var a = this;
        a.checkResponsive(), a.setPosition()
    }, b.prototype.pause = b.prototype.slickPause = function () {
        var a = this;
        a.autoPlayClear(), a.paused = !0
    }, b.prototype.play = b.prototype.slickPlay = function () {
        var a = this;
        a.autoPlay(), a.options.autoplay = !0, a.paused = !1, a.focussed = !1, a.interrupted = !1
    }, b.prototype.postSlide = function (a) {
        var b = this;
        b.unslicked || (b.$slider.trigger("afterChange", [b, a]), b.animating = !1, b.setPosition(), b.swipeLeft = null, b.options.autoplay && b.autoPlay(), b.options.accessibility === !0 && b.initADA())
    }, b.prototype.prev = b.prototype.slickPrev = function () {
        var a = this;
        a.changeSlide({data: {message: "previous"}})
    }, b.prototype.preventDefault = function (a) {
        a.preventDefault()
    }, b.prototype.progressiveLazyLoad = function (b) {
        b = b || 1;
        var e, f, g, c = this, d = a("img[data-lazy]", c.$slider);
        d.length ? (e = d.first(), f = e.attr("data-lazy"), g = document.createElement("img"), g.onload = function () {
            e.attr("src", f).removeAttr("data-lazy").removeClass("slick-loading"), c.options.adaptiveHeight === !0 && c.setPosition(), c.$slider.trigger("lazyLoaded", [c, e, f]), c.progressiveLazyLoad()
        }, g.onerror = function () {
            3 > b ? setTimeout(function () {
                c.progressiveLazyLoad(b + 1)
            }, 500) : (e.removeAttr("data-lazy").removeClass("slick-loading").addClass("slick-lazyload-error"), c.$slider.trigger("lazyLoadError", [c, e, f]), c.progressiveLazyLoad())
        }, g.src = f) : c.$slider.trigger("allImagesLoaded", [c])
    }, b.prototype.refresh = function (b) {
        var d, e, c = this;
        e = c.slideCount - c.options.slidesToShow, !c.options.infinite && c.currentSlide > e && (c.currentSlide = e), c.slideCount <= c.options.slidesToShow && (c.currentSlide = 0), d = c.currentSlide, c.destroy(!0), a.extend(c, c.initials, {currentSlide: d}), c.init(), b || c.changeSlide({
            data: {
                message: "index",
                index: d
            }
        }, !1)
    }, b.prototype.registerBreakpoints = function () {
        var c, d, e, b = this, f = b.options.responsive || null;
        if ("array" === a.type(f) && f.length) {
            b.respondTo = b.options.respondTo || "window";
            for (c in f) if (e = b.breakpoints.length - 1, d = f[c].breakpoint, f.hasOwnProperty(c)) {
                for (; e >= 0;) b.breakpoints[e] && b.breakpoints[e] === d && b.breakpoints.splice(e, 1), e--;
                b.breakpoints.push(d), b.breakpointSettings[d] = f[c].settings
            }
            b.breakpoints.sort(function (a, c) {
                return b.options.mobileFirst ? a - c : c - a
            })
        }
    }, b.prototype.reinit = function () {
        var b = this;
        b.$slides = b.$slideTrack.children(b.options.slide).addClass("slick-slide"), b.slideCount = b.$slides.length, b.currentSlide >= b.slideCount && 0 !== b.currentSlide && (b.currentSlide = b.currentSlide - b.options.slidesToScroll), b.slideCount <= b.options.slidesToShow && (b.currentSlide = 0), b.registerBreakpoints(), b.setProps(), b.setupInfinite(), b.buildArrows(), b.updateArrows(), b.initArrowEvents(), b.buildDots(), b.updateDots(), b.initDotEvents(), b.cleanUpSlideEvents(), b.initSlideEvents(), b.checkResponsive(!1, !0), b.options.focusOnSelect === !0 && a(b.$slideTrack).children().on("click.slick", b.selectHandler), b.setSlideClasses("number" == typeof b.currentSlide ? b.currentSlide : 0), b.setPosition(), b.focusHandler(), b.paused = !b.options.autoplay, b.autoPlay(), b.$slider.trigger("reInit", [b])
    }, b.prototype.resize = function () {
        var b = this;
        a(window).width() !== b.windowWidth && (clearTimeout(b.windowDelay), b.windowDelay = window.setTimeout(function () {
            b.windowWidth = a(window).width(), b.checkResponsive(), b.unslicked || b.setPosition()
        }, 50))
    }, b.prototype.removeSlide = b.prototype.slickRemove = function (a, b, c) {
        var d = this;
        return "boolean" == typeof a ? (b = a, a = b === !0 ? 0 : d.slideCount - 1) : a = b === !0 ? --a : a, d.slideCount < 1 || 0 > a || a > d.slideCount - 1 ? !1 : (d.unload(), c === !0 ? d.$slideTrack.children().remove() : d.$slideTrack.children(this.options.slide).eq(a).remove(), d.$slides = d.$slideTrack.children(this.options.slide), d.$slideTrack.children(this.options.slide).detach(), d.$slideTrack.append(d.$slides), d.$slidesCache = d.$slides, void d.reinit())
    }, b.prototype.setCSS = function (a) {
        var d, e, b = this, c = {};
        b.options.rtl === !0 && (a = -a), d = "left" == b.positionProp ? Math.ceil(a) + "px" : "0px", e = "top" == b.positionProp ? Math.ceil(a) + "px" : "0px", c[b.positionProp] = a, b.transformsEnabled === !1 ? b.$slideTrack.css(c) : (c = {}, b.cssTransitions === !1 ? (c[b.animType] = "translate(" + d + ", " + e + ")", b.$slideTrack.css(c)) : (c[b.animType] = "translate3d(" + d + ", " + e + ", 0px)", b.$slideTrack.css(c)))
    }, b.prototype.setDimensions = function () {
        var a = this;
        a.options.vertical === !1 ? a.options.centerMode === !0 && a.$list.css({padding: "0px " + a.options.centerPadding}) : (a.$list.height(a.$slides.first().outerHeight(!0) * a.options.slidesToShow), a.options.centerMode === !0 && a.$list.css({padding: a.options.centerPadding + " 0px"})), a.listWidth = a.$list.width(), a.listHeight = a.$list.height(), a.options.vertical === !1 && a.options.variableWidth === !1 ? (a.slideWidth = Math.ceil(a.listWidth / a.options.slidesToShow), a.$slideTrack.width(Math.ceil(a.slideWidth * a.$slideTrack.children(".slick-slide").length))) : a.options.variableWidth === !0 ? a.$slideTrack.width(5e3 * a.slideCount) : (a.slideWidth = Math.ceil(a.listWidth), a.$slideTrack.height(Math.ceil(a.$slides.first().outerHeight(!0) * a.$slideTrack.children(".slick-slide").length)));
        var b = a.$slides.first().outerWidth(!0) - a.$slides.first().width();
        a.options.variableWidth === !1 && a.$slideTrack.children(".slick-slide").width(a.slideWidth - b)
    }, b.prototype.setFade = function () {
        var c, b = this;
        b.$slides.each(function (d, e) {
            c = b.slideWidth * d * -1, b.options.rtl === !0 ? a(e).css({
                position: "relative",
                right: c,
                top: 0,
                zIndex: b.options.zIndex - 2,
                opacity: 0
            }) : a(e).css({position: "relative", left: c, top: 0, zIndex: b.options.zIndex - 2, opacity: 0})
        }), b.$slides.eq(b.currentSlide).css({zIndex: b.options.zIndex - 1, opacity: 1})
    }, b.prototype.setHeight = function () {
        var a = this;
        if (1 === a.options.slidesToShow && a.options.adaptiveHeight === !0 && a.options.vertical === !1) {
            var b = a.$slides.eq(a.currentSlide).outerHeight(!0);
            a.$list.css("height", b)
        }
    }, b.prototype.setOption = b.prototype.slickSetOption = function () {
        var c, d, e, f, h, b = this, g = !1;
        if ("object" === a.type(arguments[0]) ? (e = arguments[0], g = arguments[1], h = "multiple") : "string" === a.type(arguments[0]) && (e = arguments[0], f = arguments[1], g = arguments[2], "responsive" === arguments[0] && "array" === a.type(arguments[1]) ? h = "responsive" : "undefined" != typeof arguments[1] && (h = "single")), "single" === h) b.options[e] = f; else if ("multiple" === h) a.each(e, function (a, c) {
            b.options[a] = c
        }); else if ("responsive" === h) for (d in f) if ("array" !== a.type(b.options.responsive)) b.options.responsive = [f[d]]; else {
            for (c = b.options.responsive.length - 1; c >= 0;) b.options.responsive[c].breakpoint === f[d].breakpoint && b.options.responsive.splice(c, 1), c--;
            b.options.responsive.push(f[d])
        }
        g && (b.unload(), b.reinit())
    }, b.prototype.setPosition = function () {
        var a = this;
        a.setDimensions(), a.setHeight(), a.options.fade === !1 ? a.setCSS(a.getLeft(a.currentSlide)) : a.setFade(), a.$slider.trigger("setPosition", [a])
    }, b.prototype.setProps = function () {
        var a = this, b = document.body.style;
        a.positionProp = a.options.vertical === !0 ? "top" : "left", "top" === a.positionProp ? a.$slider.addClass("slick-vertical") : a.$slider.removeClass("slick-vertical"), (void 0 !== b.WebkitTransition || void 0 !== b.MozTransition || void 0 !== b.msTransition) && a.options.useCSS === !0 && (a.cssTransitions = !0), a.options.fade && ("number" == typeof a.options.zIndex ? a.options.zIndex < 3 && (a.options.zIndex = 3) : a.options.zIndex = a.defaults.zIndex), void 0 !== b.OTransform && (a.animType = "OTransform", a.transformType = "-o-transform", a.transitionType = "OTransition", void 0 === b.perspectiveProperty && void 0 === b.webkitPerspective && (a.animType = !1)), void 0 !== b.MozTransform && (a.animType = "MozTransform", a.transformType = "-moz-transform", a.transitionType = "MozTransition", void 0 === b.perspectiveProperty && void 0 === b.MozPerspective && (a.animType = !1)), void 0 !== b.webkitTransform && (a.animType = "webkitTransform", a.transformType = "-webkit-transform", a.transitionType = "webkitTransition", void 0 === b.perspectiveProperty && void 0 === b.webkitPerspective && (a.animType = !1)), void 0 !== b.msTransform && (a.animType = "msTransform", a.transformType = "-ms-transform", a.transitionType = "msTransition", void 0 === b.msTransform && (a.animType = !1)), void 0 !== b.transform && a.animType !== !1 && (a.animType = "transform", a.transformType = "transform", a.transitionType = "transition"), a.transformsEnabled = a.options.useTransform && null !== a.animType && a.animType !== !1
    }, b.prototype.setSlideClasses = function (a) {
        var c, d, e, f, b = this;
        d = b.$slider.find(".slick-slide").removeClass("slick-active slick-center slick-current").attr("aria-hidden", "true"), b.$slides.eq(a).addClass("slick-current"), b.options.centerMode === !0 ? (c = Math.floor(b.options.slidesToShow / 2), b.options.infinite === !0 && (a >= c && a <= b.slideCount - 1 - c ? b.$slides.slice(a - c, a + c + 1).addClass("slick-active").attr("aria-hidden", "false") : (e = b.options.slidesToShow + a,
            d.slice(e - c + 1, e + c + 2).addClass("slick-active").attr("aria-hidden", "false")), 0 === a ? d.eq(d.length - 1 - b.options.slidesToShow).addClass("slick-center") : a === b.slideCount - 1 && d.eq(b.options.slidesToShow).addClass("slick-center")), b.$slides.eq(a).addClass("slick-center")) : a >= 0 && a <= b.slideCount - b.options.slidesToShow ? b.$slides.slice(a, a + b.options.slidesToShow).addClass("slick-active").attr("aria-hidden", "false") : d.length <= b.options.slidesToShow ? d.addClass("slick-active").attr("aria-hidden", "false") : (f = b.slideCount % b.options.slidesToShow, e = b.options.infinite === !0 ? b.options.slidesToShow + a : a, b.options.slidesToShow == b.options.slidesToScroll && b.slideCount - a < b.options.slidesToShow ? d.slice(e - (b.options.slidesToShow - f), e + f).addClass("slick-active").attr("aria-hidden", "false") : d.slice(e, e + b.options.slidesToShow).addClass("slick-active").attr("aria-hidden", "false")), "ondemand" === b.options.lazyLoad && b.lazyLoad()
    }, b.prototype.setupInfinite = function () {
        var c, d, e, b = this;
        if (b.options.fade === !0 && (b.options.centerMode = !1), b.options.infinite === !0 && b.options.fade === !1 && (d = null, b.slideCount > b.options.slidesToShow)) {
            for (e = b.options.centerMode === !0 ? b.options.slidesToShow + 1 : b.options.slidesToShow, c = b.slideCount; c > b.slideCount - e; c -= 1) d = c - 1, a(b.$slides[d]).clone(!0).attr("id", "").attr("data-slick-index", d - b.slideCount).prependTo(b.$slideTrack).addClass("slick-cloned");
            for (c = 0; e > c; c += 1) d = c, a(b.$slides[d]).clone(!0).attr("id", "").attr("data-slick-index", d + b.slideCount).appendTo(b.$slideTrack).addClass("slick-cloned");
            b.$slideTrack.find(".slick-cloned").find("[id]").each(function () {
                a(this).attr("id", "")
            })
        }
    }, b.prototype.interrupt = function (a) {
        var b = this;
        a || b.autoPlay(), b.interrupted = a
    }, b.prototype.selectHandler = function (b) {
        var c = this, d = a(b.target).is(".slick-slide") ? a(b.target) : a(b.target).parents(".slick-slide"),
            e = parseInt(d.attr("data-slick-index"));
        return e || (e = 0), c.slideCount <= c.options.slidesToShow ? (c.setSlideClasses(e), void c.asNavFor(e)) : void c.slideHandler(e)
    }, b.prototype.slideHandler = function (a, b, c) {
        var d, e, f, g, j, h = null, i = this;
        return b = b || !1, i.animating === !0 && i.options.waitForAnimate === !0 || i.options.fade === !0 && i.currentSlide === a || i.slideCount <= i.options.slidesToShow ? void 0 : (b === !1 && i.asNavFor(a), d = a, h = i.getLeft(d), g = i.getLeft(i.currentSlide), i.currentLeft = null === i.swipeLeft ? g : i.swipeLeft, i.options.infinite === !1 && i.options.centerMode === !1 && (0 > a || a > i.getDotCount() * i.options.slidesToScroll) ? void (i.options.fade === !1 && (d = i.currentSlide, c !== !0 ? i.animateSlide(g, function () {
            i.postSlide(d)
        }) : i.postSlide(d))) : i.options.infinite === !1 && i.options.centerMode === !0 && (0 > a || a > i.slideCount - i.options.slidesToScroll) ? void (i.options.fade === !1 && (d = i.currentSlide, c !== !0 ? i.animateSlide(g, function () {
            i.postSlide(d)
        }) : i.postSlide(d))) : (i.options.autoplay && clearInterval(i.autoPlayTimer), e = 0 > d ? i.slideCount % i.options.slidesToScroll !== 0 ? i.slideCount - i.slideCount % i.options.slidesToScroll : i.slideCount + d : d >= i.slideCount ? i.slideCount % i.options.slidesToScroll !== 0 ? 0 : d - i.slideCount : d, i.animating = !0, i.$slider.trigger("beforeChange", [i, i.currentSlide, e]), f = i.currentSlide, i.currentSlide = e, i.setSlideClasses(i.currentSlide), i.options.asNavFor && (j = i.getNavTarget(), j = j.slick("getSlick"), j.slideCount <= j.options.slidesToShow && j.setSlideClasses(i.currentSlide)), i.updateDots(), i.updateArrows(), i.options.fade === !0 ? (c !== !0 ? (i.fadeSlideOut(f), i.fadeSlide(e, function () {
            i.postSlide(e)
        })) : i.postSlide(e), void i.animateHeight()) : void (c !== !0 ? i.animateSlide(h, function () {
            i.postSlide(e)
        }) : i.postSlide(e))))
    }, b.prototype.startLoad = function () {
        var a = this;
        a.options.arrows === !0 && a.slideCount > a.options.slidesToShow && (a.$prevArrow.hide(), a.$nextArrow.hide()), a.options.dots === !0 && a.slideCount > a.options.slidesToShow && a.$dots.hide(), a.$slider.addClass("slick-loading")
    }, b.prototype.swipeDirection = function () {
        var a, b, c, d, e = this;
        return a = e.touchObject.startX - e.touchObject.curX, b = e.touchObject.startY - e.touchObject.curY, c = Math.atan2(b, a), d = Math.round(180 * c / Math.PI), 0 > d && (d = 360 - Math.abs(d)), 45 >= d && d >= 0 ? e.options.rtl === !1 ? "left" : "right" : 360 >= d && d >= 315 ? e.options.rtl === !1 ? "left" : "right" : d >= 135 && 225 >= d ? e.options.rtl === !1 ? "right" : "left" : e.options.verticalSwiping === !0 ? d >= 35 && 135 >= d ? "down" : "up" : "vertical"
    }, b.prototype.swipeEnd = function (a) {
        var c, d, b = this;
        if (b.dragging = !1, b.interrupted = !1, b.shouldClick = b.touchObject.swipeLength > 10 ? !1 : !0, void 0 === b.touchObject.curX) return !1;
        if (b.touchObject.edgeHit === !0 && b.$slider.trigger("edge", [b, b.swipeDirection()]), b.touchObject.swipeLength >= b.touchObject.minSwipe) {
            switch (d = b.swipeDirection()) {
                case"left":
                case"down":
                    c = b.options.swipeToSlide ? b.checkNavigable(b.currentSlide + b.getSlideCount()) : b.currentSlide + b.getSlideCount(), b.currentDirection = 0;
                    break;
                case"right":
                case"up":
                    c = b.options.swipeToSlide ? b.checkNavigable(b.currentSlide - b.getSlideCount()) : b.currentSlide - b.getSlideCount(), b.currentDirection = 1
            }
            "vertical" != d && (b.slideHandler(c), b.touchObject = {}, b.$slider.trigger("swipe", [b, d]))
        } else b.touchObject.startX !== b.touchObject.curX && (b.slideHandler(b.currentSlide), b.touchObject = {})
    }, b.prototype.swipeHandler = function (a) {
        var b = this;
        if (!(b.options.swipe === !1 || "ontouchend" in document && b.options.swipe === !1 || b.options.draggable === !1 && -1 !== a.type.indexOf("mouse"))) switch (b.touchObject.fingerCount = a.originalEvent && void 0 !== a.originalEvent.touches ? a.originalEvent.touches.length : 1, b.touchObject.minSwipe = b.listWidth / b.options.touchThreshold, b.options.verticalSwiping === !0 && (b.touchObject.minSwipe = b.listHeight / b.options.touchThreshold), a.data.action) {
            case"start":
                b.swipeStart(a);
                break;
            case"move":
                b.swipeMove(a);
                break;
            case"end":
                b.swipeEnd(a)
        }
    }, b.prototype.swipeMove = function (a) {
        var d, e, f, g, h, b = this;
        return h = void 0 !== a.originalEvent ? a.originalEvent.touches : null, !b.dragging || h && 1 !== h.length ? !1 : (d = b.getLeft(b.currentSlide), b.touchObject.curX = void 0 !== h ? h[0].pageX : a.clientX, b.touchObject.curY = void 0 !== h ? h[0].pageY : a.clientY, b.touchObject.swipeLength = Math.round(Math.sqrt(Math.pow(b.touchObject.curX - b.touchObject.startX, 2))), b.options.verticalSwiping === !0 && (b.touchObject.swipeLength = Math.round(Math.sqrt(Math.pow(b.touchObject.curY - b.touchObject.startY, 2)))), e = b.swipeDirection(), "vertical" !== e ? (void 0 !== a.originalEvent && b.touchObject.swipeLength > 4 && a.preventDefault(), g = (b.options.rtl === !1 ? 1 : -1) * (b.touchObject.curX > b.touchObject.startX ? 1 : -1), b.options.verticalSwiping === !0 && (g = b.touchObject.curY > b.touchObject.startY ? 1 : -1), f = b.touchObject.swipeLength, b.touchObject.edgeHit = !1, b.options.infinite === !1 && (0 === b.currentSlide && "right" === e || b.currentSlide >= b.getDotCount() && "left" === e) && (f = b.touchObject.swipeLength * b.options.edgeFriction, b.touchObject.edgeHit = !0), b.options.vertical === !1 ? b.swipeLeft = d + f * g : b.swipeLeft = d + f * (b.$list.height() / b.listWidth) * g, b.options.verticalSwiping === !0 && (b.swipeLeft = d + f * g), b.options.fade === !0 || b.options.touchMove === !1 ? !1 : b.animating === !0 ? (b.swipeLeft = null, !1) : void b.setCSS(b.swipeLeft)) : void 0)
    }, b.prototype.swipeStart = function (a) {
        var c, b = this;
        return b.interrupted = !0, 1 !== b.touchObject.fingerCount || b.slideCount <= b.options.slidesToShow ? (b.touchObject = {}, !1) : (void 0 !== a.originalEvent && void 0 !== a.originalEvent.touches && (c = a.originalEvent.touches[0]), b.touchObject.startX = b.touchObject.curX = void 0 !== c ? c.pageX : a.clientX, b.touchObject.startY = b.touchObject.curY = void 0 !== c ? c.pageY : a.clientY, void (b.dragging = !0))
    }, b.prototype.unfilterSlides = b.prototype.slickUnfilter = function () {
        var a = this;
        null !== a.$slidesCache && (a.unload(), a.$slideTrack.children(this.options.slide).detach(), a.$slidesCache.appendTo(a.$slideTrack), a.reinit())
    }, b.prototype.unload = function () {
        var b = this;
        a(".slick-cloned", b.$slider).remove(), b.$dots && b.$dots.remove(), b.$prevArrow && b.htmlExpr.test(b.options.prevArrow) && b.$prevArrow.remove(), b.$nextArrow && b.htmlExpr.test(b.options.nextArrow) && b.$nextArrow.remove(), b.$slides.removeClass("slick-slide slick-active slick-visible slick-current").attr("aria-hidden", "true").css("width", "")
    }, b.prototype.unslick = function (a) {
        var b = this;
        b.$slider.trigger("unslick", [b, a]), b.destroy()
    }, b.prototype.updateArrows = function () {
        var b, a = this;
        b = Math.floor(a.options.slidesToShow / 2), a.options.arrows === !0 && a.slideCount > a.options.slidesToShow && !a.options.infinite && (a.$prevArrow.removeClass("slick-disabled").attr("aria-disabled", "false"), a.$nextArrow.removeClass("slick-disabled").attr("aria-disabled", "false"), 0 === a.currentSlide ? (a.$prevArrow.addClass("slick-disabled").attr("aria-disabled", "true"), a.$nextArrow.removeClass("slick-disabled").attr("aria-disabled", "false")) : a.currentSlide >= a.slideCount - a.options.slidesToShow && a.options.centerMode === !1 ? (a.$nextArrow.addClass("slick-disabled").attr("aria-disabled", "true"), a.$prevArrow.removeClass("slick-disabled").attr("aria-disabled", "false")) : a.currentSlide >= a.slideCount - 1 && a.options.centerMode === !0 && (a.$nextArrow.addClass("slick-disabled").attr("aria-disabled", "true"), a.$prevArrow.removeClass("slick-disabled").attr("aria-disabled", "false")))
    }, b.prototype.updateDots = function () {
        var a = this;
        null !== a.$dots && (a.$dots.find("li").removeClass("slick-active").attr("aria-hidden", "true"), a.$dots.find("li").eq(Math.floor(a.currentSlide / a.options.slidesToScroll)).addClass("slick-active").attr("aria-hidden", "false"))
    }, b.prototype.visibility = function () {
        var a = this;
        a.options.autoplay && (document[a.hidden] ? a.interrupted = !0 : a.interrupted = !1)
    }, a.fn.slick = function () {
        var f, g, a = this, c = arguments[0], d = Array.prototype.slice.call(arguments, 1), e = a.length;
        for (f = 0; e > f; f++) if ("object" == typeof c || "undefined" == typeof c ? a[f].slick = new b(a[f], c) : g = a[f].slick[c].apply(a[f].slick, d), "undefined" != typeof g) return g;
        return a
    }
});

/*!
 * smartbanner.js v1.11.0 <https://github.com/ain/smartbanner.js>
 * Copyright © 2019 Ain Tohvri, contributors. Licensed under GPL-3.0.
 */
(function e(t, n, r) {
    function s(o, u) {
        if (!n[o]) {
            if (!t[o]) {
                var a = typeof require == "function" && require;
                if (!u && a) return a(o, !0);
                if (i) return i(o, !0);
                var f = new Error("Cannot find module '" + o + "'");
                throw f.code = "MODULE_NOT_FOUND", f
            }
            var l = n[o] = {exports: {}};
            t[o][0].call(l.exports, function (e) {
                var n = t[o][1][e];
                return s(n ? n : e)
            }, l, l.exports, e, t, n, r)
        }
        return n[o].exports
    }

    var i = typeof require == "function" && require;
    for (var o = 0; o < r.length; o++) s(r[o]);
    return s
})({
    1: [function (require, module, exports) {
        "use strict";
        Object.defineProperty(exports, "__esModule", {value: true});
        exports.default = void 0;

        function _classCallCheck(instance, Constructor) {
            if (!(instance instanceof Constructor)) {
                throw new TypeError("Cannot call a class as a function")
            }
        }

        function _defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor)
            }
        }

        function _createClass(Constructor, protoProps, staticProps) {
            if (protoProps) _defineProperties(Constructor.prototype, protoProps);
            if (staticProps) _defineProperties(Constructor, staticProps);
            return Constructor
        }

        var Bakery = function () {
            function Bakery() {
                _classCallCheck(this, Bakery)
            }

            _createClass(Bakery, null, [{
                key: "getCookieExpiresString",
                value: function getCookieExpiresString(hideTtl) {
                    var now = new Date;
                    var expireTime = new Date(now.getTime() + hideTtl);
                    return "expires=".concat(expireTime.toGMTString(), ";")
                }
            }, {
                key: "bake", value: function bake(hideTtl, hidePath) {
                    document.cookie = "smartbanner_exited=1; ".concat(hideTtl ? Bakery.getCookieExpiresString(hideTtl) : "", " path=").concat(hidePath)
                }
            }, {
                key: "unbake", value: function unbake() {
                    document.cookie = "smartbanner_exited=; expires=Thu, 01 Jan 1970 00:00:01 GMT;"
                }
            }, {
                key: "baked", get: function get() {
                    var value = document.cookie.replace(/(?:(?:^|.*;\s*)smartbanner_exited\s*=\s*([^;]*).*$)|^.*$/, "$1");
                    return value === "1"
                }
            }]);
            return Bakery
        }();
        exports.default = Bakery
    }, {}], 2: [function (require, module, exports) {
        (function (global) {
            "use strict";
            Object.defineProperty(exports, "__esModule", {value: true});
            exports.default = void 0;

            function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                    throw new TypeError("Cannot call a class as a function")
                }
            }

            function _defineProperties(target, props) {
                for (var i = 0; i < props.length; i++) {
                    var descriptor = props[i];
                    descriptor.enumerable = descriptor.enumerable || false;
                    descriptor.configurable = true;
                    if ("value" in descriptor) descriptor.writable = true;
                    Object.defineProperty(target, descriptor.key, descriptor)
                }
            }

            function _createClass(Constructor, protoProps, staticProps) {
                if (protoProps) _defineProperties(Constructor.prototype, protoProps);
                if (staticProps) _defineProperties(Constructor, staticProps);
                return Constructor
            }

            var Detector = function () {
                function Detector() {
                    _classCallCheck(this, Detector)
                }

                _createClass(Detector, null, [{
                    key: "platform", value: function platform() {
                        if (/iPhone|iPad|iPod/i.test(window.navigator.userAgent)) {
                            return "ios"
                        } else if (/Android/i.test(window.navigator.userAgent)) {
                            return "android"
                        }
                    }
                }, {
                    key: "userAgentMatchesRegex", value: function userAgentMatchesRegex(regexString) {
                        return new RegExp(regexString).test(window.navigator.userAgent)
                    }
                }, {
                    key: "jQueryMobilePage", value: function jQueryMobilePage() {
                        return typeof global.$ !== "undefined" && global.$.mobile !== "undefined" && document.querySelector(".ui-page") !== null
                    }
                }, {
                    key: "wrapperElement", value: function wrapperElement() {
                        var selector = Detector.jQueryMobilePage() ? ".ui-page" : "html";
                        return document.querySelectorAll(selector)
                    }
                }]);
                return Detector
            }();
            exports.default = Detector
        }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    }, {}], 3: [function (require, module, exports) {
        "use strict";
        var _smartbanner = _interopRequireDefault(require("./smartbanner.js"));

        function _interopRequireDefault(obj) {
            return obj && obj.__esModule ? obj : {default: obj}
        }

        var smartbanner;
        window.addEventListener("load", function () {
            smartbanner = new _smartbanner.default;
            smartbanner.publish()
        })
    }, {"./smartbanner.js": 5}], 4: [function (require, module, exports) {
        "use strict";
        Object.defineProperty(exports, "__esModule", {value: true});
        exports.default = void 0;

        function _classCallCheck(instance, Constructor) {
            if (!(instance instanceof Constructor)) {
                throw new TypeError("Cannot call a class as a function")
            }
        }

        function _defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor)
            }
        }

        function _createClass(Constructor, protoProps, staticProps) {
            if (protoProps) _defineProperties(Constructor.prototype, protoProps);
            if (staticProps) _defineProperties(Constructor, staticProps);
            return Constructor
        }

        function valid(name) {
            return name.indexOf("smartbanner:") !== -1 && name.split(":")[1].length > 0
        }

        function convertToCamelCase(name) {
            var parts = name.split("-");
            parts.map(function (part, index) {
                if (index > 0) {
                    parts[index] = part.charAt(0).toUpperCase() + part.substring(1)
                }
            });
            return parts.join("")
        }

        var OptionParser = function () {
            function OptionParser() {
                _classCallCheck(this, OptionParser)
            }

            _createClass(OptionParser, [{
                key: "parse", value: function parse() {
                    var metas = document.getElementsByTagName("meta");
                    var options = {};
                    Array.apply(null, metas).forEach(function (meta) {
                        var optionName = null;
                        var name = meta.getAttribute("name");
                        var content = meta.getAttribute("content");
                        if (name && content && valid(name) && content.length > 0) {
                            optionName = name.split(":")[1];
                            if (optionName.indexOf("-") !== -1) {
                                optionName = convertToCamelCase(optionName)
                            }
                            options[optionName] = content
                        }
                    });
                    return options
                }
            }]);
            return OptionParser
        }();
        exports.default = OptionParser
    }, {}], 5: [function (require, module, exports) {
        "use strict";
        Object.defineProperty(exports, "__esModule", {value: true});
        exports.default = void 0;
        var _optionparser = _interopRequireDefault(require("./optionparser.js"));
        var _detector = _interopRequireDefault(require("./detector.js"));
        var _bakery = _interopRequireDefault(require("./bakery.js"));

        function _interopRequireDefault(obj) {
            return obj && obj.__esModule ? obj : {default: obj}
        }

        function _classCallCheck(instance, Constructor) {
            if (!(instance instanceof Constructor)) {
                throw new TypeError("Cannot call a class as a function")
            }
        }

        function _defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor)
            }
        }

        function _createClass(Constructor, protoProps, staticProps) {
            if (protoProps) _defineProperties(Constructor.prototype, protoProps);
            if (staticProps) _defineProperties(Constructor, staticProps);
            return Constructor
        }

        var DEFAULT_PLATFORMS = "android,ios";
        var datas = {
            originalTop: "data-smartbanner-original-top",
            originalMarginTop: "data-smartbanner-original-margin-top"
        };

        function handleExitClick(event, self) {
            self.exit();
            event.preventDefault()
        }

        function handleJQueryMobilePageLoad(event) {
            if (!this.positioningDisabled) {
                setContentPosition(event.data.height)
            }
        }

        function addEventListeners(self) {
            var closeIcon = document.querySelector(".js_smartbanner__exit");
            closeIcon.addEventListener("click", function (event) {
                return handleExitClick(event, self)
            });
            if (_detector.default.jQueryMobilePage()) {
                $(document).on("pagebeforeshow", self, handleJQueryMobilePageLoad)
            }
        }

        function removeEventListeners() {
            if (_detector.default.jQueryMobilePage()) {
                $(document).off("pagebeforeshow", handleJQueryMobilePageLoad)
            }
        }

        function setContentPosition(value) {
            var wrappers = _detector.default.wrapperElement();
            for (var i = 0, l = wrappers.length, wrapper; i < l; i++) {
                wrapper = wrappers[i];
                if (_detector.default.jQueryMobilePage()) {
                    if (wrapper.getAttribute(datas.originalTop)) {
                        continue
                    }
                    var top = parseFloat(getComputedStyle(wrapper).top);
                    wrapper.setAttribute(datas.originalTop, isNaN(top) ? 0 : top);
                    wrapper.style.top = value + "px"
                } else {
                    if (wrapper.getAttribute(datas.originalMarginTop)) {
                        continue
                    }
                    var margin = parseFloat(getComputedStyle(wrapper).marginTop);
                    wrapper.setAttribute(datas.originalMarginTop, isNaN(margin) ? 0 : margin);
                    wrapper.style.marginTop = value + "px"
                }
            }
        }

        function restoreContentPosition() {
            var wrappers = _detector.default.wrapperElement();
            for (var i = 0, l = wrappers.length, wrapper; i < l; i++) {
                wrapper = wrappers[i];
                if (_detector.default.jQueryMobilePage() && wrapper.getAttribute(datas.originalTop)) {
                    wrapper.style.top = wrapper.getAttribute(datas.originalTop) + "px"
                } else if (wrapper.getAttribute(datas.originalMarginTop)) {
                    wrapper.style.marginTop = wrapper.getAttribute(datas.originalMarginTop) + "px"
                }
            }
        }

        var SmartBanner = function () {
            function SmartBanner() {
                _classCallCheck(this, SmartBanner);
                var parser = new _optionparser.default;
                this.options = parser.parse();
                this.platform = _detector.default.platform()
            }

            _createClass(SmartBanner, [{
                key: "publish", value: function publish() {
                    if (Object.keys(this.options).length === 0) {
                        throw new Error("No options detected. Please consult documentation.")
                    }
                    if (_bakery.default.baked) {
                        return false
                    }
                    if (this.userAgentExcluded) {
                        return false
                    }
                    if (!(this.platformEnabled || this.userAgentIncluded)) {
                        return false
                    }
                    var bannerDiv = document.createElement("div");
                    document.querySelector("body").appendChild(bannerDiv);
                    bannerDiv.outerHTML = this.html;
                    var event = new Event("smartbanner.view");
                    document.dispatchEvent(event);
                    if (!this.positioningDisabled) {
                        setContentPosition(this.height)
                    }
                    addEventListeners(this)
                }
            }, {
                key: "exit", value: function exit() {
                    removeEventListeners();
                    if (!this.positioningDisabled) {
                        restoreContentPosition()
                    }
                    var banner = document.querySelector(".js_smartbanner");
                    document.querySelector("body").removeChild(banner);
                    var event = new Event("smartbanner.exit");
                    document.dispatchEvent(event);
                    _bakery.default.bake(this.hideTtl, this.hidePath)
                }
            }, {
                key: "originalTop", get: function get() {
                    var wrapper = _detector.default.wrapperElement()[0];
                    return parseFloat(wrapper.getAttribute(datas.originalTop))
                }
            }, {
                key: "originalTopMargin", get: function get() {
                    var wrapper = _detector.default.wrapperElement()[0];
                    return parseFloat(wrapper.getAttribute(datas.originalMarginTop))
                }
            }, {
                key: "priceSuffix", get: function get() {
                    if (this.platform === "ios") {
                        return this.options.priceSuffixApple
                    } else if (this.platform === "android") {
                        return this.options.priceSuffixGoogle
                    }
                    return ""
                }
            }, {
                key: "icon", get: function get() {
                    if (this.platform === "android") {
                        return this.options.iconGoogle
                    } else {
                        return this.options.iconApple
                    }
                }
            }, {
                key: "buttonUrl", get: function get() {
                    if (this.platform === "android") {
                        return this.options.buttonUrlGoogle
                    } else if (this.platform === "ios") {
                        return this.options.buttonUrlApple
                    }
                    return "#"
                }
            }, {
                key: "html", get: function get() {
                    var modifier = !this.options.customDesignModifier ? this.platform : this.options.customDesignModifier;
                    return '<div class="smartbanner smartbanner--'.concat(modifier, ' js_smartbanner">\n      <a href="javascript:void();" class="smartbanner__exit js_smartbanner__exit"></a>\n      <div class="smartbanner__icon" style="background-image: url(').concat(this.icon, ');"></div>\n      <div class="smartbanner__info">\n        <div>\n          <div class="smartbanner__info__title">').concat(this.options.title, '</div>\n          <div class="smartbanner__info__author">').concat(this.options.author, '</div>\n          <div class="smartbanner__info__price">').concat(this.options.price).concat(this.priceSuffix, '</div>\n        </div>\n      </div>\n      <a href="').concat(this.buttonUrl, '" target="_blank" class="smartbanner__button"><span class="smartbanner__button__label">').concat(this.options.button, "</span></a>\n    </div>")
                }
            }, {
                key: "height", get: function get() {
                    var height = document.querySelector(".js_smartbanner").offsetHeight;
                    return height !== undefined ? height : 0
                }
            }, {
                key: "platformEnabled", get: function get() {
                    var enabledPlatforms = this.options.enabledPlatforms || DEFAULT_PLATFORMS;
                    return enabledPlatforms && enabledPlatforms.replace(/\s+/g, "").split(",").indexOf(this.platform) !== -1
                }
            }, {
                key: "positioningDisabled", get: function get() {
                    return this.options.disablePositioning === "true"
                }
            }, {
                key: "userAgentExcluded", get: function get() {
                    if (!this.options.excludeUserAgentRegex) {
                        return false
                    }
                    return _detector.default.userAgentMatchesRegex(this.options.excludeUserAgentRegex)
                }
            }, {
                key: "userAgentIncluded", get: function get() {
                    if (!this.options.includeUserAgentRegex) {
                        return false
                    }
                    return _detector.default.userAgentMatchesRegex(this.options.includeUserAgentRegex)
                }
            }, {
                key: "hideTtl", get: function get() {
                    return this.options.hideTtl ? parseInt(this.options.hideTtl) : false
                }
            }, {
                key: "hidePath", get: function get() {
                    return this.options.hidePath ? this.options.hidePath : "/"
                }
            }]);
            return SmartBanner
        }();
        exports.default = SmartBanner
    }, {"./bakery.js": 1, "./detector.js": 2, "./optionparser.js": 4}]
}, {}, [3]);

/*
 * easy-autocomplete
 * jQuery plugin for autocompletion
 * 
 * @author Łukasz Pawełczak (http://github.com/pawelczak)
 * @version 1.3.5
 * Copyright  License: 
 */

var EasyAutocomplete = function (a) {
    return a.Configuration = function (a) {
        function b() {
            if ("xml" === a.dataType && (a.getValue || (a.getValue = function (a) {
                return $(a).text()
            }), a.list || (a.list = {}), a.list.sort || (a.list.sort = {}), a.list.sort.method = function (b, c) {
                return b = a.getValue(b), c = a.getValue(c), c > b ? -1 : b > c ? 1 : 0
            }, a.list.match || (a.list.match = {}), a.list.match.method = function (a, b) {
                return a.search(b) > -1
            }), void 0 !== a.categories && a.categories instanceof Array) {
                for (var b = [], c = 0, d = a.categories.length; d > c; c += 1) {
                    var e = a.categories[c];
                    for (var f in h.categories[0]) void 0 === e[f] && (e[f] = h.categories[0][f]);
                    b.push(e)
                }
                a.categories = b
            }
        }

        function c() {
            function b(a, c) {
                var d = a || {};
                for (var e in a) void 0 !== c[e] && null !== c[e] && ("object" != typeof c[e] || c[e] instanceof Array ? d[e] = c[e] : b(a[e], c[e]));
                return void 0 !== c.data && null !== c.data && "object" == typeof c.data && (d.data = c.data), d
            }

            h = b(h, a)
        }

        function d() {
            if ("list-required" !== h.url && "function" != typeof h.url) {
                var b = h.url;
                h.url = function () {
                    return b
                }
            }
            if (void 0 !== h.ajaxSettings.url && "function" != typeof h.ajaxSettings.url) {
                var b = h.ajaxSettings.url;
                h.ajaxSettings.url = function () {
                    return b
                }
            }
            if ("string" == typeof h.listLocation) {
                var c = h.listLocation;
                "XML" === h.dataType.toUpperCase() ? h.listLocation = function (a) {
                    return $(a).find(c)
                } : h.listLocation = function (a) {
                    return a[c]
                }
            }
            if ("string" == typeof h.getValue) {
                var d = h.getValue;
                h.getValue = function (a) {
                    return a[d]
                }
            }
            void 0 !== a.categories && (h.categoriesAssigned = !0)
        }

        function e() {
            void 0 !== a.ajaxSettings && "object" == typeof a.ajaxSettings ? h.ajaxSettings = a.ajaxSettings : h.ajaxSettings = {}
        }

        function f(a) {
            return void 0 !== h[a] && null !== h[a]
        }

        function g(a, b) {
            function c(b, d) {
                for (var e in d) void 0 === b[e] && a.log("Property '" + e + "' does not exist in EasyAutocomplete options API."), "object" == typeof b[e] && -1 === $.inArray(e, i) && c(b[e], d[e])
            }

            c(h, b)
        }

        var h = {
            data: "list-required",
            url: "list-required",
            dataType: "json",
            listLocation: function (a) {
                return a
            },
            xmlElementName: "",
            getValue: function (a) {
                return a
            },
            autocompleteOff: !0,
            placeholder: !1,
            ajaxCallback: function () {
            },
            matchResponseProperty: !1,
            list: {
                sort: {
                    enabled: !1, method: function (a, b) {
                        return a = h.getValue(a), b = h.getValue(b), b > a ? -1 : a > b ? 1 : 0
                    }
                },
                maxNumberOfElements: 6,
                hideOnEmptyPhrase: !0,
                match: {
                    enabled: !1, caseSensitive: !1, method: function (a, b) {
                        return a.search(b) > -1
                    }
                },
                showAnimation: {
                    type: "normal", time: 400, callback: function () {
                    }
                },
                hideAnimation: {
                    type: "normal", time: 400, callback: function () {
                    }
                },
                onClickEvent: function () {
                },
                onSelectItemEvent: function () {
                },
                onLoadEvent: function () {
                },
                onChooseEvent: function () {
                },
                onKeyEnterEvent: function () {
                },
                onMouseOverEvent: function () {
                },
                onMouseOutEvent: function () {
                },
                onShowListEvent: function () {
                },
                onHideListEvent: function () {
                }
            },
            highlightPhrase: !0,
            theme: "",
            cssClasses: "",
            minCharNumber: 0,
            requestDelay: 0,
            adjustWidth: !0,
            ajaxSettings: {},
            preparePostData: function (a, b) {
                return a
            },
            loggerEnabled: !0,
            template: "",
            categoriesAssigned: !1,
            categories: [{maxNumberOfElements: 4}]
        }, i = ["ajaxSettings", "template"];
        this.get = function (a) {
            return h[a]
        }, this.equals = function (a, b) {
            return !(!f(a) || h[a] !== b)
        }, this.checkDataUrlProperties = function () {
            return "list-required" !== h.url || "list-required" !== h.data
        }, this.checkRequiredProperties = function () {
            for (var a in h) if ("required" === h[a]) return logger.error("Option " + a + " must be defined"), !1;
            return !0
        }, this.printPropertiesThatDoesntExist = function (a, b) {
            g(a, b)
        }, b(), c(), h.loggerEnabled === !0 && g(console, a), e(), d()
    }, a
}(EasyAutocomplete || {}), EasyAutocomplete = function (a) {
    return a.Logger = function () {
        this.error = function (a) {
            console.log("ERROR: " + a)
        }, this.warning = function (a) {
            console.log("WARNING: " + a)
        }
    }, a
}(EasyAutocomplete || {}), EasyAutocomplete = function (a) {
    return a.Constans = function () {
        var a = {
            CONTAINER_CLASS: "easy-autocomplete-container",
            CONTAINER_ID: "eac-container-",
            WRAPPER_CSS_CLASS: "easy-autocomplete"
        };
        this.getValue = function (b) {
            return a[b]
        }
    }, a
}(EasyAutocomplete || {}), EasyAutocomplete = function (a) {
    return a.ListBuilderService = function (a, b) {
        function c(b, c) {
            function d() {
                var d, e = {};
                return void 0 !== b.xmlElementName && (e.xmlElementName = b.xmlElementName), void 0 !== b.listLocation ? d = b.listLocation : void 0 !== a.get("listLocation") && (d = a.get("listLocation")), void 0 !== d ? "string" == typeof d ? e.data = $(c).find(d) : "function" == typeof d && (e.data = d(c)) : e.data = c, e
            }

            function e() {
                var a = {};
                return void 0 !== b.listLocation ? "string" == typeof b.listLocation ? a.data = c[b.listLocation] : "function" == typeof b.listLocation && (a.data = b.listLocation(c)) : a.data = c, a
            }

            var f = {};
            if (f = "XML" === a.get("dataType").toUpperCase() ? d() : e(), void 0 !== b.header && (f.header = b.header), void 0 !== b.maxNumberOfElements && (f.maxNumberOfElements = b.maxNumberOfElements), void 0 !== a.get("list").maxNumberOfElements && (f.maxListSize = a.get("list").maxNumberOfElements), void 0 !== b.getValue) if ("string" == typeof b.getValue) {
                var g = b.getValue;
                f.getValue = function (a) {
                    return a[g]
                }
            } else "function" == typeof b.getValue && (f.getValue = b.getValue); else f.getValue = a.get("getValue");
            return f
        }

        function d(b) {
            var c = [];
            return void 0 === b.xmlElementName && (b.xmlElementName = a.get("xmlElementName")), $(b.data).find(b.xmlElementName).each(function () {
                c.push(this)
            }), c
        }

        this.init = function (b) {
            var c = [], d = {};
            return d.data = a.get("listLocation")(b), d.getValue = a.get("getValue"), d.maxListSize = a.get("list").maxNumberOfElements, c.push(d), c
        }, this.updateCategories = function (b, d) {
            if (a.get("categoriesAssigned")) {
                b = [];
                for (var e = 0; e < a.get("categories").length; e += 1) {
                    var f = c(a.get("categories")[e], d);
                    b.push(f)
                }
            }
            return b
        }, this.convertXml = function (b) {
            if ("XML" === a.get("dataType").toUpperCase()) for (var c = 0; c < b.length; c += 1) b[c].data = d(b[c]);
            return b
        }, this.processData = function (c, d) {
            for (var e = 0, f = c.length; f > e; e += 1) c[e].data = b(a, c[e], d);
            return c
        }, this.checkIfDataExists = function (a) {
            for (var b = 0, c = a.length; c > b; b += 1) if (void 0 !== a[b].data && a[b].data instanceof Array && a[b].data.length > 0) return !0;
            return !1
        }
    }, a
}(EasyAutocomplete || {}), EasyAutocomplete = function (a) {
    return a.proccess = function (b, c, d) {
        function e(a, c) {
            var d = [], e = "";
            if (b.get("list").match.enabled) for (var g = 0, h = a.length; h > g; g += 1) e = b.get("getValue")(a[g]), f(e, c) && d.push(a[g]); else d = a;
            return d
        }

        function f(a, c) {
            return b.get("list").match.caseSensitive || ("string" == typeof a && (a = a.toLowerCase()), c = c.toLowerCase()), !!b.get("list").match.method(a, c)
        }

        function g(a) {
            return void 0 !== c.maxNumberOfElements && a.length > c.maxNumberOfElements && (a = a.slice(0, c.maxNumberOfElements)), a
        }

        function h(a) {
            return b.get("list").sort.enabled && a.sort(b.get("list").sort.method), a
        }

        a.proccess.match = f;
        var i = c.data, j = d;
        return i = e(i, j), i = g(i), i = h(i)
    }, a
}(EasyAutocomplete || {}), EasyAutocomplete = function (a) {
    return a.Template = function (a) {
        var b = {
            basic: {
                type: "basic", method: function (a) {
                    return a
                }, cssClass: ""
            }, description: {
                type: "description", fields: {description: "description"}, method: function (a) {
                    return a + " - description"
                }, cssClass: "eac-description"
            }, iconLeft: {
                type: "iconLeft", fields: {icon: ""}, method: function (a) {
                    return a
                }, cssClass: "eac-icon-left"
            }, iconRight: {
                type: "iconRight", fields: {iconSrc: ""}, method: function (a) {
                    return a
                }, cssClass: "eac-icon-right"
            }, links: {
                type: "links", fields: {link: ""}, method: function (a) {
                    return a
                }, cssClass: ""
            }, custom: {
                type: "custom", method: function () {
                }, cssClass: ""
            }
        }, c = function (a) {
            var c, d = a.fields;
            return "description" === a.type ? (c = b.description.method, "string" == typeof d.description ? c = function (a, b) {
                return a + " - <span>" + b[d.description] + "</span>"
            } : "function" == typeof d.description && (c = function (a, b) {
                return a + " - <span>" + d.description(b) + "</span>"
            }), c) : "iconRight" === a.type ? ("string" == typeof d.iconSrc ? c = function (a, b) {
                return a + "<img class='eac-icon' src='" + b[d.iconSrc] + "' />"
            } : "function" == typeof d.iconSrc && (c = function (a, b) {
                return a + "<img class='eac-icon' src='" + d.iconSrc(b) + "' />"
            }), c) : "iconLeft" === a.type ? ("string" == typeof d.iconSrc ? c = function (a, b) {
                return "<img class='eac-icon' src='" + b[d.iconSrc] + "' />" + a
            } : "function" == typeof d.iconSrc && (c = function (a, b) {
                return "<img class='eac-icon' src='" + d.iconSrc(b) + "' />" + a
            }), c) : "links" === a.type ? ("string" == typeof d.link ? c = function (a, b) {
                return "<a href='" + b[d.link] + "' >" + a + "</a>"
            } : "function" == typeof d.link && (c = function (a, b) {
                return "<a href='" + d.link(b) + "' >" + a + "</a>"
            }), c) : "custom" === a.type ? a.method : b.basic.method
        }, d = function (a) {
            return a && a.type && a.type && b[a.type] ? c(a) : b.basic.method
        }, e = function (a) {
            var c = function () {
                return ""
            };
            return a && a.type && a.type && b[a.type] ? function () {
                var c = b[a.type].cssClass;
                return function () {
                    return c
                }
            }() : c
        };
        this.getTemplateClass = e(a), this.build = d(a)
    }, a
}(EasyAutocomplete || {}), EasyAutocomplete = function (a) {
    return a.main = function (b, c) {
        function d() {
            return 0 === t.length ? void p.error("Input field doesn't exist.") : o.checkDataUrlProperties() ? o.checkRequiredProperties() ? (e(), void g()) : void p.error("Will not work without mentioned properties.") : void p.error("One of options variables 'data' or 'url' must be defined.")
        }

        function e() {
            function a() {
                var a = $("<div>"), c = n.getValue("WRAPPER_CSS_CLASS");
                o.get("theme") && "" !== o.get("theme") && (c += " eac-" + o.get("theme")), o.get("cssClasses") && "" !== o.get("cssClasses") && (c += " " + o.get("cssClasses")), "" !== q.getTemplateClass() && (c += " " + q.getTemplateClass()), a.addClass(c), t.wrap(a), o.get("adjustWidth") === !0 && b()
            }

            function b() {
                var a = t.outerWidth();
                t.parent().css("width", a)
            }

            function c() {
                t.unwrap()
            }

            function d() {
                var a = $("<div>").addClass(n.getValue("CONTAINER_CLASS"));
                a.attr("id", f()).prepend($("<ul>")), function () {
                    a.on("show.eac", function () {
                        switch (o.get("list").showAnimation.type) {
                            case"slide":
                                var b = o.get("list").showAnimation.time, c = o.get("list").showAnimation.callback;
                                a.find("ul").slideDown(b, c);
                                break;
                            case"fade":
                                var b = o.get("list").showAnimation.time, c = o.get("list").showAnimation.callback;
                                a.find("ul").fadeIn(b), c;
                                break;
                            default:
                                a.find("ul").show()
                        }
                        o.get("list").onShowListEvent()
                    }).on("hide.eac", function () {
                        switch (o.get("list").hideAnimation.type) {
                            case"slide":
                                var b = o.get("list").hideAnimation.time, c = o.get("list").hideAnimation.callback;
                                a.find("ul").slideUp(b, c);
                                break;
                            case"fade":
                                var b = o.get("list").hideAnimation.time, c = o.get("list").hideAnimation.callback;
                                a.find("ul").fadeOut(b, c);
                                break;
                            default:
                                a.find("ul").hide()
                        }
                        o.get("list").onHideListEvent()
                    }).on("selectElement.eac", function () {
                        a.find("ul li").removeClass("selected"), a.find("ul li").eq(w).addClass("selected"), o.get("list").onSelectItemEvent()
                    }).on("loadElements.eac", function (b, c, d) {
                        var e = "", f = a.find("ul");
                        f.empty().detach(), v = [];
                        for (var h = 0, i = 0, k = c.length; k > i; i += 1) {
                            var l = c[i].data;
                            if (0 !== l.length) {
                                void 0 !== c[i].header && c[i].header.length > 0 && f.append("<div class='eac-category' >" + c[i].header + "</div>");
                                for (var m = 0, n = l.length; n > m && h < c[i].maxListSize; m += 1) e = $("<li><div class='eac-item'></div></li>"), function () {
                                    var a = m, b = h, f = c[i].getValue(l[a]);
                                    e.find(" > div").on("click", function () {
                                        t.val(f).trigger("change"), w = b, j(b), o.get("list").onClickEvent(), o.get("list").onChooseEvent()
                                    }).mouseover(function () {
                                        w = b, j(b), o.get("list").onMouseOverEvent()
                                    }).mouseout(function () {
                                        o.get("list").onMouseOutEvent()
                                    }).html(q.build(g(f, d), l[a]))
                                }(), f.append(e), v.push(l[m]), h += 1
                            }
                        }
                        a.append(f), o.get("list").onLoadEvent()
                    })
                }(), t.after(a)
            }

            function e() {
                t.next("." + n.getValue("CONTAINER_CLASS")).remove()
            }

            function g(a, b) {
                return o.get("highlightPhrase") && "" !== b ? i(a, b) : a
            }

            function h(a) {
                return a.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")
            }

            function i(a, b) {
                var c = h(b);
                return (a + "").replace(new RegExp("(" + c + ")", "gi"), "<b>$1</b>")
            }

            t.parent().hasClass(n.getValue("WRAPPER_CSS_CLASS")) && (e(), c()), a(), d(), u = $("#" + f()), o.get("placeholder") && t.attr("placeholder", o.get("placeholder"))
        }

        function f() {
            var a = t.attr("id");
            return a = n.getValue("CONTAINER_ID") + a
        }

        function g() {
            function a() {
                s("autocompleteOff", !0) && n(), b(), c(), d(), e(), f(), g()
            }

            function b() {
                t.focusout(function () {
                    var a, b = t.val();
                    o.get("list").match.caseSensitive || (b = b.toLowerCase());
                    for (var c = 0, d = v.length; d > c; c += 1) if (a = o.get("getValue")(v[c]), o.get("list").match.caseSensitive || (a = a.toLowerCase()), a === b) return w = c, void j(w)
                })
            }

            function c() {
                t.off("keyup").keyup(function (a) {
                    function b(a) {
                        function b() {
                            var a = {}, b = o.get("ajaxSettings") || {};
                            for (var c in b) a[c] = b[c];
                            return a
                        }

                        function c(a, b) {
                            return o.get("matchResponseProperty") !== !1 ? "string" == typeof o.get("matchResponseProperty") ? b[o.get("matchResponseProperty")] === a : "function" == typeof o.get("matchResponseProperty") ? o.get("matchResponseProperty")(b) === a : !0 : !0
                        }

                        if (!(a.length < o.get("minCharNumber"))) {
                            if ("list-required" !== o.get("data")) {
                                var d = o.get("data"), e = r.init(d);
                                e = r.updateCategories(e, d), e = r.processData(e, a), k(e, a), t.parent().find("li").length > 0 ? h() : i()
                            }
                            var f = b();
                            void 0 !== f.url && "" !== f.url || (f.url = o.get("url")), void 0 !== f.dataType && "" !== f.dataType || (f.dataType = o.get("dataType")), void 0 !== f.url && "list-required" !== f.url && (f.url = f.url(a), f.data = o.get("preparePostData")(f.data, a), $.ajax(f).done(function (b) {
                                var d = r.init(b);
                                d = r.updateCategories(d, b), d = r.convertXml(d), c(a, b) && (d = r.processData(d, a), k(d, a)), r.checkIfDataExists(d) && t.parent().find("li").length > 0 ? h() : i(), o.get("ajaxCallback")()
                            }).fail(function () {
                                p.warning("Fail to load response data")
                            }).always(function () {
                            }))
                        }
                    }

                    switch (a.keyCode) {
                        case 27:
                            i(), l();
                            break;
                        case 38:
                            a.preventDefault(), v.length > 0 && w > 0 && (w -= 1, t.val(o.get("getValue")(v[w])), j(w));
                            break;
                        case 40:
                            a.preventDefault(), v.length > 0 && w < v.length - 1 && (w += 1, t.val(o.get("getValue")(v[w])), j(w));
                            break;
                        default:
                            if (a.keyCode > 40 || 8 === a.keyCode) {
                                var c = t.val();
                                o.get("list").hideOnEmptyPhrase !== !0 || 8 !== a.keyCode || "" !== c ? o.get("requestDelay") > 0 ? (void 0 !== m && clearTimeout(m), m = setTimeout(function () {
                                    b(c)
                                }, o.get("requestDelay"))) : b(c) : i()
                            }
                    }
                })
            }

            function d() {
                t.on("keydown", function (a) {
                    a = a || window.event;
                    var b = a.keyCode;
                    return 38 === b ? (suppressKeypress = !0, !1) : void 0
                }).keydown(function (a) {
                    13 === a.keyCode && w > -1 && (t.val(o.get("getValue")(v[w])), o.get("list").onKeyEnterEvent(), o.get("list").onChooseEvent(), w = -1, i(), a.preventDefault())
                })
            }

            function e() {
                t.off("keypress")
            }

            function f() {
                t.focus(function () {
                    "" !== t.val() && v.length > 0 && (w = -1, h())
                })
            }

            function g() {
                t.blur(function () {
                    setTimeout(function () {
                        w = -1, i()
                    }, 250)
                })
            }

            function n() {
                t.attr("autocomplete", "off")
            }

            a()
        }

        function h() {
            u.trigger("show.eac")
        }

        function i() {
            u.trigger("hide.eac")
        }

        function j(a) {
            u.trigger("selectElement.eac", a)
        }

        function k(a, b) {
            u.trigger("loadElements.eac", [a, b])
        }

        function l() {
            t.trigger("blur")
        }

        var m, n = new a.Constans, o = new a.Configuration(c), p = new a.Logger, q = new a.Template(c.template),
            r = new a.ListBuilderService(o, a.proccess), s = o.equals, t = b, u = "", v = [], w = -1;
        a.consts = n, this.getConstants = function () {
            return n
        }, this.getConfiguration = function () {
            return o
        }, this.getContainer = function () {
            return u
        }, this.getSelectedItemIndex = function () {
            return w
        }, this.getItems = function () {
            return v
        }, this.getItemData = function (a) {
            return v.length < a || void 0 === v[a] ? -1 : v[a]
        }, this.getSelectedItemData = function () {
            return this.getItemData(w)
        }, this.build = function () {
            e()
        }, this.init = function () {
            d()
        }
    }, a.eacHandles = [], a.getHandle = function (b) {
        return a.eacHandles[b]
    }, a.inputHasId = function (a) {
        return void 0 !== $(a).attr("id") && $(a).attr("id").length > 0
    }, a.assignRandomId = function (b) {
        var c = "";
        do c = "eac-" + Math.floor(1e4 * Math.random()); while (0 !== $("#" + c).length);
        elementId = a.consts.getValue("CONTAINER_ID") + c, $(b).attr("id", c)
    }, a.setHandle = function (b, c) {
        a.eacHandles[c] = b
    }, a
}(EasyAutocomplete || {});
!function (a) {
    a.fn.easyAutocomplete = function (b) {
        return this.each(function () {
            var c = a(this), d = new EasyAutocomplete.main(c, b);
            EasyAutocomplete.inputHasId(c) || EasyAutocomplete.assignRandomId(c), d.init(), EasyAutocomplete.setHandle(d, c.attr("id"))
        })
    }, a.fn.getSelectedItemIndex = function () {
        var b = a(this).attr("id");
        return void 0 !== b ? EasyAutocomplete.getHandle(b).getSelectedItemIndex() : -1
    }, a.fn.getItems = function () {
        var b = a(this).attr("id");
        return void 0 !== b ? EasyAutocomplete.getHandle(b).getItems() : -1
    }, a.fn.getItemData = function (b) {
        var c = a(this).attr("id");
        return void 0 !== c && b > -1 ? EasyAutocomplete.getHandle(c).getItemData(b) : -1
    }, a.fn.getSelectedItemData = function () {
        var b = a(this).attr("id");
        return void 0 !== b ? EasyAutocomplete.getHandle(b).getSelectedItemData() : -1
    }
}(jQuery);

!function (t, n) {
    "object" == typeof exports && "object" == typeof module ? module.exports = n() : "function" == typeof define && define.amd ? define([], n) : "object" == typeof exports ? exports.Scrollbar = n() : t.Scrollbar = n()
}(window, (function () {
    return function (t) {
        var n = {};

        function e(r) {
            if (n[r]) return n[r].exports;
            var o = n[r] = {i: r, l: !1, exports: {}};
            return t[r].call(o.exports, o, o.exports, e), o.l = !0, o.exports
        }

        return e.m = t, e.c = n, e.d = function (t, n, r) {
            e.o(t, n) || Object.defineProperty(t, n, {enumerable: !0, get: r})
        }, e.r = function (t) {
            "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t, Symbol.toStringTag, {value: "Module"}), Object.defineProperty(t, "__esModule", {value: !0})
        }, e.t = function (t, n) {
            if (1 & n && (t = e(t)), 8 & n) return t;
            if (4 & n && "object" == typeof t && t && t.__esModule) return t;
            var r = Object.create(null);
            if (e.r(r), Object.defineProperty(r, "default", {
                enumerable: !0,
                value: t
            }), 2 & n && "string" != typeof t) for (var o in t) e.d(r, o, function (n) {
                return t[n]
            }.bind(null, o));
            return r
        }, e.n = function (t) {
            var n = t && t.__esModule ? function () {
                return t.default
            } : function () {
                return t
            };
            return e.d(n, "a", n), n
        }, e.o = function (t, n) {
            return Object.prototype.hasOwnProperty.call(t, n)
        }, e.p = "", e(e.s = 58)
    }([function (t, n, e) {
        var r = e(25)("wks"), o = e(16), i = e(2).Symbol, u = "function" == typeof i;
        (t.exports = function (t) {
            return r[t] || (r[t] = u && i[t] || (u ? i : o)("Symbol." + t))
        }).store = r
    }, function (t, n) {
        t.exports = function (t) {
            return "object" == typeof t ? null !== t : "function" == typeof t
        }
    }, function (t, n) {
        var e = t.exports = "undefined" != typeof window && window.Math == Math ? window : "undefined" != typeof self && self.Math == Math ? self : Function("return this")();
        "number" == typeof __g && (__g = e)
    }, function (t, n) {
        var e = t.exports = {version: "2.6.9"};
        "number" == typeof __e && (__e = e)
    }, function (t, n, e) {
        t.exports = !e(13)((function () {
            return 7 != Object.defineProperty({}, "a", {
                get: function () {
                    return 7
                }
            }).a
        }))
    }, function (t, n, e) {
        var r = e(2), o = e(3), i = e(11), u = e(6), c = e(10), s = function (t, n, e) {
            var a, f, l, p, h = t & s.F, d = t & s.G, v = t & s.S, y = t & s.P, m = t & s.B,
                g = d ? r : v ? r[n] || (r[n] = {}) : (r[n] || {}).prototype, b = d ? o : o[n] || (o[n] = {}),
                x = b.prototype || (b.prototype = {});
            for (a in d && (e = n), e) l = ((f = !h && g && void 0 !== g[a]) ? g : e)[a], p = m && f ? c(l, r) : y && "function" == typeof l ? c(Function.call, l) : l, g && u(g, a, l, t & s.U), b[a] != l && i(b, a, p), y && x[a] != l && (x[a] = l)
        };
        r.core = o, s.F = 1, s.G = 2, s.S = 4, s.P = 8, s.B = 16, s.W = 32, s.U = 64, s.R = 128, t.exports = s
    }, function (t, n, e) {
        var r = e(2), o = e(11), i = e(9), u = e(16)("src"), c = e(60), s = ("" + c).split("toString");
        e(3).inspectSource = function (t) {
            return c.call(t)
        }, (t.exports = function (t, n, e, c) {
            var a = "function" == typeof e;
            a && (i(e, "name") || o(e, "name", n)), t[n] !== e && (a && (i(e, u) || o(e, u, t[n] ? "" + t[n] : s.join(String(n)))), t === r ? t[n] = e : c ? t[n] ? t[n] = e : o(t, n, e) : (delete t[n], o(t, n, e)))
        })(Function.prototype, "toString", (function () {
            return "function" == typeof this && this[u] || c.call(this)
        }))
    }, function (t, n, e) {
        var r = e(8), o = e(41), i = e(43), u = Object.defineProperty;
        n.f = e(4) ? Object.defineProperty : function (t, n, e) {
            if (r(t), n = i(n, !0), r(e), o) try {
                return u(t, n, e)
            } catch (t) {
            }
            if ("get" in e || "set" in e) throw TypeError("Accessors not supported!");
            return "value" in e && (t[n] = e.value), t
        }
    }, function (t, n, e) {
        var r = e(1);
        t.exports = function (t) {
            if (!r(t)) throw TypeError(t + " is not an object!");
            return t
        }
    }, function (t, n) {
        var e = {}.hasOwnProperty;
        t.exports = function (t, n) {
            return e.call(t, n)
        }
    }, function (t, n, e) {
        var r = e(44);
        t.exports = function (t, n, e) {
            if (r(t), void 0 === n) return t;
            switch (e) {
                case 1:
                    return function (e) {
                        return t.call(n, e)
                    };
                case 2:
                    return function (e, r) {
                        return t.call(n, e, r)
                    };
                case 3:
                    return function (e, r, o) {
                        return t.call(n, e, r, o)
                    }
            }
            return function () {
                return t.apply(n, arguments)
            }
        }
    }, function (t, n, e) {
        var r = e(7), o = e(17);
        t.exports = e(4) ? function (t, n, e) {
            return r.f(t, n, o(1, e))
        } : function (t, n, e) {
            return t[n] = e, t
        }
    }, function (t, n, e) {
        var r = e(1);
        t.exports = function (t, n) {
            if (!r(t) || t._t !== n) throw TypeError("Incompatible receiver, " + n + " required!");
            return t
        }
    }, function (t, n) {
        t.exports = function (t) {
            try {
                return !!t()
            } catch (t) {
                return !0
            }
        }
    }, function (t, n) {
        t.exports = {}
    }, function (t, n, e) {
        var r = e(10), o = e(49), i = e(50), u = e(8), c = e(19), s = e(51), a = {}, f = {};
        (n = t.exports = function (t, n, e, l, p) {
            var h, d, v, y, m = p ? function () {
                return t
            } : s(t), g = r(e, l, n ? 2 : 1), b = 0;
            if ("function" != typeof m) throw TypeError(t + " is not iterable!");
            if (i(m)) {
                for (h = c(t.length); h > b; b++) if ((y = n ? g(u(d = t[b])[0], d[1]) : g(t[b])) === a || y === f) return y
            } else for (v = m.call(t); !(d = v.next()).done;) if ((y = o(v, g, d.value, n)) === a || y === f) return y
        }).BREAK = a, n.RETURN = f
    }, function (t, n) {
        var e = 0, r = Math.random();
        t.exports = function (t) {
            return "Symbol(".concat(void 0 === t ? "" : t, ")_", (++e + r).toString(36))
        }
    }, function (t, n) {
        t.exports = function (t, n) {
            return {enumerable: !(1 & t), configurable: !(2 & t), writable: !(4 & t), value: n}
        }
    }, function (t, n, e) {
        var r = e(31), o = e(28);
        t.exports = function (t) {
            return r(o(t))
        }
    }, function (t, n, e) {
        var r = e(27), o = Math.min;
        t.exports = function (t) {
            return t > 0 ? o(r(t), 9007199254740991) : 0
        }
    }, function (t, n, e) {
        var r = e(28);
        t.exports = function (t) {
            return Object(r(t))
        }
    }, function (t, n, e) {
        var r = e(16)("meta"), o = e(1), i = e(9), u = e(7).f, c = 0, s = Object.isExtensible || function () {
            return !0
        }, a = !e(13)((function () {
            return s(Object.preventExtensions({}))
        })), f = function (t) {
            u(t, r, {value: {i: "O" + ++c, w: {}}})
        }, l = t.exports = {
            KEY: r, NEED: !1, fastKey: function (t, n) {
                if (!o(t)) return "symbol" == typeof t ? t : ("string" == typeof t ? "S" : "P") + t;
                if (!i(t, r)) {
                    if (!s(t)) return "F";
                    if (!n) return "E";
                    f(t)
                }
                return t[r].i
            }, getWeak: function (t, n) {
                if (!i(t, r)) {
                    if (!s(t)) return !0;
                    if (!n) return !1;
                    f(t)
                }
                return t[r].w
            }, onFreeze: function (t) {
                return a && l.NEED && s(t) && !i(t, r) && f(t), t
            }
        }
    }, function (t, n, e) {
        "use strict";
        var r = e(23), o = {};
        o[e(0)("toStringTag")] = "z", o + "" != "[object z]" && e(6)(Object.prototype, "toString", (function () {
            return "[object " + r(this) + "]"
        }), !0)
    }, function (t, n, e) {
        var r = e(24), o = e(0)("toStringTag"), i = "Arguments" == r(function () {
            return arguments
        }());
        t.exports = function (t) {
            var n, e, u;
            return void 0 === t ? "Undefined" : null === t ? "Null" : "string" == typeof (e = function (t, n) {
                try {
                    return t[n]
                } catch (t) {
                }
            }(n = Object(t), o)) ? e : i ? r(n) : "Object" == (u = r(n)) && "function" == typeof n.callee ? "Arguments" : u
        }
    }, function (t, n) {
        var e = {}.toString;
        t.exports = function (t) {
            return e.call(t).slice(8, -1)
        }
    }, function (t, n, e) {
        var r = e(3), o = e(2), i = o["__core-js_shared__"] || (o["__core-js_shared__"] = {});
        (t.exports = function (t, n) {
            return i[t] || (i[t] = void 0 !== n ? n : {})
        })("versions", []).push({
            version: r.version,
            mode: e(40) ? "pure" : "global",
            copyright: "© 2019 Denis Pushkarev (zloirock.ru)"
        })
    }, function (t, n, e) {
        "use strict";
        var r = e(61)(!0);
        e(29)(String, "String", (function (t) {
            this._t = String(t), this._i = 0
        }), (function () {
            var t, n = this._t, e = this._i;
            return e >= n.length ? {value: void 0, done: !0} : (t = r(n, e), this._i += t.length, {value: t, done: !1})
        }))
    }, function (t, n) {
        var e = Math.ceil, r = Math.floor;
        t.exports = function (t) {
            return isNaN(t = +t) ? 0 : (t > 0 ? r : e)(t)
        }
    }, function (t, n) {
        t.exports = function (t) {
            if (null == t) throw TypeError("Can't call method on  " + t);
            return t
        }
    }, function (t, n, e) {
        "use strict";
        var r = e(40), o = e(5), i = e(6), u = e(11), c = e(14), s = e(62), a = e(33), f = e(68), l = e(0)("iterator"),
            p = !([].keys && "next" in [].keys()), h = function () {
                return this
            };
        t.exports = function (t, n, e, d, v, y, m) {
            s(e, n, d);
            var g, b, x, _ = function (t) {
                    if (!p && t in O) return O[t];
                    switch (t) {
                        case"keys":
                        case"values":
                            return function () {
                                return new e(this, t)
                            }
                    }
                    return function () {
                        return new e(this, t)
                    }
                }, w = n + " Iterator", S = "values" == v, E = !1, O = t.prototype,
                T = O[l] || O["@@iterator"] || v && O[v], A = T || _(v), M = v ? S ? _("entries") : A : void 0,
                P = "Array" == n && O.entries || T;
            if (P && (x = f(P.call(new t))) !== Object.prototype && x.next && (a(x, w, !0), r || "function" == typeof x[l] || u(x, l, h)), S && T && "values" !== T.name && (E = !0, A = function () {
                return T.call(this)
            }), r && !m || !p && !E && O[l] || u(O, l, A), c[n] = A, c[w] = h, v) if (g = {
                values: S ? A : _("values"),
                keys: y ? A : _("keys"),
                entries: M
            }, m) for (b in g) b in O || i(O, b, g[b]); else o(o.P + o.F * (p || E), n, g);
            return g
        }
    }, function (t, n, e) {
        var r = e(64), o = e(46);
        t.exports = Object.keys || function (t) {
            return r(t, o)
        }
    }, function (t, n, e) {
        var r = e(24);
        t.exports = Object("z").propertyIsEnumerable(0) ? Object : function (t) {
            return "String" == r(t) ? t.split("") : Object(t)
        }
    }, function (t, n, e) {
        var r = e(25)("keys"), o = e(16);
        t.exports = function (t) {
            return r[t] || (r[t] = o(t))
        }
    }, function (t, n, e) {
        var r = e(7).f, o = e(9), i = e(0)("toStringTag");
        t.exports = function (t, n, e) {
            t && !o(t = e ? t : t.prototype, i) && r(t, i, {configurable: !0, value: n})
        }
    }, function (t, n, e) {
        for (var r = e(69), o = e(30), i = e(6), u = e(2), c = e(11), s = e(14), a = e(0), f = a("iterator"), l = a("toStringTag"), p = s.Array, h = {
            CSSRuleList: !0,
            CSSStyleDeclaration: !1,
            CSSValueList: !1,
            ClientRectList: !1,
            DOMRectList: !1,
            DOMStringList: !1,
            DOMTokenList: !0,
            DataTransferItemList: !1,
            FileList: !1,
            HTMLAllCollection: !1,
            HTMLCollection: !1,
            HTMLFormElement: !1,
            HTMLSelectElement: !1,
            MediaList: !0,
            MimeTypeArray: !1,
            NamedNodeMap: !1,
            NodeList: !0,
            PaintRequestList: !1,
            Plugin: !1,
            PluginArray: !1,
            SVGLengthList: !1,
            SVGNumberList: !1,
            SVGPathSegList: !1,
            SVGPointList: !1,
            SVGStringList: !1,
            SVGTransformList: !1,
            SourceBufferList: !1,
            StyleSheetList: !0,
            TextTrackCueList: !1,
            TextTrackList: !1,
            TouchList: !1
        }, d = o(h), v = 0; v < d.length; v++) {
            var y, m = d[v], g = h[m], b = u[m], x = b && b.prototype;
            if (x && (x[f] || c(x, f, p), x[l] || c(x, l, m), s[m] = p, g)) for (y in r) x[y] || i(x, y, r[y], !0)
        }
    }, function (t, n, e) {
        var r = e(6);
        t.exports = function (t, n, e) {
            for (var o in n) r(t, o, n[o], e);
            return t
        }
    }, function (t, n) {
        t.exports = function (t, n, e, r) {
            if (!(t instanceof n) || void 0 !== r && r in t) throw TypeError(e + ": incorrect invocation!");
            return t
        }
    }, function (t, n, e) {
        "use strict";
        var r = e(2), o = e(5), i = e(6), u = e(35), c = e(21), s = e(15), a = e(36), f = e(1), l = e(13), p = e(52),
            h = e(33), d = e(73);
        t.exports = function (t, n, e, v, y, m) {
            var g = r[t], b = g, x = y ? "set" : "add", _ = b && b.prototype, w = {}, S = function (t) {
                var n = _[t];
                i(_, t, "delete" == t ? function (t) {
                    return !(m && !f(t)) && n.call(this, 0 === t ? 0 : t)
                } : "has" == t ? function (t) {
                    return !(m && !f(t)) && n.call(this, 0 === t ? 0 : t)
                } : "get" == t ? function (t) {
                    return m && !f(t) ? void 0 : n.call(this, 0 === t ? 0 : t)
                } : "add" == t ? function (t) {
                    return n.call(this, 0 === t ? 0 : t), this
                } : function (t, e) {
                    return n.call(this, 0 === t ? 0 : t, e), this
                })
            };
            if ("function" == typeof b && (m || _.forEach && !l((function () {
                (new b).entries().next()
            })))) {
                var E = new b, O = E[x](m ? {} : -0, 1) != E, T = l((function () {
                    E.has(1)
                })), A = p((function (t) {
                    new b(t)
                })), M = !m && l((function () {
                    for (var t = new b, n = 5; n--;) t[x](n, n);
                    return !t.has(-0)
                }));
                A || ((b = n((function (n, e) {
                    a(n, b, t);
                    var r = d(new g, n, b);
                    return null != e && s(e, y, r[x], r), r
                }))).prototype = _, _.constructor = b), (T || M) && (S("delete"), S("has"), y && S("get")), (M || O) && S(x), m && _.clear && delete _.clear
            } else b = v.getConstructor(n, t, y, x), u(b.prototype, e), c.NEED = !0;
            return h(b, t), w[t] = b, o(o.G + o.W + o.F * (b != g), w), m || v.setStrong(b, t, y), b
        }
    }, function (t, n, e) {
        "use strict";
        var r = e(5);
        t.exports = function (t) {
            r(r.S, t, {
                of: function () {
                    for (var t = arguments.length, n = new Array(t); t--;) n[t] = arguments[t];
                    return new this(n)
                }
            })
        }
    }, function (t, n, e) {
        "use strict";
        var r = e(5), o = e(44), i = e(10), u = e(15);
        t.exports = function (t) {
            r(r.S, t, {
                from: function (t) {
                    var n, e, r, c, s = arguments[1];
                    return o(this), (n = void 0 !== s) && o(s), null == t ? new this : (e = [], n ? (r = 0, c = i(s, arguments[2], 2), u(t, !1, (function (t) {
                        e.push(c(t, r++))
                    }))) : u(t, !1, e.push, e), new this(e))
                }
            })
        }
    }, function (t, n) {
        t.exports = !1
    }, function (t, n, e) {
        t.exports = !e(4) && !e(13)((function () {
            return 7 != Object.defineProperty(e(42)("div"), "a", {
                get: function () {
                    return 7
                }
            }).a
        }))
    }, function (t, n, e) {
        var r = e(1), o = e(2).document, i = r(o) && r(o.createElement);
        t.exports = function (t) {
            return i ? o.createElement(t) : {}
        }
    }, function (t, n, e) {
        var r = e(1);
        t.exports = function (t, n) {
            if (!r(t)) return t;
            var e, o;
            if (n && "function" == typeof (e = t.toString) && !r(o = e.call(t))) return o;
            if ("function" == typeof (e = t.valueOf) && !r(o = e.call(t))) return o;
            if (!n && "function" == typeof (e = t.toString) && !r(o = e.call(t))) return o;
            throw TypeError("Can't convert object to primitive value")
        }
    }, function (t, n) {
        t.exports = function (t) {
            if ("function" != typeof t) throw TypeError(t + " is not a function!");
            return t
        }
    }, function (t, n, e) {
        var r = e(8), o = e(63), i = e(46), u = e(32)("IE_PROTO"), c = function () {
        }, s = function () {
            var t, n = e(42)("iframe"), r = i.length;
            for (n.style.display = "none", e(67).appendChild(n), n.src = "javascript:", (t = n.contentWindow.document).open(), t.write("<script>document.F=Object<\/script>"), t.close(), s = t.F; r--;) delete s.prototype[i[r]];
            return s()
        };
        t.exports = Object.create || function (t, n) {
            var e;
            return null !== t ? (c.prototype = r(t), e = new c, c.prototype = null, e[u] = t) : e = s(), void 0 === n ? e : o(e, n)
        }
    }, function (t, n) {
        t.exports = "constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf".split(",")
    }, function (t, n) {
        t.exports = function (t, n) {
            return {value: n, done: !!t}
        }
    }, function (t, n, e) {
        "use strict";
        var r = e(7).f, o = e(45), i = e(35), u = e(10), c = e(36), s = e(15), a = e(29), f = e(47), l = e(72),
            p = e(4), h = e(21).fastKey, d = e(12), v = p ? "_s" : "size", y = function (t, n) {
                var e, r = h(n);
                if ("F" !== r) return t._i[r];
                for (e = t._f; e; e = e.n) if (e.k == n) return e
            };
        t.exports = {
            getConstructor: function (t, n, e, a) {
                var f = t((function (t, r) {
                    c(t, f, n, "_i"), t._t = n, t._i = o(null), t._f = void 0, t._l = void 0, t[v] = 0, null != r && s(r, e, t[a], t)
                }));
                return i(f.prototype, {
                    clear: function () {
                        for (var t = d(this, n), e = t._i, r = t._f; r; r = r.n) r.r = !0, r.p && (r.p = r.p.n = void 0), delete e[r.i];
                        t._f = t._l = void 0, t[v] = 0
                    }, delete: function (t) {
                        var e = d(this, n), r = y(e, t);
                        if (r) {
                            var o = r.n, i = r.p;
                            delete e._i[r.i], r.r = !0, i && (i.n = o), o && (o.p = i), e._f == r && (e._f = o), e._l == r && (e._l = i), e[v]--
                        }
                        return !!r
                    }, forEach: function (t) {
                        d(this, n);
                        for (var e, r = u(t, arguments.length > 1 ? arguments[1] : void 0, 3); e = e ? e.n : this._f;) for (r(e.v, e.k, this); e && e.r;) e = e.p
                    }, has: function (t) {
                        return !!y(d(this, n), t)
                    }
                }), p && r(f.prototype, "size", {
                    get: function () {
                        return d(this, n)[v]
                    }
                }), f
            }, def: function (t, n, e) {
                var r, o, i = y(t, n);
                return i ? i.v = e : (t._l = i = {
                    i: o = h(n, !0),
                    k: n,
                    v: e,
                    p: r = t._l,
                    n: void 0,
                    r: !1
                }, t._f || (t._f = i), r && (r.n = i), t[v]++, "F" !== o && (t._i[o] = i)), t
            }, getEntry: y, setStrong: function (t, n, e) {
                a(t, n, (function (t, e) {
                    this._t = d(t, n), this._k = e, this._l = void 0
                }), (function () {
                    for (var t = this._k, n = this._l; n && n.r;) n = n.p;
                    return this._t && (this._l = n = n ? n.n : this._t._f) ? f(0, "keys" == t ? n.k : "values" == t ? n.v : [n.k, n.v]) : (this._t = void 0, f(1))
                }), e ? "entries" : "values", !e, !0), l(n)
            }
        }
    }, function (t, n, e) {
        var r = e(8);
        t.exports = function (t, n, e, o) {
            try {
                return o ? n(r(e)[0], e[1]) : n(e)
            } catch (n) {
                var i = t.return;
                throw void 0 !== i && r(i.call(t)), n
            }
        }
    }, function (t, n, e) {
        var r = e(14), o = e(0)("iterator"), i = Array.prototype;
        t.exports = function (t) {
            return void 0 !== t && (r.Array === t || i[o] === t)
        }
    }, function (t, n, e) {
        var r = e(23), o = e(0)("iterator"), i = e(14);
        t.exports = e(3).getIteratorMethod = function (t) {
            if (null != t) return t[o] || t["@@iterator"] || i[r(t)]
        }
    }, function (t, n, e) {
        var r = e(0)("iterator"), o = !1;
        try {
            var i = [7][r]();
            i.return = function () {
                o = !0
            }, Array.from(i, (function () {
                throw 2
            }))
        } catch (t) {
        }
        t.exports = function (t, n) {
            if (!n && !o) return !1;
            var e = !1;
            try {
                var i = [7], u = i[r]();
                u.next = function () {
                    return {done: e = !0}
                }, i[r] = function () {
                    return u
                }, t(i)
            } catch (t) {
            }
            return e
        }
    }, function (t, n) {
        n.f = {}.propertyIsEnumerable
    }, function (t, n, e) {
        var r = e(23), o = e(77);
        t.exports = function (t) {
            return function () {
                if (r(this) != t) throw TypeError(t + "#toJSON isn't generic");
                return o(this)
            }
        }
    }, function (t, n, e) {
        var r = e(10), o = e(31), i = e(20), u = e(19), c = e(87);
        t.exports = function (t, n) {
            var e = 1 == t, s = 2 == t, a = 3 == t, f = 4 == t, l = 6 == t, p = 5 == t || l, h = n || c;
            return function (n, c, d) {
                for (var v, y, m = i(n), g = o(m), b = r(c, d, 3), x = u(g.length), _ = 0, w = e ? h(n, x) : s ? h(n, 0) : void 0; x > _; _++) if ((p || _ in g) && (y = b(v = g[_], _, m), t)) if (e) w[_] = y; else if (y) switch (t) {
                    case 3:
                        return !0;
                    case 5:
                        return v;
                    case 6:
                        return _;
                    case 2:
                        w.push(v)
                } else if (f) return !1;
                return l ? -1 : a || f ? f : w
            }
        }
    }, function (t, n, e) {
        "use strict";
        var r = e(4), o = e(30), i = e(90), u = e(53), c = e(20), s = e(31), a = Object.assign;
        t.exports = !a || e(13)((function () {
            var t = {}, n = {}, e = Symbol(), r = "abcdefghijklmnopqrst";
            return t[e] = 7, r.split("").forEach((function (t) {
                n[t] = t
            })), 7 != a({}, t)[e] || Object.keys(a({}, n)).join("") != r
        })) ? function (t, n) {
            for (var e = c(t), a = arguments.length, f = 1, l = i.f, p = u.f; a > f;) for (var h, d = s(arguments[f++]), v = l ? o(d).concat(l(d)) : o(d), y = v.length, m = 0; y > m;) h = v[m++], r && !p.call(d, h) || (e[h] = d[h]);
            return e
        } : a
    }, function (t, n, e) {
        "use strict";
        (function (t) {
            var e = "object" == typeof t && t && t.Object === Object && t;
            n.a = e
        }).call(this, e(99))
    }, function (t, n, e) {
        t.exports = e(100)
    }, function (t, n, e) {
        e(22), e(26), e(34), e(71), e(76), e(78), e(79), t.exports = e(3).Map
    }, function (t, n, e) {
        t.exports = e(25)("native-function-to-string", Function.toString)
    }, function (t, n, e) {
        var r = e(27), o = e(28);
        t.exports = function (t) {
            return function (n, e) {
                var i, u, c = String(o(n)), s = r(e), a = c.length;
                return s < 0 || s >= a ? t ? "" : void 0 : (i = c.charCodeAt(s)) < 55296 || i > 56319 || s + 1 === a || (u = c.charCodeAt(s + 1)) < 56320 || u > 57343 ? t ? c.charAt(s) : i : t ? c.slice(s, s + 2) : u - 56320 + (i - 55296 << 10) + 65536
            }
        }
    }, function (t, n, e) {
        "use strict";
        var r = e(45), o = e(17), i = e(33), u = {};
        e(11)(u, e(0)("iterator"), (function () {
            return this
        })), t.exports = function (t, n, e) {
            t.prototype = r(u, {next: o(1, e)}), i(t, n + " Iterator")
        }
    }, function (t, n, e) {
        var r = e(7), o = e(8), i = e(30);
        t.exports = e(4) ? Object.defineProperties : function (t, n) {
            o(t);
            for (var e, u = i(n), c = u.length, s = 0; c > s;) r.f(t, e = u[s++], n[e]);
            return t
        }
    }, function (t, n, e) {
        var r = e(9), o = e(18), i = e(65)(!1), u = e(32)("IE_PROTO");
        t.exports = function (t, n) {
            var e, c = o(t), s = 0, a = [];
            for (e in c) e != u && r(c, e) && a.push(e);
            for (; n.length > s;) r(c, e = n[s++]) && (~i(a, e) || a.push(e));
            return a
        }
    }, function (t, n, e) {
        var r = e(18), o = e(19), i = e(66);
        t.exports = function (t) {
            return function (n, e, u) {
                var c, s = r(n), a = o(s.length), f = i(u, a);
                if (t && e != e) {
                    for (; a > f;) if ((c = s[f++]) != c) return !0
                } else for (; a > f; f++) if ((t || f in s) && s[f] === e) return t || f || 0;
                return !t && -1
            }
        }
    }, function (t, n, e) {
        var r = e(27), o = Math.max, i = Math.min;
        t.exports = function (t, n) {
            return (t = r(t)) < 0 ? o(t + n, 0) : i(t, n)
        }
    }, function (t, n, e) {
        var r = e(2).document;
        t.exports = r && r.documentElement
    }, function (t, n, e) {
        var r = e(9), o = e(20), i = e(32)("IE_PROTO"), u = Object.prototype;
        t.exports = Object.getPrototypeOf || function (t) {
            return t = o(t), r(t, i) ? t[i] : "function" == typeof t.constructor && t instanceof t.constructor ? t.constructor.prototype : t instanceof Object ? u : null
        }
    }, function (t, n, e) {
        "use strict";
        var r = e(70), o = e(47), i = e(14), u = e(18);
        t.exports = e(29)(Array, "Array", (function (t, n) {
            this._t = u(t), this._i = 0, this._k = n
        }), (function () {
            var t = this._t, n = this._k, e = this._i++;
            return !t || e >= t.length ? (this._t = void 0, o(1)) : o(0, "keys" == n ? e : "values" == n ? t[e] : [e, t[e]])
        }), "values"), i.Arguments = i.Array, r("keys"), r("values"), r("entries")
    }, function (t, n, e) {
        var r = e(0)("unscopables"), o = Array.prototype;
        null == o[r] && e(11)(o, r, {}), t.exports = function (t) {
            o[r][t] = !0
        }
    }, function (t, n, e) {
        "use strict";
        var r = e(48), o = e(12);
        t.exports = e(37)("Map", (function (t) {
            return function () {
                return t(this, arguments.length > 0 ? arguments[0] : void 0)
            }
        }), {
            get: function (t) {
                var n = r.getEntry(o(this, "Map"), t);
                return n && n.v
            }, set: function (t, n) {
                return r.def(o(this, "Map"), 0 === t ? 0 : t, n)
            }
        }, r, !0)
    }, function (t, n, e) {
        "use strict";
        var r = e(2), o = e(7), i = e(4), u = e(0)("species");
        t.exports = function (t) {
            var n = r[t];
            i && n && !n[u] && o.f(n, u, {
                configurable: !0, get: function () {
                    return this
                }
            })
        }
    }, function (t, n, e) {
        var r = e(1), o = e(74).set;
        t.exports = function (t, n, e) {
            var i, u = n.constructor;
            return u !== e && "function" == typeof u && (i = u.prototype) !== e.prototype && r(i) && o && o(t, i), t
        }
    }, function (t, n, e) {
        var r = e(1), o = e(8), i = function (t, n) {
            if (o(t), !r(n) && null !== n) throw TypeError(n + ": can't set as prototype!")
        };
        t.exports = {
            set: Object.setPrototypeOf || ("__proto__" in {} ? function (t, n, r) {
                try {
                    (r = e(10)(Function.call, e(75).f(Object.prototype, "__proto__").set, 2))(t, []), n = !(t instanceof Array)
                } catch (t) {
                    n = !0
                }
                return function (t, e) {
                    return i(t, e), n ? t.__proto__ = e : r(t, e), t
                }
            }({}, !1) : void 0), check: i
        }
    }, function (t, n, e) {
        var r = e(53), o = e(17), i = e(18), u = e(43), c = e(9), s = e(41), a = Object.getOwnPropertyDescriptor;
        n.f = e(4) ? a : function (t, n) {
            if (t = i(t), n = u(n, !0), s) try {
                return a(t, n)
            } catch (t) {
            }
            if (c(t, n)) return o(!r.f.call(t, n), t[n])
        }
    }, function (t, n, e) {
        var r = e(5);
        r(r.P + r.R, "Map", {toJSON: e(54)("Map")})
    }, function (t, n, e) {
        var r = e(15);
        t.exports = function (t, n) {
            var e = [];
            return r(t, !1, e.push, e, n), e
        }
    }, function (t, n, e) {
        e(38)("Map")
    }, function (t, n, e) {
        e(39)("Map")
    }, function (t, n, e) {
        e(22), e(26), e(34), e(81), e(82), e(83), e(84), t.exports = e(3).Set
    }, function (t, n, e) {
        "use strict";
        var r = e(48), o = e(12);
        t.exports = e(37)("Set", (function (t) {
            return function () {
                return t(this, arguments.length > 0 ? arguments[0] : void 0)
            }
        }), {
            add: function (t) {
                return r.def(o(this, "Set"), t = 0 === t ? 0 : t, t)
            }
        }, r)
    }, function (t, n, e) {
        var r = e(5);
        r(r.P + r.R, "Set", {toJSON: e(54)("Set")})
    }, function (t, n, e) {
        e(38)("Set")
    }, function (t, n, e) {
        e(39)("Set")
    }, function (t, n, e) {
        e(22), e(34), e(86), e(92), e(93), t.exports = e(3).WeakMap
    }, function (t, n, e) {
        "use strict";
        var r, o = e(2), i = e(55)(0), u = e(6), c = e(21), s = e(56), a = e(91), f = e(1), l = e(12), p = e(12),
            h = !o.ActiveXObject && "ActiveXObject" in o, d = c.getWeak, v = Object.isExtensible, y = a.ufstore,
            m = function (t) {
                return function () {
                    return t(this, arguments.length > 0 ? arguments[0] : void 0)
                }
            }, g = {
                get: function (t) {
                    if (f(t)) {
                        var n = d(t);
                        return !0 === n ? y(l(this, "WeakMap")).get(t) : n ? n[this._i] : void 0
                    }
                }, set: function (t, n) {
                    return a.def(l(this, "WeakMap"), t, n)
                }
            }, b = t.exports = e(37)("WeakMap", m, g, a, !0, !0);
        p && h && (s((r = a.getConstructor(m, "WeakMap")).prototype, g), c.NEED = !0, i(["delete", "has", "get", "set"], (function (t) {
            var n = b.prototype, e = n[t];
            u(n, t, (function (n, o) {
                if (f(n) && !v(n)) {
                    this._f || (this._f = new r);
                    var i = this._f[t](n, o);
                    return "set" == t ? this : i
                }
                return e.call(this, n, o)
            }))
        })))
    }, function (t, n, e) {
        var r = e(88);
        t.exports = function (t, n) {
            return new (r(t))(n)
        }
    }, function (t, n, e) {
        var r = e(1), o = e(89), i = e(0)("species");
        t.exports = function (t) {
            var n;
            return o(t) && ("function" != typeof (n = t.constructor) || n !== Array && !o(n.prototype) || (n = void 0), r(n) && null === (n = n[i]) && (n = void 0)), void 0 === n ? Array : n
        }
    }, function (t, n, e) {
        var r = e(24);
        t.exports = Array.isArray || function (t) {
            return "Array" == r(t)
        }
    }, function (t, n) {
        n.f = Object.getOwnPropertySymbols
    }, function (t, n, e) {
        "use strict";
        var r = e(35), o = e(21).getWeak, i = e(8), u = e(1), c = e(36), s = e(15), a = e(55), f = e(9), l = e(12),
            p = a(5), h = a(6), d = 0, v = function (t) {
                return t._l || (t._l = new y)
            }, y = function () {
                this.a = []
            }, m = function (t, n) {
                return p(t.a, (function (t) {
                    return t[0] === n
                }))
            };
        y.prototype = {
            get: function (t) {
                var n = m(this, t);
                if (n) return n[1]
            }, has: function (t) {
                return !!m(this, t)
            }, set: function (t, n) {
                var e = m(this, t);
                e ? e[1] = n : this.a.push([t, n])
            }, delete: function (t) {
                var n = h(this.a, (function (n) {
                    return n[0] === t
                }));
                return ~n && this.a.splice(n, 1), !!~n
            }
        }, t.exports = {
            getConstructor: function (t, n, e, i) {
                var a = t((function (t, r) {
                    c(t, a, n, "_i"), t._t = n, t._i = d++, t._l = void 0, null != r && s(r, e, t[i], t)
                }));
                return r(a.prototype, {
                    delete: function (t) {
                        if (!u(t)) return !1;
                        var e = o(t);
                        return !0 === e ? v(l(this, n)).delete(t) : e && f(e, this._i) && delete e[this._i]
                    }, has: function (t) {
                        if (!u(t)) return !1;
                        var e = o(t);
                        return !0 === e ? v(l(this, n)).has(t) : e && f(e, this._i)
                    }
                }), a
            }, def: function (t, n, e) {
                var r = o(i(n), !0);
                return !0 === r ? v(t).set(n, e) : r[t._i] = e, t
            }, ufstore: v
        }
    }, function (t, n, e) {
        e(38)("WeakMap")
    }, function (t, n, e) {
        e(39)("WeakMap")
    }, function (t, n, e) {
        e(26), e(95), t.exports = e(3).Array.from
    }, function (t, n, e) {
        "use strict";
        var r = e(10), o = e(5), i = e(20), u = e(49), c = e(50), s = e(19), a = e(96), f = e(51);
        o(o.S + o.F * !e(52)((function (t) {
            Array.from(t)
        })), "Array", {
            from: function (t) {
                var n, e, o, l, p = i(t), h = "function" == typeof this ? this : Array, d = arguments.length,
                    v = d > 1 ? arguments[1] : void 0, y = void 0 !== v, m = 0, g = f(p);
                if (y && (v = r(v, d > 2 ? arguments[2] : void 0, 2)), null == g || h == Array && c(g)) for (e = new h(n = s(p.length)); n > m; m++) a(e, m, y ? v(p[m], m) : p[m]); else for (l = g.call(p), e = new h; !(o = l.next()).done; m++) a(e, m, y ? u(l, v, [o.value, m], !0) : o.value);
                return e.length = m, e
            }
        })
    }, function (t, n, e) {
        "use strict";
        var r = e(7), o = e(17);
        t.exports = function (t, n, e) {
            n in t ? r.f(t, n, o(0, e)) : t[n] = e
        }
    }, function (t, n, e) {
        e(98), t.exports = e(3).Object.assign
    }, function (t, n, e) {
        var r = e(5);
        r(r.S + r.F, "Object", {assign: e(56)})
    }, function (t, n) {
        var e;
        e = function () {
            return this
        }();
        try {
            e = e || new Function("return this")()
        } catch (t) {
            "object" == typeof window && (e = window)
        }
        t.exports = e
    }, function (t, n, e) {
        "use strict";
        e.r(n);
        var r = {};
        e.r(r), e.d(r, "keyboardHandler", (function () {
            return et
        })), e.d(r, "mouseHandler", (function () {
            return rt
        })), e.d(r, "resizeHandler", (function () {
            return ot
        })), e.d(r, "selectHandler", (function () {
            return it
        })), e.d(r, "touchHandler", (function () {
            return ut
        })), e.d(r, "wheelHandler", (function () {
            return ct
        }));
        /*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
        var o = function (t, n) {
            return (o = Object.setPrototypeOf || {__proto__: []} instanceof Array && function (t, n) {
                t.__proto__ = n
            } || function (t, n) {
                for (var e in n) n.hasOwnProperty(e) && (t[e] = n[e])
            })(t, n)
        }, i = function () {
            return (i = Object.assign || function (t) {
                for (var n, e = 1, r = arguments.length; e < r; e++) for (var o in n = arguments[e]) Object.prototype.hasOwnProperty.call(n, o) && (t[o] = n[o]);
                return t
            }).apply(this, arguments)
        };

        function u(t, n, e, r) {
            var o, i = arguments.length, u = i < 3 ? n : null === r ? r = Object.getOwnPropertyDescriptor(n, e) : r;
            if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) u = Reflect.decorate(t, n, e, r); else for (var c = t.length - 1; c >= 0; c--) (o = t[c]) && (u = (i < 3 ? o(u) : i > 3 ? o(n, e, u) : o(n, e)) || u);
            return i > 3 && u && Object.defineProperty(n, e, u), u
        }

        e(59), e(80), e(85), e(94), e(97);
        var c = function (t) {
                var n = typeof t;
                return null != t && ("object" == n || "function" == n)
            }, s = e(57), a = "object" == typeof self && self && self.Object === Object && self,
            f = s.a || a || Function("return this")(), l = f.Symbol, p = Object.prototype, h = p.hasOwnProperty,
            d = p.toString, v = l ? l.toStringTag : void 0, y = Object.prototype.toString,
            m = l ? l.toStringTag : void 0, g = function (t) {
                return null == t ? void 0 === t ? "[object Undefined]" : "[object Null]" : m && m in Object(t) ? function (t) {
                    var n = h.call(t, v), e = t[v];
                    try {
                        t[v] = void 0;
                        var r = !0
                    } catch (t) {
                    }
                    var o = d.call(t);
                    return r && (n ? t[v] = e : delete t[v]), o
                }(t) : function (t) {
                    return y.call(t)
                }(t)
            }, b = /^\s+|\s+$/g, x = /^[-+]0x[0-9a-f]+$/i, _ = /^0b[01]+$/i, w = /^0o[0-7]+$/i, S = parseInt,
            E = function (t) {
                if ("number" == typeof t) return t;
                if (function (t) {
                    return "symbol" == typeof t || function (t) {
                        return null != t && "object" == typeof t
                    }(t) && "[object Symbol]" == g(t)
                }(t)) return NaN;
                if (c(t)) {
                    var n = "function" == typeof t.valueOf ? t.valueOf() : t;
                    t = c(n) ? n + "" : n
                }
                if ("string" != typeof t) return 0 === t ? t : +t;
                t = t.replace(b, "");
                var e = _.test(t);
                return e || w.test(t) ? S(t.slice(2), e ? 2 : 8) : x.test(t) ? NaN : +t
            }, O = function (t, n, e) {
                return void 0 === e && (e = n, n = void 0), void 0 !== e && (e = (e = E(e)) == e ? e : 0), void 0 !== n && (n = (n = E(n)) == n ? n : 0), function (t, n, e) {
                    return t == t && (void 0 !== e && (t = t <= e ? t : e), void 0 !== n && (t = t >= n ? t : n)), t
                }(E(t), n, e)
            };

        function T(t, n) {
            return void 0 === t && (t = -1 / 0), void 0 === n && (n = 1 / 0), function (e, r) {
                var o = "_" + r;
                Object.defineProperty(e, r, {
                    get: function () {
                        return this[o]
                    }, set: function (e) {
                        Object.defineProperty(this, o, {
                            value: O(e, t, n),
                            enumerable: !1,
                            writable: !0,
                            configurable: !0
                        })
                    }, enumerable: !0, configurable: !0
                })
            }
        }

        function A(t, n) {
            var e = "_" + n;
            Object.defineProperty(t, n, {
                get: function () {
                    return this[e]
                }, set: function (t) {
                    Object.defineProperty(this, e, {value: !!t, enumerable: !1, writable: !0, configurable: !0})
                }, enumerable: !0, configurable: !0
            })
        }

        var M = function () {
            return f.Date.now()
        }, P = Math.max, j = Math.min, k = function (t, n, e) {
            var r, o, i, u, s, a, f = 0, l = !1, p = !1, h = !0;
            if ("function" != typeof t) throw new TypeError("Expected a function");

            function d(n) {
                var e = r, i = o;
                return r = o = void 0, f = n, u = t.apply(i, e)
            }

            function v(t) {
                var e = t - a;
                return void 0 === a || e >= n || e < 0 || p && t - f >= i
            }

            function y() {
                var t = M();
                if (v(t)) return m(t);
                s = setTimeout(y, function (t) {
                    var e = n - (t - a);
                    return p ? j(e, i - (t - f)) : e
                }(t))
            }

            function m(t) {
                return s = void 0, h && r ? d(t) : (r = o = void 0, u)
            }

            function g() {
                var t = M(), e = v(t);
                if (r = arguments, o = this, a = t, e) {
                    if (void 0 === s) return function (t) {
                        return f = t, s = setTimeout(y, n), l ? d(t) : u
                    }(a);
                    if (p) return clearTimeout(s), s = setTimeout(y, n), d(a)
                }
                return void 0 === s && (s = setTimeout(y, n)), u
            }

            return n = E(n) || 0, c(e) && (l = !!e.leading, i = (p = "maxWait" in e) ? P(E(e.maxWait) || 0, n) : i, h = "trailing" in e ? !!e.trailing : h), g.cancel = function () {
                void 0 !== s && clearTimeout(s), f = 0, r = a = o = s = void 0
            }, g.flush = function () {
                return void 0 === s ? u : m(M())
            }, g
        };

        function D() {
            for (var t = [], n = 0; n < arguments.length; n++) t[n] = arguments[n];
            return function (n, e, r) {
                var o = r.value;
                return {
                    get: function () {
                        return this.hasOwnProperty(e) || Object.defineProperty(this, e, {
                            value: k.apply(void 0, function () {
                                for (var t = 0, n = 0, e = arguments.length; n < e; n++) t += arguments[n].length;
                                var r = Array(t), o = 0;
                                for (n = 0; n < e; n++) for (var i = arguments[n], u = 0, c = i.length; u < c; u++, o++) r[o] = i[u];
                                return r
                            }([o], t))
                        }), this[e]
                    }
                }
            }
        }

        var L, N = function () {
            function t(t) {
                var n = this;
                void 0 === t && (t = {}), this.damping = .1, this.thumbMinSize = 20, this.renderByPixels = !0, this.alwaysShowTracks = !1, this.continuousScrolling = !0, this.delegateTo = null, this.plugins = {}, Object.keys(t).forEach((function (e) {
                    n[e] = t[e]
                }))
            }

            return Object.defineProperty(t.prototype, "wheelEventTarget", {
                get: function () {
                    return this.delegateTo
                }, set: function (t) {
                    console.warn("[smooth-scrollbar]: `options.wheelEventTarget` is deprecated and will be removed in the future, use `options.delegateTo` instead."), this.delegateTo = t
                }, enumerable: !0, configurable: !0
            }), u([T(0, 1)], t.prototype, "damping", void 0), u([T(0, 1 / 0)], t.prototype, "thumbMinSize", void 0), u([A], t.prototype, "renderByPixels", void 0), u([A], t.prototype, "alwaysShowTracks", void 0), u([A], t.prototype, "continuousScrolling", void 0), t
        }(), z = new WeakMap;

        function C() {
            if (void 0 !== L) return L;
            var t = !1;
            try {
                var n = function () {
                }, e = Object.defineProperty({}, "passive", {
                    get: function () {
                        t = !0
                    }
                });
                window.addEventListener("testPassive", n, e), window.removeEventListener("testPassive", n, e)
            } catch (t) {
            }
            return L = !!t && {passive: !1}
        }

        function R(t) {
            var n = z.get(t) || [];
            return z.set(t, n), function (t, e, r) {
                function o(t) {
                    t.defaultPrevented || r(t)
                }

                e.split(/\s+/g).forEach((function (e) {
                    n.push({elem: t, eventName: e, handler: o}), t.addEventListener(e, o, C())
                }))
            }
        }

        function F(t) {
            var n = function (t) {
                return t.touches ? t.touches[t.touches.length - 1] : t
            }(t);
            return {x: n.clientX, y: n.clientY}
        }

        function I(t, n) {
            return void 0 === n && (n = []), n.some((function (n) {
                return t === n
            }))
        }

        var W = ["webkit", "moz", "ms", "o"], H = new RegExp("^-(?!(?:" + W.join("|") + ")-)");

        function B(t, n) {
            n = function (t) {
                var n = {};
                return Object.keys(t).forEach((function (e) {
                    if (H.test(e)) {
                        var r = t[e];
                        e = e.replace(/^-/, ""), n[e] = r, W.forEach((function (t) {
                            n["-" + t + "-" + e] = r
                        }))
                    } else n[e] = t[e]
                })), n
            }(n), Object.keys(n).forEach((function (e) {
                var r = e.replace(/^-/, "").replace(/-([a-z])/g, (function (t, n) {
                    return n.toUpperCase()
                }));
                t.style[r] = n[e]
            }))
        }

        var G, X = function () {
            function t(t) {
                this.updateTime = Date.now(), this.delta = {x: 0, y: 0}, this.velocity = {
                    x: 0,
                    y: 0
                }, this.lastPosition = {x: 0, y: 0}, this.lastPosition = F(t)
            }

            return t.prototype.update = function (t) {
                var n = this.velocity, e = this.updateTime, r = this.lastPosition, o = Date.now(), i = F(t),
                    u = {x: -(i.x - r.x), y: -(i.y - r.y)}, c = o - e || 16, s = u.x / c * 16, a = u.y / c * 16;
                n.x = .9 * s + .1 * n.x, n.y = .9 * a + .1 * n.y, this.delta = u, this.updateTime = o, this.lastPosition = i
            }, t
        }(), V = function () {
            function t() {
                this._touchList = {}
            }

            return Object.defineProperty(t.prototype, "_primitiveValue", {
                get: function () {
                    return {x: 0, y: 0}
                }, enumerable: !0, configurable: !0
            }), t.prototype.isActive = function () {
                return void 0 !== this._activeTouchID
            }, t.prototype.getDelta = function () {
                var t = this._getActiveTracker();
                return t ? i({}, t.delta) : this._primitiveValue
            }, t.prototype.getVelocity = function () {
                var t = this._getActiveTracker();
                return t ? i({}, t.velocity) : this._primitiveValue
            }, t.prototype.track = function (t) {
                var n = this, e = t.targetTouches;
                return Array.from(e).forEach((function (t) {
                    n._add(t)
                })), this._touchList
            }, t.prototype.update = function (t) {
                var n = this, e = t.touches, r = t.changedTouches;
                return Array.from(e).forEach((function (t) {
                    n._renew(t)
                })), this._setActiveID(r), this._touchList
            }, t.prototype.release = function (t) {
                var n = this;
                delete this._activeTouchID, Array.from(t.changedTouches).forEach((function (t) {
                    n._delete(t)
                }))
            }, t.prototype._add = function (t) {
                if (!this._has(t)) {
                    var n = new X(t);
                    this._touchList[t.identifier] = n
                }
            }, t.prototype._renew = function (t) {
                this._has(t) && this._touchList[t.identifier].update(t)
            }, t.prototype._delete = function (t) {
                delete this._touchList[t.identifier]
            }, t.prototype._has = function (t) {
                return this._touchList.hasOwnProperty(t.identifier)
            }, t.prototype._setActiveID = function (t) {
                this._activeTouchID = t[t.length - 1].identifier
            }, t.prototype._getActiveTracker = function () {
                return this._touchList[this._activeTouchID]
            }, t
        }();
        !function (t) {
            t.X = "x", t.Y = "y"
        }(G || (G = {}));
        var U = function () {
            function t(t, n) {
                void 0 === n && (n = 0), this._direction = t, this._minSize = n, this.element = document.createElement("div"), this.displaySize = 0, this.realSize = 0, this.offset = 0, this.element.className = "scrollbar-thumb scrollbar-thumb-" + t
            }

            return t.prototype.attachTo = function (t) {
                t.appendChild(this.element)
            }, t.prototype.update = function (t, n, e) {
                this.realSize = Math.min(n / e, 1) * n, this.displaySize = Math.max(this.realSize, this._minSize), this.offset = t / e * (n + (this.realSize - this.displaySize)), B(this.element, this._getStyle())
            }, t.prototype._getStyle = function () {
                switch (this._direction) {
                    case G.X:
                        return {
                            width: this.displaySize + "px",
                            "-transform": "translate3d(" + this.offset + "px, 0, 0)"
                        };
                    case G.Y:
                        return {
                            height: this.displaySize + "px",
                            "-transform": "translate3d(0, " + this.offset + "px, 0)"
                        };
                    default:
                        return null
                }
            }, t
        }(), Y = function () {
            function t(t, n) {
                void 0 === n && (n = 0), this.element = document.createElement("div"), this._isShown = !1, this.element.className = "scrollbar-track scrollbar-track-" + t, this.thumb = new U(t, n), this.thumb.attachTo(this.element)
            }

            return t.prototype.attachTo = function (t) {
                t.appendChild(this.element)
            }, t.prototype.show = function () {
                this._isShown || (this._isShown = !0, this.element.classList.add("show"))
            }, t.prototype.hide = function () {
                this._isShown && (this._isShown = !1, this.element.classList.remove("show"))
            }, t.prototype.update = function (t, n, e) {
                B(this.element, {display: e <= n ? "none" : "block"}), this.thumb.update(t, n, e)
            }, t
        }(), q = function () {
            function t(t) {
                this._scrollbar = t;
                var n = t.options.thumbMinSize;
                this.xAxis = new Y(G.X, n), this.yAxis = new Y(G.Y, n), this.xAxis.attachTo(t.containerEl), this.yAxis.attachTo(t.containerEl), t.options.alwaysShowTracks && (this.xAxis.show(), this.yAxis.show())
            }

            return t.prototype.update = function () {
                var t = this._scrollbar, n = t.size, e = t.offset;
                this.xAxis.update(e.x, n.container.width, n.content.width), this.yAxis.update(e.y, n.container.height, n.content.height)
            }, t.prototype.autoHideOnIdle = function () {
                this._scrollbar.options.alwaysShowTracks || (this.xAxis.hide(), this.yAxis.hide())
            }, u([D(300)], t.prototype, "autoHideOnIdle", null), t
        }(), K = new WeakMap;

        function $(t) {
            return Math.pow(t - 1, 3) + 1
        }

        var J, Q, Z, tt = function () {
            function t(t, n) {
                var e = this.constructor;
                this.scrollbar = t, this.name = e.pluginName, this.options = i(i({}, e.defaultOptions), n)
            }

            return t.prototype.onInit = function () {
            }, t.prototype.onDestroy = function () {
            }, t.prototype.onUpdate = function () {
            }, t.prototype.onRender = function (t) {
            }, t.prototype.transformDelta = function (t, n) {
                return i({}, t)
            }, t.pluginName = "", t.defaultOptions = {}, t
        }(), nt = {order: new Set, constructors: {}};

        function et(t) {
            var n = R(t), e = t.containerEl;
            n(e, "keydown", (function (n) {
                var r = document.activeElement;
                if ((r === e || e.contains(r)) && !function (t) {
                    return !("INPUT" !== t.tagName && "TEXTAREA" !== t.tagName && !t.isContentEditable) && !t.disabled
                }(r)) {
                    var o = function (t, n) {
                        var e = t.size, r = t.limit, o = t.offset;
                        switch (n) {
                            case J.TAB:
                                return function (t) {
                                    requestAnimationFrame((function () {
                                        t.scrollIntoView(document.activeElement, {
                                            offsetTop: t.size.container.height / 2,
                                            onlyScrollIfNeeded: !0
                                        })
                                    }))
                                }(t);
                            case J.SPACE:
                                return [0, 200];
                            case J.PAGE_UP:
                                return [0, 40 - e.container.height];
                            case J.PAGE_DOWN:
                                return [0, e.container.height - 40];
                            case J.END:
                                return [0, r.y - o.y];
                            case J.HOME:
                                return [0, -o.y];
                            case J.LEFT:
                                return [-40, 0];
                            case J.UP:
                                return [0, -40];
                            case J.RIGHT:
                                return [40, 0];
                            case J.DOWN:
                                return [0, 40];
                            default:
                                return null
                        }
                    }(t, n.keyCode || n.which);
                    if (o) {
                        var i = o[0], u = o[1];
                        t.addTransformableMomentum(i, u, n, (function (e) {
                            e ? n.preventDefault() : (t.containerEl.blur(), t.parent && t.parent.containerEl.focus())
                        }))
                    }
                }
            }))
        }

        function rt(t) {
            var n, e, r, o, i, u = R(t), c = t.containerEl, s = t.track, a = s.xAxis, f = s.yAxis;

            function l(n, e) {
                var r = t.size;
                return n === Q.X ? e / (r.container.width + (a.thumb.realSize - a.thumb.displaySize)) * r.content.width : n === Q.Y ? e / (r.container.height + (f.thumb.realSize - f.thumb.displaySize)) * r.content.height : 0
            }

            function p(t) {
                return I(t, [a.element, a.thumb.element]) ? Q.X : I(t, [f.element, f.thumb.element]) ? Q.Y : void 0
            }

            u(c, "click", (function (n) {
                if (!e && I(n.target, [a.element, f.element])) {
                    var r = n.target, o = p(r), i = r.getBoundingClientRect(), u = F(n), c = t.offset, s = t.limit;
                    if (o === Q.X) {
                        var h = u.x - i.left - a.thumb.displaySize / 2;
                        t.setMomentum(O(l(o, h) - c.x, -c.x, s.x - c.x), 0)
                    }
                    o === Q.Y && (h = u.y - i.top - f.thumb.displaySize / 2, t.setMomentum(0, O(l(o, h) - c.y, -c.y, s.y - c.y)))
                }
            })), u(c, "mousedown", (function (e) {
                if (I(e.target, [a.thumb.element, f.thumb.element])) {
                    n = !0;
                    var u = e.target, s = F(e), l = u.getBoundingClientRect();
                    o = p(u), r = {
                        x: s.x - l.left,
                        y: s.y - l.top
                    }, i = c.getBoundingClientRect(), B(t.containerEl, {"-user-select": "none"})
                }
            })), u(window, "mousemove", (function (u) {
                if (n) {
                    e = !0;
                    var c = t.offset, s = F(u);
                    if (o === Q.X) {
                        var a = s.x - r.x - i.left;
                        t.setPosition(l(o, a), c.y)
                    }
                    o === Q.Y && (a = s.y - r.y - i.top, t.setPosition(c.x, l(o, a)))
                }
            })), u(window, "mouseup blur", (function () {
                n = e = !1, B(t.containerEl, {"-user-select": ""})
            }))
        }

        function ot(t) {
            R(t)(window, "resize", k(t.update.bind(t), 300))
        }

        function it(t) {
            var n, e = R(t), r = t.containerEl, o = t.contentEl, i = t.offset, u = t.limit, c = !1;
            e(window, "mousemove", (function (e) {
                c && (cancelAnimationFrame(n), function e(r) {
                    var o = r.x, c = r.y;
                    (o || c) && (t.setMomentum(O(i.x + o, 0, u.x) - i.x, O(i.y + c, 0, u.y) - i.y), n = requestAnimationFrame((function () {
                        e({x: o, y: c})
                    })))
                }(function (t, n) {
                    var e = t.bounding, r = e.top, o = e.right, i = e.bottom, u = e.left, c = F(n), s = c.x, a = c.y,
                        f = {x: 0, y: 0};
                    return 0 === s && 0 === a ? f : (s > o - 20 ? f.x = s - o + 20 : s < u + 20 && (f.x = s - u - 20), a > i - 20 ? f.y = a - i + 20 : a < r + 20 && (f.y = a - r - 20), f.x *= 2, f.y *= 2, f)
                }(t, e)))
            })), e(o, "selectstart", (function (t) {
                t.stopPropagation(), cancelAnimationFrame(n), c = !0
            })), e(window, "mouseup blur", (function () {
                cancelAnimationFrame(n), c = !1
            })), e(r, "scroll", (function (t) {
                t.preventDefault(), r.scrollTop = r.scrollLeft = 0
            }))
        }

        function ut(t) {
            var n, e = /Android/.test(navigator.userAgent) ? 3 : 2, r = t.options.delegateTo || t.containerEl,
                o = new V, i = R(t), u = 0;
            i(r, "touchstart", (function (e) {
                o.track(e), t.setMomentum(0, 0), 0 === u && (n = t.options.damping, t.options.damping = Math.max(n, .5)), u++
            })), i(r, "touchmove", (function (n) {
                if (!Z || Z === t) {
                    o.update(n);
                    var e = o.getDelta(), r = e.x, i = e.y;
                    t.addTransformableMomentum(r, i, n, (function (e) {
                        e && (n.preventDefault(), Z = t)
                    }))
                }
            })), i(r, "touchcancel touchend", (function (r) {
                var i = o.getVelocity(), c = {x: 0, y: 0};
                Object.keys(i).forEach((function (t) {
                    var r = i[t] / n;
                    c[t] = Math.abs(r) < 50 ? 0 : r * e
                })), t.addTransformableMomentum(c.x, c.y, r), 0 == --u && (t.options.damping = n), o.release(r), Z = null
            }))
        }

        function ct(t) {
            R(t)(t.options.delegateTo || t.containerEl, "onwheel" in window || document.implementation.hasFeature("Events.wheel", "3.0") ? "wheel" : "mousewheel", (function (n) {
                var e = function (t) {
                    if ("deltaX" in t) {
                        var n = ft(t.deltaMode);
                        return {x: t.deltaX / st.STANDARD * n, y: t.deltaY / st.STANDARD * n}
                    }
                    return "wheelDeltaX" in t ? {x: t.wheelDeltaX / st.OTHERS, y: t.wheelDeltaY / st.OTHERS} : {
                        x: 0,
                        y: t.wheelDelta / st.OTHERS
                    }
                }(n), r = e.x, o = e.y;
                t.addTransformableMomentum(r, o, n, (function (t) {
                    t && n.preventDefault()
                }))
            }))
        }

        !function (t) {
            t[t.TAB = 9] = "TAB", t[t.SPACE = 32] = "SPACE", t[t.PAGE_UP = 33] = "PAGE_UP", t[t.PAGE_DOWN = 34] = "PAGE_DOWN", t[t.END = 35] = "END", t[t.HOME = 36] = "HOME", t[t.LEFT = 37] = "LEFT", t[t.UP = 38] = "UP", t[t.RIGHT = 39] = "RIGHT", t[t.DOWN = 40] = "DOWN"
        }(J || (J = {})), function (t) {
            t[t.X = 0] = "X", t[t.Y = 1] = "Y"
        }(Q || (Q = {}));
        var st = {STANDARD: 1, OTHERS: -3}, at = [1, 28, 500], ft = function (t) {
                return at[t] || at[0]
            }, lt = new Map, pt = function () {
                function t(t, n) {
                    var e = this;
                    this.offset = {x: 0, y: 0}, this.limit = {x: 1 / 0, y: 1 / 0}, this.bounding = {
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0
                    }, this._plugins = [], this._momentum = {x: 0, y: 0}, this._listeners = new Set, this.containerEl = t;
                    var r = this.contentEl = document.createElement("div");
                    this.options = new N(n), t.setAttribute("data-scrollbar", "true"), t.setAttribute("tabindex", "-1"), B(t, {
                        overflow: "hidden",
                        outline: "none"
                    }), window.navigator.msPointerEnabled && (t.style.msTouchAction = "none"), r.className = "scroll-content", Array.from(t.childNodes).forEach((function (t) {
                        r.appendChild(t)
                    })), t.appendChild(r), this.track = new q(this), this.size = this.getSize(), this._plugins = function (t, n) {
                        return Array.from(nt.order).filter((function (t) {
                            return !1 !== n[t]
                        })).map((function (e) {
                            var r = new (0, nt.constructors[e])(t, n[e]);
                            return n[e] = r.options, r
                        }))
                    }(this, this.options.plugins);
                    var o = t.scrollLeft, i = t.scrollTop;
                    t.scrollLeft = t.scrollTop = 0, this.setPosition(o, i, {withoutCallbacks: !0});
                    var u = window, c = u.MutationObserver || u.WebKitMutationObserver || u.MozMutationObserver;
                    "function" == typeof c && (this._observer = new c((function () {
                        e.update()
                    })), this._observer.observe(r, {
                        subtree: !0,
                        childList: !0
                    })), lt.set(t, this), requestAnimationFrame((function () {
                        e._init()
                    }))
                }

                return Object.defineProperty(t.prototype, "parent", {
                    get: function () {
                        for (var t = this.containerEl.parentElement; t;) {
                            var n = lt.get(t);
                            if (n) return n;
                            t = t.parentElement
                        }
                        return null
                    }, enumerable: !0, configurable: !0
                }), Object.defineProperty(t.prototype, "scrollTop", {
                    get: function () {
                        return this.offset.y
                    }, set: function (t) {
                        this.setPosition(this.scrollLeft, t)
                    }, enumerable: !0, configurable: !0
                }), Object.defineProperty(t.prototype, "scrollLeft", {
                    get: function () {
                        return this.offset.x
                    }, set: function (t) {
                        this.setPosition(t, this.scrollTop)
                    }, enumerable: !0, configurable: !0
                }), t.prototype.getSize = function () {
                    return function (t) {
                        var n = t.containerEl, e = t.contentEl;
                        return {
                            container: {width: n.clientWidth, height: n.clientHeight},
                            content: {
                                width: e.offsetWidth - e.clientWidth + e.scrollWidth,
                                height: e.offsetHeight - e.clientHeight + e.scrollHeight
                            }
                        }
                    }(this)
                }, t.prototype.update = function () {
                    !function (t) {
                        var n = t.getSize(), e = {
                            x: Math.max(n.content.width - n.container.width, 0),
                            y: Math.max(n.content.height - n.container.height, 0)
                        }, r = t.containerEl.getBoundingClientRect(), o = {
                            top: Math.max(r.top, 0),
                            right: Math.min(r.right, window.innerWidth),
                            bottom: Math.min(r.bottom, window.innerHeight),
                            left: Math.max(r.left, 0)
                        };
                        t.size = n, t.limit = e, t.bounding = o, t.track.update(), t.setPosition()
                    }(this), this._plugins.forEach((function (t) {
                        t.onUpdate()
                    }))
                }, t.prototype.isVisible = function (t) {
                    return function (t, n) {
                        var e = t.bounding, r = n.getBoundingClientRect(), o = Math.max(e.top, r.top),
                            i = Math.max(e.left, r.left), u = Math.min(e.right, r.right);
                        return o < Math.min(e.bottom, r.bottom) && i < u
                    }(this, t)
                }, t.prototype.setPosition = function (t, n, e) {
                    var r = this;
                    void 0 === t && (t = this.offset.x), void 0 === n && (n = this.offset.y), void 0 === e && (e = {});
                    var o = function (t, n, e) {
                        var r = t.options, o = t.offset, u = t.limit, c = t.track, s = t.contentEl;
                        return r.renderByPixels && (n = Math.round(n), e = Math.round(e)), n = O(n, 0, u.x), e = O(e, 0, u.y), n !== o.x && c.xAxis.show(), e !== o.y && c.yAxis.show(), r.alwaysShowTracks || c.autoHideOnIdle(), n === o.x && e === o.y ? null : (o.x = n, o.y = e, B(s, {"-transform": "translate3d(" + -n + "px, " + -e + "px, 0)"}), c.update(), {
                            offset: i({}, o),
                            limit: i({}, u)
                        })
                    }(this, t, n);
                    o && !e.withoutCallbacks && this._listeners.forEach((function (t) {
                        t.call(r, o)
                    }))
                }, t.prototype.scrollTo = function (t, n, e, r) {
                    void 0 === t && (t = this.offset.x), void 0 === n && (n = this.offset.y), void 0 === e && (e = 0), void 0 === r && (r = {}), function (t, n, e, r, o) {
                        void 0 === r && (r = 0);
                        var i = void 0 === o ? {} : o, u = i.easing, c = void 0 === u ? $ : u, s = i.callback,
                            a = t.options, f = t.offset, l = t.limit;
                        a.renderByPixels && (n = Math.round(n), e = Math.round(e));
                        var p = f.x, h = f.y, d = O(n, 0, l.x) - p, v = O(e, 0, l.y) - h, y = Date.now();
                        cancelAnimationFrame(K.get(t)), function n() {
                            var e = Date.now() - y, o = r ? c(Math.min(e / r, 1)) : 1;
                            if (t.setPosition(p + d * o, h + v * o), e >= r) "function" == typeof s && s.call(t); else {
                                var i = requestAnimationFrame(n);
                                K.set(t, i)
                            }
                        }()
                    }(this, t, n, e, r)
                }, t.prototype.scrollIntoView = function (t, n) {
                    void 0 === n && (n = {}), function (t, n, e) {
                        var r = void 0 === e ? {} : e, o = r.alignToTop, i = void 0 === o || o, u = r.onlyScrollIfNeeded,
                            c = void 0 !== u && u, s = r.offsetTop, a = void 0 === s ? 0 : s, f = r.offsetLeft,
                            l = void 0 === f ? 0 : f, p = r.offsetBottom, h = void 0 === p ? 0 : p, d = t.containerEl,
                            v = t.bounding, y = t.offset, m = t.limit;
                        if (n && d.contains(n)) {
                            var g = n.getBoundingClientRect();
                            if (!c || !t.isVisible(n)) {
                                var b = i ? g.top - v.top - a : g.bottom - v.bottom + h;
                                t.setMomentum(g.left - v.left - l, O(b, -y.y, m.y - y.y))
                            }
                        }
                    }(this, t, n)
                }, t.prototype.addListener = function (t) {
                    if ("function" != typeof t) throw new TypeError("[smooth-scrollbar] scrolling listener should be a function");
                    this._listeners.add(t)
                }, t.prototype.removeListener = function (t) {
                    this._listeners.delete(t)
                }, t.prototype.addTransformableMomentum = function (t, n, e, r) {
                    this._updateDebounced();
                    var o = this._plugins.reduce((function (t, n) {
                        return n.transformDelta(t, e) || t
                    }), {x: t, y: n}), i = !this._shouldPropagateMomentum(o.x, o.y);
                    i && this.addMomentum(o.x, o.y), r && r.call(this, i)
                }, t.prototype.addMomentum = function (t, n) {
                    this.setMomentum(this._momentum.x + t, this._momentum.y + n)
                }, t.prototype.setMomentum = function (t, n) {
                    0 === this.limit.x && (t = 0), 0 === this.limit.y && (n = 0), this.options.renderByPixels && (t = Math.round(t), n = Math.round(n)), this._momentum.x = t, this._momentum.y = n
                }, t.prototype.updatePluginOptions = function (t, n) {
                    this._plugins.forEach((function (e) {
                        e.name === t && Object.assign(e.options, n)
                    }))
                }, t.prototype.destroy = function () {
                    var t = this.containerEl, n = this.contentEl;
                    !function (t) {
                        var n = z.get(t);
                        n && (n.forEach((function (t) {
                            var n = t.elem, e = t.eventName, r = t.handler;
                            n.removeEventListener(e, r, C())
                        })), z.delete(t))
                    }(this), this._listeners.clear(), this.setMomentum(0, 0), cancelAnimationFrame(this._renderID), this._observer && this._observer.disconnect(), lt.delete(this.containerEl);
                    for (var e = Array.from(n.childNodes); t.firstChild;) t.removeChild(t.firstChild);
                    e.forEach((function (n) {
                        t.appendChild(n)
                    })), B(t, {overflow: ""}), t.scrollTop = this.scrollTop, t.scrollLeft = this.scrollLeft, this._plugins.forEach((function (t) {
                        t.onDestroy()
                    })), this._plugins.length = 0
                }, t.prototype._init = function () {
                    var t = this;
                    this.update(), Object.keys(r).forEach((function (n) {
                        r[n](t)
                    })), this._plugins.forEach((function (t) {
                        t.onInit()
                    })), this._render()
                }, t.prototype._updateDebounced = function () {
                    this.update()
                }, t.prototype._shouldPropagateMomentum = function (t, n) {
                    void 0 === t && (t = 0), void 0 === n && (n = 0);
                    var e = this.options, r = this.offset, o = this.limit;
                    if (!e.continuousScrolling) return !1;
                    0 === o.x && 0 === o.y && this._updateDebounced();
                    var i = O(t + r.x, 0, o.x), u = O(n + r.y, 0, o.y), c = !0;
                    return (c = (c = c && i === r.x) && u === r.y) && (r.x === o.x || 0 === r.x || r.y === o.y || 0 === r.y)
                }, t.prototype._render = function () {
                    var t = this._momentum;
                    if (t.x || t.y) {
                        var n = this._nextTick("x"), e = this._nextTick("y");
                        t.x = n.momentum, t.y = e.momentum, this.setPosition(n.position, e.position)
                    }
                    var r = i({}, this._momentum);
                    this._plugins.forEach((function (t) {
                        t.onRender(r)
                    })), this._renderID = requestAnimationFrame(this._render.bind(this))
                }, t.prototype._nextTick = function (t) {
                    var n = this.options, e = this.offset, r = this._momentum, o = e[t], i = r[t];
                    if (Math.abs(i) <= .1) return {momentum: 0, position: o + i};
                    var u = i * (1 - n.damping);
                    return n.renderByPixels && (u |= 0), {momentum: u, position: o + i - u}
                }, u([D(100, {leading: !0})], t.prototype, "_updateDebounced", null), t
            }(),
            ht = "\n[data-scrollbar] {\n  display: block;\n  position: relative;\n}\n\n.scroll-content {\n  -webkit-transform: translate3d(0, 0, 0);\n          transform: translate3d(0, 0, 0);\n}\n\n.scrollbar-track {\n  position: absolute;\n  opacity: 0;\n  z-index: 1;\n  background: rgba(222, 222, 222, .75);\n  -webkit-user-select: none;\n     -moz-user-select: none;\n      -ms-user-select: none;\n          user-select: none;\n  -webkit-transition: opacity 0.5s 0.5s ease-out;\n          transition: opacity 0.5s 0.5s ease-out;\n}\n.scrollbar-track.show,\n.scrollbar-track:hover {\n  opacity: 1;\n  -webkit-transition-delay: 0s;\n          transition-delay: 0s;\n}\n\n.scrollbar-track-x {\n  bottom: 0;\n  left: 0;\n  width: 100%;\n  height: 8px;\n}\n.scrollbar-track-y {\n  top: 0;\n  right: 0;\n  width: 8px;\n  height: 100%;\n}\n.scrollbar-thumb {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 8px;\n  height: 8px;\n  background: rgba(0, 0, 0, .5);\n  border-radius: 4px;\n}\n",
            dt = "smooth-scrollbar-style", vt = !1;

        function yt() {
            if (!vt && "undefined" != typeof window) {
                var t = document.createElement("style");
                t.id = dt, t.textContent = ht, document.head && document.head.appendChild(t), vt = !0
            }
        }

        e.d(n, "ScrollbarPlugin", (function () {
            return tt
        }));
        /*!
 * cast `I.Scrollbar` to `Scrollbar` to avoid error
 *
 * `I.Scrollbar` is not assignable to `Scrollbar`:
 *     "privateProp" is missing in `I.Scrollbar`
 *
 * @see https://github.com/Microsoft/TypeScript/issues/2672
 */
        var mt = function (t) {
            function n() {
                return null !== t && t.apply(this, arguments) || this
            }

            return function (t, n) {
                function e() {
                    this.constructor = t
                }

                o(t, n), t.prototype = null === n ? Object.create(n) : (e.prototype = n.prototype, new e)
            }(n, t), n.init = function (t, n) {
                if (!t || 1 !== t.nodeType) throw new TypeError("expect element to be DOM Element, but got " + t);
                return yt(), lt.has(t) ? lt.get(t) : new pt(t, n)
            }, n.initAll = function (t) {
                return Array.from(document.querySelectorAll("[data-scrollbar]"), (function (e) {
                    return n.init(e, t)
                }))
            }, n.has = function (t) {
                return lt.has(t)
            }, n.get = function (t) {
                return lt.get(t)
            }, n.getAll = function () {
                return Array.from(lt.values())
            }, n.destroy = function (t) {
                var n = lt.get(t);
                n && n.destroy()
            }, n.destroyAll = function () {
                lt.forEach((function (t) {
                    t.destroy()
                }))
            }, n.use = function () {
                for (var t = [], n = 0; n < arguments.length; n++) t[n] = arguments[n];
                return function () {
                    for (var t = [], n = 0; n < arguments.length; n++) t[n] = arguments[n];
                    t.forEach((function (t) {
                        var n = t.pluginName;
                        if (!n) throw new TypeError("plugin name is required");
                        nt.order.add(n), nt.constructors[n] = t
                    }))
                }.apply(void 0, t)
            }, n.attachStyle = function () {
                return yt()
            }, n.detachStyle = function () {
                return function () {
                    if (vt && "undefined" != typeof window) {
                        var t = document.getElementById(dt);
                        t && t.parentNode && (t.parentNode.removeChild(t), vt = !1)
                    }
                }()
            }, n.version = "8.5.0", n.ScrollbarPlugin = tt, n
        }(pt);
        n.default = mt
    }]).default
}));