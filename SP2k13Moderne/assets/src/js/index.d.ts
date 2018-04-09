/// <reference path="../../../node_modules/@types/jquery/index.d.ts" />
/// <reference path="../../../node_modules/@types/highcharts/index.d.ts" />
/// <reference path="../../../node_modules/@types/typeahead/index.d.ts" />
/// <reference path="../../../node_modules/@types/bootstrap/index.d.ts" />
/// <reference path="../../../node_modules/@types/jsrender/index.d.ts" />
/// <reference path="../../../node_modules/@types/cookie_js/index.d.ts" />

interface JQuery
{
    scrollTo(target:  number | string | { left?: number; top?: number } | JQuery | HTMLElement, options: any): JQuery;
}

interface Array<T>
{
	includes(o: T): Array<T>;
}