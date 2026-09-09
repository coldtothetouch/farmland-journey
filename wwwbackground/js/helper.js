(function($) {

  'use strict';

  // Numeric input
  function numericInput() {
    $(".numericOnly").on("keypress keyup blur",function (event) {
      $(this).val($(this).val().replace(/[^\d].+/, ""));
        if ((event.which < 48 || event.which > 57)) {
          event.preventDefault();
        }
    });
  }

  // Scroll to target
  function scrollToTarget() {
    $('.scroll-to-target').on('click', function() {
      var target = $(this).attr('href');
      $('html, body').animate({
        scrollTop: $(target).offset().top - 140
      }, 1000);
      return false;
    });
  }

  // Products slider
  function sliderProducts() {
    $('.products .p-slider .items').each(function() {
      $(this).slick({
        slidesToShow: 4,
        slidesToScroll: 4,
        arrows: false,
        dots: true,
        appendDots: $('.slider-dots', $(this).closest('.p-slider')),
        autoplay: false,
        pauseOnHover: false,
        responsive: [
          {
            breakpoint: 992,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 3,
            }
          },
          {
            breakpoint: 768,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 2,
            }
          }
        ]
      });
    });

    $(document).on('click', '.p-also .prev', function () {
      $('.products .p-slider .items').slick('slickPrev');
    });

    $(document).on('click', '.p-also .next', function () {
      $('.products .p-slider .items').slick('slickNext');
    });

    $('.products .bp-slider').each(function() {
      $(this).slick({
        slidesToShow: 4,
        slidesToScroll: 4,
        arrows: false,
        dots: true,
        appendDots: $('.slider-dots', $(this).closest('.products')),
        autoplay: false,
        pauseOnHover: false,
        responsive: [
          {
            breakpoint: 992,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 3,
            }
          },
          {
            breakpoint: 768,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 2,
            }
          }
        ]
      });

      $('.prev', $(this).closest(".bottom-products")).click(function() {
        $('.bp-slider', $(this).closest('.bottom-products')).slick('slickPrev');
      });

      $('.next', $(this).closest(".bottom-products")).click(function() {
        $('.bp-slider', $(this).closest('.bottom-products')).slick('slickNext');
      });
    });
  }

  // Slimscroll
  function slimscroll() {
    $('.custom-scrollbar').slimScroll({
      distance: '4px',
      opacity : '0.2',
      height: '100%',
      size: '4px',
      touchScrollStep: 50,
      wheelStep: 10,
      width: '100%'
    });

    $('.slimScrollBar').hide();

    $('.custom-scrollbar-horizontal').slimScroll({
      distance: '4px',
      opacity : '0.2',
      height: '100%',
      size: '4px',
      touchScrollStep: 50,
      wheelStep: 10,
      width: '100%',
      horizontal: 'true'
    });

    if ($("#diseases-scrollbar").length) {
      var scrollbar = window.Scrollbar;
      scrollbar.init(document.querySelector('#diseases-scrollbar'), {
      });
    };


    if($('.h-actions__body').length){
        var scrollbar = window.Scrollbar;
        scrollbar.init(document.querySelector('.h-actions__body'), {
      });
    }

    if ($("#promo-scrollbar").length) {
      var scrollbar = window.Scrollbar;
      scrollbar.init(document.querySelector('#promo-scrollbar'), {
      });
    };
  }

  // Toggle filters hidden
  function toggleHiddenFilters() {
    $('.toggle-filters-hidden').click(function(){
      if ($(this).hasClass('active')) {
        $(this).removeClass('active');
        $(this).text('Показать все');
      } else {
        $(this).addClass('active');
        $(this).text('Свернуть');
      }
      $('.filters-hidden').slideToggle('slow');
      return false;
    });
  }

  // Tooltip
  function tooltip() {
    $(document).find("[data-toggle='tooltip']").tooltip();
    $(document).on("mouseenter", "[data-toggle='tooltip']", function(){
        var that = $(this);
        that.tooltip('show');
        setTimeout(function(){
            that.tooltip('hide');
        }, 2000);
    });
    $(document).on("mouseleave", "[data-toggle='tooltip']", function(){
        $(this).tooltip('hide');
    });

    $(document).on("click", ".label-title", function(e) {
      e.preventDefault();
    });
  }

  function tooltipCart() {
    $('body').on('click', "[data-toggle='tooltip-manual']", function(){
      var maxCount = Number($(this).find('.quantity-input').attr('data-max'));
      var val = Number($(this).find('.quantity-input').val());
      var title = 'Достигнуто максимальное количество';

      if (maxCount <= val) {
        var that = $(this);
        that.attr('data-original-title', title);
        that.tooltip('show');
        setTimeout(function(){
          that.tooltip('hide');
        }, 2000);
      } else {
        $(this).attr('data-original-title', '');
        $(this).tooltip('hide');
      }

    });
  }

  // Show catalog
  function showCatalog() {
        $('.show-catalog').on('click', function() {
          if ($('body').hasClass('catalog-shown')) {
            $('body').removeClass('catalog-shown');
          } else {
            $('body').addClass('catalog-shown');
          }
          return false;
        });
    // $('body').on('click', function (e) {
    //   if (!$('.catalog').is(e.target)) {
    //       $('body').removeClass('catalog-shown');
    //   }
    // });
  }

  // Catalog menu hide
  function hideCatalog() {
    $('.catalog .c-submenu .cs-item').hide();
  }

  // Catalog menu
  function catalogMenu() {
    $('.catalog .c-menu ul li:not(.static) a').on('mouseenter', function() {
      $('.catalog .c-menu ul li.active').removeClass('active');
      $(this).parent().addClass('active');
      $('.catalog .c-submenu .cs-item').hide();
      $($(this).data('sub')).show();
    });

    $('.catalog .c-submenu ul li:not(.static) a').on('mouseenter', function() {
      $('.catalog .c-submenu ul li.active').removeClass('active');
      $(this).parent().addClass('active');
      $('.catalog .c-submenu.third-level .cs-item').hide();
      $($(this).data('sub')).show();
    });

    $('.catalog .c-control-block').on('mouseleave', function() {

      setTimeout(hideCatalog, 500);
    });
  }

  // Sidebar catalog menu
  function sidebarCatalogMenu() {
    $('.sidebar .s-catalog-menu ul li:not(.static) a').on('click', function() {
      $('.sidebar .s-main').hide();
      $('.sidebar .s-catalog-submenu .scs-item').hide();
      $($(this).attr('href')).show();
      $('.sidebar .custom-scrollbar').slimScroll({
        scrollTo : '0'
      });
      return false;
    });

    $('.sidebar .s-catalog-submenu .hide-sidebar-catalog-submenu').on('click', function() {
      $('.sidebar .s-catalog-submenu .scs-item').hide();
      $('.sidebar .s-main').show();
      $('.sidebar .custom-scrollbar').slimScroll({
        scrollTo : '0'
      });
      return false;
    });

    $('.sidebar .s-catalog-submenu ul li:not(.static) a').on('click', function() {
      $('.sidebar .s-catalog-submenu .scs-item').hide();
      $($(this).attr('href')).show();
      $('.sidebar .custom-scrollbar').slimScroll({
        scrollTo : '0'
      });
      return false;
    });

    $('.sidebar .s-catalog-submenu.third-level .hide-sidebar-catalog-sub-submenu').on('click', function() {
      $('.sidebar .s-catalog-submenu.third-level .scs-item').hide();
      $($(this).attr('href')).show();
      $('.sidebar .custom-scrollbar').slimScroll({
        scrollTo : '0'
      });
      return false;
    });
  }

  // Show fixed header
  function showFixedHeader() {
    $(window).scroll(function () {
        if ($(this).scrollTop() > 600) {
            $('body').addClass('fixed-header-shown');
        } else {
            $('body').removeClass('fixed-header-shown');
        }
    });
  }

  // Show sidebar
  function showSidebarMain() {
    $('.show-sidebar-main').on('click', function() {
      $('body').toggleClass('sidebar-main-shown');
      return false;
    });
  }

  // Hide sideabr
  function hideSidebarMain() {
    $('.hide-sidebar-main').on('click', function() {
      $('body').removeClass('sidebar-main-shown');
    });
  }

  // Show sidebar search
  function showSidebarSearch() {
    $('.show-sidebar-search').on('click', function() {
      $('body').toggleClass('sidebar-search-shown');
      return false;
    });
  }

  // Hide sideabr search
  function hideSidebarSearch() {
    $('.hide-sidebar-search').on('click', function() {
      $('body').removeClass('sidebar-search-shown');
    });
  }

  // Cart
  function cart() {
    $(document).on('submit', '.cart-form', function (event) {
      event.preventDefault();
  
      this.$button = $(this).find("button[type=submit]");
      this.$button.attr('disabled', true);
  
      $.ajax({
        type: 'post',
        data: $(this).serialize(),
        url: '/cart',
        dataType: 'json',
        context: this,
        cache: false,
        success: function(result, textStatus, xhr) {
          if(result.addedToCartModalContent != false) {
            $('#modal-added-to-cart #matc-content').html(result.addedToCartModalContent);
            $('#modal-added-to-cart').modal('toggle');
            $(this).replaceWith('<a href="/cart" class="btn btn-default btn-xs btn-block">В корзине</a>');
          }
  
          if(result.reloadedCartContent != false) {
            $('#positions-area').html(result.reloadedCartContent);
            $("[data-toggle='tooltip']").tooltip();
          }
  
          $('.cart-total-price').text(result.totalPrice);
          $('.cart-total-count').text(result.totalCount);
        },
        error: function(xhr, textStatus, errorThrown) {
          console.log(errorThrown);
        }
      });
    });
  }

  function onBannerClick() {
    $('body').on('click', 'a[data-banner]', function() {
        var banner = $(this).data('banner');
        var page = $(this).data('page');
        $.get('/ajax/add-count-click-banner?id='+banner+'&page='+page);
    });
  }

  function showCookie() {
    if (document.cookie.indexOf('acceptCookie') === -1) {
        $('#cookie-policy').show();
    }
    $('body').on('click', '#accept-cookie', function() {
        $('#cookie-policy').hide();
        $.get('/ajax/accept-cookie');
    });
  }

  // Links fix
  function linksFix() {
    $("a[href*='/']").on("click touchend", function(e) {
      var el = $(this);
      var link = el.attr("href");
      window.location = link;
    });
    $("a[href^='tel']").on("click touchend", function(e) {
      var el = $(this);
      var link = el.attr("href");
      window.location = link;
    });
  }

  function citychecker() {
    $("#approval").click(function () {
      $("#city-approval").addClass("loading");
      $("#city-approval").slideUp();
    });
  }

  // Collapses
  function collapses() {
    var $myGroup = $('#info-accordeon');
    $myGroup.on('show.bs.collapse','.collapse', function() {
        $myGroup.find('.collapse.in').collapse('hide');
    });
  };


  var waitForFinalEvent = (function () {
    var timers = {};
    return function (callback, ms, uniqueId) {
      if (!uniqueId) {
        uniqueId = "Don't call this twice without a uniqueId";
      }
      if (timers[uniqueId]) {
        clearTimeout (timers[uniqueId]);
      }
      timers[uniqueId] = setTimeout(callback, ms);
    };
  })();
  

  function breadcrumbs() {
    if ($('.breadcrumbs-block').length) {

      if($(window).width() < 543) {
        var widthUl = 0;

        $('.breadcrumbs-block .bc-content > ul > li').each(function() {
          widthUl += $(this).outerWidth(true);
        });
  
        if (widthUl - $('.breadcrumbs-block').width() > 0 ) {
          $('.breadcrumbs-block').css('direction', 'rtl');
        } else {
          $('.breadcrumbs-block').css('direction', 'ltr');
        }
      }

      $(window).on('resize', function(){
        waitForFinalEvent(function(){
          if($(window).width() <= 543) {
            var widthUl = 0;
    
            $('.breadcrumbs-block .bc-content > ul > li').each(function() {
              widthUl += $(this).outerWidth(true);
            });
      
            if (widthUl - $('.breadcrumbs-block').width() > 0 ) {
              $('.breadcrumbs-block').css('direction', 'rtl');
            } else {
              $('.breadcrumbs-block').css('direction', 'ltr');
            }

          } else {
            $('.breadcrumbs-block').css('direction', 'ltr');
          }
        }, 200, "breadcrumbs-update");
      });

    }
  }

  function validateFormContacts() {
    $('.validate--js input, .validate--js textarea').on('change', function() {
      var _this = $(this);

      if (_this.val() != '') {
        _this.closest('.validate--js').addClass('validate--js__validate');
      } else {
        _this.closest('.validate--js').removeClass('validate--js__validate');
      }
    });

    $('.validate-mail--js input').on('change', function() {
      var _this = $(this),
          template = /^[+a-z0-9_.-]+@[a-z0-9-]+\.([a-z]{1,6}\.)?[a-z]{2,6}$/i;

      if (_this.val() != '') {
        if (_this.val().search(template) == 0) {
          _this.closest('.validate-mail--js').addClass('validate--js__validate');
        } else{
          _this.closest('.validate-mail--js').removeClass('validate--js__validate');
        }
      } else{
        _this.closest('.validate-mail--js').removeClass('validate--js__validate');
      }
    });
  }

  function modalDismiss() {
    $(".modal-dismiss").on('click', function() {
      var modal_id = $(this).attr('href');
      $(this).closest('.modal').modal('hide');
      setTimeout(function() {
        $(modal_id).modal('show');
      }, 400);
      return false;
    });
  }

  // Gallery slider
  function sliderGallery() {
    $('.slider-gallery .slick-slider-alt').each(function() {
      $(this).slick({
        slidesToShow: 5,
        slidesToScroll: 1,
        arrows: false,
        autoplay: true,
        autoplaySpeed: 4000,
        dots: false,
        responsive: [
          // {
          //   breakpoint: 1200,
          //   settings: {
          //     slidesToShow: 5,
          //     slidesToScroll: 1,
          //   }
          // },
          // {
          //   breakpoint: 992,
          //   settings: {
          //     slidesToShow: 3,
          //     slidesToScroll: 1,
          //   }
          // },
          {
            breakpoint: 768,
            settings: {
              slidesToShow: 4,
              slidesToScroll: 1,
            }
          },
          {
            breakpoint: 576,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 1,
            }
          },
        ]
      });

      $('.ss-controls .slick-switches .ss-switch.prev', $(this).closest(".slider-gallery")).click(function() {
        $('.slick-slider-alt', $(this).closest('.slider-gallery')).slick('slickPrev');
      });

      $('.ss-controls .slick-switches .ss-switch.next', $(this).closest(".slider-gallery")).click(function() {
        $('.slick-slider-alt', $(this).closest('.slider-gallery')).slick('slickNext');
      });

      var numItems = $('.ss-item', $(this)).length;
      if (numItems > 5 && window.innerWidth >= 1200 || numItems > 4 && (window.innerWidth >= 992 && window.innerWidth <= 1199) || numItems > 3 && (window.innerWidth >= 768 && window.innerWidth <= 991) || numItems > 2 && window.innerWidth <= 768 )  {
        $('.ss-controls', $(this).closest('.slider-gallery')).css('display', '');
      }

      var currentSlider = $(this);

      $(window).on('resize', function(){
        waitForFinalEvent(function(){
          var numItems = $('.ss-item', currentSlider).length;
          if (numItems > 5 && window.innerWidth >= 1200 || numItems > 4 && (window.innerWidth >= 992 && window.innerWidth <= 1199) || numItems > 3 && (window.innerWidth >= 768 && window.innerWidth <= 991) || numItems > 2 && window.innerWidth <= 768 )  {
            $('.ss-controls', currentSlider.closest('.slider-gallery')).css('display', '');
          } else {
            $('.ss-controls', currentSlider.closest('.slider-gallery')).css('display', 'none');
          };
        }, 100, "slider_gallery");
      });
    });
  };

  function fixAccordion() {
    $('.accordion [data-toggle="collapse"]').click(function() {
      $('.collapse.in').collapse('hide');
    });
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    } else {
      return null;
    }
  }

  function addFillplaceScript() {

    if (getCookie('fillplaceVisible') == null) {
      var script = document.createElement('script');
      window.domainkey = '4b1afd07-2708-4358-a38f-83cf178f9f0d';
      script.src = "https://app.fillplace.ru/js/embed.js";
      script.setAttribute('data-timestamp', +new Date());
      document.body.appendChild(script);

      document.cookie = "fillplaceVisible=true; path=/;";
    }

  }

  // Select2
  function select2() {
    if($('.select2').length > 0){
      $('.select2').select2({
        width: '100%',
        language: "ru"
      });
    }
    if($('#select-sort').length > 0){
      var obj = {
        minimumResultsForSearch: -1,
        width: '100%',
        language: "ru",
        templateSelection: formatSelection,
        templateResult: formatSelection,
      }
      if ($('.order-by').length) {
        obj['dropdownParent'] = $('.order-by')
      }
      $('#select-sort').select2(obj);
    }
    if($('#select-page-size').length > 0){
      $('#select-page-size').select2({
        // minimumResultsForSearch: -1,
        width: '100%',
        language: "ru",
        dropdownParent: $('.page-size')
      });

    }
    if($('.pharmacies #select_region').length > 0){
        $('.pharmacies #select_region').select2({
            minimumResultsForSearch: -1,
            width: '100%',
            language: "ru",
            dropdownParent: $('.pharmacies .select-region-select'),
            searchInputPlaceholder: 'My custom placeholder...'
        });
    }

    if($('.select-order').length > 0){
      $('.select-order').select2({
        minimumResultsForSearch: -1,
        width: '100%',
        language: "ru",
        templateSelection: formatSelection,
        templateResult: formatSelection,
      });
    }

    function formatSelection (item) {
      if (item.element) {
        return $(
            '<span><span class="sort-icon"><img src="/images/icons/'+ item.element.className + '.svg" alt=""></span>' +
            item.text + '</span>'
        );
      }
    }
  }

  function passwordVisible() {
    $(".password-input").each(function() {
      $('.pi-btn', $(this)).click(function(e) {
        e.preventDefault();
        if ($((this).closest('.password-input')).hasClass('visible')) {
          $((this).closest('.password-input')).removeClass('visible');
          $("input", $((this).closest('.password-input'))).attr('type','password');
        } else {
          $((this).closest('.password-input')).addClass('visible');
          $("input", $((this).closest('.password-input'))).attr('type','text');
        }
      });
    });
  };

  function setCookieForChoiceCity() {
    $(document).on('click', '#location-collapse .location-link', function (e) {
      var city = $(this).data('city');
      if (city) {
        document.cookie = "choice_city=" + city + "; path=/;"
      }
    });

    $(document).on('click', '#modal-alert .modal-alert-link', function (e) {
      var city = $(this).data('city');
      if (city) {
        document.cookie = "choice_city=" + city + "; path=/;"
      }
    });

    $(document).on('click', '#delivery-method .delivery-method-link', function (e) {
      var city = $(this).data('city');
      if (city) {
        document.cookie = "choice_city=" + city + "; path=/;"
      }
    });

    $(document).on('click', function (e) {
        if(!e.target.closest('.collapse') && !e.target.closest('[data-toggle="collapse"]')){
            $('#delivery-method').collapse('hide');
        }
    });

    $(document).on('click', '#block-prices .block-prices-link', function (e) {
      var city = $(this).data('city');
      if (city) {
        document.cookie = "choice_city=" + city + "; path=/;"
      }
    });
  }

  function setCookieForChoiceDrugstore() {
    let drugstoreSelectWrapper = document.querySelector('.drugstore-select-wrapper');
    $(document).on('click', '.js-choice-drugstore', function (e) {
      e.preventDefault();

      let codeApt = $('#drugstore-list-by-town').val();

      if (codeApt) {
        document.cookie = "choice_drugstore=" + codeApt + "; path=/;"
        document.cookie = "has_choice_drugstore=true; path=/;"
        location.reload();
        drugstoreSelectWrapper.classList.remove('error');
      } else {
        drugstoreSelectWrapper.classList.add('error');
      }
    });
    
    $('#drugstore-list-by-town').on("select2:select", function(elem){
        if($('#drugstore-list-by-town').val()){
            drugstoreSelectWrapper.classList.remove('error');
        } else{
            drugstoreSelectWrapper.classList.add('error');
        }
    });
    $(document).on('click', '.js-drop-drugstore', function (e) {
      e.preventDefault();

      document.cookie = "choice_drugstore=0; path=/;"
      document.cookie = "has_choice_drugstore=true; path=/;"
      location.reload();
    });
  }

  function tableOrders() {
    if ($('.orders.orders--delivery').length) {
      $('.orders.orders--delivery').find('.orders__item-status').css('height', $('.orders.orders--delivery').find('.orders__body').innerHeight());

      $(window).on('resize', function() {
        waitForFinalEvent(
          function() {
            $('.orders.orders--delivery').find('.orders__item-status').css('height', $('.orders.orders--delivery').find('.orders__body').innerHeight());
          }, 200, 'height-status'
        );
      });
    }
  }

  function searchSorting() {
    $('#select-sort').on('change', function () {
      var url = $(this).val(); // get selected value

      if ($('#filters-form').length) {
        var value = $(this).val().slice(1).trim(),
            order_by = '',
            order_dir = '';

        if (value) {
          order_by = value.split('&')[0].split('=')[1];
          order_dir = value.split('&')[1].split('=')[1];
        }

        if ($('#filters-form input[name="order_by"]').length) {
          $('#filters-form input[name="order_by"]').val(order_by);
        } else {
          $('#filters-form').prepend('<input type="hidden" name="order_by" value="' + order_by + '">');
        }
        if ($('#filters-form input[name="order_dir"]').length) {
          $('#filters-form input[name="order_dir"]').val(order_dir);
        } else {
          $('#filters-form').prepend('<input type="hidden" name="order_dir" value="' + order_dir + '">');
        }

        filterFormGetParams();
      } else {
        if (url) { // require a URL
          window.location = url; // redirect
        }
      }

      return false;
    });
  }

  function pageSize() {
    $('#select-page-size').on('change', function () {
      var size = $(this).val();

      if ($('#filters-form').length) {
        if ($('#filters-form input[name="size"]').length) {
          $('#filters-form input[name="size"]').val(size);
        } else {
          $('#filters-form').prepend('<input type="hidden" name="size" value="' + size + '">');
        }

        filterFormGetParams();
      }

      return false;
    });
  }

  function categoryMode() {
    $('.category-view__button').on('click', function (e) {
      e.preventDefault();
      var type = $(this).data('type');

      if ($('#filters-form').length) {
        if ($('#filters-form input[name="mode"]').length) {
          $('#filters-form input[name="mode"]').val(type);
        } else {
          $('#filters-form').prepend('<input type="hidden" name="mode" value="' + type + '">');
        }

        filterFormGetParams();
      }

      return false;
    });
  }

  function filterFormGetParams() {
    var queryParams = '',
        firstEl = true;

    $('#filters-form input[type="hidden"]').each(function () {
      var input = $(this),
          inputName = input.attr('name'),
          inputValue = input.val();

      if (inputValue) {
        if (firstEl) {
          firstEl = false;
        } else {
          queryParams += '&';
        }

        queryParams += inputName + '=' + inputValue;
      }
    });

    if (queryParams) {
      queryParams = '?' + queryParams;
    }

    window.location.href = window.location.pathname + queryParams;
  }

  /**
   * Добавление товара в избранное
   */
  function addFavoriteProduct() {
    $('body').on('click', '.add-favorite-product', function(e){
      e.preventDefault();
      e.stopPropagation();

      var product = $(this);
      var productId = product.data('product-id');


      $.ajax({
        url: '/ajax/add-favorite-product',
        type: 'get',
        dataType: "json",
        cache: false,
        data: {
          'id': productId,
        },
        success: function (data) {
          if (data.add) {
            product.addClass('active');
            product.attr('data-original-title', 'Удалить из избранного');
            $('.favorite-link-count').text(data.count);
          } else {
            product.removeClass('active');
            product.attr('data-original-title', "Добавить в\u00a0избранное");
            $('.favorite-link-count').text(data.count);
          }
        }
      });
    });
  }

  // Preview gallery slider
  function sliderPreview() {
    $(".preview-gallery .p-slider .slick-slider-temp").slick({
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: false,
      speed: 500,
      fade: true,
      cssEase: "linear",
      dots: false,
      draggable: false,
      swipe: false,
    });

    $(".preview-gallery .p-slider-preview .slick-slider-alt").slick({
      slidesToShow: 3,
      arrows: false,
      dots: false,
      infinite: true,
      centerMode: true,
      centerPadding: 0,
      asNavFor: $(".preview-gallery .p-slider .slick-slider-temp"),
      focusOnSelect: true,
    });

    $(".preview-gallery .ps-controls .slick-switches .ss-switch.prev").click(
        function () {
          $(".preview-gallery .p-slider-preview .slick-slider-alt").slick(
              "slickPrev"
          );
        }
    );

    $(".preview-gallery .ps-controls .slick-switches .ss-switch.next").click(
        function () {
          $(".preview-gallery .p-slider-preview .slick-slider-alt").slick(
              "slickNext"
          );
        }
    );

    var numItems = $(".preview-gallery .p-slider-preview .ss-item").length;
    if (numItems > 3) {
      $(".preview-gallery .p-slider-preview .ps-controls").css("display", "");
      $(".preview-gallery .p-slider-preview .slick-slider-alt").removeClass(
          "slick-static"
      );
      $(".preview-gallery .p-slider-preview").addClass("p-x-30");
    }

    if (numItems > 1) {
      $(".preview-gallery .p-slider-preview").addClass("visible");
    }

    var currentSlider = $(".preview-gallery .p-slider-preview");

    $(window).on("resize", function () {
      waitForFinalEvent(
          function () {
            var numItems = $(".ss-item", currentSlider).length;
            if (numItems > 2) {
              $(".ps-controls", currentSlider).css("display", "");
              $(".slick-slider-alt", currentSlider).removeClass("slick-static");
              $(currentSlider).addClass("p-x-30");
            } else {
              $(".ps-controls", currentSlider).css("display", "none");
              $(".slick-slider-alt", currentSlider).addClass("slick-static");
              $(currentSlider).removeClass("p-x-30");
            }
          },
          100,
          "slider_preview_gallery"
      );
    });
  }

  function getSecondsToTomorrow() {
    var now = new Date();

    // завтрашняя дата
    var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1);
    var diff = tomorrow - now; // разница в миллисекундах
    return Math.round(diff / 1000); // преобразуем в секунды
  }

  /**
   * Счетчик показа товара
   */
  function addCountViewProduct () {

    var dfmArr = [];

    var dfm;
    function findMessages(messageList) {
      return Number(messageList) === Number(dfm);
    }

    $(window).on('scroll', function(){
      waitForFinalEvent(function(){

      var sepecElem = $('#special-tabs .tab-pane.active, .category-list-view, .search-list-view, .also-list-view, .cart-popular-list-view, .banner-list-view, .slider-list-view');
      if (!sepecElem.length) {
        return;
      }

      var productStat = JSON.parse(getCookie('productStat'));
      if (!productStat) {
        productStat = {};
      }


      var wt = $(window).scrollTop();//количество пикселей от верха страницы
      var wh = $(window).height();//высота окна браузера

      var et = sepecElem.offset().top;// на какой высоте от верха страницы находится элемент
      var eh = sepecElem.outerHeight();// его высота
      var dh = $(document).height();// высота всей страницы

      if (wt + wh >= et + (eh / 4) && wt + wh <= et + eh + (eh * 0.5)){
        var elems = sepecElem.find('.p-item');
        if (elems) {
          for (var i = 0; i < elems.length; i++) {
            dfm = $(elems[i]).data('product-id');

            if (typeof productStat[dfm] === 'undefined') {
              productStat[dfm] = {};
            }

            if(dfmArr.find(findMessages) === undefined && typeof productStat[dfm]['view'] === 'undefined'){
              dfmArr.push(dfm);

              productStat[dfm]['view'] = 1;

              $.get("/ajax/add-count-product-stat", { dfm: dfm, value: 'view_count' })
                .done(function(data) {
                  if (data) {
                    document.cookie = `productStat=${JSON.stringify(productStat)}; path=/; max-age=${getSecondsToTomorrow()};`;
                  }
                });

            }

          }
        }
      }
      }, 100, "scroll-page");
    });

  }

  /**
   * Счетчик клика по товару
   */
  function clickSpecialProduct() {
    $('body').on('click', '#special-tabs .tab-pane.active .p-item[data-product-id]', function(e) {
      e.preventDefault();

      location.href = $(this).children('a').attr('href') + '?p-c=1';
    });
  }

  function clickCategoryProduct() {
    $('body').on('click', '.category-list-view .p-item[data-product-id]', function(e) {
      e.preventDefault();

      location.href = $(this).children('a').attr('href') + '?p-c=2';
    });
  }

  function clickSearchProduct() {
    $('body').on('click', '.search-list-view .p-item[data-product-id]', function(e) {
      e.preventDefault();

      var params = window
          .location
          .search
          .replace('?','')
          .split('&')
          .reduce(
              function(p,e){
                var a = e.split('=');
                p[ decodeURIComponent(a[0])] = decodeURIComponent(a[1]);
                return p;
              },
              {}
          );

        let keyword = params['keyword'] ?? '';
        let utm_baziron = '';

        switch ($(this).data('product-id')) {
          case 14785:
          case 316021:
          case 75710:
            utm_baziron = '&utm_source=galderma_akne_search';
        }

      location.href = $(this).children('a').attr('href') + '?p-c=3&s-k=' + keyword + utm_baziron;
    });
  }

  function clickAlsoProduct() {
    $('body').on('click', '.also-list-view .p-item[data-product-id]', function(e) {
      e.preventDefault();

      let sourceId = $(this).parents('.also-list-view').data('source-id');
      location.href = $(this).children('a').attr('href') + '?p-c=4&s-i=' + sourceId;
    });
  }

  function clickCartPopularProduct() {
    $('body').on('click', '.cart-popular-list-view .p-item[data-product-id]', function(e) {
      e.preventDefault();

      location.href = $(this).children('a').attr('href') + '?p-c=5';
    });
  }

  function clickBannerProduct() {
    $('body').on('click', '.banner-list-view .p-item[data-product-id]', function(e) {
      e.preventDefault();

      let sourceId = $(this).parents('.banner-list-view').data('banner-id');
      location.href = $(this).children('a').attr('href') + '?p-c=6&s-i=' + sourceId;
    });
  }

  function clickSliderProduct() {
    $('body').on('click', '.slider-list-view .p-item[data-product-id]', function(e) {
      e.preventDefault();

      let sourceId = $(this).parents('.slider-list-view').data('slider-id');
      location.href = $(this).children('a').attr('href') + '?p-c=7&s-i=' + sourceId;
    });
  }

  function addCountClickProduct () {

    var params = window
      .location
      .search
      .replace('?','')
      .split('&')
      .reduce(
        function(p,e){
          var a = e.split('=');
          p[ decodeURIComponent(a[0])] = decodeURIComponent(a[1]);
          return p;
        },
        {}
      );

    if (params['p-c']) {

      var productStat = JSON.parse(getCookie("productStat"));
      if (!productStat) {
        productStat = {};
      }

      var dfm = $('.favorite-product-container>a').data('product-id');

      if (typeof productStat[dfm] === 'undefined') {
        productStat[dfm] = {};
      }

      if(dfm && typeof productStat[dfm]['click'] === 'undefined' && typeof productStat[dfm]['view'] !== 'undefined') {
        productStat[dfm]['click'] = 1;

        document.cookie = `productStat=${JSON.stringify(productStat)}; path=/; max-age=${getSecondsToTomorrow()};`;
        
      }

    }

  }


  function orderSearch() {
    var form = $('.order-search');
    form.submit(function (e) {
      var action = form.attr('action');
      var order_id = form.find(".order-id-value").val();
      var town_slug = form.find('.town-slug-value').val();
      $.ajax({
        url: action,
        type: 'get',
        dataType: "json",
        data: {
          'orderId': order_id,
          'townSlug': town_slug,
        }
      });
      return false;
    })
  }

  function attachBonusCard() {
    const form = $("#bonus-card-form");
    const image_field = form.find("#card-image");
    var files = [];
    const file_extensions = ['png', 'jpg', 'jpeg', 'heic', 'PNG', 'JPG', 'JPEG', 'HEIC'];

    image_field.change(function() {
      files = image_field.prop('files');
      if(files.length > 0 && $.inArray($(this).val().split('.').pop().toLowerCase(), file_extensions) !== -1)
      {
        form.submit();
      }
    })

    var reader = new FileReader();
    form.submit(function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();

      var action = $(this).attr('action');
      var barcode = null;
      if(files.length > 0) {
        var file = files[0];

        // Getting base64 from file
        reader.readAsDataURL(file);
        reader.onload = function () {
          var image = reader.result;
          var size = 1920;
          console.log(image);
          // Getting barcode from base64 file
          Quagga.decodeSingle({
            numOfWorkers: 2,
            decoder: {
              readers: ["code_39_reader"] // List of active readers
            },
            locate: true, // try to locate the barcode in the image
            locator: {
              halfSample: true,
              patchSize: "small"
            },
            inputStream: {
              size: size  // restrict input-size to be 800px in width (long-side)
            },
            src: image // or 'data:image/jpg;base64,' + data
          }, function (result) {
            if (result && result.codeResult) {
              barcode = result.codeResult.code;
            } else {
              console.log("Barcode was not detected");
            }
            $.ajax({
              url: action,
              type: 'post',
              dataType: "json",
              data: {'card_identifier': barcode},
              success: function (data) {
                if (data) {
                  console.log('success');
                  document.location.reload();
                }
              },
              error: function (errorThrown) {
                console.log(errorThrown);
                document.location.reload();
              }
            });
          });
        };
        reader.onerror = function (error) {
          console.log('Error: ', error);
          return null;
        };
      }
    })
  }

  function copyPromocode() {
    $('body').on('click', '.js-copy-promocode', function () {
      var input = this.closest('.promocode-active__item').querySelector('.js-copy-input');
      input.select();
      document.execCommand("Copy");
      $(this).attr({'title': 'Скопировано', 'data-original-title': 'Скопировано'})
          .tooltip('show')
          .closest('.promocode-active__item')
          .find('.js-copy-promocode')
          .attr({'title': 'Нажмите, чтобы скопировать', 'data-original-title': 'Нажмите, чтобы скопировать'});

    });
  }

  function searchCity() {
    if($('.js-search-city').length){
      $('.js-search-city').on('change', function() {
        if ($('.js-search-city').val() !== '') {
          window.location = $('.js-search-city').val();
        }
      });
    }
  }
  // Scroll to top
  function scrollToTop() {
    if ($("#back-to-top").length) {
      var scrollTrigger = 100,
          backToTop = function () {
            var scrollTop = $(window).scrollTop();
            if (scrollTop > scrollTrigger) {
              $("#back-to-top").addClass("show");
            } else {
              $("#back-to-top").removeClass("show");
            }
          };
      backToTop();
      $(window).on("scroll", function () {
        waitForFinalEvent(function() {
          backToTop();
        }, 100, 'scroll-to-top');
      });
    }
  }


  // Удаление профиля (сокрытие)
  function deleteProfile() {
    $("#delete-user-profile").click(function() {
      $.ajax({
        type: 'post',
        url: '/profile/delete-profile',
        error: function(xhr, textStatus, errorThrown) {
          console.log(errorThrown);
        }
      });
    });
  }

  // Scrollbar initializing
  window.scrollbarFilter = function () {
    if ($('.scrollbar-init').length) {
      var containerArray = document.getElementsByClassName('scrollbar-init');
      for (var i = 0; i < containerArray.length; i++) {
        window['scrollbar_' + i] = window.Scrollbar;
        window['scrollbar_' + i].init(document.getElementsByClassName('scrollbar-init')[i], {
          // alwaysShowTracks: true,
        });
      }
    }
  };

  function checkFiltersByResize() {
    if ($('#product-filters').length) {
      $(window).on('resize', function() {
        waitForFinalEvent(function() {
          if ($(window).width() >= 768
              && ($('#product-filters').hasClass('in') || $('#product-filters').is(':hidden'))) {
            $('#product-filters').modal('hide');
            $('#product-filters').show(0);
          }
        }, '200', 'filters-block');
      });
    }
  }

  function productPager() {
    if ($('#filters-form').length && $('.pagination').length) {
      var pathName = window.location.pathname,
          queryParams = '?',
          firstEl = true;

      $('#filters-form input[type="hidden"]').each(function () {
        var input = $(this),
            inputName = input.attr('name'),
            inputValue = input.val();

        if (inputValue) {
          if (firstEl) {
            firstEl = false;
          } else {
            queryParams += '&';
          }

          queryParams += inputName + '=' + inputValue;
        }
      });

      $('.pagination > li:not(.disabled)').each(function () {
        var _this = $(this),
            pagerLink = _this.find('a'),
            pagerLinkData = Number(pagerLink.data('page')) + 1;
        pagerLink.attr('href', pathName + queryParams + '&page=' + pagerLinkData);
      });
    }
  }

  function mobileAppBanner() {
    if ($('.mobile-app').length) {

      $('.mobile-app__button').on('click', function(e) {
        e.preventDefault();
        $('.mobile-app__body').addClass('_ready').addClass('_show');
      });
      $('.mobile-app__hide').on('click', function(e) {
        e.preventDefault();
        $('.mobile-app__body').removeClass('_show');
        setTimeout(function () {
          $('.mobile-app__body').removeClass('_ready');
        }, 400);
      });

      if ($(window).width() < 768) {
        var isMainPage = !!$('.mobile-app').data('main');
        if (isMainPage) {
          $('.mobile-app').show();
          $('.mobile-app__body').addClass('_ready').addClass('_show');
        } else {
          if (!sessionStorage.getItem('mobile-banner')) {
            $('.mobile-app').show();
            $('.mobile-app__body').addClass('_ready').addClass('_show');
          }
        }

        $('.mobile-app__close').on('click', function(e) {
          e.preventDefault();
          if (!isMainPage) {
            sessionStorage.setItem('mobile-banner', true);
          }
          $('.mobile-app__body').removeClass('_show');
          setTimeout(function () {
            $('.mobile-app__body').removeClass('_ready');
          }, 400);
        });
      }
    }
  }

  function sliderGoodsInc() {
      $('.goods-inc .slick-slider').slick({
        slidesToShow: 5,
        slidesToScroll: 1,
        arrows: false,
        dots: true,
        // appendDots: $('.slider-dots', $(this).closest('.p-slider')),
        // autoplay: false,
        // pauseOnHover: false,
        infinite:false,
        responsive: [
          {
            breakpoint: 992,
            settings: {
              slidesToShow: 3.5,
              slidesToScroll: 1,
            }
          },
          {
            breakpoint: 768,
            settings: {
              slidesToShow: 2.5,
              slidesToScroll: 1,
            }
          },
          {
            breakpoint: 480,
            settings: {
              slidesToShow: 1.5,
              slidesToScroll: 1,
            }
          }
        ]
      });
  }

  function sliderGoodsIncModal() {
    $('.goods-inc .slick-slider-modal').slick({
      slidesToShow: 5,
      slidesToScroll: 1,
      arrows: false,
      dots: true,
      // appendDots: $('.slider-dots', $(this).closest('.p-slider')),
      // autoplay: false,
      // pauseOnHover: false,
      infinite:false,
      vairableWidth: true,
      responsive: [
        {
          breakpoint: 992,
          settings: {
            slidesToShow: 2.5,
            slidesToScroll: 1,
          }
        },
        {
          breakpoint: 575,
          settings: {
            slidesToShow: 1.5,
            slidesToScroll: 1,
          }
        },
      ]
    });

    $('#modal-inc').on('shown.bs.modal', function () {
        $('.goods-inc .slick-slider-modal').slick('setPosition');
        $('.goods-inc .slick-slider-modal').css('visibility', 'visible');
        $('.goods-inc .slick-slider-modal .slick-slide').css('visibility', 'visible');
      });
   
}

