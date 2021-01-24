import ReactiveDOM from "./reactive-dom.mjs";
import * as ReactivePKG from "./reactive.mjs";
const { Reactive, useState, apply } = ReactivePKG;


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
                    "warning",
                    {className: "no-modal"},
                    apply((headerTitle) => {
                        return `No modal is being displayed and the headerTitle is ${headerTitle}`;
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

ReactiveDOM.render(Reactive.createElement(App), {type: "root"});
console.log("------testing innerHTML------");
setHeaderTitle("Saved");
console.log("------testing conditional render: on------");
setModalOpen(true);
console.log("------testing conditional render: off------");
setModalOpen(false);