import './index.d'
import { breakpoints } from './sp2k13moderneconstants'

class CommonClass
{
	$body: JQuery;
	$master: JQuery;
	$page: JQuery;
	$content: JQuery;
	$main: JQuery;

	init()
	{
		this.$body = $('body');
		this.$master = $('#master');
		this.$page = $('#page');
		this.$content = $('#content');
		this.$main = $('#main');

		this.initPageStates();
		this.formStyles();
		this.initGotoTop();
		this.initExternalLinks();
	}

	initPageStates()
	{
		this.$body.on('loading.start', e =>
		{
			this.$body.addClass('loading');
		});

		this.$body.on('loading.end', e =>
		{
			this.$body.removeClass('loading');
		});
	}

	formStyles()
	{
		let containers = $('.checkbox, .radio');
		let inputs = containers.find('input');

		let customControl = $('<span />').addClass('custom-form-control');
		inputs.after(customControl);
	}

	initGotoTop()
	{
		let $btn: JQuery = $('#btn-goto-top');

		$btn.on('click', e => {
			e.preventDefault();

			let block: JQuery = (window.matchMedia(`(min-width:${breakpoints.md})`).matches) ? this.$main : this.$page;

			block.scrollTo(0, {
				duration: 400,
				interrupt: true
			});
		});
	}

	initExternalLinks()
	{
		this.$master.on('click', 'a[target="_blank"]', e => {
			return confirm(window.jsTexts.leaveWebsiteConfirm)
		});
	}
}

export default new CommonClass()