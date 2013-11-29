// 注册新的控制器  list
babe.addController('list', {
	uichange: function(dom) {
		// 需要操作吗？
		// logs(dom);
	},
	datachange: function(d, value) {
		// 保存模板,并第一次绘制
		if (!('tpls' in this)) {
			this.tpls = [];
		}
		var idx = 0,
			tpl = '';
		if (!d.hasAttribute('bb-list')) {
			idx = this.tpls.length;
			tpl = d.innerHTML.replace(/[\r\t\n]/g, " ").replace(/'/g, "\'")
				.replace(/"/g, "\"")
				.replace(/\{\{/g, "\'+(")
				.replace(/\}\}/g, ")+\'");

			this.tpls[idx] = tpl;
			d.setAttribute('bb-list', idx);
		} else {
			idx = d.getAttribute('bb-list');
			tpl = this.tpls[idx];
		}
		var html = [],
			$$ = new Function('$index', '$value', 'return \'' + tpl + '\';'),
			isarray = Object.prototype.toString.call(value) == '[object Array]';
		for (var k in value) {
			k = isarray ? parseInt(k) : k;
			var h = $$(k, value[k]);
			html.push($$(k, value[k]));
		}
		// logs(html.join(''));
		d.innerHTML = html.join('');
	}
});