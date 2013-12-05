/*************************** 注册基本控制器*********************/
! function() {
	['text','html'].forEach(function(d){
		babe.addController(d, {
			// 数据发生变化
			datachange: function(dom,k, v) {
				dom.innerHTML = v;
			},
			//ui发生变化
			uichange: function(dom) {
				return dom.innerHTML;
			}
		});
	});
	babe.addController('value', {
		// 数据发生变化
		datachange: function(dom,k, v) {
			dom.value = v;
		},
		//ui发生变化
		uichange: function(dom) {
			return dom.value;
		}
	});
	// bb-bind='attr:name=key'
	babe.addController('attr', {
		// 解析控制器，将click=fnname解析出实际的key来
		resolve:function(c){
			var cs = c.split('=');
			if (cs.length==2) {
				return cs[1];
			}
			return false;
		},
		// 数据发生变化
		datachange: function(dom,c, val) {
			var ets = c.split('=');
			if (!ets || ets.length<2) {
				return;
			}
			if (val) {
				dom.setAttribute(ets[0], val);
			}
		},
		//ui发生变化
		uichange: function(dom) {}
	});
}(babe);