export const Reactive = {
    createElement(component, props, ...children) {
        return {
            props: (props || children) ? {...props, children: children} : null, // Any of these could be reactive variables
            type: component, // Either a string or a function
            effects: [] // List containing the setup-cleanup objects for each effect invoked with useEffect
        }
    }
}

// Misc. internally-used data management-related buffers, stores and functions go here
const storage = {
    R: {},
    placeholder: {},
    contextBuffer: [], // Where the variable's context waits during callback execution
    pushContext() {
        // Adds an empty array to the context buffer – nested apply() calls will add to the last array in context
        this.contextBuffer.push([]);
    },
    popContext() {
        return this.contextBuffer.pop();
    },
    addVar(variable, depSources) {
        // Takes in a reactive variable and an array of references to the reactive variables it depends on. These will be added to the global contextBuffer, and then popped by the encapsulating apply() variable. The one exception is when we have a root-level apply() call, which can tell it's root-level since the contextBuffer is empty when it's called. In these cases, the apply() call doesn't add its result to the contextBuffer (since there's no need to – it's root-level so will never be re-called)
        this.contextBuffer[this.contextBuffer.length - 1].push([variable, depSources]);
    },
    isAtRoot() {
        // "At root" means that apply() is being called from outside of any other apply(). This means it is safe to assume it will never be run again (if it were run again, we would need to do memory management to prevent the old return values from being kept in bloated subscription lists).
        return this.contextBuffer.length === 0;
    },
    collectors: [],
    addCollector(collector) {
        if (this.collectors.indexOf(collector) === -1) {
            this.collectors.push(collector);
        }
    },
    updateCollectors() {
        while (this.collectors.length > 0) {
            const cp = [...this.collectors];
            // Clear the array, because updating the collectors below might add more collectors. We need to know which ones were added during this pass.
            this.collectors = [];
            for (let collector of cp) {
                assign(collector, collector.c(...collector.d));
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
        // Clear the effects list (this would be bad if we could create effects inside effect callbacks – but why would that be needed? Better to just forbid it and then change later if we need that as a feature).
        this.effects = [];
    }
}
export function runEffects() {
    storage.runEffects();
}
// For creating and managing reactive variables
export function createReactive(initial, callback, returnCleanup) {
    if (callback === undefined) {
        callback = (x) => {x};
    }
    const result = Object.create(storage.R);
    result.v = initial; // Current value of the variable
    result.s = []; // Other variables subscribed to this variable's changes
    result.c = callback; // Callback mapping new input to new output
    result.n = []; // Identities and dependencies of other reactive variables created by invoking this variable's callback (used for memory management)
    result.r = returnCleanup; // Whether we should treat this variable's output value as a cleanup function to be run before each update
    result.a = true; // Whether the variable is alive (if a is set to false, it means this variable is in the process of being cleaned up for deletion and should be ignored)
    return result;
}
export function isReactive(variable) {
    return (variable === undefined || variable === null ) ? false : Object.getPrototypeOf(variable) === storage.R;
}
export function isAlive(reactiveVar) {
    // reactiveVar must be a reactive variable!!
    return reactiveVar.a === true;
}

// Misc. internally-used functions
function assign(reactiveVar, value) {
    // This function is only intended to be called by set()
    // `reactiveVar` must be reactive and value must be non-reactive
    if (isReactive(reactiveVar)) {
        reactiveVar.v = value;
        // It's important that we iterate over a copy of the list, in case nested variable cleanup leads to the deletion of some subscriptions part-way through iteration (which could lead to skipping bugs).
        // IMPORTANT: the assign() function needs to iterate over a copy of the subscription list, because it's possible that items will be spliced from that list during iteration. When it meets a variable marked as dead, it should ignore it and not worry about unsubscribing it: that has already been taken care of
        for (let subscription of [...reactiveVar.s]) {
            // Is it a collector or a single-dependency variable?
            if (Array.isArray(subscription)) {
                // Don't do anything if it's marked as dead
                if (isAlive(subscription[0])) {
                    // Update the value in the collector's dependency list
                    subscription[0].d[subscription[1]] = reactiveVar.v;
                    // Add the collector to the storage's collectors list
                    storage.addCollector(subscription[0]);
                }
            } else {
                // Don't do anything if it's marked as dead
                if (isAlive(subscription)) {
                    // Compute the new value of the subscription and recursively assign it this value.
                    assign(subscription, subscription.c(reactiveVar.v));
                }
            }
        }
    } else {
        console.error("Error: assign can only assign to a reactive variable");
    }
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
}
export function bindUE(element) {
    // Changes the identity of useEffect to bind it to a specific element
    useEffect = unboundUseEffect.bind(element);
}
function withCleanup(reactiveVar, callback) {
    // Decorate the callback to automatically run cleanup 
    return (...args) => {
        // Recursively cleanup any nested varibles created last update
        nestedCleanup(reactiveVar);
        
        // Run the cleanup function if there is one
        if (reactiveVar.r && (typeof(reactiveVar.v) === "function")) {
            reactiveVar.v();
        }
        
        // Push a new context to receive nested variables
        storage.pushContext();
        // Run the actual callback. All reactive variables registered to storage will be captured
        const result = callback(...args);
        // Pop the context from storage and store each nested variable in this variable.
        reactiveVar.n = storage.popContext();
        // Return the result of the callback, so we don't interrupt normal execution
        return result;
    }
}
function nestedCleanup(reactiveVar) {
    // For each nested variable to clean up
    for (let [nestedVar, depSources] of reactiveVar.n) {
        // Recursively cleanup any nested variables created within this nested variable
        nestedCleanup(nestedVar);
        
        // Mark this nested variable as no longer alive. This is in case an assign() function is currently iterating over the subscription list of one of the depSources for this nested variable. The nestedCleanup function is going to splice out that subscription, but that would cause skipping bugs in the iteration. To solve this, assign() iterates over a temporary frozen copy of the subscription list, with all recently-culled variables still there. We don't want it assigning a culled variable, though (and running its callback), so we'll mark this one as culled, instructing the assign() function to ignore it.
        nestedVar.a = false;
        
        // Iterate over the variables that subscribe to this nested variable and remove the subscriptions
        for (let source of depSources) {
            var index = 0;
            for (let subscription of source.s) {
                // If this is the subscription we're looking for (either a single-input variable or a collector)
                if ((subscription === nestedVar) || (Array.isArray(subscription) && subscription[0] === nestedVar)) {
                    break;
                }
                index ++;
            }
            // If we found it, remove the subscription
            if (index < source.s.length) {
                source.s.splice(index, 1);
            }
        }
        
        // If this is a cleanup-returning variable, run its cleanup function
        if (nestedVar.r && (typeof(nestedVar.v) === "function")) {
            nestedVar.v();
        }
    }
    // It's important that we access this as a property of reactiveVar, so that we actually clear the list of nested variables
    reactiveVar.n = [];
}

// Front-facing api

export function apply(callback, dependencies, returnCleanup) {
    // TODO: Allow user to supply their own non-returned cleanup maybe?
    if (!Array.isArray(dependencies)) {
        console.error("Error: apply() must take an array of dependencies as its second argument");
        return null;
    }
    const outputVariable = createReactive(null, null, returnCleanup);
    if (dependencies.length > 1) {
        // I know what you're thinking: won't storing the dependencies create circular references? These won't be stored in the variable, but rather in the variable whose callback created this variable. When that callback re-runs, it will use these references to unsubscribe this variable from all of its dependency sources (preventing their subscription arrays from bloating and potentially causing memory issues). The variable never stores these, so it won't affect the one-way reference tree structure. Yes, the variable whose callback created this variable will keep these references. But it would anyway, since that callback boxes in these dependencies so that it can pass them as arguments to apply() calls like this one. And that isn't runaway referencing: the memory consumed won't increase. When it gets cleaned up, it deletes all of these references it kept. So it's inevitable that nesting apply() calls will keep things alive past their due. But the memory used is proportional to the number of places the user invokes the name of that variable, and we aren't keeping old subscriptions or anything so this falls under normal memory retention, not leaks.
        const depSources = [];
        outputVariable.d = [];
        // TODO: you know, we could actually just store nonreactive stuff in the outputVariable.d list too. It's not like it's going to change and that would simplify the decoration process dramatically.
        var index = 0;
        dependencies = dependencies.map(dependency => {
            if (isReactive(dependency)) {
                // Add the current value of this dependency to the dependency collector
                outputVariable.d.push(dependency.v);
                // Subscribe the output variable to the dependency (passing the index so that subscribed variables know which position in the dependency array this goes into)
                dependency.s.push([outputVariable, index]);
                if (!storage.isAtRoot()) {
                    // Store the dependency source, to be added to the context later on
                    depSources.push(dependency);
                }
                index ++; // Only increment the index if we found a reactive variable, because the final callback won't take in arguments that correspond to non-reactive variables
                // Return a placeholder item to indicate that this spot in the parameters is reserved for the updated value of a reactive variable
                return storage.placeholder;
            } else {
                // Return the static value of the non-reactive dependency
                return dependency;
            }
        });
        if (outputVariable.d.length === 0) {
            // It's safe to just use pass in since outputVariable.d.length === 0 guarantees that the dependency list was unmodified by the map
            return callback(...dependencies);
        }
        outputVariable.c = withCleanup(outputVariable, (...reactiveDeps) => {
            var index = -1;
            return callback(...dependencies.map(dependency => {
                // Either supply the actual dependency or the value from the UndecoratedCallback's arguments, depending on whether a placeholder has been left.
                if (dependency === storage.placeholder) {
                    index ++;
                    return reactiveDeps[index];
                } else {
                    return dependency;
                }
            }));
        });
        outputVariable.v = outputVariable.c(...outputVariable.d);
        
        if (!storage.isAtRoot()) {
            // We pass depSources instead of dependencies because depSources is only for the reactive variables
            storage.addVar(outputVariable, depSources);
        }
        return outputVariable;
    } else {
        if (!isReactive(dependencies[0])) {
            return callback(...dependencies);
        }
        dependencies[0].s.push(outputVariable);
        outputVariable.c = withCleanup(outputVariable, callback);
        outputVariable.v = outputVariable.c(dependencies[0].v);
        
        if (!storage.isAtRoot()) {
            storage.addVar(outputVariable, dependencies);
        }
        return outputVariable;
    }
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
export function deref(variable) {
    if (isReactive(variable)) {
        return variable.v;
    } else {
        return variable;
    }
}

// "Hooks" – these are not really special as "hooks" but they emulate functionality of specific react hooks
export function useState(initial) {
    const variable = createReactive(initial);
    return [variable, (value) => {
        set(variable, value);
    }];
}
export let useEffect = (cb, deps) => {
    console.log("Error, attempting to call useEffect before it has been bound!");
    //unboundUseEffect(cb, deps);
}
