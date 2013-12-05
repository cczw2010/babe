// 注册控制器  event
// 使用方法 bb-bind=event:click=fnname,
// 由于绑定器后为事件和绑定值得拼接，所以系统是获取不到键值的，也就是datachange的时候value是获取不到的。
!function(babe){
	babe.addController('event', {
		// 解析控制器，将click=fnname解析出实际的key来
		resolve:function(c){
			var cs = c.split('=');
			if (cs.length==2) {
				return cs[1];
			}
			return false;
		},
		// 当ui发生变化的时候的处理
		uichange: function(dom) {},
		// 当数据发生变化时候的处理
		// dom,绑定的dom；c绑定的控制器，value实际的绑定值
		datachange: function(dom, c,value) {
			// console.log(d,value);
			var ets = c.split('=');
			if (!ets || ets.length<2) {
				return;
			}
			if (value) {
				dom.addEventListener(ets[0], value, false);
			}
		}
	});
}(babe);
