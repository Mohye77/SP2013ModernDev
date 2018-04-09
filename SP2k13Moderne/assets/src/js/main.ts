import common from './common'
import cookies from './cookies'

(function($){

	$(document).ready( () =>
	{
		common.init(); 
		cookies.init();
	});

})(jQuery);
