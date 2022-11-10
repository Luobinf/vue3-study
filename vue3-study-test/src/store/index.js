
import { createStore } from 'vuex'

const store = createStore({
    state() {
        return {
            count: 666
        }
    },
    mutations: {
        add(state, payload) {
            state.count++
        }
    },
})

export default store