function sliderGamma() {
     $('.brandzone .brandzone-gamma__row.slick-slider').slick({
      slidesToShow: 4,
      slidesToScroll: 1,
      arrows: true,
      prevArrow: $('.brandzone .brandzone-gamma .ss-controls .slick-switches .ss-switch.prev'),
      nextArrow: $('.brandzone .brandzone-gamma .ss-controls .slick-switches .ss-switch.next'),
      dots: true,
      // appendDots: $('.slider-dots', $(this).closest('.p-slider')),
      // autoplay: false,
      // pauseOnHover: false,
      infinite:false,
      vairableWidth: true,
      responsive: [
        {
          breakpoint: 575,
          settings: {
            slidesToShow: 1.7,
            slidesToScroll: 1,
          }
        },
      ]
    });

    // $('.brandzone.brandzone-gamma .ss-controls .slick-switches .ss-switch.prev').click(function() {
    //     $('.brandzone .brandzone-gamma__row.slick-slider').slick('slickPrev');
    // });

    // $('.brandzone.brandzone-gamma .ss-controls .slick-switches .ss-switch.next').click(function(a,b,c,d) {
    //     $('.brandzone .brandzone-gamma__row.slick-slider').slick('slickNext');
    // });
   
}

function sliderProductsInArticle() {
  $('.article-product-slider-wrapper').each(function () {
    var $sliderWrapper = $(this);
    var $slider = $sliderWrapper.find('.slick-slider');

    $slider.slick({
      slidesToShow: 3,
      slidesToScroll: 1,
      arrows: true,
      prevArrow: $sliderWrapper.find('.slider-arrows .slider-arrow-prev'),
      nextArrow: $sliderWrapper.find('.slider-arrows .slider-arrow-next'),
      appendDots: $sliderWrapper.find('.dots-wrapper'),
      dots: true,
      infinite: false,
      responsive: [
        {
          breakpoint: 575,
          settings: {
            slidesToShow: 2,
            slidesToScroll: 1,
          }
        },
      ]
    });
  });

    // $('.brandzone .brandzone-brands .ss-controls .slick-switches .ss-switch.prev').click(function() {
    //     $('.brandzone .brandzone-brands__row.slick-slider').slick('slickPrev');
    // });

    // $('.brandzone .brandzone-brands .ss-controls .slick-switches .ss-switch.next').click(function() {
    //     $('.brandzone .brandzone-brands__row.slick-slider').slick('slickNext');
    // });
   
}

