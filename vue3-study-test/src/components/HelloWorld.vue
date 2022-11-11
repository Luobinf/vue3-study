<template>
  <button @click="increment">
    {{ store.state.count }} && {{ computedProperty }}
  </button>
  <button @click="change">click</button>
  <div
    class="box"
    :style="{
      width: width + 'px',
    }"
  ></div>
</template>

<script setup>
import { computed, ref, reactive } from "@vue/reactivity";

import {useStore} from 'vuex'

let store = useStore();

// const state = reactive({
//   count: 0,
//   nested: {
//     name: "jack",
//   },
// });

const computedProperty = computed(() => {
  return store.state.count;
});

const width = ref(100);

function change() {
  width.value += 100;
}

function increment() {
  // state.count++
  store.commit("add");
}


function asyncAdd(){
    store.dispatch('asyncAdd')
}

</script>

<style>
.box {
  position: relative;
  height: 100px;
  background-color: skyblue;
  /* transition: width .3s linear; */
  animation: move 2s linear infinite;
}

@keyframes move {
  0% {
    left: 0;
  }
  50% {
    left: 200px;
  }
  100% {
    left: 0;
  }
}
</style>
