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

function App(props) {
    const [headerTitle, setHeaderTitle] = useState("Recipes");
    const [modalOpen, setModalOpen] = useState(false);
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
            },
            apply((headerTitle) => (headerTitle === "Recipes") ? "Saved" : "Recipes", [headerTitle])
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

ReactiveDom.render(Reactive.createElement(App), document.getElementById("root"));