function Compile(el, vm) {
    this.$vm = vm;//保存vm实例对象
    //经过判断获el元素，保存el元素
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);

    if (this.$el) {
        //1，将el中所有的子节点转移到fragment对象中，并保存fragment
        this.$fragment = this.node2Fragment(this.$el);
        //2，编译fragment中所有层次的子节点（通过init（）方法里面调用的是compileElement()方法）
        this.init();
        //3，将编译好的fragment添加到el中显示
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    node2Fragment: function(el) {
        var fragment = document.createDocumentFragment(),
            child;

        // 将原生节点拷贝到fragment
        while (child = el.firstChild) {
            fragment.appendChild(child);
        }

        return fragment;
    },

    init: function() {
        this.compileElement(this.$fragment);
    },
    //编译指定元素/fragment的所有层次子节点（利用递归调用）
    compileElement: function(el) {
        var childNodes = el.childNodes,
            me = this;//this指向编译器
        //遍历所有的子节点
        [].slice.call(childNodes).forEach(function(node) {//某个子节点
            //得到节点的文本内容
            var text = node.textContent;
            //用于匹配大括号表达式的正则表达式
            var reg = /\{\{(.*)\}\}/;
            //如果是一个元素节点
            if (me.isElementNode(node)) {
                //编译元素节点中的指令
                me.compile(node);
                //如果是大括号表达式格式的文本节点（既是文本节点且满足大括号表达式）
            } else if (me.isTextNode(node) && reg.test(text)) {
                //编译大括号表达式
                me.compileText(node, RegExp.$1);
            }
            //如果当前子节点还有子节点
            if (node.childNodes && node.childNodes.length) {
                //递归实现所有层次子节点的编译
                me.compileElement(node);
            }
        });
    },

    compile: function(node) {
        //得到所有的属性节点
        var nodeAttrs = node.attributes,
            me = this;
        //遍历所有属性
        [].slice.call(nodeAttrs).forEach(function(attr) {
            //得到属性名：v-on：click
            var attrName = attr.name;
            //如果是指令属性
            if (me.isDirective(attrName)) {
                //得到属性值，也就是表达式 show
                var exp = attr.value;
                //得到指令名 on：click
                var dir = attrName.substring(2);
                // 如果是事件指令
                if (me.isEventDirective(dir)) {
                    //处理、解析事件指令 传入button ，vm ，show ，on：click
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                //    如果是普通指令
                } else {
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }
                //删除指令属性
                node.removeAttribute(attrName);
            }
        });
    },

    compileText: function(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },

    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

// 包含n个解析指令/大括号表达的函数的工具对象
var compileUtil = {
    //解析v-text/大括号表达式
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },

    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },

    model: function(node, vm, exp) {
        //初始化显示，监视表达式实现更新显示
        this.bind(node, vm, exp, 'model');

        var me = this,
            //得到表达式的值
            val = this._getVMVal(vm, exp);
        //给节点绑定input监听，当input.value噶发省改变时，会自动调用
        node.addEventListener('input', function(e) {
            //得到input的最新值
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }
            //将最新值保存到表达式对应的属性上（会触发setter---更新页面中相应的节点）
            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },

    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },
    // 调用对应的节点更新函数去更新节点
    bind: function(node, vm, exp, dir) {
        //前两句进行初始化显示
        //根据指令名得到对应的节点更新函数
        var updaterFn = updater[dir + 'Updater'];
        //执行更新函数更新节点
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));


        //当表达式相关的属性发生变化就会自动调用function
        new Watcher(vm, exp, function(value, oldValue) {
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        //从指令名中得到事件名：click
        var eventType = dir.split(':')[1],
            //根据表达式从method是中取出对应的事件回调函数
            fn = vm.$options.methods && vm.$options.methods[exp];

        if (eventType && fn) {
            //绑定指定事件名和回调函数（强制绑定this为vm）的dom事件监听
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

    _getVMVal: function(vm, exp) {
        var val = vm._data;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },

    _setVMVal: function(vm, exp, value) {
        var val = vm._data;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        });
    }
};


var updater = {
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');

        var space = className && String(value) ? ' ' : '';

        node.className = className + space + value;
    },

    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};