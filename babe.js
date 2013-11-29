/**
 * babe v1.0 build by awen @2013-11-25
 * descr : 一个简单的（mv）viewmodle框架,babe is for my babe;
 *	1 消息路径：scope/key
 *	2 绑定属性统一为：bb-bind 通过值来判断例如：bb-bind=click:callback  //分号前后位控制器，和绑定值
 *		如果要绑定多个绑定器，请用|分开，例如：bb-bind=list:colors|change:callback
 *		bb-with 代表当前绑定的键值是一个对象，更新其内部的作用域为当前键值
 *	3 多次绑定数据时，传入的id请不要互相包含，防止作用域混乱
 *	4 如果绑定数据后，用户想手动改变数据以刷新ui，直接修改绑定的json对象就行了.
 *		但值得注意的是，该操作如果是列表级别的绑定，那么列表会重绘，所以事件绑定最好是代理级别的，防止内存泄露.
 *		另外改变数据请用 = 号，其他方法的改变无法触发，例如[].push();
 *	5 用户可以通过addController接口定义自己的绑定器，使之有了无限的可能。传入的绑定器方法的上下文是当前数据对象
 *  6 目前变化双工监控只支持1级,另外方法是不被监控的，因为没有考虑到绑定的方法还要改变的问题
 *  7 用户可以自定义数据的get和set，get按照模板来写，自动绑定关联，但是set的解析需要用户手动改变关联，因为内容格式变化太复杂，按照原来的模板无法正确解析
 */
