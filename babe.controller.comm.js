/*************************** 注册基本控制器*********************/
! function() {
	['text','html'].forEach(function(d){
		babe.addController(d, {
			// 数据发生变化
			datachange: function(dom, k, v) {
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
		datachange: function(dom, k, v) {
			dom.value = v;
		},
		//ui发生变化
		uichange: function(dom) {
			return dom.value;
		}
	});
}(babe);