const ReactiveDom = {
    setStyle(node, style) {
        // Styles an element at `node` with a given style object
        apply(style => {
            for (let [key, value] of Object.entries(style)) {
                //apply(value => {node.style[key] = value }, [value])
                node.style[key] = value;
            }
        }, [style]);
    },
    setAttr(node, key, value) {
        // Sets the attribute of a given node. May change to just creating the node with all of its attributes each time
        apply((value) => {
            node[key] = value;
            //return () => { WARNING: REMEMBER TO SET APPLY CALLBACK RETURN TO TRUE IF WE USE THIS!!!
            //    this.log(`Unset ${node.type}.${key} from `, value);
            //}
        }, [value]);
    },
    renderProps(props, element) {
        // Iterates over props and sets them as attributes to the DOM node of a given element
        // TODO: Maybe add only one event listener per event type to the document, and just add these callbacks to a global list of events. Or maybe add them to the element similar to useEffect so that we can remove them on teardown? That seems like it would be difficult to manage deletion though – and it seems inefficient to search through the elements looking for a match. Is that how synthetic event bubbling actually works? We just listen for an event on the document and then look through each element for a match? You'd think the browser would be optimized to do that.
        for (let [key, value] of Object.entries(props)) {
            if (key === "children") {
            //} else if (key.slice(0, 2) === "on" && key[2] === key[2].toUpperCase()) {
            } else if (key === "className") { // ...or anything else that is meant to be kept camelCase
                this.setAttr(element.node, key, value)
            } else if (key === "style") {
                this.setStyle(element.node, value);
            } else {
                this.setAttr(element.node, key.toLowerCase(), value);
            }
        }
    },
    renderConst(element, parent) {
        if (typeof(element) === "undefined") {
            // This means it wasn't conditionally rendered, probably
        } else if (typeof(element) === "string") {
            this.setAttr(parent, "innerHTML", element)
        } else if (typeof(element.type) === "string") {
            // TODO: Assign the result of creating the element to the element's node property (this will be visible in the cleanup function since the cleanup has a reference to element)
            element.node = document.createElement(element.type);
            parent.appendChild(element.node);
            this.renderProps(element.props, element);
            if (element.props.children.length > 0) {
                for (let child of element.props.children) {
                    this.renderRecursive(child, element.node);
                }
            }
        } else {
            // We need to change the identity of global useEffect to a bound function referring to this element. This will allow useEffect to store its effects in the element, which is useful during teardown since we can run all the cleanups for just this element:
            bindUE(element);
            // A functional component's element object will never have any references to DOM nodes, since it's only used to create non-functional elements. This is bad if we need to tear down the functional element, since it doesn't know what DOM nodes it's actually associated with. So we'll store the value produced at element.yield to be used for later teardowns:
            element.yield = element.type(element.props); // Since this is a functional component, element.type is the render function. I'm just copying React with this one
            //this.tabIndex ++;
            this.renderRecursive(element.yield, parent);
        }
    },
    tearDown(element, parent) {
        if (element === undefined) {
            // Probably a conditionally rendered element being not rendered
        } else if (typeof(element) === "string") {
            // No need to unset innerHTML
        } else if (typeof(element.type) === "string") {
            element.node.remove();
            for (let child of element.props.children) {
                this.tearDown(child);
            }
        } else if (isReactive(element)) {
            // Element.s contains one subscription, which is to the render/teardown object. We can follow this subscription to access its collector.v value, which refers to the teardown function for this element. Then, we need to remove the subscription to prevent it from re-rendering when this reactive element changes.
            // The reactive element that needs to be torn down will still have an open reference in some external state variables that are supposed to update it. We can't have a reference back to them because that could cause memory leaks due to circularity in old browsers with naive garbage collectors.
            // So we need to mark this reactive variable as dead, by setting its prototype to null. This will not delete the variable but will instruct all variables to remove this variable's subscriptions to their changes.
            // The subscriptions won't be removed until there's a state change at the dependency, and element won't be garbage-collected until the subscriptions are removed from all dependencies or all dependencies are garbage-collected themselves (since each dependency has a reference to the element). But once all dependencies have either been GC-d or updated, this element will have no remaining references and thus be GC-d.
            // Until then, we'll set every attribute of the reactive element (except prototype) to undefined, so that it only takes up minimal space and allows garbage collection of anything stored.
            // The worst-case scenario for memory here would be if we create a bajillion little components each dependent on some state, and then unrender them all at once and leave the setState refenence in some seldom-called event listener. Until that listener fires, there will be a bajillion little empty objects clogging up the memory.
            
            // Fire the teardown function for this element (no need for arguments since these are boxed in at render time)
            element.s[0][0].v();
            // This does all the steps of marking an element as deleted
            cull(element);
        } else {
            // This is a funcitonal component. It might invoke useEffect, so we need to run all of the element's effect cleanups at teardown
            element.effects = element.effects.filter(effect => {
                // effect.v contains the result of the callback passed to useEffect(). If the callback returned another callback, we'll use that for cleanup. storage.runEffects() already takes care of cleanup when the effect is re-running, but when we tear down the element we need to run cleanup one last time.
                if (typeof(effect.v) === "function") {
                    effect.v();
                    // Tell array.filter() to remove this effect from the list. The element's reference in the render setup-teardown object will be overwritten soon, but just to be safe.
                    // TODO: This is not good memory management. Remove the filter and use the for loop.
                    return false;
                }
            });
            // Since it's a functional element, we recursively follow the yield properties until we reach a a non-functional element (remember, yield stores the element produced by the element.type() function)
            this.tearDown(element.yield, parent);
        }
    },
    renderRecursive(element, parent) {
        // This only exists because we need to run effects after every render (hence a separate render and renderRecursive function: render only runs once per app, renderRecursive runs once per element)
        // TODO: render fragments
        // TODO: render each item of an array child
        if (isReactive(element)) {
            apply((element, parent) => {
                this.renderConst(element, parent);
                return () => {
                    this.tearDown(element, parent)
                }
            }, [element, parent], true)
        } else {
            this.renderConst(element, parent)
        }
    },
    render(element, parent) {
        this.renderRecursive(element, parent);
        storage.runEffects();
    }
}


// Store the reactive variables that are created inside of an apply() call inside the parent reactive variable. Also store references to their dependencies separately. When we re-render and call apply() internally, if the list of subsidiary variables contains a ref with the same dependencies, we can just re-use this. If not, create a new variable. At the end, the variables that weren't bound to new ones get deleted from their dependencies' subscriptions.
// WARNING: this might cause more memory issues backwards! The references in the dependency list of the parent variable could be unsafe to hold onto, because if this component doesn't de-render it could keep alive the dependencies? This sounds like an issue because some components might almost never be torn down and so they could keep the dependencies and everything in their subscription lists open indefinitely. This could be even worse than the render objects staying open!
// Also, what if a nested reactive variable isn't used for rendering? What if it's an intermediary step? Will it even be culled at all?

// Other solution: at render time, briefly capture the variables depended on, then flush these variables, then delete them. That way they don't need to be kept alive during the duration of the component, only at render time. And so culled variables leftover from the previous derender are flushed out. But what if this is never re-rendered? What if we create an element and then never create the exact same one again, but do this over and over, creating more and more unique ones that will never be re-rendered to trigger flush clean up their culled remains?