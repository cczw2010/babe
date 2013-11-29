// 注册控制器  change
babe.addController('change', {
	uichange: function(dom) {
		// 需要操作吗？
		alert('change');
	},
	datachange: function(d, value) {
		if ('bind' in this) {
			d.removeEventListener('change', this.bind, false);
		}
		// console.log(d, value);
		d.addEventListener('change', value, false);
		this.bind = value;
	}
});