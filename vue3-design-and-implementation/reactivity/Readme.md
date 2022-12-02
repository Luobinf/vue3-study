# 响应式原理

## 计算属性 computed 与 lazy

computed原理是啥？？

```JS
function computed(getter) {
    let value
    let dirty = true
    const effectFn = effect(getter, {
        lazy: true,
        scheduler() {
            dirty = true
            // 当计算属性的依赖的响应式数据发生变化时，手动调用 trigger 函数触发响应。
            trigger(obj, 'value')
        }
    })
    const obj = {
        get value() {
            if(dirty) {
                value = effectFn()
                dirty = false
            }
            track(obj, 'value')
            return value
        }
    }
    return obj
}
```


## watch

`watch`, 本质上就是当观测到的响应式数据发生变化时，执行其回调函数。watch() 默认是懒侦听的，即仅在侦听源发生变化时才执行回调函数。

参考： https://cn.vuejs.org/api/reactivity-core.html#watch

```JS
watch(obj, () => {
    console.log('数据发生了变化')
})

// 修改响应式数据的值，会导致回调函数执行。
obj.foo++ 
```


`watch` 的调度时机，可以使用 `immediate`、`flush` 控制。

**过期的副作用**

cleanup

## watch 的实现

注意：选项式 API 中， watch 的侦听默认是浅层的，而在组合式 API 中，watch 的侦听默认是深层的，需要注意区别。


### 侦听数据源类型

watch 的第一个参数可以是不同形式的“数据源”：它可以是一个 ref (包括计算属性)、一个响应式对象、一个 getter 函数、或多个数据源组成的数组：


### 深层侦听器

直接给 watch() 传入一个响应式对象，会隐式地创建一个深层侦听器——该回调函数在所有嵌套的变更时都会被触发：


```JS
const obj = reactive({ count: 0 })

watch(obj, (newValue, oldValue) => {
  // 在嵌套的属性变更时触发
  // 注意：`newValue` 此处和 `oldValue` 是相等的
  // 因为它们是同一个对象！
})

obj.count++

```

### 回调的执行时机(调度)

```JS
watch(obj, (newValue, oldValue) => {
  // 在嵌套的属性变更时触发
  // 注意：`newValue` 此处和 `oldValue` 是相等的
  // 因为它们是同一个对象！
}, {
    flush: 'pre', // post、pre、sync
})
```

### 过期的副作用

例如当监听某一个对象或者属性时，发起一个网络请求，在第一次网络请求响应没有收到数据时，又改变了该对象或属性，会导致发起第二次网路请求，假设第二次请求后的响应时间比第一次慢，那么实际获取到的结果是第一次的结果，而我们实际需要的第二次的数据。


```JS
let obj = reactive({name: 'hello'})
let result = ''

watch(obj, () => {
    const res = fetch('/path/xxx')
    result = res
})
```

**如何解决？watch 的回调函数为我们提供了第三个参数，用于清除副作用**

```JS
let obj = reactive({name: 'hello'})
let result = ''

watch(obj, (newVal， oldVal, onValidFn) => {
    let expired = false
    // 该回调函数会在副作用下一次重新执行前调用，可以用来清除无效的副作用，例如等待中的异步请求。
    onValidFn(() => {
        expired = true
    })
    const res = fetch('/path/xxx')
    if(!expired) {
        result = res
    }
})
```

## watch 实现原理

**原理： onValidFn 会在下一次执行副作用前被调用，所以第二次执行副作用时，expired被修改成了 true，导致 if 语句没执行到，即结果被丢弃了。onValidFn 通过闭包清理掉了前一次的副作用结果。**

watch 实现：


