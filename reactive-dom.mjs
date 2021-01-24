"use strict";
import {apply, isReactive, cull} from "./reactive.mjs";
// Reactive DOM

export default {
    tabIndex: 0,
    log(...args) {
        const tabs = [...Array(this.tabIndex).keys()].reduce((prev, current) => prev + "  |", "");
        //console.log(...(args.map(item => tabs + item.toString())));
        console.log(tabs, ...args)
    },
    setAttr(node, key, value) {
        apply((value) => {
            this.log(`Set ${node.type}.${key} to `, value);
            return () => {
                this.log(`Unset ${node.type}.${key} from `, value);
            }
        }, [value], true);
    },
    renderProps(props, node) {
        for (let [key, value] of Object.entries(props)) {
            if (key !== "children") {
                if (key === "className") {
                    this.setAttr(node, "class", value);
                } else {
                    this.setAttr(node, key.toLowerCase(), value);
                }
            }
        }
    },
    renderConst(element, parent) {
        //console.log(`Element: `, element);
        //console.log(`This: `, this);
        if (typeof(element) === "undefined") {
            // This means it wasn't conditionally rendered, probably
            console.log("No need to render an undefined element")
        } else if (typeof(element) === "string") {
            this.setAttr(parent, "innerHTML", element)
        } else if (typeof(element.type) === "string") {
            // TODO: Assign the result of creating the element to the element's node property (this will be visible in the cleanup function since the cleanup has a reference to element)
            element.node = `<${element.type}>`;
            this.log(`<${element.type}>    <---- ${parent.type}`);
            this.renderProps(element.props, element);
            if (element.props.children.length > 0) {
                this.log(`Children:`);
                this.tabIndex ++;
                for (let child of element.props.children) {
                    // TODO: render each item of an array child
                    
                    this.render(child, element);
                }
                this.tabIndex --;
            }
        } else {
            // A functional component's element object will never have any references to DOM nodes, since it's only used to create non-functional elements. This is bad if we need to tear down the functional element, since it doesn't know what DOM nodes it's actually associated with. So we'll store the value produced at element.yield to be used for later teardowns:
            element.yield = element.type(element.props);
            //this.tabIndex ++;
            this.render(element.yield, parent);
        }
    },
    tearDown(element, parent) {
        if (element === undefined) {
            console.log("Previous element value was undefined, nothing to tear down");
        } else if (typeof(element) === "string") {
            console.log(`No need to unset innerHTML from ${element}`);
        } else if (typeof(element.type) === "string") {
            // This can use the stored element node property
            console.log(`Tearing down ${element.node} (${element.type}) from ${parent.type}`);
            console.log(`Tearing down children of ${element.type}`);
            console.log(element.props.children);
            for (let child of element.props.children) {
                console.log(child)
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
            element.s[0[0]].v();
            // This does all the steps of marking an element as deleted
            cull(element);
        } else {
            // If it's a functional element, recursively follow the yields until we reach a a non-functional element
            this.tearDown(element.yield, parent);
        }
    },
    render(element, parent) {
        // TODO: render fragments
        if (isReactive(element)) {
            console.log("Reactive element:")
            console.log(element);
            apply((element, parent) => {
                this.renderConst(element, parent);
                return () => {
                    this.tearDown(element, parent)
                }
            }, [element, parent], true)
        } else {
            this.renderConst(element, parent)
        }
    }
}

//Object.entries(props).reduce((prev, current) => prev + ' ' + current[0] + '="' + current[1] + '"', "")


// If a conditionally rendered component contains another conditionally rendered component:
// If the contained component is rendered based on the container component's state, then when the container component is unrendered, it will tear down all of its children. One of these children is the reactive variable containing the contained component's current element. 



//function createCallback(cb, deps) {
//    return () => cb(...deps)
//}

//createCallback(
//    (x) => setHeaderTitle(x),
//    [
//        apply((headerTitle) => ((headerTitle === "Recipes") ? "Saved": "Recipes"), [headerTitle])
//    ]
//)

//{onClick: (() => {
//    const modified = apply((headerTitle) => ((headerTitle === "Recipes") ? "Saved": "Recipes"), [headerTitle]);
//    return () => setHeaderTitle(modified)
//})(),}