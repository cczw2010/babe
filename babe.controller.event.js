// 注册控制器  event
// 使用方法 bb-bind=event:click-fnname,
// 由于绑定器后为事件和绑定值得拼接，所以系统是获取不到键值的，也就是datachange的时候value是获取不到的。
// 需要绑定器的实现中自己获取值，当然也可以设计成  bb-bind=event-click:fname  这种类型的绑定器，不过事件类型太多了。。我懒得写，可以自己去实现
!function(babe){
 	babe.addController('event', {
		uichange: function(dom) {},
		datachange: function(d, key,value) {
			// console.log(d,value);
			var ets = key.split('-'),k,v;
			if (!ets || ets.length!=2) {
				return;
			}
			k =ets[0],v = this[ets[1]];
			d.addEventListener(k, v, false);
		}
	});
}(babe);
