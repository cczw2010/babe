babe v1.0 build by awen @2013-11-25

一个简单的（mv）viewmodle框架,babe is for my babe;

1 消息路径：scope/key

2 绑定属性统一为：bb-bind 通过值来判断例如：bb-bind=click:callback  //分号前后位控制器，和绑定值

  如果要绑定多个绑定器，请用|分开，例如：bb-bind=list:colors|change:callback
  
  bb-with 代表当前绑定的键值是一个对象，更新其内部的作用域为当前键值
  
3 多次绑定数据时，传入的id请不要互相包含，防止作用域混乱

4 如果绑定数据后，用户想手动改变数据以刷新ui，直接修改绑定的json对象就行了.

  但值得注意的是，该操作如果是列表级别的绑定，那么列表会重绘，所以事件绑定最好是代理级别的，防止内存泄露.
  
  另外改变数据请用 = 号，其他方法的改变无法触发，例如[].push();
  
5 用户可以通过addController接口定义自己的绑定器，使之有了无限的可能。

6 目前变化双工监控只支持1级,另外方法是不被监控的，因为没有考虑到绑定的方法还要改变的问题

 7 用户可以自定义数据的get和set，get按照模板来写，自动绑定关联，但是set的解析需要用户手动改变关联，因为内容格式变化太复杂，按照原来的模板无法正确解析
