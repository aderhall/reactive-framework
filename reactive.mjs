"use strict";

export function isReactive(variable) {
    return (variable === undefined || variable === null ) ? false : variable.prototype === storage.R;
}
const storage = {
    collectors: [],
    addCollector(collector) {
        if (this.collectors.indexOf(collector) === -1) {
            this.collectors.push(collector);
        }
    },
    updateCollectors() {
        while (this.collectors.length > 0) {
            const cp = [...this.collectors];
            this.collectors = [];
            for (let collector of cp) {
                assign(collector, collector.c(...collector.d));
                //assignments.push(collector);
                //assignments.push(collector.c(...collector.d));
            }
        }
    },
    effects: [],
    addEffectElement(effect) {
        if (this.effects.indexOf(effect) === -1) {
            this.effects.push(effect);
        }
    },
    runEffects() {
        for (let effect of this.effects) {
            // If there's a cleanup function, then run it
            if (typeof(effect.v) === "function") {
                effect.v();
            }
            // Run the new callback and store its result as the next cleanup function
            effect.v = effect.c();
        }
        // Clear the effects list
        this.effects = [];
        
        // Old code
        //while (this.effects.length > 0) {
        //    const cp = [...this.effects];
        //    this.effects = [];
        //    for (let effect of cp) {
        //        if (typeof(effect[1][0]) === "function") {
        //            effect[1][0](); // This is the cleanup function (passed as item 0 of an array so we can get its reference)
        //        }
        //        effect[1][0] = effect[0](); // Run the effect function and save its cleanup callback for next time
        //    }
        //}
    },
    R: {}
}
export const Reactive = {
    createElement(component, props, ...children) {
        return {
            props: props ? {...props, children: children} : null, // Any of these could be reactive variables
            type: component
        }
    }
}
export function useState(initial) {
    // const [state, setState] = useReactive(5);
    const variable = createReactive(initial);
    return [variable, (value) => {
        set(variable, value);
    }]
}
function unboundUseEffect(cb, deps) {
    // Push the effect to `this.effects` then run `storage.addEffectElement([this, index])`
    // Where index is the index of the effect in this.effects
    const effectAndCleanup = {c: null, v: null};
    this.effects.push(effectAndCleanup);
    apply((...deps) => {
        const callback = () => cb(...deps);
        effectAndCleanup.c = callback;
        storage.effects.push(effectAndCleanup);
    }, deps);
    
    
    //const cleanup = [() => {}];
    //apply((...deps) => {
    //    storage.effects.push([() => cb(...deps), cleanup])
    //}, deps);
    // We could have replaced cb(...deps) with something like this to ensure it happens later:
    //setTimeout(cb(...deps), 0) // Not sure whether this is necessary though
}
export function useEffect(cb, deps) {
    unboundUseEffect(cb, deps);
}
function createReactive(initial, callback) {
    if (callback === undefined) {
        callback = (x) => {x};
    }
    const result = {
        v: initial,
        s: [],
        c: callback
        //valueOf: function() {
        //    return this.v;
        //}
    }
    result.prototype = storage.R;
    return result;
}
export function apply(cb, deps, returnCleanup) {
    if (deps === undefined) {
        return cb();
    }
    // If a dependency array is passed, check its length. If it has only one dep, create a normal reactive variable. If it has multiple deps, create a collector
    if (Array.isArray(deps)) {
        if (deps.length == 0) {
            return cb();
        } else if (deps.length == 1) {
            return applySingle(cb, deps[0], returnCleanup);
        } else {
            return applyCollector(cb, deps, returnCleanup)
        }
    } else {
        throw TypeError;
        //return applySingle(cb, deps, returnCleanup); // We can't do this because what if apply gets passed a normal variable as an array? Then this would treat that array as a dependency array rather than one variable as expected. 
    }
}
function applySingle(cb, dep, returnCleanup) {
    if (isReactive(dep)) {
        var nextStep;
        if (returnCleanup) {
            // Create an empty reactive variable
            nextStep = createReactive(() => {});
            // Add code to call the variable's current value before updating normally
            var modifiedCb = (...args) => {
                nextStep.v();
                return cb(...args);
            }
            // Assign the variable this callback
            nextStep.c = modifiedCb;
            nextStep.v = nextStep.c(dep.v);
        } else {
           nextStep = createReactive(cb(dep.v), cb);
        }
        dep.s.push(nextStep);
        return nextStep;
    } else {
        return cb(dep);
    }
}
function applyCollector(cb, deps, returnCleanup) {
    // Create an empty collector
    var collector, modifiedCb;
    if (returnCleanup) {
        collector = createReactive(() => {});
        modifiedCb = (...args) => {
            collector.v();
            return cb(...args);
        }
    } else {
       collector = createReactive(undefined);
       modifiedCb = cb;
    }
    collector.d = [];
    var index = 0;
    for (let dep of deps) {
        if (isReactive(dep)) {
            // Evaluate the current value of the dependency variable
            collector.d.push(dep.v);
            // Subscribe the collector to the dependency variable (the index represents which parameter the variable needs to be given to in the collector's callback)
            dep.s.push([collector, index]);
            index ++;
        }
    }
    collector.c = (...params) => {
        // Zip together the reactive dependencies and closured dependencies and store them in args
        var index = 0;
        const args = [];
        // deps is not a parameter so it is closured into the callback
        for (let dep of deps) {
            if (isReactive(dep)) {
                args.push(params[index]);
                index ++;
            } else {
                args.push(dep);
            }
        }
        // Call the given callback and return the result
        return modifiedCb(...args);
    }
    // Evaluate the collector's initial value
    collector.v = collector.c(...collector.d);
    return collector;
}
export function set(...args) {
    // Assign but takes multiple inputs and updates collectors when done
    if (args.length % 2 == 1) {
        throw RangeError("set() must take an even number of arguments");
    } else {
        for (let i = 0; i < args.length / 2; i++) {
            assign(args[i*2], args[i*2 + 1]);
        }
        storage.updateCollectors();
        storage.runEffects();
    }
}
function assign(variable, value) {
    var dereferencedValue = isReactive(value) ? value.v : value;
    if (isReactive(variable)) {
        // Set the variable's value
        variable.v = dereferencedValue;
        // Update variable recursively
        variable.s = variable.s.filter((subscription) => {
            if (Array.isArray(subscription)) {
                const [collector, index] = subscription;
                // If the collector is no longer reactive, that means its prototype has been reset and it is marked for deletion
                if (isReactive(collector)) {
                    collector.d[index] = variable.v;
                    storage.addCollector(collector);
                    // Since it's still reactive, keep the subscription
                    return true;
                }
                // If it's not, delete the subscription
                return false;
            } else {
                if (isReactive(subscription)) {
                    assign(subscription, subscription.c(variable.v));
                    // keep the subscription
                    return true;
                }
                return false
            }
        });
    } else {
        variable = dereferencedValue;
    }
}
export function deref(variable) {
    if (isReactive(variable)) {
        return variable.v;
    } else {
        return variable;
    }
}
export function cull(variable) {
    // Marks a variable as no longer used, instructing all other variables to remove it from their subscriptions next time they update.
    // We only use the prototype to determine whether it has been culled, but we'll clear all these properties to free up memory, just in case one of its dependencies goes a long time without updating (this object can't be GC-d until then, but its properties can be once we delete them)
    delete variable.v;
    delete variable.c;
    delete variable.s;
    variable.prototype = null;
}