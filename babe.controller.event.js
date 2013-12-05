// 注册控制器  event
// 使用方法 bb-bind=event:click=fname,  传参bb-bind=event:click=fname(param1,param2)
// v1.0由于绑定器后为事件和绑定值得拼接，所以系统是获取不到键值的，也就是datachange的时候value是获取不到的。v1.1 之后增加了resolve解析方法，得到解决。
// 支持自定义传参
!function(babe){
	// 将控制器分解为{事件，实际绑定key，参数}
	var splitc = function(c){
		var et,k,param=[];
			c = c.split('=');
			if (!c || c.length<2) {
				return;
			}
			// v1.2 解析函数的参数
			et = c[0];
			c = c[1].replace(/\s/g,'').replace(/\)/,''); //去空格并转化成：fname(param1,param2
			c = c.split('(');
			k = c.shift();	//去掉函数名称
			if (c.length>0) {
				param = c[0].split(',');
			}
			return {et:et,k:k,param:param};
	};
	babe.addController('event', {
		// 解析控制器，将click=fnname解析出实际的key来
		resolve:function(c){
			var _c = splitc(c);
			if (_c) {
				return _c['k'];
			}
			return false;
		},
		// 当ui发生变化的时候的处理
		uichange: function(dom) {},
		// 当数据发生变化时候的处理
		// dom,绑定的dom；c绑定的控制器，value实际的绑定值,注意重复绑定的问题
		// v1.1中时间回调除了event还会将自定义的参数传回,
		// v1.2 解决了回调参数叠加的bug
		datachange: function(dom, c,value) {
			// console.log(c,value);
			var _c = splitc(c),
				param = _c['param'];
			if (typeof value == 'function') {
				dom.addEventListener(_c['et'], function(e){
					var _param  = babe.clone(param);
					// console.log(_param);
					_param.unshift(e);
					value.apply(this,_param);
				}, false);
			}
		}
	});
}(babe);
