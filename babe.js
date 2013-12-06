/**
 * babe v1.1 build by awen @2013-11-25
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
 *v1.1 修改
 *	1 clone对象以前使用JSON来生成，优点高效，简单，但是不能格式化function，改为递归
 *	2 将scopeid绑定到每个内部需要监控的dom上，这样获取的时候不再需要遍历
 *	3 将数据的实际pathkey绑定到dom上，方便多级定位
 *	4 vmskeys 使用path作为key，而不是只监控第一级key
 *	5 开始实现多级数据双工监控
 *	6 用户自定义的get中支持直接返回的是数据对象
 *	7 babe.bind方法将返回实时监控对象，用户可以用变量接收（跟第一次该id上绑定的数据指向的是同一个监控对象）
 *	8 用户bind一个数据之后，可以再bind第二个数据，但是第二个数据将不再被监听，而是做为比对数据而已
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
		listenInTime = false, //是否监控keyup
		bscopekey = 'bb-scope', //dom上存放id的属性
		bwithkey = 'bb-with', //dom上绑定对象改变数据上下文的属性
		blinkkey = 'bb-link', //dom上绑定对象关联key，可以关联多个用|割开
		bpathkey = 'bb-path', //dom上标示键值完整路径的属性
		bpathsign = '.', //path之间的连接符，
		bckey = '|', //多绑定器是之间的间隔符
		// bbidkey = 'bb-id',//dom上标示该绑定dom对应babe的为id，暂时注销，目前使用的path
		// bbidx = 0,	//计数器
		cbb = 'bb-bind', //统一绑定控制器属性
		vmscope = '__id', //vm对象上存放id的key
		datas = {}, //数据原始对象列表,只复制了第一层，以后是引用
		vms = {}, //vm对象列表
		vmskeys = {}, //已经监控了的vmkey，防止defineProperty重复定义

		linkkeys = {}, //用户自定义的关联列表，用户可以再get方法中用的{{key}}关联,存的时候key，val与上面相反
		linksTpl = {}, //用户自定义的get方法的模板保存
		// linksTplrev = {}, //用户自定义的get方法的模板反向解析

		//控制器以及其处理方法{data-click,function(dom,key){}},
		//注意函数必须返回 {key:'',value:''}格式
		controls = {};

	/*****************viewmodule******************/
	// clone 对象
	function clone(obj) {
		// JSON这种方式简单而且高效，但是不能格式化function，虽然可以硬性要求用户使用function name，但是不喜
		// v1.0
		// return JSON.parse(JSON.stringify(json));
		// v1.1
		if (typeof obj != 'object' || obj == null) {
			return obj;
		}
		var newObj = Array.isArray(obj) ? [] : {};
		for (var i in obj) {
			newObj[i] = clone(obj[i]);
		}
		return newObj;
	}
	// 获取当前dom所属解析作用域id,因为初始化的时候path已经建立了，所以可以用path来获取
	function getScope(dom) {
		return dom.getAttribute[bscopekey];
	}
	// 解析访问路径，（订阅路径）
	// v1.1  如果path为空，返回空数组
	function splitPath(path) {
		return path ? path.split(bpathsign) : [];
	}
	//new 根据dom来获取path, 支持with 集成版本，path是发布消息路径，这个path不包含bb-bind中的key
	function getPathByDom(dom) {
		var path = '';
		if (dom.hasAttribute(bpathkey)) {
			path = dom.getAttribute(bpathkey);
			// if (bpathkey in dom) {
			// path = dom[bpathkey];
		} else {
			var scopeid = dom.getAttribute(bscopekey),
				withs = [],
				p = dom;
			while ((p = p.parentNode) && p.id != scopeid) {
				if (p.hasAttribute(bwithkey)) {
					withs.push(p.getAttribute(bwithkey));
				}
			}
			withs.unshift(scopeid);
			path = withs.join(bpathsign);
			dom.setAttribute(bpathkey, path);
			// dom[bpathkey] = path;
		}
		return path;
	}
	// new 根据path获取实际数据
	function getDataByPath(path, isvm) {
		var paths = splitPath(path),
			id = paths[0],
			data = isvm ? vms[id] : datas[id];
		if (data) {
			for (var i = 1, l = paths.length; i < l; i++) {
				data = data[paths[i]];
			}
		}
		// console.log(data,paths);
		return data;
	}
	// 解析绑定器值，可能绑定是多个,reversion是否反转control和key
	function resolveControl(key, reversion) {
		var cs = key.split(bckey),
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
	// 根据path和key设置dom
	function updateUIByPath(path, key, value) {
		var paths = splitPath(path),
			id = paths[0],
			scope = $(id),
			vm = vms[id],
			// v1.1 检索时增加bb-path判断，防止不同path同名key数据污染
			sel = '[' + cbb + '*=":' + key + '"][' + bpathkey + '="' + path + '"]',
			doms = scope.querySelectorAll(sel);
		// console.log(path,key,value,sel,doms);
		if (doms.length > 0) {
			aproto.forEach.call(doms, function(d) {
				var cs = resolveControl(d.getAttribute(cbb), true);
				// console.log(key,'<<<<<<<<<<<<<<<<<<<<<<<<<');
				if (key in cs) {
					var c = cs[key],
						control = controls[c];
					// console.log('><><><>',d,control,value)
					if (typeof control.datachange == 'function') {
						control.datachange.call(vm, d, key, value);
					} else {
						console.log(c + '>>>>%c控制器注册方法错误，没有遵循{updatedata：fn,datachange:fn}格式', 'color:red');
					}
				}

			});
		}
	}
	// 统一消息处理方法 v代表value，stype代表出发类型，data,dom
	function smessage(path, key, stype, v) {
		// console.log('message>>>>>>>>', arguments);
		// v为空的话自动获取数据
		if (typeof v == 'undefined') {
			v = getDataByPath(path + bpathsign + key, true);
		}
		if (stype == 'datachange') {
			updateUIByPath(path, key, v);
			// console.log('message:数据发生改变>>>>', arguments);
		} else if (stype == 'domchange') {
			//因为使用的是vm，所以会再次触发datachange，从而刷新关联的dom
			var paths = splitPath(path),
				len = paths.length,
				vm;
			if (len > 0) {
				vm = vms[paths[0]];
				for (var i = 1; i < len; i++) {
					vm = vm[paths[i]];
				}
				vm[key] = v;
			}
		}
	}
	// // v1.1 中抽出vmkey的拼接方式
	function buildpath(id, path, key) {
		// console.log(arguments);
		var tmp = path ? bpathsign + path : '';
		if (key) {
			tmp += bpathsign + key;
		}
		return id + tmp;
	}
	// 增加键值和键值之间的关联,即当patha变化时也要通知pathb刷新数据,path是带key和id的完整路径
	function addlink(patha, pathb) {
		if (!(patha in linkkeys)) {
			linkkeys[patha] = [];
			//v1.2如果还没有监听，同样也需要监听一下，因为link绑定器绑定的数据如果没有通过bind绑定过，也是不监听的
			// 查分patha
			var paths = patha.split(bpathsign),
				id = paths[0],
				key = paths.pop();

			paths = paths.join(bpathsign);
			monitorVM(id, paths, key);
		}
		// v1.1 防止多次绑定
		if (linkkeys[patha].indexOf(pathb) < 0) {
			linkkeys[patha].push(pathb);
		}
	}
	// 根据vm数据对象生成vm监控对象，监控数据变化
	// id 上下文id，key要监控的键值
	// modify by awen @ 2013-11-28 14:09:50 增加用户自定义get和set支持
	// v1.1 中vm要多层，vmskeys中的key将变成id/path/key 这样才能监控多级
	function monitorVM(id, path, key, links) {
		var pathkey = path + bpathsign + key,
			obj = getDataByPath(path), //v1.1 取得实际key对应的数据对象
			vm = getDataByPath(path, true), //v1.1 取得实际key对应的vm对象
			val = obj[key],
			isobj = val && (aproto.toString.call(val) == '[object Object]'),
			getter, setter;
		if (!(id in vmskeys)) {
			vmskeys[id] = [];
		}
		// 确认key存在，并且没有在vmskeys中定义过监听
		if (obj.hasOwnProperty(key) && (vmskeys[id].indexOf(pathkey) == -1)) {
			// 用户自定义的get，set
			if (isobj && ('get' in val)) {
				getter = function() {
					// return val['get'].call(obj);
					var lkeys, trueval, linkvals = {},
						tpl = val['get']();
					// 保存模板
					// v1.1将模板中的this更换为实际的scopeid，并且只保存反向关联。正向关联应该由用户实现
					if (!tpl) {
						return;
					}
					// v1.2tpl可能返回的是数据(直接返回)，也可能返回的是模板
					if (typeof tpl == 'object') {
						return tpl;
					} else {
						if (!(key in linksTpl)) {
							linksTpl[pathkey] = tpl.replace(/\{\{this/g, '{{' + id);

							lkeys = linksTpl[pathkey].match(/[.\w]+(?=\}\})/g); //获取所有的关联键数组
							// console.log(lkeys,pathkey);
							for (var i = 0, l = lkeys.length; i < l; i++) {
								var lkey = lkeys[i];
								addlink(lkey, pathkey);
							}
						} else {
							lkeys = linkkeys[pathkey] || [];
						}
						for (var i = 0, l = lkeys.length; i < l; i++) {
							var lkey = lkeys[i];
							lval = getDataByPath(lkey);
							// console.log(lkey,lval);
							linkvals[lkey] = lval;
						}
						// 替换数据
						trueval = linksTpl[pathkey].replace(/\{\{([^\}\{]+)\}\}/g, function($1, $2) {
							return linkvals[$2];
						});
						// console.log(lkeys, linksTpl[pathkey], linkvals);
						return obj[key] = trueval;
					}
				};
			} else {
				getter = function() {
					return obj[key];
				};
			}
			var usersetfn = isobj && ('set' in val) ? val['set'] : null;
			setter = function(v) {
				var oldv = obj[key];
				// console.log('>>>>>>>>>>>>>>setter:'+key,oldv, v);
				if (oldv != v) {
					obj[key] = v;
					usersetfn && usersetfn(v);
					// 改变数据发布消息,第三个参数表示是js数据发生变化
					smessage(path, key, 'datachange', v);
					// 处理关联当前key的key，改变关联的自定义set和get的key值
					if (pathkey in linkkeys) {
						var lkeys = linkkeys[pathkey];
						for (var i = 0, l = lkeys.length; i < l; i++) {
							var lpath = lkeys[i],
								lpaths = splitPath(lpath);
							lkey = lpaths.pop(),
							lval = getDataByPath(lpath,true), // 防止关联的带有用户自定义的get，所以这里最好是自己获取val
							lpath = lpaths.join(bpathsign);
							// console.log("links~~~~~~~~~~~~~",lpath,lkey,lval);
							smessage(lpath, lkey, 'datachange',lval);
						}
					}
					// 处理被当前key关联的key，绕吧？自定义get和set的key改变的时候，触发关联的key改变
					// 限制比较多，内容格式变化太复杂，交给用户的set自己解析。
					// if (key in linkkeys) {
					// }
				}
			};
			// console.log(key,path,obj,data);
			Object.defineProperty(vm, key, {
				// enumerable: true,
				get: getter,
				set: setter
			});
			vmskeys[id].push(pathkey);
		}
	}
	// 统一event触发函数
	function trigger(e) {
		// console.log(e.type, e.target);
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
					// console.log('<<<<<<<<解析控制器：', path + bpathsign + cs[c]);
					//有的uichange并不返回数据，而只是一些处理，比如select
					if (val) {
						smessage(path, cs[c], 'domchange', val); //??????????????????????????????????????????????????????要改
					}
				} else {
					console.log(c + '>>>>%c控制器注册方法错误，没有遵循{uichange：fn,datachange:fn}格式', 'color:red');
				}
			}
		}
	}
	// 解析dom上的link绑定器绑定,返回不带id的完整的路径
	function resolveLink(d) {
		var links = [];
		if (d.hasAttribute(blinkkey)) {
			var slink = d.getAttribute(blinkkey);
			if (slink) {
				links = slink.split(bckey);
			}
		}
		return links;
	}
	// 监控dom变化
	// modify by awen@2013-11-29 17:48:09 取消代理观察模式，因为优先级较低，经常影响实际数据
	function monitorDOM(dom) {
		// ['click', 'keyup', 'animationend', 'touchup'].forEach(function(k) {
		if (listenInTime) {
			dom.addEventListener('keyup', trigger, false);
		}
		dom.addEventListener('change', trigger, false);
	}
	// 扫描dom,刷新数据，生成内部标签标示（例如:bb-with），生成监控
	function scan(id) {
		var scope = $(id),
			sel = '[' + cbb + ']',
			data = datas[id],
			doms = scope.querySelectorAll(sel);
		if (doms.length > 0) {
			aproto.forEach.call(doms, function(d) {
				var cs, path, vm, links;
				// v1.1 为每个dom增加scopeid属性，这样就不用去遍历了,path中包含了id
				d.setAttribute(bscopekey, id);
				path = getPathByDom(d);
				// v1.2 增加key关联绑定器判断
				links = resolveLink(d);

				cs = resolveControl(d.getAttribute(cbb));
				vm = vms[id];
				// console.log(path,cs);
				// 事件绑定
				if (nodetypes.indexOf(d.nodeName) >= 0) {
					monitorDOM(d);
				}
				for (var c in cs) {
					var key = cs[c],
						value,
						control = controls[c];
					if (control) {
						// v1.1 获取实际的key
						var realkey = control.resolve ? control.resolve(key) : '',
							pathkey;
						realkey = realkey ? realkey : key;
						//监控相应对象
						monitorVM(id, path, realkey);

						// v1.2 添加links，这里过滤掉了event，防止事件重复绑定，等event控制器解决重复绑定后，早打开限制
						if (c != 'event') {
							pathkey = id + bpathsign + realkey;
							for (var i = 0, l = links.length; i < l; i++) {
								// console.log(id+bpathsign+links[i],pathkey);
								addlink(id + bpathsign + links[i], pathkey);
							}
						}
						// console.log(id, path, key, realkey);
						// value要在monitorVM处理之后在赋值，因为monitorVM可能会改变数据结构（用户自定义get，set）
						value = getDataByPath(path + bpathsign + realkey, true);
						// console.log('><><><>',d,control,value,path+bpathsign+key)
						if (typeof control.datachange == 'function') {
							control.datachange.call(vm, d, key, value);
						} else {
							console.log(c + '>>>>%c控制器注册方法错误，没有遵循{updatedata：fn,datachange:fn}格式', 'color:red');
						}
					}
				}
			});
		}
	}
	// 对外提供命名空间
	O.babe = {
		// 克隆数据
		clone: clone,
		// 是否开启输入时实时监控刷新（keyup）
		// 注意该方法是运行时的，不是全局监控的，默认是false
		listenintime: function(intime) {
			listenInTime = intime;
		},
		// 定义一个vm并解析相应的dom，完成双向绑定,fn会获取到vm虚拟对象，并对其填充值
		bind: function(id, json) {
			// 判断该id是否被绑定过数据,再次绑定数据的话只刷新上次绑定的键值
			var vm;
			if (id in vms) {
				var vmkeys = vmskeys[id];
				vm = vms[id];
				// console.log(vmkeys);
				// 循环判断数据改变
				for (var i = 0, l = vmkeys.length; i < l; i++) {
					var paths = splitPath(vmkeys[i]),
						_key = paths.pop(),
						_vm = vm,
						_json = json;
					for (var j = 1, n = paths.length; j < n; j++) {
						var path = paths[j];
						_vm = _vm[path];
						_json = _json[path];
						// 增加一步纠错，因为后期覆盖绑定的数据中不见得所有的值都有
						if (_json == undefined) {break;}
					}
					// 判断数据是否变了
					if ((_key in _json) && (_vm[_key] != _json[_key])) {
						// console.log(_vm[_key],_json[_key]);
						_vm[_key] = _json[_key];
					}
				}
			} else {
				var dom = $(id);
				// 保存数据备份，所以数据时可以覆盖的
				datas[id] = clone(json);
				// 标记bb专用id到源对象上，备用
				json[vmscope] = id;
				// 更新原来的json对象将作为observer监控对象,
				vm = vms[id] = json;
				// 扫描绑定
				scan(id);
			}
			return vm;

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
		// 获取dom上绑定的数据的path
		getPathByDom: getPathByDom,
		// 根据path获取数据
		getDataByPath: getDataByPath
	};
}(this);