//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.
//     中文注释 @https://github.com/MechanicianW

(function() {

  // 基本配置
  // --------------

  // 判断是否存在 self 和 node环境中的全局变量 global，然后赋给 root，作为根对象
  var root = typeof self == 'object' && self.self === self && self ||
            typeof global == 'object' && global.global === global && global ||
            this;

  // 把根对象的 `_` 赋值给 previousUnderscore 缓存起来，这个变量仅在后面的 noConflict 方法中有用到
  var previousUnderscore = root._;

  // 在非 min.js 版本中，把原生 JavaScript 的 Array,Object,Symbol 类型的 prototype 缓存起来
  // 这样可以便于调用这三种类型的原生方法
  // Symbol 是ES6引入的一种新的原始数据类型，表示独一无二的值，它是JavaScript语言的第七种数据类型
  var ArrayProto = Array.prototype, ObjProto = Object.prototype;
  var SymbolProto = typeof Symbol !== 'undefined' ? Symbol.prototype : null;

  // 缓存了 push、slice、toString、hasOwnProperty 四个方法
  var push = ArrayProto.push,
      slice = ArrayProto.slice,
      toString = ObjProto.toString,
      hasOwnProperty = ObjProto.hasOwnProperty;

  // 声明了 ES5 中的三个原生函数
  var nativeIsArray = Array.isArray,
      nativeKeys = Object.keys,
      nativeCreate = Object.create;

  // 创建了一个裸函数 在后面代码中用于扩展 prototype
  var Ctor = function(){};

  // Underscore 所封装的函数都是作为函数对象绑定在 `_` 上
  // `_` 是一个构造函数
  // 支持无 new 调用的构造函数
  // 将传入的参数（实际要操作的数据）赋值给 this._wrapped 属性
  var _ = function(obj) {
    // 如果 obj 是 `_` 的引用则直接返回 obj
    if (obj instanceof _) return obj;
    // 如果 obj 不是 `_` 函数的实例
    // 则调用 new 运算符，返回实例化的对象
    if (!(this instanceof _)) return new _(obj);
    // 把 obj 赋值给 this._wrapped
    this._wrapped = obj;
  };

  // 把 `_` 变量/方法赋值给全局环境中的 `_`
  // 客户端（浏览器）中 window._ = _
  // node.js 中 exports._ = _
  if (typeof exports != 'undefined' && !exports.nodeType) {
    // node
    if (typeof module != 'undefined' && !module.nodeType && module.exports) {
      // 不太懂 连等可以么？
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    // 客户端
    root._ = _;
  }

  // 版本号
  _.VERSION = '1.8.3';

  // 内部方法 优化回调
  // 传入待优化的回调函数 func，以及迭代回调需要的参数个数 argCount，根据参数个数分情况进行优化
  var optimizeCb = function(func, context, argCount) {
    // void 0 即为 undefined
    // 这种用法避免 undefined 被覆盖（即 undefined 在 JavaScript 中不是保留字
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      // 目前还没有情况涉及到有两个参数的 iteratee
      // 有三个参数的话，就为 当前迭代元素值，其索引，所被迭代的集合
      // 在 _.map, _.each, _.filter 等函数中均为这种情况
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      // 四个参数，累加器，当前迭代元素值，其索引，所被迭代集合
      // _.reduce 为这种情况，需传入初始值，否则将集合中第一个元素设置为初始值，迭代从第二个元素开始
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // 声明内置 Iteratee 迭代器
  var builtinIteratee;

  // 定义内部函数 cb
  // 使集合中的每一个元素生成回调
  // element in a collection, returning the desired result — either `identity`,
  // an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    // 接受三个参数
    if (_.iteratee !== builtinIteratee) return _.iteratee(value, context);
    // 空值则返回传入值， _.identity 为后面封装好的方法 默认回调返回 value
    if (value == null) return _.identity;
    // 是方法 调用 optimizeCb
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    // 参数是对象，则去判断是否包含键值对
    if (_.isObject(value)) return _.matcher(value);
    // 默认返回获取对象属性的函数
    return _.property(value);
  };

  // 用 _.iteratee 包装 cb 并提供外部访问
  _.iteratee = builtinIteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // 类似于 ES6 的 rest param (不定参数)
  // 一个包装器，包装函数 func，使之支持 rest 参数
  // func 为想要赋予支持 rest 参数能力的函数
  // startIndex 从第几个参数开始为 rest 参数
  // This accumulates the arguments passed into an array, after a given index.
  var restArgs = function(func, startIndex) {
    // 没有 stratIndex 则默认函数最后一个参数为 rest 参数
    startIndex = startIndex == null ? func.length - 1 : +startIndex;
    return function() {
      // rest 参数长度 （做了个校正，避免为负数
      var length = Math.max(arguments.length - startIndex, 0),
          rest = Array(length),
          index = 0;
      // 把参数塞进 rest 数组
      for (; index < length; index++) {
        rest[index] = arguments[index + startIndex];
      }
      // 三种情况
      switch (startIndex) {
        // func(...rest)
        case 0: return func.call(this, rest);
        // func(a, ...rest)
        case 1: return func.call(this, arguments[0], rest);
        case 2: return func.call(this, arguments[0], arguments[1], rest);
      }
      // 非上述三种情况
      // 创建一个 args 数组做参数
      var args = Array(startIndex + 1);
      for (index = 0; index < startIndex; index++) {
        args[index] = arguments[index];
      }
      args[startIndex] = rest;
      return func.apply(this, args);
    };
  };

  // 创建一个干净且只存在具有想要其具有 prototype 的函数
  var baseCreate = function(prototype) {
    // 如果 prototype 参数不是对象
    if (!_.isObject(prototype)) return {};
    // 浏览器是否支持用原生的 Object.create 来创建，可以则直接调用原生方法创建
    if (nativeCreate) return nativeCreate(prototype);
    // 用空函数创建一个具有所传入 prototype 的函数
    Ctor.prototype = prototype;
    var result = new Ctor;
    // 创建，赋值完成后再重置 Ctor 空函数
    Ctor.prototype = null;
    return result;
  };

  // 获取、设置 obj 的 key 值，obj 中有所传入的 key 则获取，无 key 则创建
  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object.
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  // 设置一个最大值 2的53次幂 等于 9007199254740991
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  // 有 length 属性则获取 无则创建
  var getLength = property('length');
  // 判断 返回布尔值 判断传入参数是否具有 length 属性且有值
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // Collection 集合元素相关函数
  // --------------------

  // 遍历数组及类数组 (array-like) 结构
  _.each = _.forEach = function(obj, iteratee, context) {
    // 前面封装好的优化回调函数
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      // 有 length 则遍历集合中的每一项
      // for 循环中把 length 赋给变量并放在循环体外 提升了循环性能
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      // 没 length 则遍历对象上的属性
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // 遍历对象，不会修改 obj 直接 return
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    // results 是与 obj 的 length 相同的空数组
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  // 为  _.reduce 和  _.reduceRight 返回函数
  // dir 只可能为 1 或 -1
  var createReduce = function(dir) {
    // Wrap code that reassigns argument variables in a separate function than
    // the one that accesses `arguments.length` to avoid a perf hit. (#1991)
    // obj 为（类）数组或对象
    // memo 为初始值
    var reducer = function(obj, iteratee, memo, initial) {
      // 传入的 object 无 length 属性且 不是空对象的话 keys 为 true
      // length 为 （类）数组长度 或 对象属性数
      // index 为 0 或 obj 的最后一项（最后一个属性）
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      if (!initial) {
        memo = obj[keys ? keys[index] : index];
        // 根据 dir 确定向左或向右遍历
        index += dir;
      }
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        // memo 为单次迭代返回值
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      // 返回 memo 供下次迭代使用
      return memo;
    };

    return function(obj, iteratee, memo, context) {
      var initial = arguments.length >= 3;
      return reducer(obj, optimizeCb(iteratee, context, 4), memo, initial);
    };
  };

  // reduce 方法把list中元素归结为一个单独的数值
  // 用法 _.reduce(list, iteratee, [memo], [context]) 接受4个参数
  // 别名为 inject 和 foldl
  _.reduce = _.foldl = _.inject = createReduce(1);

  // reducRight是从右侧开始组合的元素的reduce函数
  _.reduceRight = _.foldr = createReduce(-1);

  // 寻找数组或者对象中第一个满足条件(通过predicate迭代函数真值检测)的元素
  // 并返回该元素值
  // 别名 detect
  _.find = _.detect = function(obj, predicate, context) {
    var keyFinder = isArrayLike(obj) ? _.findIndex : _.findKey;
    var key = keyFinder(obj, predicate, context);
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // 返回数组或者对象中所有 满足条件(通过predicate迭代函数真值检测)的元素
  // 传入的是 （类）数组 则把元素值存到数组中返回
  // 传入的是 对象 则把属性值存到数组中返回
  // 别名 select
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    // 遍历所有元素 符合条件的 push 到返回数组中
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // 返回数组或者对象中所有 不满足条件(没通过predicate迭代函数真值检测)的元素
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // 检测数组或对象中所有元素是否都满足条件(通过predicate迭代函数真值检测)
  // 别名 all
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      // 一旦不满足条件则跳出循环 返回 false
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    // 在上面的循环中未跳出则意味着所有元素都满足条件
    // 返回 true
    return true;
  };

  // 检测数组或对象中 是否至少有一个元素 满足条件(通过predicate迭代函数真值检测)
  // 别名 any
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      // 一旦有元素满足条件则跳出循环
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // 检测数组或对象中 是否存在所传入的元素
  // 用法 _.contains(list, value)
  // 使用 === 严格等于来判断
  // 别名 includes 和 include
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    // 传入的 obj 非（类）数组的话 取其属性值数组
    if (!isArrayLike(obj)) obj = _.values(obj);
    // fromIndex 为查询起始位置
    // 没有 fromIndex 则从首项开始查询
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    // 返回布尔值
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // 数组或对象中的每一个元素都执行 methodName 方法
  // 返回调用后的结果
  // 用法 _.invoke(list, methodName, *arguments)
  // restArgs 为前面117-138行封装好的不定参数方法
  // method 参数后的参数会被当做参数传入 method 方法中
  _.invoke = restArgs(function(obj, method, args) {
    // 把判断结果放在循环外 作为函数局部变量 减少判断和赋值次数
    var isFunc = _.isFunction(method);
    // 用 map 方法对每一个元素调用 method 方法
    // 不修改 obj 仅仅返回调用后的结果数组
    return _.map(obj, function(value) {
      // 如果 method 不是函数，则可能是 obj 的 key 值
      // obj[method] 可能是函数
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  });

  // 获取对象或数组中的每一个元素key属性的值
  // 返回结果数组
  // 用法 _.pluck(list, propertyName)
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // 返回对象或数组中元素 具有 attrs 键值对的元素数组
  // 用法 _.where(list, properties)
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // 返回对象或数组中 具有 attrs 键值对的第一个元素
  // 用法 _.findWhere(list, properties)
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // 返回对象或数组中的 最大值
  // 若传入 iteratee 则对每一个元素进行 iteratee 迭代后找到最大值
  // 返回最大值 或 -Infinity
  // 用法 _.max(list, [iteratee], [context])
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null || (typeof iteratee == 'number' && typeof obj[0] != 'object') && obj != null) {
      // obj 没有 length 属性的话则取其 value 值数组
      obj = isArrayLike(obj) ? obj : _.values(obj);
      // 遍历 找最大值
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value != null && value > result) {
          result = value;
        }
      }
    } else {
      // 迭代后找最大值
      iteratee = cb(iteratee, context);
      _.each(obj, function(v, index, list) {
        computed = iteratee(v, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = v;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // 类似于 _.max
  // 找最小值
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null || (typeof iteratee == 'number' && typeof obj[0] != 'object') && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value != null && value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(v, index, list) {
        computed = iteratee(v, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = v;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // 将集合乱序
  _.shuffle = function(obj) {
    // 用 _.sample 取得随机样本
    // 简单粗暴地用 Infinity 表示无论 obj 是集合还是对象，都将其所有元素随机
    return _.sample(obj, Infinity);
  };

  // 从集合中返回一个随机样本 传入n表示需返回样本中的元素个数
  // 如果参数是对象 则返回由 values 组成的数组
  // 用法 _.sample(list, [n])
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    // 有 length 则克隆对象 否则返回对象的value值数组
    var sample = isArrayLike(obj) ? _.clone(obj) : _.values(obj);
    var length = getLength(sample);
    // 做了一个返回数组元素个数的处理
    // 传入的参数 n 大于集合长度的话 返回集合所有元素
    // 比如 _.shuffle 中传入的 Infinity 意味将集合中所有元素随机
    // 小于的话 返回 n 个
    // 因此 n 值应该是小于等于 length
    n = Math.max(Math.min(n, length), 0);
    var last = length - 1;
    for (var index = 0; index < n; index++) {
      // 随机取一个数值在 index 和 last 中的值作为随机出来的索引项
      // 即 rand 大于等于 index
      var rand = _.random(index, last);
      // 交换 index 项 和 rand 项的值
      // 并且避免了随机数组中有相同值
      // (否则由于 rand > index 随着index的增加可能依然会取到同样的rand)
      var temp = sample[index];
      sample[index] = sample[rand];
      sample[rand] = temp;
    }
    // 结果返回为由n个sample[rand]组成的数组
    return sample.slice(0, n);
  };

  // 返回一个排序后的list拷贝副本。如果传递iteratee参数，iteratee将作为list中每个值的排序依据
  _.sortBy = function(obj, iteratee, context) {
    var index = 0;
    iteratee = cb(iteratee, context);
    // 根据指定的 key 返回 values 数组
    // _.plunk(_.map(), 'value')
    return _.pluck(_.map(obj, function(value, key, list) {
      // 将 obj 的每一个元素/属性都改装成如下形式
      // 每个元素/属性上都有自己的 value值，index，迭代后的值
      return {
        value: value,
        index: index++,
        // 元素经过迭代函数迭代后的值
        criteria: iteratee(value, key, list)
      };
      // 调用 JavaScript 数组原生的 sort 方法 升序排列
    }).sort(function(left, right) {
      // 进行迭代后的值的比较
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      // 值相同的话 则 index 比较
      return left.index - right.index;
    }), 'value');
  };

  // 内部用的工具函数
  // 为 _.groupBy, _.indexBy 以及 _.countBy 提供方法
  // behavior 为分类规则函数
  // partition 是一个布尔值，决定是否要把集合分为满足规则，不满足规则的两组
  var group = function(behavior, partition) {
    // 对每个元素执行 iteratee
    // 并将结果传入 behavior 执行
    return function(obj, iteratee, context) {
      // 主要提供分类方式和集合元素的遍历
      // 需分组则返回包含两个数组的数组 否则返回 Object
      var result = partition ? [[], []] : {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // 把一个集合分组为多个集合
  // 用法 _.groupBy(list, iteratee, [context])
  // 如果 iterator 是一个字符串而不是函数, 那么将使用 iterator 作为各元素的属性名来对比进行分组
  _.groupBy = group(function(result, value, key) {
    // 分类规则函数
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // 用法 _.indexBy(list, iteratee, [context])
  // 按元素键来分组
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // 用法 _.countBy(list, iteratee, [context])
  // 分组，返回每组元素个数
  _.countBy = group(function(result, value, key) {
    // 已有的则累加，没有的则初始计为1
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // 匹配指定区域的unicode字符,然后以数组形式返回
  // https://www.zhihu.com/question/38324041
  var reStrSymbol = /[^\ud800-\udfff]|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g;

  // 用法 _.toArray(list)
  // 把任意（可迭代）对象转换为数组
  // 常用的是转换 arguments 对象
  _.toArray = function(obj) {
    if (!obj) return [];
    // 处理数组
    // Array.prototype.slice.call(arguments, indexes);
    if (_.isArray(obj)) return slice.call(obj);
    // 处理字符串
    if (_.isString(obj)) {
      // Keep surrogate pair characters together
      return obj.match(reStrSymbol);
    }
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // 用法 _.size(list)
  // 返回 list 的长度
  _.size = function(obj) {
    if (obj == null) return 0;
    // 有 length 属性则直接返回 length
    // 没有则发挥 key 个数
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // 用法 _.partition(array, predicate)
  // 按照 predicate 把数组分为 满足要求，不满足要求的两组
  _.partition = group(function(result, value, pass) {
    result[pass ? 0 : 1].push(value);
  }, true);

  // Array Functions
  // Array 相关函数
  // ---------------

  // 用法 _.first(array, [n]) 别名 head/take
  // 返回数组中第一个元素
  // 传入 n 则返回数组的前n个元素
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null || array.length < 1) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // 用法 _.initial(array, [n])
  // 返回数组中除了最后一个元素外的其他全部元素
  // 传入 n 则排除数组最后的n个元素
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // 类似的 返回数组中从右到左指定数目 n 的结果集
  _.last = function(array, n, guard) {
    if (array == null || array.length < 1) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // 别名 tail/drop
  // 对于 arguments 对象很实用
  // 用于返回数组中从右到左指定数目 Array.length - n 的结果集
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // 返回除去'false, null, 0, "", undefined, NaN'的新数组
  _.compact = function(array) {
    // Boolean 是 JavaScript 内置函数 用于 Boolean 判断
    return _.filter(array, Boolean);
  };

  // 内部方法 数组拍平
  // shallow 是否只展开一层/即是否为浅度展开
  // strict 是否为严格模式
  // output 指定输出数组，将展开后数组添加到输出数组的尾部
  var flatten = function(input, shallow, strict, output) {
    output = output || [];
    // 输出数组下标
    var idx = output.length;
    for (var i = 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        // 当前元素为数组、集合、arguments
        // 进行拍平
        if (shallow) {
          var j = 0, len = value.length;
          // 只展开一层，遍历一遍这个集合就行，一边遍历一边把每个元素塞到 output
          while (j < len) output[idx++] = value[j++];
        } else {
          // 深度展开，递归调用
          flatten(value, shallow, strict, output);
          // 更新下标
          idx = output.length;
        }
      } else if (!strict) {
        // 如果不是严格模式，可以将非数组、集合、arguments 的元素直接塞到 output
        output[idx++] = value;
      }
    }
    return output;
  };

  // _.flatten(array, [shallow])
  // 把嵌套任意层数的数组展开 如果传 shallow 则只展开一层
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // 返回一个不包含 otherArrays 中元素的，array 的副本
  _.without = restArgs(function(array, otherArrays) {
    return _.difference(array, otherArrays);
  });

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = restArgs(function(arrays) {
    return _.uniq(flatten(arrays, true, true));
  });

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      var j;
      for (j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = restArgs(function(array, rest) {
    rest = flatten(rest, true, true);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  });

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices.
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = restArgs(_.unzip);

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions.
  var createPredicateIndexFinder = function(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  };

  // Returns the first index on an array-like that passes a predicate test.
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions.
  var createIndexFinder = function(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
          i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
          length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  };

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    if (!step) {
      step = stop < start ? -1 : 1;
    }

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Split an **array** into several arrays containing **count** or less elements
  // of initial array.
  _.chunk = function(array, count) {
    if (count == null || count < 1) return [];

    var result = [];
    var i = 0, length = array.length;
    while (i < length) {
      result.push(slice.call(array, i, i += count));
    }
    return result;
  };

  // Function (ahem) Functions
  // 函数的函数集 ? 还是应该叫高阶函数（操作函数的函数，接受一个或多个函数作为参数，并返回一个新函数）？

  // 处理绑定上下文与执行过程
  // 解决如果 bind 所返回函数被作为构造函数 new 的情况
  // new 的话需要判断函数是否有返回值，有返回值且返回值是对象，就返回这个对象，否则要返回构造实例
  // sourceFunc 待绑定函数
  // boundFunc 绑定后函数
  // content 待绑定上下文
  // callingContext 执行上下文
  // args 函数执行所需参数
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

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder by default, allowing any combination of arguments to be
  // pre-filled. Set `_.partial.placeholder` for a custom placeholder argument.
  // 偏函数，返回的新函数是原函数的一部分
  // 偏函数是相对于原函数而言的，偏的意思是部分，原函数的部分参数或者变量被预置形成的新函数就是偏函数
  // _.partial 是一个偏函数创造器
  // 可以通过重置 _.partial.placeholder 自定义一个占位符
  _.partial = restArgs(function(func, boundArgs) {
    // 读取内置占位符，这个占位符是可以替换的
    var placeholder = _.partial.placeholder;
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      // 用新的数组 args 存储最终调用时的参数
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === placeholder ? arguments[position++] : boundArgs[i];
      }
      // 如果还有参数，一并塞入 args
      while (position < arguments.length) args.push(arguments[position++]);
      // 不改变上下文
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  });

  _.partial.placeholder = _;

  // 绑定对象 obj 的所有指定成员方法中的执行上下文到 obj
  _.bindAll = restArgs(function(obj, keys) {
    keys = flatten(keys, false, false);
    var index = keys.length;
    if (index < 1) throw new Error('bindAll must be passed function names');
    while (index--) {
      var key = keys[index];
      obj[key] = _.bind(obj[key], obj);
    }
  });

  // 缓存函数创建器,适用于需要重复计算的函数
  // hasher 为缓存获取方法，如果传入 hasher 则用 hasher 的返回值作为 key 存储函数的计算结果
  // var fibonacci = _.memoize(function(n) {
  //   return n < 2 ? n: fibonacci(n - 1) + fibonacci(n - 2);
  // });
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      // 得到缓存地址
      // 没有定义 hasher 则将缓存函数的参数 key 视为缓存地址
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      // 缓存未命中，则计算之，并将结果存入
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    // 初始化记忆函数的缓存
    // 并将缓存绑定到了缓存函数的 cache 属性上
    memoize.cache = {};
    return memoize;
  };

  // setTimeout
  _.delay = restArgs(function(func, wait, args) {
    return setTimeout(function() {
      return func.apply(null, args);
    }, wait);
  });

  // 延迟执行某函数，直到函数调用栈为空时再执行
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var timeout, context, args, result;
    var previous = 0;
    if (!options) options = {};

    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };

    var throttled = function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };

    throttled.cancel = function() {
      clearTimeout(timeout);
      previous = 0;
      timeout = context = args = null;
    };

    return throttled;
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;

    var later = function(context, args) {
      timeout = null;
      if (args) result = func.apply(context, args);
    };

    var debounced = restArgs(function(args) {
      if (timeout) clearTimeout(timeout);
      if (immediate) {
        var callNow = !timeout;
        timeout = setTimeout(later, wait);
        if (callNow) result = func.apply(this, args);
      } else {
        timeout = _.delay(later, wait, this, args);
      }

      return result;
    });

    debounced.cancel = function() {
      clearTimeout(timeout);
      timeout = null;
    };

    return debounced;
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // 返回 predicate 方法的对立方法
  // 即对 predicate 方法迭代结果取补集
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  _.restArgs = restArgs;

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  var collectNonEnumProps = function(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = _.isFunction(constructor) && constructor.prototype || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  };

  // 返回对象的属性名的数组
  // 仅返回对象自有属性，非继承来的属性
  _.keys = function(obj) {
    // 容错 传入的非对象则返回空数组
    if (!_.isObject(obj)) return [];
    // 若浏览器支持 ES5 Object.key() 方法 则使用原生方法
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // 兼容 IE9 以下
    // IE9 以下无法用 for in 枚举对象属性
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // 取对象中所有属性的值 作为数组返回之
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // 对 object 的每一个元素进行迭代
  // 注意与 _.map 方法进行对比，这个方法返回的是一个 object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = _.keys(obj),
        length = keys.length,
        results = {};
    for (var index = 0; index < length; index++) {
      var currentKey = keys[index];
      results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`.
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, defaults) {
    return function(obj) {
      var length = arguments.length;
      if (defaults) obj = Object(obj);
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!defaults || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s).
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test.
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Internal pick helper function to determine if `obj` has key `key`.
  var keyInObj = function(value, key, obj) {
    return key in obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = restArgs(function(obj, keys) {
    var result = {}, iteratee = keys[0];
    if (obj == null) return result;
    if (_.isFunction(iteratee)) {
      if (keys.length > 1) iteratee = optimizeCb(iteratee, keys[1]);
      keys = _.allKeys(obj);
    } else {
      iteratee = keyInObj;
      keys = flatten(keys, false, false);
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  });

  // Return a copy of the object without the blacklisted properties.
  _.omit = restArgs(function(obj, keys) {
    var iteratee = keys[0], context;
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
      if (keys.length > 1) context = keys[1];
    } else {
      keys = _.map(flatten(keys, false, false), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  });

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // 判断对象是否包含所传入的 `key:value` 键值对
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq, deepEq;
  eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // `NaN`s are equivalent, but non-reflexive.
    if (a !== a) return b !== b;
    // Exhaust primitive checks
    var type = typeof a;
    if (type !== 'function' && type !== 'object' && typeof b != 'object') return false;
    return deepEq(a, b, aStack, bStack);
  };

  // Internal recursive comparison function for `isEqual`.
  deepEq = function(a, b, aStack, bStack) {
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN.
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
      case '[object Symbol]':
        return SymbolProto.valueOf.call(a) === SymbolProto.valueOf.call(b);
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // 判断给定变量是否是 Object
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError, isMap, isWeakMap, isSet, isWeakSet.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error', 'Symbol', 'Map', 'WeakMap', 'Set', 'WeakSet'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), Safari 8 (#1929), and PhantomJS (#2236).
  var nodelist = root.document && root.document.childNodes;
  if (typeof /./ != 'function' && typeof Int8Array != 'object' && typeof nodelist != 'function') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // 判断变量是否为 isFinite
  _.isFinite = function(obj) {
    return !_.isSymbol(obj) && isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // 判断变量是否为 `NaN`
  _.isNaN = function(obj) {
    // 需在是数字的情况下判断
    // 否则一切非数字字符串的，都是NaN
    return _.isNumber(obj) && isNaN(obj);
  };

  // 判断变量是否为 boolean
  _.isBoolean = function(obj) {
    // 通过是否为 true/false，或者是否为一个已声明未赋值的 var obj = new Bollean()
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // 判断变量是否为 null
  _.isNull = function(obj) {
    return obj === null;
  };

  // 判断变量是否为 undefined
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // 检测一个 object 是否有某一属性的快捷方式（只检测其自由属性，不是原型链上的属性）
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // 工具函数组

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // 进行默认迭代的身份函数
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // 判断对象是否包含某些 `key:value` 键值对
  // 返回布尔值
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

  // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped.
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, prop, fallback) {
    var value = object == null ? void 0 : object[prop];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'": "'",
    '\\': '\\',
    '\r': 'r',
    '\n': 'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escapeRegExp, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offset.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    var render;
    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // 使之能够进行链式调用
  // 将函数传给 _ 构造器以获取实例
  // 给每个实例都赋予 _chain 属性，作为该函数是否能链式调用的标志
  // 再返回这个实例以实现链式调用
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var chainResult = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // 可以向 underscore 上挂载自己的方法
  // 使之支持 OOP _(....).map 调用
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return chainResult(this, func.apply(_, args));
      };
    });
    return _;
  };

  // 把挂载在 _ 对象上的方法都添加到 _.prototype 上，使之支持 OOP
  _.mixin(_);

  //  把 Array 原型链上有的方法都添加到 underscore 全局环境的原型链中
  // 这些方法都可以直接调用
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      // obj 为调用 _ 的方法
      var obj = this._wrapped;
      method.apply(obj, arguments);
      // 这里是为了IE做的兼容 http://stackoverflow.com/questions/24725560/javascript-why-need-to-delete-the-0-index-of-an-array
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return chainResult(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return chainResult(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return String(this._wrapped);
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define == 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}());
