$(document).ready(function() {
	  
		$("ul.cups li").each(function( index ) {
		  $(this).append("<img src='img/coffeecup.svg'/>");
		  $(this).css('opacity','0');
		});
  	  
  	  $("ul.cups").css('list-style', 'none');
  	});
	
	//---------------INVIEW ---------------------//
	
	// for header bar
	 $(".intro").bind('inview', function(event, visible, visiblePartX, visiblePartY) {
      if (visible) {
       	$("header").css('opacity', 0);
      } else {
         $("header").css('opacity', 1);
      }
    });
	
	
	// date circles
	 $(".date").bind('inview', function(event, visible, visiblePartX, visiblePartY) {
      if (visible) {
       	$(this).addClass('date-anim-in');
      } else {
        $(this).removeClass('date-anim-in');
      }
    });
    
    
    $("ul.cups").bind('inview', function(event, visible, visiblePartX, visiblePartY) {
      if (visible) {
       	$(this).find('li').each(function () {
       	$(this).addClass('swing-in');
	  });
      } else {
       $(this).find('li').each(function () {
       $(this).removeClass();
       	});

      }
    });
    
   
    //food graphs
	 $(".nine .food").bind('inview', function(event, visible, visiblePartX, visiblePartY) {
      if (visible) {
	      $(".nine .veg").removeClass('fade-down').addClass('food1').css('width', $(".nine .veg .label span").text()*2); 
	      $(".nine .pierogi").removeClass('fade-down').addClass('food2').css('width', $(".nine .pierogi .label span").text()*2);
	      $(".nine .meaty").removeClass('fade-down').addClass('food3').css('width', $(".nine .meaty .label span").text()*2);

      } else {
		  $(".nine .veg").toggleClass('fade-down food1').css('width', '0px');
	      $(".nine .pierogi").toggleClass('fade-down food2').css('width', '0px');
	      $(".nine .meaty").toggleClass('fade-down food3').css('width', '0px');
      }
    });
       
    $(".ten .food").bind('inview', function(event, visible, visiblePartX, visiblePartY) {
      if (visible) {
	      $(".ten .veg").removeClass('fade-down').addClass('food1').css('width', $(".ten .veg .label span").text()*2); 
	      $(".ten .pierogi").removeClass('fade-down').addClass('food2').css('width', $(".ten .pierogi .label span").text()*2);
	      $(".ten .meaty").removeClass('fade-down').addClass('food3').css('width', $(".ten .meaty .label span").text()*2);	
      } else {
		  $(".ten .veg").toggleClass('fade-down food1').css('width', '0px');
	      $(".ten .pierogi").toggleClass('fade-down food2').css('width', '0px');
	      $(".ten .meaty").toggleClass('fade-down food3').css('width', '0px');
		 }
    });
    
    $(".eleven .food").bind('inview', function(event, visible, visiblePartX, visiblePartY) {
      if (visible) {	
	      $(".eleven .veg").removeClass('fade-down').addClass('food1').css('width', $(".eleven .veg .label span").text()*2); 
	      $(".eleven .pierogi").removeClass('fade-down').addClass('food2').css('width', $(".eleven .pierogi .label span").text()*2);
	      $(".eleven .meaty").removeClass('fade-down').addClass('food3').css('width', $(".eleven .meaty .label span").text()*2);
      } else {
		  $(".eleven .veg").toggleClass('fade-down food1').css('width', '0px');
	      $(".eleven .pierogi").toggleClass('fade-down food2').css('width', '0px');
	      $(".eleven .meaty").toggleClass('fade-down food3').css('width', '0px');
      }
    });

	$(".twelve .food").bind('inview', function(event, visible, visiblePartX, visiblePartY) {
      if (visible) {
		  $(".twelve .veg").removeClass('fade-down').addClass('food1').css('width', $(".twelve .veg .label span").text()*1.5); 
	      $(".twelve .pierogi").removeClass('fade-down').addClass('food2').css('width', $(".twelve .pierogi .label span").text()*1.5);
	      $(".twelve .meaty").removeClass('fade-down').addClass('food3').css('width', $(".twelve .meaty .label span").text()*1.5);
      } else {
		  $(".twelve .veg").toggleClass('fade-down food1').css('width', '0px');
	      $(".twelve .pierogi").toggleClass('fade-down food2').css('width', '0px');
	      $(".twelve .meaty").toggleClass('fade-down food3').css('width', '0px');
      }
    });
       
      
    
    

