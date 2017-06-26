在阅读源码过程中的知识点 **简记**

![cover](http://o7ts2uaks.bkt.clouddn.com/Underscore.png)

1. 关于 `void 0`

   > `void` 操作符无论后面表达式是什么都会返回 `undefined`

   [点击链接传送至 MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/void)

   - 由于 `undefined` 在 JavaScript 中并不是保留字，即 `undefined` 有可能被覆盖，作为一个变量名。用 `void` 操作符则可确保获取到 `undefined`
   - 用来填充空的 `href`，确保点击a标签不会发生跳转
   - 用来填充空的 `src`，确保img标签不会发送垃圾请求（还没遇到过这种情况
   - 在操作符后面添加函数或方法，可确保其被执行

2. 说不完的 `call` & `apply` & `bind`

   [点击链接传送至 stackoverflow](http://stackoverflow.com/questions/15455009/javascript-call-apply-vs-bind)

   [点击链接传送至 一篇深入浅出的总结](http://www.cnblogs.com/coco1s/p/4833199.html)

   - apply 、 call 、bind 三者都是用来改变函数的this对象的指向
   - apply 、 call 、bind 三者第一个参数都是this要指向的对象，即想指定的上下文
   - apply 、 call 、bind 三者都可以利用后续参数传参
   - bind 是返回改变上下文后的函数，便于稍后调用；apply 、 call 则是改变上下文后立即执行该函数
   - apply 、 call 接受参数的方式不同，apply 要将参数放入数组里传入，call 要把参数按顺序挨个传入

3. underscore 是如何实现 bind 函数的

   首先需要阅读[You-Dont-Know-JS 中对于关键字 this 的描述](https://github.com/getify/You-Dont-Know-JS/blob/master/this%20&%20object%20prototypes/README.md#you-dont-know-js-this--object-prototypes)

   然后需要回忆一下，通过 `new 操作符`调用构造函数，实际上会经历一下4个步骤：
   > 1. 创建一个新对象
   > 2. 将构造函数的作用域赋给新对象（this 就指向了这个新对象）
   > 3. 执行构造函数中的代码（为这个新对象添加属性）
   > 4. 如果没有显式的返回值，新对象则作为构造器的返回值进行返回。

   这里我们可以发现 **构造器的目的就是要创建一个新对象并对其进行设置，然后将其作为构造器的返回值进行返回。任何干扰这种意图的函数都不适合作为构造器。——《JavaScript Ninja》**

   可以通过 `instanceof 操作符` 来检测是否为对方的实例。

   ```javascript
     // 处理绑定上下文与执行过程
     // 解决如果 bind 所返回函数被作为构造函数 new 的情况
     // new 的话需要判断函数是否有返回值，有返回值且返回值是对象，就返回这个对象，否则要返回构造实例
     // sourceFunc 待绑定函数
     // boundFunc 绑定后函数
     // content 待绑定上下文
     // callingContext 执行上下文
     // 函数执行所需参数
     var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
       // 非 new 调用 _.bind 返回的方法（即 bound）
       // callingContext 不是 boundFunc 的一个实例
       if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
       // new 调用
       // self 为通过 new 生成的一个构造函数实例
       var self = baseCreate(sourceFunc.prototype);
       // 得到返回值
       var result = sourceFunc.apply(self, args);
       if (_.isObject(result)) return result;
       return self;
     };

     // 后来在 ES5 中所支持的 Function.bind
     _.bind = restArgs(function(func, context, args) {
       if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
       var bound = restArgs(function(callArgs) {
         return executeBound(func, bound, context, this, args.concat(callArgs));
       });
       return bound;
     });
   ```
   可以发现，underscore 中对于 `bind` 的实现考虑到了如果 `bind` 所返回函数被作为构造函数 new 的情况，此时应通过具体例子判断最后 return 的是函数执行结果还是一个实例。

4. bind 的一个重要应用: **偏函数**

   偏函数是一种高阶函数，用于“把一个函数的某些参数给固定住（也就是设置默认值），返回一个新的函数，调用这个新函数会更简单”，与柯里化的概念有些相似。

   underscore 通过 `_.partial()` 实现了偏函数的创造器（也是基于内部函数 `executeBound` 来保持上下文一致）。

   ```javascript
   // 一个实例
   var substract = function (a, b) {
       return b - a;
   };

   sub5 = _.partail(substract, 5);

   sub5(20); // => 15

   // 通过使用默认占位符'_'，先赋值b，暂缓对a的赋值
   subFrom20 = _.partail(substract, _, 20);

   subFrom20(5); // => 15
   ```

5. js 中的递归与尾调用

   首先需要阅读 [Understanding recursion in functional JavaScript programming](http://www.integralist.co.uk/posts/js-recursion.html)

   ① 递归存在问题，每次调用都会耗费内存（形成调用栈来储存调用位置和内部变量等信息），开销昂贵，运算规模较大时会出现 `Maxium call stack size exceeded`

   ② 执行尾调用时，程序无需储存调用栈的值，直接在最后一次调用时输出函数运算结果，大大节省内存，ES6已支持尾调用优化（只在严格模式下开启）

6. 循环🙅🏻‍ 迭代🙆🏻
   underscore 对许多方法的封装中都有一个参数，叫 `iteratee迭代函数`

   ```javascript
   _.each = _.forEach = function(obj, iteratee, context) {
      // blabla
   }
   // eg. _.each([1,2,3], function(elem) {return elem*2})
   _.map = _.collect = function(obj, iteratee, context) {
      // blabla
   }
   ```
   
