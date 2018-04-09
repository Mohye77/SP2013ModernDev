import * as Constants from './sp2k13moderneconstants';

class CookiesClass {
	$cookiesMsgBlock: JQuery;
	$btnAcceptCookies: JQuery;
	hasCookie: boolean = false;
    cookieName: string = 'sp2k13moderneCookiePolicyAccepted';

	init()
	{
		this.$cookiesMsgBlock = $('#cookies-msg');
		this.$btnAcceptCookies = this.$cookiesMsgBlock.find('.btn');

		this.hasCookie = !!cookie.get(this.cookieName);

		if(!this.hasCookie)
		{
			this.$cookiesMsgBlock.addClass('opened');
		}

		this.$btnAcceptCookies.on('click', e =>
		{
			e.preventDefault();

			this.setCookie();
		})
	}

	setCookie()
	{
		cookie.set(this.cookieName, 'ok', { expires: 365 });
		this.hasCookie = true;
		this.$cookiesMsgBlock.removeClass('opened');
	}
}


export default new CookiesClass()