function sliderBiodermaBrands() {
    $('.brandzone .brandzone-brands__row.slick-slider').slick({
      slidesToShow: 4,
      slidesToScroll: 1,
      arrows: true,
      prevArrow: $('.brandzone .brandzone-brands .ss-controls .slick-switches .ss-switch.prev'),
      nextArrow: $('.brandzone .brandzone-brands .ss-controls .slick-switches .ss-switch.next'),
      dots: true,
      // appendDots: $('.slider-dots', $(this).closest('.p-slider')),
      // autoplay: false,
      // pauseOnHover: false,
      infinite:false,
      vairableWidth: true,
      responsive: [
        {
          breakpoint: 575,
          settings: {
            slidesToShow: 2.3,
            slidesToScroll: 1,
          }
        },
      ]
    });

    // $('.brandzone .brandzone-brands .ss-controls .slick-switches .ss-switch.prev').click(function() {
    //     $('.brandzone .brandzone-brands__row.slick-slider').slick('slickPrev');
    // });

    // $('.brandzone .brandzone-brands .ss-controls .slick-switches .ss-switch.next').click(function() {
    //     $('.brandzone .brandzone-brands__row.slick-slider').slick('slickNext');
    // });
   
}

function sliderPromocodeBrands() {
    $('.pps-brands__row.slick-slider').slick({
      slidesToShow: 5,
      slidesToScroll: 1,
      arrows: true,
      prevArrow: $('.pps-brands .ss-controls .slick-switches .ss-switch.prev'),
      nextArrow: $('.pps-brands .ss-controls .slick-switches .ss-switch.next'),
    //   dots: true,
      // appendDots: $('.slider-dots', $(this).closest('.p-slider')),
      // autoplay: false,
      // pauseOnHover: false,
      infinite:false,
      vairableWidth: true,
      responsive: [
        {
          breakpoint: 1199,
          settings: {
            slidesToShow: 4,
            slidesToScroll: 1,
          },
        },
        {
            breakpoint: 767,
            settings: {
              slidesToShow: 2.3,
              slidesToScroll: 1,
            },
          },
      ]
    });

    // $('.brandzone .brandzone-brands .ss-controls .slick-switches .ss-switch.prev').click(function() {
    //     $('.brandzone .brandzone-brands__row.slick-slider').slick('slickPrev');
    // });

    // $('.brandzone .brandzone-brands .ss-controls .slick-switches .ss-switch.next').click(function() {
    //     $('.brandzone .brandzone-brands__row.slick-slider').slick('slickNext');
    // });

}