```JS
const {
  reactive,
  isRef,
  isReactive,
  callWithErrorHandling,
  ReactiveEffect
} = require("vue");
const { isMap, isSet, isObject, isPlainObject, hasChanged, } = require("@vue/shared")


function watch(source, cb, options = {}) {
  let { deep, flush, immediate } = options;

  let getter;
  let isMultiSource = true;
  if (isRef(source)) {
    getter = () => source.value;
  } else if (isReactive(source)) {
    getter = () => source;
    deep = true;
  } else if (isFunction(source)) {
    if (cb) {
      // getter with cb
      getter = () => callWithErrorHandling(source, instance, "watch getter");
    } else {
      // no cb -> simple effect
      getter = () => {
        if (instance && instance.isUnmounted()) {
          return;
        }
        if (cleanup) {
          cleanup();
        }
        return callWithErrorHandling(source, instance, "watch callback", [
          onCleanup,
        ]);
      };
    }
  } else if (Array.isArray(source)) {
    isMultiSource = true;
    getter = () =>
      source.map((s) => {
        if (isRef(s)) {
          return s.value;
        } else if (isReactive) {
          return traverse(s);
        } else if (isFunction(s)) {
          // return s();
          return callWithErrorHandling(s, instance, "watch getter");
        } else {
          console.warn(`${source} is not a valid value to watch`);
          return s;
        }
      });
  } else {
    getter = () => {};
    console.warn(`${source} is not a valid value to watch`);
  }

  if (cb && deep) {
    const baseGetter = getter;
    getter = () => traverse(baseGetter());
  }

  let newVal,
    oldVal = isMultiSource ? [] : undefined;

  let cleanup;
  const onCleanup = (fn) => {
    cleanup = effect.onStop = fn;
  };

  //   const job = () => {
  //     newVal = effectFn();
  //     if (cleanup) {
  //       cleanup && cleanup();
  //     }
  //     cb && cb(newVal, oldVal, clean);
  //     oldVal = newVal;
  //   };

  const job = () => {
    if (!effect.active) {
      return;
    }
    if (cb) {
      // watch(source, cb)
      newVal = effect.run();
      // 这里为什么还需要加 deep 来判断，理论上来说用新旧两个值来判断即可？因为当我watch 的值是一个对象时，修改对象属性时，newVal 与 oldVal 的值时一样的
			//故不会执行 cb 的重新执行了，所以需要加上对 deep 的或判断。
      if (
        deep || isMultiSource
          ? newVal.some((v, i) => hasChanged(v, oldVal[i]))
          : hasChanged(newVal, oldVal)
      ) {
        // 下一次副作用函数执行前，执行 cleanup， 用于清除无效的副作用。
        if (cleanup) {
          cleanup();
        }
        callWithErrorHandling(cb, instance, "watch callback", [
          newVal,
          oldVal,
          onCleanup,
        ]);
        // cb && cb.call(null, [newVal, oldVal, onCleanup])
        oldVal = newVal;
      }
    } else {
      // watch effect
      effect.run();
    }
  };

  let scheduler;
  if (flush === "sync") {
    scheduler = job;
  } else if (flush === "post") {
    scheduler = () => queuePostFlushCb(job);
  } else {
    // flush = 'pre' 默认
    scheduler = () => queuePreFlushCb(job);
  }

  job.allowRecurse = !!cb;

  const effect = new ReactiveEffect(getter, scheduler);

  if (cb) {
    if (immediate) {
      job();
    } else {
      oldVal = effect.run();
    }
  } else if (flush === "post") {
    queuePostFlushCb(effect.run.bind(effect));
  } else {
		// watch effect
    effect.run();
  }

  const unwatch = () => {
    effect.stop();
    if (instance && instance.scope) {
      remove(instance.scope.effects, effect);
    }
  };

  return unwatch;
}

function traverse(source, seen = new Set()) {
  if (!isObject(source) || seen.has(source)) return source;
  seen.add(source);

  if (isRef(source)) {
    traverse(source.value, seen);
  } else if (Array.isArray(source)) {
    for (let i = 0; i < source.length; i++) {
      // 通过 x[i] 的形式去获取数组的元素，相当于 touch 了。
      traverse(s[i], seen);
    }
  } else if (isMap(source) || isSet(source)) {
    source.forEach((s) => {
      traverse(s, seen);
    });
  } else if (isPlainObject(source)) {
    for (const key in value) {
      traverse(value[key], seen);
    }
  }

  return source;
}

```

## watchEffect

第一个参数就是要运行的副作用函数。这个副作用函数的参数也是一个函数，用来注册清理回调。清理回调会在该副作用下一次执行前被调用，可以用来清理无效的副作用，例如等待中的异步请求 (参见下面的示例)。

第二个参数是一个可选的选项，可以用来调整副作用的刷新时机或调试副作用的依赖。

默认情况下，侦听器将在组件渲染之前执行。设置 flush: 'post' 将会使侦听器延迟到组件渲染之后再执行。详见回调的触发时机。在某些特殊情况下 (例如要使缓存失效)，可能有必要在响应式依赖发生改变时立即触发侦听器。这可以通过设置 flush: 'sync' 来实现。然而，该设置应谨慎使用，因为如果有多个属性同时更新，这将导致一些性能和数据一致性的问题。

返回值是一个用来停止该副作用的函数。


**watchEffect 的实现是基于 watch 的，如下：**


```JS
function watchEffect(effect, options = {}) {
    watch(effect, undefined, options)
}
```

```JS
// Example
const count = ref(0)

watchEffect((onCleanUp) => {
    // onCleanUp: 用于下一次副作用函数执行时清除上一次的无效副作用
    console.log(count.value)
}, {
    // flush: 'post' // 设置调度时机
})

count.value++
```


## watchPostEffect 实现

watchEffect() 使用 flush: 'post' 选项时的别名。

```JS
function watchPostEffect(effect, options = {}) {
  watch(
    effect,
    undefined,
    {
      ...options, 
      flush: 'post'
    }
  );
}
```

## watchSyncEffect 实现

watchEffect() 使用 flush: 'sync' 选项时的别名。

```JS
function watchSyncEffect(effect, options = {}) {
  watch(
    effect,
    undefined,
    {
      ...options, 
      flush: 'sync'
    }
  );
}
```

// import { ReactiveEffect } from './effect'
import { ReactiveEffect } from '../reactivity/src/effect'

@mpxjs/utils  增加 isSet、isMap 工具函数



# 非原始值的响应式方案

采用 Proxy 进行代理

为什么需要使用 Reflect ？

## 哪些操作是对一个对象的读取操作

1. 对象属性（obj.a）的方式读取
2. key in obj 的方式读取
3. for in 的方式读取



# 原始值的响应式方案



