# 读文档笔记

# 1、响应式基础
## reactive()的局限性

reactive() API 有两条限制：

1. 仅对对象类型有效（对象、数组和 Map、Set 这样的集合类型），而对 string、number 和 boolean 这样的 原始类型 无效。

```JS
// 1. 以下数据类型（字符串类型、布尔类型、数字类型）不适用进行响应式处理，由于 reactive 的底层是使用 Proxy 实现的， Proxy 仅对对象类型（对象、数组、Map、Set数据结构）生效。
import { reactive } from 'vue'
const name = reactive('jack')
const isTrue = reactive(true)
const number = reactive(12)

```

2. 因为 Vue 的响应式系统是通过属性访问进行追踪的，因此我们必须始终保持对该响应式对象的相同引用。这意味着我们不可以随意地“替换”一个响应式对象，因为这将导致对初始引用的响应性连接丢失：


```JS
import { reactive } from 'vue'
let state = reactive({ count: 0 })
// 上面的引用 ({ count: 0 }) 将不再被追踪（响应性连接已丢失！）
state = reactive({ count: 1 })

```

同时这也意味着当我们将响应式对象的属性赋值或解构至本地变量时，或是将该属性传入一个函数时，我们会失去响应性：


```JS
const state = reactive({ count: 0 })

// n 是一个局部变量，同 state.count
// 失去响应性连接
let n = state.count
// 不影响原始的 state
n++

// count 也和 state.count 失去了响应性连接
let { count } = state
// 不会影响原始的 state
count++

// 该函数接收一个普通数字，并且
// 将无法跟踪 state.count 的变化
callSomeFunction(state.count)

```

## 用 ref() 定义响应式变量————Vue 是怎么实现的？

reactive() 的种种限制归根结底是因为 JavaScript 没有可以作用于所有值类型的 “引用” 机制。为此，Vue 提供了一个 ref() 方法来允许我们创建可以使用任何值类型的响应式 ref：

### ref 在模板中的解包

当 ref 在模板中作为顶层属性被访问时，它们会被自动“解包”，所以不需要使用 .value。

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)

function increment() {
  count.value++
}
</script>

<template>
  <button @click="increment">
    {{ count }} <!-- 无需 .value -->
  </button>
</template>

```


## 响应性语法糖 

相对于普通的 JavaScript 变量，我们不得不用相对繁琐的 .value 来获取 ref 的值。这是一个受限于 JavaScript 语言限制的缺点。然而，通过编译时转换，我们可以让编译器帮我们省去使用 .value 的麻烦。Vue 提供了一种编译时转换，使得我们可以像这样书写之前的“计数器”示例：

```vue
<script setup>
let count = $ref(0)

function increment() {
  // 无需 .value
  count++
}
</script>

<template>
  <button @click="increment">{{ count }}</button>
</template>

```


# 2、计算属性

computed() 方法期望接收一个 getter 函数，返回值为一个计算属性 ref。和其他一般的 ref 类似，你可以通过 xx.value 访问计算结果。**计算属性 ref 也会在模板中自动解包**，因此在模板表达式中引用时无需添无需添加 .value。


### 计算属性缓存与方法

我们将同样的函数定义为一个方法而不是计算属性，两种方式在结果上确实是完全相同的，然而，不同之处在于计算属性值会基于其响应式依赖被缓存。一个计算属性仅会在其响应式依赖更新时才重新计算。


相比之下，方法调用总是会在重渲染发生时再次执行函数。



# Vuex

Vuex 提供统一的数据中心。在 Vuex 中，你可以使用 getters 配置，来实现 computed 的功能。