function checkVisible() {
    var screen = $(window),
        slider = $(".brandzone__banner-slider-wrapper");

    if (slider.length === 0) {
        return false;
    }

    return (screen.scrollTop() + screen.height() >= slider.offset().top && screen.scrollTop() < slider.offset().top + slider.height());
}

function setStatistic(sliderId) {
    var csrfToken = $("meta[name=\'csrf-token\']").attr("content"); // Получить токен CSRF
    $.ajax({
      type: "post",
      headers: {
        "X-CSRF-Token": csrfToken
      },
      url: "/ajax/slider-brand-view-statistic",
      data: {"sliderId": sliderId},
      error: function (xhr, status, error) {
        console.log(error);
      }
    });
}

function sliderBannerCosmetics() {
    $('.brandzone .brandzone__banner-slider').slick({
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: false,
      dots: false,
      infinite:true,
      vairableWidth: true,
    });

    $('.brandzone .brandzone__banner-slider').on('afterChange', function (event, slick, currentSlide) {
        var currentSlideElement = slick.$slides[currentSlide];
        var sliderId = $(currentSlideElement).data('slider-id');

        if (checkVisible()) {
          setStatistic(sliderId);
        }
    });

    $('.brandzone .brandzone__banner-slider-wrapper .ss-controls .slick-switches .ss-switch.prev').click(function() {
        $('.brandzone .brandzone__banner-slider-wrapper .slick-slider').slick('slickPrev');
    });

    $('.brandzone .brandzone__banner-slider-wrapper .ss-controls .slick-switches .ss-switch.next').click(function() {
        $('.brandzone .brandzone__banner-slider-wrapper .slick-slider').slick('slickNext');
    });
   
}

