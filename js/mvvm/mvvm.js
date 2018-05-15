/*相当于Vue的构造函数*/
function MVVM(options) {//vm的构造函数MVVM
    this.$options = options;//this指向vm，将配置对象保存在vm中
    var data = this._data = this.$options.data;//保存data数据对象到vm和变量data中
    var me = this;//将vm保存到me

    // 数据代理
    // 实现 vm.xxx -> vm._data.xxx
    Object.keys(data).forEach(function(key) {
        me._proxy(key);//对key属性实现代理
    });

    observe(data, this);
    //创建一个用于编译模板的对象compile （）
    //当没有传入指定管理的区域时，默认为body。当el有值时，将通过选择器获取到指定的dom节点
    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },

    _proxy: function(key) {
        var me = this;//保存vm
        Object.defineProperty(me, key, {//给vm添加key属性（使用属性描述符）
            configurable: false,//不能重新定义
            enumerable: true,//可以枚举
            get: function proxyGetter() {//当读取属性值自动调用
                return me._data[key];//返回的属性值就是的data中对应 的属性值
            },
            //当设置新的属性值时自动调用
            set: function proxySetter(newVal) {//该newVal表示vm.xxx = value设置的新的属性值
                me._data[key] = newVal;//将设置的新的属性值保存vm中的data对应属性上
            }
        });
    }
};