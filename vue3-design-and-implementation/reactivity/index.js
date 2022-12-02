let xx = {}

debugger

let activeEffect
let effectStack = []

function effect(fn, options = {}) {
    const effectFn = () => {
        cleanup(effectFn)
        activeEffect = effectFn
        effectStack.push(effectFn)
        const res = fn && fn()
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]
        // 返回副作用函数的结果
        return res
    }
    // 存储所有与该副作用相关的依赖集合。
    effectFn.deps = []
    // options 挂载
    effectFn.options = options
    // 只有在非 lazy 的时候，才会去执行。
    if (!options.lazy) {
        effectFn()
    }
    // 返回副作用函数
    return effectFn
}

let bucket = new WeakMap()

function track(target, key) {
    if (!activeEffect) {
        return
    }
    let depsMap = bucket.get(target)

    if (!depsMap) {
        bucket.set(target, depsMap = new Map())
    }

    let deps = depsMap.get(key)
    if (!deps) {
        depsMap.set(key, deps = new Set())
    }
    deps.add(activeEffect)
    activeEffect.deps.push(deps)
}

function trigger(target, key) {
    const depsMap = bucket.get(target)
    if (!depsMap) return
    const effects = depsMap.get(key)
    const effectsToRun = new Set()

    // 避免无限递归循环
    effects.forEach(effectFn => {
        if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
        }
    })
    effectsToRun && effectsToRun.forEach(effectFn => {
        // effect 副作用函数传递 options 调度器时，则应该调用调度器，即将副作用函数的触发将控制权交给用户
        if (effectFn && effectFn.options && effectFn.options.scheduler) {
            effectFn.options.scheduler(effectFn)
        } else {
            effectFn && effectFn()
        }
    });
}

function cleanup(effectFn) {
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i]
        deps.delete(effectFn)
    }
    effectFn.deps.length = 0
}

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
            if (dirty) {
                value = effectFn()
                dirty = false
            }
            track(obj, 'value')
            return value
        }
    }
    return obj
}

function watch(source, cb, options = {}) {
    let getter
    // 对 source 包装一下
    if(typeof source === 'function') {
        getter = source
    } else {
        getter = () => source 
    }
    let oldVal, newVal

    const job = () => {
        newVal = effectFn()
        cb(newVal, oldVal)
        oldVal = newVal
    }

    const effectFn = effect(() => {
        return getter()
    }, {
        lazy: true,
        scheduler() {
            if(options.flush === 'post') {
                const p = Promise.resolve()
                p.then(job)
            } else {
                job()
            }
        }
    })
    if(options.immediate) {
        job()
    } else {
        oldVal = effectFn()
    }
}


const data = {
    ok: true,
    text: 'hello world',
    foo: true,
    bar: true
}

const obj = new Proxy(data, {
    get(target, key) {
        track(target, key)
        return target[key]
    },
    set(target, key, newVal) {
        target[key] = newVal
        trigger(target, key)
        return true
    }
})


watch(obj.text, (newVal, oldVal, cleanup) => {
    console.log(newVal, oldVal, 99)
}, {
    immediate: true,
    // flush: 'post'
})

// obj.text = 888

// effect(function (){
//     console.log(obj.text)
// }, {
//     scheduler() {
//         console.log(909090)
//     },
//     lazy: true
// })
// obj.ok = false
// obj.text = 90

// obj.text++

// let temp1, temp2

// effect( function effectFn1() {
//     console.log(`effectFn1执行`)

//     effect(function effectFn2() {
//         console.log(`effectFn2执行`)
//         temp2 = obj.bar
//     })

//     temp1 = obj.foo
// })

// obj.foo = 'lj'


// effect(() => {
//     obj.foo = obj.foo+1
// })


// obj.foo = 88


// console.log(obj.foo)


// 调度执行

// effect(() => {
//     console.log(obj.foo)
// }, {
//     scheduler(fn) {
//         setTimeout(() => {
//             fn()
//         }, 0);
//     }
// })

// obj.foo++


// console.log('结束了!!!')



// 计算属性
// 指定 lazy 选项，这个函数不会立即执行。
// const effectFn = effect(() => {
//     return obj.foo + 99
// }, {
//     lazy: true
// })

// const val = effectFn()

// console.log(val)


// 计算属性，读取属性值时才会去进行计算，否则不进行计算。
// const result = computed(() => {
//     return obj.foo + obj.bar
// })

// effect(() => {
//     console.log(9)
//     console.log(result.value)
// })

// obj.foo++


