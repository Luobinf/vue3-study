// const {
//   isFunction,
//   isObject,
//   isArray,
//   isPlainObject,
// } = require("@mpxjs/utils");
debugger;
// const { isFunction } = require("@babel/types");
const { ReactiveEffect } = require("@vue/reactivity/dist/reactivity.cjs");
const {
  reactive,
  isRef,
  isReactive,
  callWithErrorHandling,
  effect,
  watch,
  watchEffect,
  ref,
} = require("vue");

const obj = reactive({
  info: [90, 77, 56],
});

watch(obj.info, (newVal, oldVal) => {
  console.log('变更了吗：', newVal, oldVal)
})

obj.info.push(89)

function isSet(value) {
  return Object.prototype.toString.call(value) === "[object Set]";
}

function isMap(value) {
  return Object.prototype.toString.call(value) === "[object Map]";
}

function isObject(s) {
  return typeof s === "object" && s !== null;
}

function isPlainObject(source) {
  Object.prototype.toString.call(source) === "[object Object]";
}

const hasChanged = (value, oldValue) => {
  return !Object.is(value, oldValue);
};


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

// function watch(source, cb, options = {}) {
//   let { deep, flush, immediate } = options;

//   let getter;
//   let isMultiSource = true;
//   if (isRef(source)) {
//     getter = () => source.value;
//   } else if (isReactive(source)) {
//     getter = () => source;
//     deep = true;
//   } else if (isFunction(source)) {
//     if (cb) {
//       // getter with cb
//       getter = () => callWithErrorHandling(source, instance, "watch getter");
//     } else {
//       // no cb -> simple effect
//       getter = () => {
//         if (instance && instance.isUnmounted()) {
//           return;
//         }
//         if (cleanup) {
//           cleanup();
//         }
//         return callWithErrorHandling(source, instance, "watch callback", [
//           onCleanup,
//         ]);
//       };
//     }
//   } else if (Array.isArray(source)) {
//     isMultiSource = true;
//     getter = () =>
//       source.map((s) => {
//         if (isRef(s)) {
//           return s.value;
//         } else if (isReactive) {
//           return traverse(s);
//         } else if (isFunction(s)) {
//           // return s();
//           return callWithErrorHandling(s, instance, "watch getter");
//         } else {
//           console.warn(`${source} is not a valid value to watch`);
//           return s;
//         }
//       });
//   } else {
//     getter = () => {};
//     console.warn(`${source} is not a valid value to watch`);
//   }

//   if (cb && deep) {
//     const baseGetter = getter;
//     getter = () => traverse(baseGetter());
//   }

//   let newVal,
//     oldVal = isMultiSource ? [] : undefined;

//   let cleanup;
//   const onCleanup = (fn) => {
//     cleanup = effect.onStop = fn;
//   };

//   //   const job = () => {
//   //     newVal = effectFn();
//   //     if (cleanup) {
//   //       cleanup && cleanup();
//   //     }
//   //     cb && cb(newVal, oldVal, clean);
//   //     oldVal = newVal;
//   //   };

//   const job = () => {
//     if (!effect.active) {
//       return;
//     }
//     if (cb) {
//       // watch(source, cb)
//       newVal = effect.run();
//       // 这里为什么还需要加 deep 来判断，理论上来说用新旧两个值来判断即可？因为当我watch 的值是一个对象时，修改对象属性时，newVal 与 oldVal 的值时一样的
// 			//故不会执行 cb 的重新执行了，所以需要加上对 deep 的或判断。
//       if (
//         deep || isMultiSource
//           ? newVal.some((v, i) => hasChanged(v, oldVal[i]))
//           : hasChanged(newVal, oldVal)
//       ) {
//         // 下一次副作用函数执行前，执行 cleanup， 用于清除无效的副作用。
//         if (cleanup) {
//           cleanup();
//         }
//         callWithErrorHandling(cb, instance, "watch callback", [
//           newVal,
//           oldVal,
//           onCleanup,
//         ]);
//         // cb && cb.call(null, [newVal, oldVal, onCleanup])
//         oldVal = newVal;
//       }
//     } else {
//       // watch effect
//       effect.run();
//     }
//   };

//   let scheduler;
//   if (flush === "sync") {
//     scheduler = job;
//   } else if (flush === "post") {
//     scheduler = () => queuePostFlushCb(job);
//   } else {
//     // flush = 'pre' 默认
//     scheduler = () => queuePreFlushCb(job);
//   }

//   job.allowRecurse = !!cb;

//   const effect = new ReactiveEffect(getter, scheduler);

//   if (cb) {
//     if (immediate) {
//       job();
//     } else {
//       oldVal = effect.run();
//     }
//   } else if (flush === "post") {
//     queuePostFlushCb(effect.run.bind(effect));
//   } else {
// 		// watch effect
//     effect.run();
//   }

//   const unwatch = () => {
//     effect.stop();
//     if (instance && instance.scope) {
//       remove(instance.scope.effects, effect);
//     }
//   };

//   return unwatch;
// }

// obj.info = "world";

// console.log(`结束了！！！`);

// watch(
//   obj,
//   async (newVal, oldVal, onInValid) => {
//     console.log(newVal, oldVal);
//     let expired = false;
//     onInValid(() => {
//       expired = true;
//     });
//     let res = await fetch("path/xxx");
//     if (!expired) {
//       result = res;
//     }
//   },
//   {
//     immediate: true,
//     flush: "pre",
//     deep: true,
//   }
// );

// 副作用函数中访问响应式数据时，就会与响应式数据建立联系。

// obj.info = "world";

// 立即执行;
// watch(
//   obj,
//   () => {
//     console.log(90);
//   },
//   {
//     // immediate: true
//   }
// );


