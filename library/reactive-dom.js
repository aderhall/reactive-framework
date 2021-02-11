import {runEffects, apply, bindUE, isReactive} from "./reactive.js";

const ReactiveDOM = {
    setStyle(node, style) {
        // Styles an element at `node` with a given style object
        apply(style => {
            for (let [key, value] of Object.entries(style)) {
                apply(value => {
                    node.style[key] = value; // Set this style property
                    //return () => {
                    //    node.style[key] = ""; // Unset this style property during cleanup
                    //}
                }, [value], false); // We don't need to clean this up, because the act of setting it does the job of overriding the old value. In the event that it is no longer assigned at all, the apply(style => {}) callback will remove it.
            }
            return () => {
                // NOTE: this will remove all inline styles from the element, not just ones added through this framework. But I think that should be the expected behavior anyway – not just looping over the styles we set and unsetting them. But I could change that if necessary.
                node.removeAttribute("style");
            }
        }, [style], true);
    },
    setAttr(node, key, value) {
        // Sets the attribute of a given node. May change to just creating the node with all of its attributes each time
        apply((value) => {
            node[key] = value;
            //return () => { WARNING: REMEMBER TO SET APPLY CALLBACK RETURN TO TRUE IF WE USE THIS!!!
            //    this.log(`Unset ${node.type}.${key} from `, value);
            //}
        }, [value], false); // We don't need a cleanup because the act of setting a new value will override the last value. If the value is to be unset, the render apply callback will un-render the element anyway
    },
    renderProps(props, element) {
        // Iterates over props and sets them as attributes to the DOM node of a given element
        // TODO: Maybe add only one event listener per event type to the document, and just add these callbacks to a global list of events. Or maybe add them to the element similar to useEffect so that we can remove them on teardown? That seems like it would be difficult to manage deletion though – and it seems inefficient to search through the elements looking for a match. Is that how synthetic event bubbling actually works? We just listen for an event on the document and then look through each element for a match? You'd think the browser would be optimized to do that.
        for (let [key, value] of Object.entries(props)) {
            if (value === null || value === undefined) {
                continue;
            }
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
    renderElement(element, parent) {
        // element is an object created by Reactive.createElement(), parent is a DOM node that we'll attach element to
        if (typeof(element) === "undefined") {
            // This means it wasn't conditionally rendered, probably
        } else if (typeof(element) === "string") {
            // String means innerHTML
            // TODO: sanitize this or make it innerText or something, but browser compatible?
            this.setAttr(parent, "textContent", element)
        } else if (typeof(element.type) === "string") {
            // Create the element and store it inside the element object for future cleanup purposes
            element.node = document.createElement(element.type);
            // Add the element to the document
            parent.appendChild(element.node);
            // Render the props to the element
            this.renderProps(element.props, element);
            // Recursively render each of the element's children, using this element node as the parent
            if (element.props.children.length > 0) {
                for (let child of element.props.children) {
                    this.renderRecursive(child, element.node);
                }
            }
        } else if (typeof(element.type) === "function") {
            // TODO: don't change the identity of useEffect – instead, we can have useEffect store effects to a global buffer (in storage) during render, and then we can collect those into the element afterwards. Or we can store a reference to the currently rendering element in storage, and useEffect can deposit effects there
            // We need to change the identity of global useEffect to a bound function referring to this element. This will allow useEffect to store its effects in the element, which is useful during teardown since we can run all the cleanups for just this element:
            bindUE(element);
            // A functional component's element object will never have any references to DOM nodes, since it's only used to create non-functional elements. This is bad if we need to tear down the functional element, since it doesn't know what DOM nodes it's actually associated with. So we'll store the value produced at element.yield to be used for later teardowns:
            element.yield = element.type(element.props); // Since this is a functional component, element.type is the render function. I'm just copying React with this one
            // Why are we passing the element's parent instead of this element? Because functional components don't actually produce DOM nodes, so we'll just render it to the last DOM node above us in the tree
            this.renderRecursive(element.yield, parent);
        } else {
            console.warn("Got unexpected type of element.type, skipping render: ", element);
        }
    },
    tearDown(element, parent) {
        // TODO: remove the parent parameter (it doesn't seem to be necessary)
        if (element === undefined) {
            // Probably a conditionally rendered element being not rendered
        } else if (typeof(element) === "string") {
            // No need to unset textContent
        } else if (typeof(element.type) === "string") {
            // If element.type is a string, then this is a DOM-corresponding element. We'll need to call node.remove() to take it out of the DOM
            element.node.remove();
            // Recursively tear down each of the element's children. This allows us to guarantee that all effects created by child elements are cleaned up when the child is de-rendered (we wouldn't be able to do that if we just tore down the parent node and let it all get GC-d)
            for (let child of element.props.children) {
                this.tearDown(child);
            }
        } else if (isReactive(element)) {
            // Tearing down a reactive variable is already taken care of by the withCleanup behaviors attached during apply() – all we need to do is tear down any elements below this one in the tree
            this.tearDown(element.v);
        } else {
            // This is a funcitonal component. It might invoke useEffect, so we need to run all of the element's effect cleanups at teardown
            for (let effect of element.effects) {
                // effect.v contains the result of the callback passed to useEffect(). If the callback returned another callback, we'll use that for cleanup. storage.runEffects() already takes care of cleanup when the effect is re-running, but when we tear down the element we need to run cleanup one last time.
                if (typeof(effect.v) === "function") {
                    effect.v();
                }
            }
            // Since it's a functional element, we recursively follow the yield properties until we reach a a non-functional element (remember, yield stores the element produced by the element.type() function)
            this.tearDown(element.yield, parent);
        }
    },
    renderRecursive(element, parent) {
        /* Element is a (possibly reactive) variable storing:
            - undefined (don't render anything) // TODO: also allow render null
            - a string (render as text inside the parent element)
            - an object with property type is a string (render a DOM element)
            - an object with property type is a function (render a functional component that produces DOM elements)
            - a nested reactive variable // TODO: this should be taken care of in apply() (there's an issue on GH about this: #1)
        */
        
        // This "renderRecursive" function only exists because we need to run effects after every render (hence a separate render and renderRecursive function: render only runs once per app, renderRecursive runs once per element)
        // TODO: render fragments
        // TODO: render each item of an array child
        apply((element) => {
            if (isReactive(element)) {
                this.renderRecursive(element, parent);
            } else if (Array.isArray(element)) {
                for (let el of element) {
                    this.renderRecursive(el, parent);
                }
            } else {
                this.renderElement(element, parent);
                return () => {
                    this.tearDown(element, parent)
                }
            }
        }, [element], true);
    },
    render(element, parent) {
        this.renderRecursive(element, parent);
        runEffects();
    }
}

export default ReactiveDOM;

// Store the reactive variables that are created inside of an apply() call inside the parent reactive variable. Also store references to their dependencies separately. When we re-render and call apply() internally, if the list of subsidiary variables contains a ref with the same dependencies, we can just re-use this. If not, create a new variable. At the end, the variables that weren't bound to new ones get deleted from their dependencies' subscriptions.
// WARNING: this might cause more memory issues backwards! The references in the dependency list of the parent variable could be unsafe to hold onto, because if this component doesn't de-render it could keep alive the dependencies? This sounds like an issue because some components might almost never be torn down and so they could keep the dependencies and everything in their subscription lists open indefinitely. This could be even worse than the render objects staying open!
// Also, what if a nested reactive variable isn't used for rendering? What if it's an intermediary step? Will it even be culled at all?

// Other solution: at render time, briefly capture the variables depended on, then flush these variables, then delete them. That way they don't need to be kept alive during the duration of the component, only at render time. And so culled variables leftover from the previous derender are flushed out. But what if this is never re-rendered? What if we create an element and then never create the exact same one again, but do this over and over, creating more and more unique ones that will never be re-rendered to trigger flush clean up their culled remains?