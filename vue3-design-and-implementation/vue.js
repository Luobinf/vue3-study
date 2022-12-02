const { reactive } = require('@vue/reactivity')


debugger
const obj = {
    name: 'jack',
    get bar() {
        return this.name
    }
}

const proxyObj = new Proxy(obj, {
    get(target, key, receiver) {
        // 注意这里的 receiver 类似于 this，表示是谁触发的读取目标对象上 key 的值。
        console.log(receiver === proxyObj) 
        return Reflect.get(target, key, receiver)
    },
    set(target, key, receiver) {

    }
})

proxyObj.bar

// 合理触发响应
