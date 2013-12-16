// 注册新的控制器  list
! function(babe) {
	var tpls = [];
	babe.addController('list', {
		uichange: function(dom) {
			// 需要操作吗？
			// console.log(dom);
		},
		datachange: function(d, k, value) {
			// console.log('list>>>>>>>>',this);
			var idx = 0,
				id = d.id,
				tpl = '';
			// 保存模板,并第一次绘制
			if (!d.hasAttribute('bb-list')) {
				idx = tpls.length;
				tpl = d.innerHTML.replace(/[\r\t\n]/g, " ").replace(/'/g, "\'")
					.replace(/"/g, "\"")
					.replace(/\{\{/g, "\'+(")
					.replace(/\}\}/g, ")+\'");
				tpls[idx] = tpl;
				d.setAttribute('bb-list', idx);
				!d.id && (id = d.id = 'bblist_' + idx);
			} else {
				idx = d.getAttribute('bb-list');
				tpl = tpls[idx];
			}
			var html = [],
				$$ = new Function('$index', '$value', 'return \'' + tpl + '\';'),
				isarray = Object.prototype.toString.call(value) == '[object Array]';
			for (var k in value) {
				k = isarray ? parseInt(k) : k;
				var h = $$(k, value[k]);
				html.push($$(k, value[k]));
			}
			//v1.2 等待babe提供接口,绑定单个dom
			// babe.bind(id,babe.getVmData(this));
			d.innerHTML = html.join('');
		}
	});
}(babe);