! function(O) {
	// 一些常量
	var root = document,
		$ = function(id) {
			return document.getElementById(id);
		},
		oproto = Object.prototype,
		aproto = Array.prototype,
		nodetypes = ['INPUT', 'SELECT', 'TEXTAREA'], //监控变化的node类型列表
		bscopekey = 'bb-scope', //dom上存放id的属性
		bwithkey = 'bb-with', //dom上绑定对象改变数据上下文的属性
		bpathkey = 'bb-path', //dom上标示键值完整路径的属性
		// bbidkey = 'bb-id',//dom上标示该绑定dom对应babe的为id，暂时注销，目前使用的path
		// bbidx = 0,	//计数器
		cbb = 'bb-bind', //统一绑定控制器属性
		vmscope = '__id', //vm对象上存放id的key
		datas = {}, //数据原始对象列表,只复制了第一层，以后是引用
		vms = {}, //vm对象列表
		vmskeys = {}, //已经监控了的vmkey，防止defineProperty重复定义
		linkrevs = {}, //用户自定义的关联列表，用户可以再get方法中用的{{key}}关联
		linkkeys = {}, //用户自定义的关联列表，用户可以再get方法中用的{{key}}关联,存的时候key，val与上面相反
		linksTpl = {}, //用户自定义的get方法的模板保存
		// linksTplrev = {}, //用户自定义的get方法的模板反向解析

		//控制器以及其处理方法{data-click,function(dom,key){}},
		//注意函数必须返回 {key:'',value:''}格式
		controls = {};

	/*****************viewmodule******************/
	// 空函数
	function noop() {}
	// clone json对象
	function clone(json) {
		return JSON.parse(JSON.stringify(json));
	}
	// 日志打印
	function logs() {
		console.log.apply(console, aproto.slice.call(arguments));
	}
	// 获取当前dom所属解析作用域id,因为初始化的时候path已经建立了，所以可以用path来获取
	function getScope(dom) {
		var path = getPathByDom(dom),
			paths = splitPath(path);
		return paths[0];
	}
	// 解析访问路径，（订阅路径）
	function splitPath(path) {
		return path.split('/');
	}
	//new 根据dom来获取path, 支持with 集成版本，path是发布消息路径，这个path不包含bb-bind中的key
	function getPathByDom(dom) {
		var path = '';
		// if (dom.hasAttribute(bpathkey)) {
		// path = dom.getAttribute(bpathkey);
		if (bpathkey in dom) {
			path = dom[bpathkey];
		} else {
			var scopeid = null,
				withs = [],
				p = dom;
			while ((p = p.parentNode) && !scopeid) {
				if (p.hasAttribute(bwithkey)) {
					withs.push(p.getAttribute(bwithkey));
				}
				scopeid = p.getAttribute(bscopekey);
			}
			withs.unshift(scopeid);
			path = withs.join('/');
			// dom.setAttribute(bpathkey,path);
			dom[bpathkey] = path;
		}
		return path;
	}
	// new 根据path获取实际数据,这个path包含bb-bind中的key
	function getDataByPath(path) {
		var paths = splitPath(path),
			vm = vms[paths[0]];
		if (vm) {
			for (var i = 1, l = paths.length; i < l; i++) {
				vm = vm[paths[i]];
			}
		}
		return vm;
	}
	// 解析绑定器值，可能绑定是多个,reversion是否反转control和key
	function resolveControl(key, reversion) {
		var cs = key.split('|'),
			ret = {};
		for (var i = 0, l = cs.length; i < l; i++) {
			var c = cs[i].split(':');
			if (reversion) {
				ret[c[1]] = c[0];
			} else {
				ret[c[0]] = c[1];
			}
		}
		return ret;
	}
	// 根据path设置dom
	function updateUIByPath(path, value) {
		var paths = splitPath(path),
			id = paths[0],
			key = paths[1],
			scope = $(id),
			vm = vms[id],
			sel = '[' + cbb + '*=":' + key + '"]',
			doms = scope.querySelectorAll(sel);
		if (doms.length > 0) {
			aproto.forEach.call(doms, function(d) {
				var cs = resolveControl(d.getAttribute(cbb), true);
				// console.log(key,'<<<<<<<<<<<<<<<<<<<<<<<<<');
				if (key in cs) {
					var c = cs[key],
						control = controls[c];
					// logs('><><><>',d,control)
					if (typeof control.datachange == 'function') {
						control.datachange.call(vm, d, key, value);
					} else {
						logs(c + '>>>>%c控制器注册方法错误，没有遵循{updatedata：fn,datachange:fn}格式', 'color:red');
					}
				}

			});
		}
	}
	// 统一消息处理方法 v代表value，stype代表出发类型，data,dom
	function smessage(path, stype, v) {
		// logs('message>>>>>>>>', arguments);
		// v为空的话自动获取数据
		if (typeof v == 'undefined') {
			v = getDataByPath(path);
		}
		if (stype == 'datachange') {
			updateUIByPath(path, v);
			// logs('message:数据发生改变>>>>', arguments);
		} else if (stype == 'domchange') {
			var paths = splitPath(path),
				len = paths.length,
				vm;
			if (len > 1) {
				vm = vms[paths[0]];
				for (var i = 1; i < len - 1; i++) {
					vm = vm[paths[i]];
				}
				vm[paths[len - 1]] = v;
			}
			// updateUIByPath(path, v);
			// console.log(paths,data,v);

			// logs('message:dom发生改变>>>>', arguments);
		}
	}
	// 根据vm数据对象生成vm监控对象，监控数据变化
	// id 上下文id，key要监控的键值
	// modify by awen @ 2013-11-28 14:09:50 增加用户自定义get和set支持
	function monitorVM(id, path, key) {
		var data = datas[id],
			vm = vms[id],
			val = vm[key],
			isobj = val && (aproto.toString.call(val) == '[object Object]'),
			getter, setter;
		if (!(id in vmskeys)) {
			vmskeys[id] = {};
		}
		//目前数据只监控到1级
		// 确认key存在，并且没有在vm中定义过监听
		if (vm.hasOwnProperty(key) && !(key in vmskeys[id])) {
			// 用户自定义的get，set 那么需要重新
			if (isobj && ('get' in val)) {
				getter = function() {
					var tpl, lkeys, linkvals = [];
					if (!(key in linksTpl)) {
						// 保存模板
						tpl = val['get']();
						// 正反存两份
						lkeys = tpl.match(/\w+(?=\}\})/g); //获取所有的关联键数组
						for (var i = 0, l = lkeys.length; i < l; i++) {
							var lkey = lkeys[i];
							if (!(lkey in linkrevs)) {
								linkrevs[lkey] = [];
							}
							linkrevs[lkey].push(key);
						}
						linkkeys[key] = lkeys;
						// 解析关联
						tpl = tpl.replace(/[\r\t\n]/g, " ").replace(/'/g, "\'")
							.replace(/"/g, "\"")
							.replace(/\{\{/g, "\'+(")
							.replace(/\}\}/g, ")+\'");
						linksTpl[key] = new Function(lkeys, 'return \'' + tpl + '\';'); //直接存了模板转换函数

						// 反向解析方法，根据字符串提取关联key的value
						// 限制比较多，内容格式变化太复杂，交给用户的set自己解析。
						// tpl = tpl.replace(/'\+\((\w*)\)\+'/g,'(.*)');
						// linksTplrev[key] =  new Function('value', 'return value.match(/' + tpl + '/g);');
					} else {
						lkeys = linkkeys[key] || [];
					}
					for (var i = 0, l = lkeys.length; i < l; i++) {
						linkvals.push(data[lkeys[i]]); //这里应该用vm还是data？？？
					}
					// console.log(lkeys,linksTpl[key],linkvals);
					return data[key] = linksTpl[key].apply(null, linkvals);
				};
			} else {
				getter = function() {
					return data[key];
				};
			}
			var usersetfn = isobj && ('set' in val) ? val['set'] : null;
			setter = function(v) {
				var oldv = data[key];
				// logs(oldv, v);
				if (oldv != v) {
					data[key] = v;
					usersetfn && usersetfn(v);
					// 改变数据发布消息,第三个参数表示是js数据发生变化
					smessage(path + '/' + key, 'datachange', v);
					// 处理关联当前key的key，改变关联的自定义set和get的key值
					if (key in linkrevs) {
						var lkeys = linkrevs[key];
						for (var i = 0, l = lkeys.length; i < l; i++) {
							// 因为自定义的get中只允许关联第一级的key，所以，path要重组保险
							smessage(id + '/' + lkeys[i], 'datachange');
						}
					}
					// 处理被当前key关联的key，绕吧？自定义get和set的key改变的时候，触发关联的key改变
					// 限制比较多，内容格式变化太复杂，交给用户的set自己解析。
					// if (key in linkkeys) {
					//	var lkeys = linkkeys[key],lvals = linksTplrev[key](v);
					//		console.log(linksTplrev[key],lvals,v);

					//	for (var i = 0, l = lkeys.length; i < l; i++) {
					//		var lkey = lkeys[i];
					//		// vm[lkeys[i]] = //咋么解析当前值改变
					//	}
					// }
				}
			};
			// console.log(key,path,vm,data);
			Object.defineProperty(vm, key, {
				enumerable: true,
				get: getter,
				set: setter
			});
			vmskeys[id][key] = 1;
		}
	}
	// 统一event触发函数
	function trigger(e) {
		// logs(e.type, e.target);
		var dom = this;
		// 检查监控对象是否符合要求
		if (nodetypes.indexOf(dom.nodeName) < 0) {
			return;
		}
		if (dom.hasAttribute(cbb)) {
			var cs = resolveControl(dom.getAttribute(cbb));
			// 循环所有绑定器
			for (var c in cs) {
				var control = controls[c];
				// 不要将control.updatedata赋值成局部变量，否则方法中的this会改变
				if (typeof control.uichange == 'function') {
					var val = control.uichange(dom),
						path = getPathByDom(dom);
					// logs('<<<<<<<<解析控制器：', path + '/' + cs[c]);
					//有的uichange并不返回数据，而只是一些处理，比如select
					if (val) {
						smessage(path + '/' + cs[c], 'domchange', val);
					}
				} else {
					logs(c + '>>>>%c控制器注册方法错误，没有遵循{uichange：fn,datachange:fn}格式', 'color:red');
				}
			}
		}
	}
	// 监控dom变化
	// modify by awe n@2013-11-29 17:48:09 取消代理观察模式，因为优先级较低，经常影响实际数据
	function monitorDOM(dom) {
		// ['click', 'keyup', 'animationend', 'touchup'].forEach(function(k) {
		['change', 'keyup'].forEach(function(k) {
			dom.addEventListener(k, trigger, false);
		});
	}
	// 扫描dom,刷新数据，生成内部标签标示（例如:bb-with），生成监控
	function scan(id) {
		var scope = $(id),
			sel = '[' + cbb + ']',
			data = datas[id],
			doms = scope.querySelectorAll(sel);
		if (doms.length > 0) {
			aproto.forEach.call(doms, function(d) {
				var cs = resolveControl(d.getAttribute(cbb)),
					path = getPathByDom(d),
					vm = vms[id];
				// 事件绑定
				if (nodetypes.indexOf(d.nodeName) >= 0) {
					monitorDOM(d);
				}
				for (var c in cs) {
					var key = cs[c],
						value,
						control = controls[c];
					if (control) {
						//监控相应对象
						monitorVM(id, path, key);
						// value要在monitorVM处理之后在赋值，因为monitorVM可能会改变数据结构（用户自定义get，set）
						value = getDataByPath(path + '/' + key);
						// logs('><><><>',d,control,value,path+'/'+key)
						if (typeof control.datachange == 'function') {
							control.datachange.call(vm, d, key, value);
						} else {
							logs(c + '>>>>%c控制器注册方法错误，没有遵循{updatedata：fn,datachange:fn}格式', 'color:red');
						}
					}
				}
			});
		}
	}
	// 对外提供命名空间
	O.babe = {
		// 定义一个vm并解析相应的dom，完成双向绑定,fn会获取到vm虚拟对象，并对其填充值
		bind: function(id, json) {

			// 获取用户设置过的vm
			var dom = $(id);
			// 更新dom上的scope,方便其内数据获取当前解析上下文id（通过 getScope获取）
			dom.setAttribute(bscopekey, id);
			// 保存数据备份
			datas[id] = clone(json);
			// 标记bb专用id到源对象上，备用
			json[vmscope] = id;
			// 更新原来的json对象将作为observer监控对象,
			vms[id] = json;
			// 扫描绑定
			scan(id);
		},
		/**
		 * 扩展或者重写控制器
		 * controlobj = {
		 *	uichange : function(dom){  return value}
		 *	datachange : function(dom,value){}
		 * }
		 */
		addController: function(c, controlobj) {
			controls[c] = controlobj;
		},
		// 获取当前的dom的所在解析作用域id，用于扩展控制器，一个dom作为参数
		getScope: getScope,
		getPathByDom: getPathByDom,
	};
}(this);