function firstSliderLoad() {
    var activeSlide = $('.brandzone .brandzone__banner-slider').find('.slick-active').first();
    var firstSlideId = activeSlide.data('slider-id');
    if (checkVisible()) {
      setStatistic(firstSlideId);
    }
}

function sliderPartners() {
  $('.partners-slider').slick({
    slidesToShow: 5,
    slidesToScroll: 1,
    arrows: false,
    dots: false,
    // appendDots: $('.slider-dots', $(this).closest('.p-slider')),
    // autoplay: false,
    // pauseOnHover: false,
    infinite:false,
    responsive: [
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1,
          dots: true,
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          dots: true,
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          dots: true,
        }
      }
    ]
  });

  $('.partners .prev').click(function() {
    $('.partners-slider').slick('slickPrev');
  });

  $('.partners .next').click(function() {
    $('.partners-slider').slick('slickNext');
  });
  }

  function hideAdBannerIfExist(){
    const adBanner = document.querySelector('.represent-col--ad [id^="adfox"]');
    if(!adBanner) return;

    const observer = new MutationObserver((mutationsList, observer) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1 && node.closest('[id^="adfox"]')) {
                        const adBannerParent = adBanner.closest('.represent-col--ad');
                        adBannerParent.classList.remove('custom-hidden');
                    }
                }
            }
        }
    });

    setTimeout(() => {
         observer.disconnect();
    }, 5000);

    // Определение наблюдаемого узла и конфигурации
    const config = { childList: true, subtree: true };
    // Начать наблюдение за изменениями в документе
    observer.observe(document.body, config);
}

  function addBackdropToSelectRegion(){
    if(window.innerWidth>768 || $('.pharmacies #select_region').length === 0) return;
    $('.pharmacies #select_region').on('select2:open', function (e) {
        $('body').append( "<div class='select-region-backdrop'></div>" );

        // костыль для того чтобы выпадашка не закрывалась сразу после нажатия на мобильном
        setTimeout(() => {
            let options = document.querySelectorAll('.select2-results__option');

            options.forEach((option, i) => {
                option.style.pointerEvents = 'auto';
            });
        }, 200);
    });
    $('.pharmacies #select_region').on('select2:close', function (e) {
        $('.select-region-backdrop').remove();
    });
  }

  function scrollBreadcrumbsToRight(){
      let breadcrumbBlock = document.querySelector('.breadcrumbs-block');
      if(window.innerWidth >= 544 || !breadcrumbBlock) return;

      breadcrumbBlock.scrollTo({
        left: 1000,
      });
  }

  function showActiveSearch(){
    const searchResults = document.querySelector('.search-results');
    const backdrop = document.querySelector('.search-backdrop');
    const input = document.querySelector('.search-form-header input[name="keyword"]');
    const clearBtn = document.querySelector('.search-clear-btn');
    if(!searchResults || !backdrop || !input || !clearBtn) return;

    input.addEventListener('input',  function(){
        if(!input.value.length){
            clearBtn.classList.add('hidden');
            searchResults.classList.remove('active');
        } else{
            clearBtn.classList.remove('hidden');
            searchResults.classList.add('active');
        }
    });

    input.addEventListener('focus', function(){
        backdrop.classList.add('active');
        if(input.value.length > 0){
            searchResults.classList.add('active');
        }
    });

    backdrop.addEventListener('click', function(){
        backdrop.classList.remove('active');
        searchResults.classList.remove('active');
    });

    clearBtn.addEventListener('click', function(){
        input.value = '';
        clearBtn.classList.add('hidden');
        searchResults.classList.remove('active');
        backdrop.classList.remove('active');
    });

  }
  function showActiveSearchFixed(){
    const searchResults = document.querySelectorAll('.fixed-results');
    const backdrop = document.querySelector('.search-backdrop');
    const input = document.querySelector('.fixed input[name="keyword"]');
    const clearBtn = document.querySelector('.search-clear-btn');

    if(!searchResults || !backdrop || !input || !clearBtn) return;

    input.addEventListener('input',  function(){
      if(!input.value.length){
        clearBtn.classList.add('hidden');
        searchResults.forEach(result => {
          result.classList.remove('active');
        });
      } else{
        clearBtn.classList.remove('hidden');
        searchResults.forEach(result => {
          result.classList.add('active');
        });
      }
    });



    backdrop.addEventListener('click', function(){
      searchResults.forEach(result => {
        result.classList.remove('active');
      });
    });

    document.addEventListener('click', function(event) {
      var container = document.querySelector('.fixed-results');
      // Проверяем, является ли клик не внутри контейнера
      if (container && !container.contains(event.target) && (!input || !input.contains(event.target))) {
        container.classList.remove('active');
      }
    });

    // Добавляем обработчик события клика на контейнер, чтобы не убирать класс при клике внутри
    document.querySelector('.fixed-results').addEventListener('click', function(event) {
      event.stopPropagation(); // Останавливаем всплытие события
    });

    input.addEventListener('focus', function(){
      if(input.value.length > 0){
        searchResults.forEach(result => {
          result.classList.add('active');
        });
      }
    });

    window.addEventListener('scroll', function() {
      searchResults.forEach(result => {
        result.classList.remove('active');
      });
    });

    clearBtn.addEventListener('click', function(){
      input.value = '';
      clearBtn.classList.add('hidden');
      searchResults.forEach(result => {
        result.classList.remove('active');
      });
    });
  }

  window.getHtmlTemplate = function(response){
    let obj = response;
    let res = '';
    if (obj) {
    Object.keys(obj).forEach(function(key){
        if(this[key] === '') return;

        let arr = this[key];

        if(key === 'tips'){
            let str = '';
            res += '<div class="search-results__block"><div class="search-results__suggestions">';
            arr.forEach((function(elem){
                str += `
                <a href="${elem.link}" class="search-results__suggestion">
                    <svg>
                        <use xlink:href="#i-search">
                        </use>
                    </svg>
                    <span>${elem.text}</span>
                </a>
                `;
            }));
            res += str;
            res += '</div></div>';
            return;
        }
        if(key === 'goods'){
            let str = '';
            res += '<div class="search-results__block"><div class="search-results-block-title">Товары</div><div class="search-results__goods">';
            arr.forEach((function(elem){
                str += `
                <a href="${elem.link}" class="search-results__goods-item search-rgi">
                    <div class="search-rgi__icon">
                        <img src="${elem.image}" alt="">
                    </div>
                    <h4 class="search-rgi__title">${elem.text}</h4>
                    <div class="search-rgi__arrow">
                        <svg >
                        <use xlink:href="#i-arrow-triangle">
                        </use>
                        </svg>
                    </div>
                </a>
                `;
            }));
            res += str;
            res += '</div></div>';
            return;
        }
        if(key === 'categories'){
            let str = '';
            res += '<div class="search-results__block"><div class="search-results-block-title">Категории</div><div class="search-results__cats">';
            arr.forEach((function(elem){
                str += `
                <a href="${elem.link}" class="search-results__cats-item">
                    ${elem.text}
                </a>
                `;
            }));
            res += str;
            res += '</div></div>';
            return;
        }
        if(key === 'brands'){
            let str = '';
            res += '<div class="search-results__block"><div class="search-results-block-title">Бренды</div><div class="search-results__brands">';
            arr.forEach((function(elem){
                str += `
                <a href="${elem.link}" class="search-results__brands-item search-rbi">
                    <div class="search-rbi__icon ${!(elem.image) ? 'hidden': ''}">
                        <img src="${elem.image}" alt="">
                    </div>
                    <h4 class="search-rbi__title">${elem.text}</h4>
                </a>
                `;
            }));
            res += str;
            res += '</div></div>';
            return;
        }


    }, obj);
    }


    return res;
  }

