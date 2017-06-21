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
   - apply 、 call 、bind 三者第一个参数都是this要指向的对象，即想制定的上下文
   - apply 、 call 、bind 三者都可以利用后续参数传参
   - bind 是返回改变上下文后的函数，便于稍后调用；apply 、 call 则是改变上下文后立即执行该函数
   - apply 、 call 接受参数的方式不同，apply 要将参数放入数组里传入，call 要把参数按顺序挨个传入

3.