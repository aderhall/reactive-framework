import {Reactive, apply, useState, useEffect, deref, cull, set, isReactive} from "./reactive.mjs";

// Composition

//function multiply(a, b) {
//    return apply((a, b) => a * b, [a, b]);
//}
//[x, setX] = useState(5);
//[y, setY] = useState(3);
//var product = multiply(x, y);
//apply((product) => {
//    console.log(product);
//}, [product]); // logs "15"
//setX(30); // logs "90"

// Collectors

//const [state1, setState1] = useState(3);
//const [state2, setState2] = useState(14);
//apply((x, y) => {
//    console.log(x + 5 * y);
//}, [state1, state2]); // logs "73"
//apply((x) => {
//    console.log(`State1 = ${x}`);
//}, [state1]);
//setState1(state1.v + 2); // logs "75"

// Apply with cleanup (also multivariable set() function)

//const [state, setState] = useState(0);
//const [otherState, setOtherState] = useState("hello");
//apply((state, otherState) => {
//    console.log(`State = ${state}`);
//    console.log(`OtherState = ${otherState}`);
//    return () => {
//        console.log(`Cleaning up state = ${state}`);
//        console.log(`Cleaning up otherState = ${otherState}`);
//    }
//}, [state, otherState], true); // logs "State = 0", "OtherState = hello"
//set(state, 1, otherState, "goodbye"); // logs "Cleaning up state = 0", "Cleaning up otherState = hello", "State = 1", "OtherState = goodbye"

// useEffect with cleanup

//const [state, setState] = useState(0);
//const [otherState, setOtherState] = useState(100);
//const obj = {
//    effects: [],
//    cleanup() {
//        for (let effect of this.effects) {
//            if (typeof(effect.v) === "function") {
//                effect.v();
//            }
//        }
//    },
//    render() {
//        useEffect((state) => {
//            console.log(state);
//            return () => {
//                console.log(`Cleaning up ${state}`);
//            }
//        }, [state]); // logs "0"
//    }
//}
//const otherObj = {
//    effects: [],
//    cleanup() {
//        for (let effect of this.effects) {
//            if (typeof(effect.v) === "function") {
//                effect.v();
//            }
//        }
//    },
//    render() {
//        useEffect((otherState) => {
//            console.log(otherState);
//            return () => {
//                console.log(`Cleaning up ${otherState}`);
//            }
//        }, [otherState]); // logs "0"
//    }
//}

//useEffect = unboundUseEffect.bind(obj);
//obj.render();
//storage.runEffects();

//useEffect = unboundUseEffect.bind(otherObj);
//otherObj.render();
//storage.runEffects();

//setState(4); // logs "Cleaning up 0", "4"
//setOtherState(55);

//obj.cleanup(); // logs "Cleaning up 4"

// Culling

//const [state, setState] = useState(0);
//const statePlusOne = apply(state => state + 1, [state]);
//console.log(state);
//cull(statePlusOne);
//console.log(state);
//setState(3);
//console.log(state);