//  по умолчанию скрываем кнопки если больше двух рядов
  function hideThirdRowSphereItems(){
    const row = document.querySelector('.sphere-block__row');
    const elems = document.querySelectorAll('.sphb-item__elem');
    const more = document.getElementById('more_sphere');

    if(!row || !more || elems.length === 0) return;

    let rowWidth = row.offsetWidth;
    let elemWidth = elems[0].offsetWidth;
    let elemsInRowApproximate = Math.floor(rowWidth/elemWidth);

    let diff = rowWidth - ((elemsInRowApproximate * 5) - 5);
    let result = Math.floor(diff/elemWidth);


    if((elems.length / result) > 2){
        more.classList.remove('hidden');
        for (let i = 0; i < elems.length; i++) {
            if( i >= ((result*2)-1)){
                elems[i].closest('.sphere-block__column').classList.add('hidden');
            }
        }
    }

    more.addEventListener('click', function(){
        more.classList.add('hidden');
        for (let j = 0; j < elems.length; j++) {
            elems[j].closest('.sphere-block__column').classList.remove('hidden');
        }
    });
  }

  function choosePharmacySphere(){
    $('input[name="sphere"]').on('change', function(){
        if($('input[name="sphere"]:checked').length === 1){
            $('#sphere_block').removeClass('invalid');
        }
    });
    $('#choose_pharmacy').on('click', function(e){
        if($('input[name="sphere"]:checked').length === 0){
            $('#sphere_block').addClass('invalid');
            return;
        }
        $('#sphere_block').removeClass('invalid');
        $('html, body').animate({
            scrollTop: $('#variants').offset().top - 140
        }, 1000);
    });
  }

