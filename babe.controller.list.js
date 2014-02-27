// 注册新的控制器  list
!function(babe){
	var tpls = [];
	babe.addController('list', {
		uichange: function(dom) {
			// 需要操作吗？
			// console.log(dom);
		},
		datachange: function(d, k, value) {
			// 保存模板,并第一次绘制
			var idx = 0,
				tpl = '';
			if (!d.hasAttribute('bb-list')) {
				idx = tpls.length;
				tpl = d.innerHTML.replace(/[\r\t\n]/g, " ").replace(/'/g, "\'")
					.replace(/"/g, "\"")
					.replace(/\{\{/g, "\'+(")
					.replace(/\}\}/g, ")+\'");

				tpls[idx] = tpl;
				d.setAttribute('bb-list', idx);
			} else {
				idx = d.getAttribute('bb-list');
				tpl = tpls[idx];
			}
			var html = [],
				$$ = new Function('$index', '$value', 'return \'' + tpl + '\';'),
				isarray = Object.prototype.toString.call(value) == '[object Array]';
			for (var _k in value) {
				_k = isarray ? parseInt(_k) : _k;
				var h = $$(_k, value[_k]);
				html.push($$(_k, value[_k]));
			}
			// logs(html.join(''));
			d.innerHTML = html.join('');
		}
	});
}(babe);
