function Observer(data) {
    //保存数据对象
    this.data = data;
    //进行数据劫持
    this.walk(data);
}

Observer.prototype = {
    walk: function(data) {
        var me = this;
        //遍历data外层的所有属性
        Object.keys(data).forEach(function(key) {
            //指定的属性进行数据劫持
            me.defineReactive(data , key , data[key])
            //me.convert(key, data[key]);
        });
    },
   /* convert: function(key, val) {
        this.defineReactive(this.data, key, val);
    },*/

    defineReactive: function(data, key, val) {
        var dep = new Dep();//为当前的属性值创建dep对象
        //通过间接递归调用实现对层次属性的劫持
        var childObj = observe(val);
        //给data重新定义指定名称的属性（使用属性描述符）
        Object.defineProperty(data, key, {
            enumerable: true, // 可枚举
            configurable: false, // 不能再define
            //当读取data中当前属性值时调用
            get: function() {
                //如果对应的watcher存在
                if (Dep.target) {
                    //建立dep与watcher之间的关系
                    dep.depend();
                }
                return val;
            },
            //当data中当前属性值发生了改变
            set: function(newVal) {
                if (newVal === val) {
                    return;
                }
                //保存最新的值
                val = newVal;
                // 新的值是object的话，进行监听
                childObj = observe(newVal);
                // 通知订阅者
                dep.notify();
            }
        });
    }
};

function observe(value, vm) {
    if (!value || typeof value !== 'object') {
        return;
    }
    //创建一个监视器
    return new Observer(value);
};


var uid = 0;

function Dep() {
    this.id = uid++;
    this.subs = [];
}

Dep.prototype = {
    addSub: function(sub) {
        this.subs.push(sub);
    },

    depend: function() {
        Dep.target.addDep(this);
    },

    removeSub: function(sub) {
        var index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    },

    notify: function() {
        //遍历所有相关 的watcher，去更新
        this.subs.forEach(function(sub) {
            sub.update();
        });
    }
};

Dep.target = null;