// скрыть кнопки при изначально пустом поле телефона
  function hideLoginBtns(){
    const input = document.getElementById('loginform-username');
    const block = document.querySelector('.auth-panel__bottom');
    const checkbox = document.getElementById('loginform-checkbox');
    if(!input || !block || !checkbox) return;

    checkbox.addEventListener('change', function(){
        if(+input.value > 9000000000 && checkbox.checked){
            block.classList.remove('hide-buttons');
        } else{
            block.classList.add('hide-buttons');
        }
    });

    input.addEventListener('input', function(){
        if(+input.value > 9000000000 && checkbox.checked){
            block.classList.remove('hide-buttons');
        } else{
            block.classList.add('hide-buttons');
        }
    });
  }

  function openBarCode(){
    const block = document.getElementById('barcode_block');
    const blockFull = document.getElementById('barcode_block_full');
    if(!block || !blockFull) return;

    const openBtn = block.querySelector('.barcode-block-open');
    const backBtn = blockFull.querySelector('.barcode-block__back');
    const closeBtn = blockFull.querySelector('.barcode-block__close')
    openBtn.addEventListener('click', function(e){
        block.classList.add('barcode-block-hidden');
        blockFull.classList.remove('barcode-block-hidden');
    });
    closeBtn.addEventListener('click', function(e){
        block.classList.remove('barcode-block-hidden');
        blockFull.classList.add('barcode-block-hidden');
    });
  }

  function initCountdown(){
    const countdowns = document.querySelectorAll('.countdown');
    if(!countdowns.length) return;

    countdowns.forEach(item=>{
        let initialTime = item.getAttribute('data-time');
        let formattedTime = formatTime(+initialTime);
        item.innerHTML = formattedTime;
        let interval = setInterval(() => {
            initialTime--;
            formattedTime = formatTime(+initialTime);
            item.innerHTML = formattedTime;
            if(initialTime <= 0){
                clearInterval(interval);
            }
        }, 1000);
    });
  }

  function formatTime(time){
    const hours = Math.floor(time / 60 / 60);
    const minutes = Math.floor(time / 60 % 60);
    const seconds = Math.floor(time % 60);

    if(hours>=1){
        return `${addZero(hours)}:${addZero(minutes)}:${addZero(seconds)}`;
    } else{
        return `${addZero(minutes)}:${addZero(seconds)}`;
    }
  }

  function addZero(num){
    if(+num < 10) return '0' + num;
    return num;
  }

  function followLinkAfterEnd(){
    $('#modal_video').on('show.bs.modal', function(){
       $('body').removeClass('sidebar-main-shown');
    });
    window.addEventListener('message', function(event) {
        if (event.origin.includes('rutube.ru')) {
            const rutubeEventData = JSON.parse(event.data);
            if (rutubeEventData.data.videoId == 'fc7b8d94f7f3ac245c90d18cf39a4c73') {
                if (rutubeEventData.data.time > 15) {
                    window.location.href = 'http://app.farmlend.ru';
                }
            }
        }
    });
  }

  function pingBrowserSession() {
    $.ajax({
        url: '/ajax/ping',
        type: 'GET',
        cache: false,
        success: function () {
            console.log('Session ping sent');
        },
        error: function () {
            console.warn('Session ping failed');
        }
    });
    setTimeout(pingBrowserSession, 300000);
  }

  function startPingIfAllowed() {
    const match = document.cookie.match(new RegExp('(^| )analyticalDataCollectionCookiesEnabled=([^;]+)'));
    const analyticalDataCollectionCookiesEnabled = (match) ? decodeURIComponent(match[2]) : 0;
    if (analyticalDataCollectionCookiesEnabled == 1) {
        setTimeout(pingBrowserSession, 300000);
    }
  }



