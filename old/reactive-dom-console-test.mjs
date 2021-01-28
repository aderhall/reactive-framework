import ReactiveDOM from "./reactive-dom-console.mjs";
import { Reactive, useState, apply, useEffect } from "./reactive.mjs";


function Header(props) {
    return Reactive.createElement(
        "div",
        {className: "Header"},
        Reactive.createElement(
            "h1",
            {className: "Header__title"},
            props.title // This is a reactive variable!!
        )
    )
}

function Article(props) {
    return Reactive.createElement(
        "div",
        {className: "Article"},
        Reactive.createElement(
            "h2",
            {className: "Article__title"},
            "How to make a sandwich"
        ),
        Reactive.createElement(
            "p",
            {className: "Article__body"},
            "First, get some bread..."
        )
    )
}

function Modal(props) {
    return Reactive.createElement(
        "div",
        {className: "Modal"},
        "This is a modal"
    )
}

const [headerTitle, setHeaderTitle] = useState("Recipes");
const [modalOpen, setModalOpen] = useState(false);

function App(props) {
    return Reactive.createElement(
        "div",
        {className: "App"},
        Reactive.createElement(
            Header,
            {title: headerTitle}
        ),
        Reactive.createElement(
            "button",
            {
                onClick: () => setHeaderTitle((deref(headerTitle) === "Recipes") ? "Saved" : "Recipes")
            }
        ),
        Reactive.createElement(
            Article,
            null
        ),
        Reactive.createElement(
            "button",
            {onClick: () => setModalOpen(!deref(modalOpen))},
            "Toggle modal"
        ),
        apply((modalOpen) => {
            if (modalOpen) {
                return Reactive.createElement(Modal);
            } else {
                return Reactive.createElement(
                    "div",
                    {className: "Warning"},
                    apply((headerTitle) => {
                        return Reactive.createElement(
                            "p",
                            {className: "Warning__text"},
                            `No modal is being displayed and the headerTitle is ${headerTitle}`
                        );
                    }, [headerTitle])
                )
            }
        }, [modalOpen])
    )
}

function List(props) {
    return Reactive.createElement(
        "ul",
        {className: "List"},
        apply((items) => 
            items.map(item => 
                Reactive.createElement(
                    "li",
                    {className: "List__item"},
                    item
                )
            )
        , [props.items])
    )
}

const [effectOn, setEffectOn] = useState(false);
const [message, setMessage] = useState("Bloop!");

function EffectApp(props) {
    
    return Reactive.createElement(
        "div",
        {className: message},
        //Reactive.createElement(
        //    EffectComponent,
        //    {message: apply((effectOn, message) => effectOn ? message : "No message is being displayed", [effectOn, message])}
        //)
        apply((effectOn) => {
            if (effectOn) {
                return Reactive.createElement(
                    EffectComponent,
                    {message: message}
                )
            }
        }, [effectOn])
    )
}

function EffectComponent(props) {
    useEffect((message) => {
        console.log(`This is an effect! ${message}`);
        return () => {
            console.log(`This is a cleanup for ${message}`);
        }
    }, [props.message]);
    return Reactive.createElement(
        "div",
        {className: "EffectComponent", style: {width: "100px"}},
        "This is an effectful component"
    )
}

//ReactiveDOM.render(Reactive.createElement(App), {type: "root"});
ReactiveDOM.render(Reactive.createElement(EffectApp), {type: "root"});
console.log("------Enabling EffectComponent------");
setEffectOn(true);
console.log("------Changing message------");
setMessage("Meep Morp!");
console.log("------Disabling EffectComponent------");
setEffectOn(false);

//console.log("------testing innerHTML------");
//setHeaderTitle("Saved");
//console.log("------testing conditional render: on------");
//setModalOpen(true);
//console.log("------testing conditional render: off------");
//setModalOpen(false);