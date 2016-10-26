在阅读源码过程中的知识点 **简记**

1. 关于 `void 0`

   > `void` 操作符无论后面表达式是什么都会返回 `undefined`

   [点击链接传送至MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/void)

   - 由于 `undefined` 在 JavaScript 中并不是保留字，即 `undefined` 有可能被覆盖，作为一个变量名。用 `void` 操作符则可确保获取到 `undefined`
   - 用来填充空的 `href`，确保点击a标签不会发生跳转
   - 用来填充空的 `src`，确保img标签不会发送垃圾请求（还没遇到过这种情况
   - 在操作符后面添加函数或方法，可确保其被执行