// $('#modal-inc').on('show.bs.modal', function () {
//     $('.goods-inc .slick-slider-modal').slick('refresh');
// });

  $(document).ready(function(){
    initCountdown();
    openBarCode();
    followLinkAfterEnd();
    // hideAdBannerIfExist();
    showActiveSearch();
    showActiveSearchFixed();
    scrollBreadcrumbsToRight();
    addBackdropToSelectRegion();
    choosePharmacySphere();
    hideThirdRowSphereItems();
    numericInput();
    scrollToTarget();
    sliderProducts();
    sliderPartners();
    slimscroll();
    toggleHiddenFilters();
    tooltip();
    tooltipCart();
    showCatalog();
    catalogMenu();
    sidebarCatalogMenu();
    showFixedHeader();
    showSidebarMain();
    hideSidebarMain();
    showSidebarSearch();
    hideSidebarSearch();
    cart();
    onBannerClick();
    showCookie();
    //linksFix();
    citychecker();
    collapses();
    breadcrumbs();
    validateFormContacts();
    modalDismiss();
    sliderGallery();
    fixAccordion();
    addFillplaceScript();
    select2();
    passwordVisible();
    setCookieForChoiceCity();
    setCookieForChoiceDrugstore();
    tableOrders();
    addFavoriteProduct();
    searchSorting();
    sliderPreview();
    addCountViewProduct();
    clickSpecialProduct();
    clickCategoryProduct();
    clickSearchProduct();
    clickAlsoProduct();
    clickCartPopularProduct();
    clickBannerProduct();
    clickSliderProduct();
    sliderGoodsInc();
    sliderGoodsIncModal();
    sliderGamma();
    sliderBiodermaBrands();
    sliderPromocodeBrands();
    sliderBannerCosmetics();
    sliderProductsInArticle();
    addCountClickProduct();
    orderSearch();
    attachBonusCard();
    copyPromocode();
    searchCity();
    scrollToTop();
    scrollbarFilter();
    checkFiltersByResize();
    pageSize();
    categoryMode();
    mobileAppBanner();
    productPager();
    deleteProfile();
    firstSliderLoad();
    hideLoginBtns();
    startPingIfAllowed();
  });

  var options = $.lazyLoadXT;
  options.forceEvent += ' lazyautoload';
  options.autoLoadTime = options.autoLoadTime || 100;
  $(document).ready(function () {
    setTimeout(function () {
      $(window).trigger('lazyautoload');
    }, options.autoLoadTime);
  });

})(jQuery);
