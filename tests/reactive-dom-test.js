function Header(props) {
    return Reactive.createElement(
        "div",
        {className: "Header"},
        Reactive.createElement(
            "h1",
            {className: "Header__title"},
            props.title // This is a reactive variable!!
        ),
        Reactive.createElement(
            "button",
            {
                className: "Button",
                onClick: () => set(props.title, (deref(props.title) === "Recipes") ? "Saved" : "Recipes")
            },
            apply((title) => "Go to " + ((title === "Recipes") ? "Saved" : "Recipes"), [props.title])
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
            props.title
        ),
        Reactive.createElement(
            "p",
            {className: "Article__body"},
            ...props.children
        )
    )
}

function Button(props) {
    return Reactive.createElement(
        "button",
        {
            className: apply(type => "Button" + (type ? " Button--" + type : ""), [props.type]),
            onClick: props.onClick,
            style: props.style
        },
        ...props.children
    )
}

function Modal(props) {
    return Reactive.createElement(
        "div",
        {className: apply((open) => "Modal" + (open ? " open" : ""), [props.open])},
        Reactive.createElement(
            "div",
            {
                className: "Modal__bg",
                onClick: () => {set(props.open, false)}
            }
        ),
        Reactive.createElement(
            "div",
            {className: "Modal__body"},
            Reactive.createElement(
                "div",
                {className: "Modal__header"},
                Reactive.createElement(
                    "h3",
                    {className: "Modal__title"},
                    "This is a modal"
                ),
                Reactive.createElement(
                    "button",
                    {
                        className: "Text-button",
                        style: {fontSize: "30px", borderRadius: "50%", width: "30px", height: "30px", lineHeight: "30px"},
                        onClick: () => {set(props.open, false)}
                    },
                    "×"
                )
            ),
            Reactive.createElement(
                "p",
                {className: "Modal__content"},
                "The semiotics of the blowers and the amplified breathing of the fighters. Still it was a square of faint light. The Sprawl was a handgun and nine rounds of ammunition, and as he made his way down Shiga from the missionaries, the train reached Case’s station. Her cheekbones flaring scarlet as Wizard’s Castle burned, forehead drenched with azure when Munich fell to the Tank War, mouth touched with hot gold as a paid killer in the shade beneath a bridge or overpass. The semiotics of the bright void beyond the chain link. Sexless and inhumanly patient, his primary gratification seemed to he in his capsule in some coffin hotel, his hands clawed into the nearest door and watched the other passengers as he rode. Case had never seen him wear the same suit twice, although his wardrobe seemed to consist entirely of meticulous reconstruction’s of garments of the spherical chamber."
            ),
            Reactive.createElement(
                "div",
                {style: {flex: "1 1 0"}}
            ),
            Reactive.createElement(
                Button,
                {
                    onClick: () => set(props.open, false),
                    type: "danger",
                    style: {alignSelf: "flex-start"}
                },
                "Close"
            )
        )
    )
}

function App(props) {
    const [headerTitle, setHeaderTitle] = useState("Recipes");
    const [modalOpen, setModalOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [content, setContent] = useState("The two surviving Founders of Zion were old men, old with the movement of the train, their high heels like polished hooves against the gray metal of the Villa bespeak a turning in, a denial of the bright void beyond the hull. Strata of cigarette smoke rose from the tiers, drifting until it struck currents set up by the blowers and the robot gardener. He’d taken the drug to blunt SAS, nausea, but the muted purring of the Villa bespeak a turning in, a denial of the bright void beyond the hull. That was Wintermute, manipulating the lock the way it had manipulated the drone micro and the amplified breathing of the Sprawl’s towers and ragged Fuller domes, dim figures moving toward him in the dark. The alarm still oscillated, louder here, the rear wall dulling the roar of the console in faded pinks and yellows.");
    const [articleTitle, setArticleTitle] = useState("How to Make a Sandwich");
    return Reactive.createElement(
        "div",
        {className: "App"},
        Reactive.createElement(
            Header,
            {title: headerTitle}
        ),
        Reactive.createElement(
            Article,
            {title: articleTitle},
            content
        ),
        Reactive.createElement(
            "div",
            {className: "App__buttons"},
            Reactive.createElement(
                Button,
                {
                    onClick: () => setModalOpen(!deref(modalOpen))
                },
                "Toggle modal"
            ),
            Reactive.createElement(
                Button,
                {
                    onClick: () => {setContent(""), setArticleTitle("")},
                    type: "danger"
                },
                "Delete article"
            )
        ),
        Reactive.createElement(Modal, {open: modalOpen}),
        apply((modalOpen) => {
            if (!modalOpen) {
                return Reactive.createElement(
                    "div",
                    {className: "Warning"},
                    Reactive.createElement(
                        "p",
                        {className: "Warning__text"},
                        "No modal is being displayed and the title is ",
                        Reactive.createElement("em", null, apply((headerTitle) => `${headerTitle}`, [headerTitle]))
                    )
                )
            }
        }, [modalOpen])
    )
}

ReactiveDom.render(Reactive.createElement(App), document.getElementById("root"));

