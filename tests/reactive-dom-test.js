import {Reactive, apply, set, useState, deref} from '../library/reactive.js';
import ReactiveDOM from "../library/reactive-dom.js";

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
                onClick: () => {
                    set(props.title, (deref(props.title) === "Recipes") ? "Saved" : "Recipes");
                }
            },
            apply((title) => "Go to " + ((title === "Recipes") ? "Saved" : "Articles"), [props.title])
        )
    )
}

const [articles, setArticles] = useState([
    ["", ""],
    ["How to make a sandwich", "The two surviving Founders of Zion were old men, old with the movement of the train, their high heels like polished hooves against the gray metal of the Villa bespeak a turning in, a denial of the bright void beyond the hull. Strata of cigarette smoke rose from the tiers, drifting until it struck currents set up by the blowers and the robot gardener. He’d taken the drug to blunt SAS, nausea, but the muted purring of the Villa bespeak a turning in, a denial of the bright void beyond the hull. That was Wintermute, manipulating the lock the way it had manipulated the drone micro and the amplified breathing of the Sprawl’s towers and ragged Fuller domes, dim figures moving toward him in the dark. The alarm still oscillated, louder here, the rear wall dulling the roar of the console in faded pinks and yellows."],
    ["The pros and cons of buying a deep fat frier", "He’d waited in the human system. The Tessier-Ashpool ice shattered, peeling away from the Chinese program’s thrust, a worrying impression of solid fluidity, as though the shards of a broken mirror bent and elongated as they rotated, but it never told the correct time. A narrow wedge of light from a half-open service hatch framed a heap of discarded fiber optics and the chassis of a heroin factory. He woke and found her stretched beside him in the coffin for Armitage’s call. Molly hadn’t seen the dead girl’s face swirl like smoke, to take on the wall between the bookcases, its distorted face sagging to the Tank War, mouth touched with hot gold as a gliding cursor struck sparks from the wall of a broken mirror bent and elongated as they fell. Then a mist closed over the black water and the robot gardener. Sexless and inhumanly patient, his primary gratification seemed to he in his capsule in some coffin hotel, his hands clawed into the shadow of the console. Case had never seen him wear the same suit twice, although his wardrobe seemed to consist entirely of meticulous reconstruction’s of garments of the blowers and the amplified breathing of the fighters."]
]);

function Article(props) {
    const title = apply((id, articles) => articles[id][0], [props.id, articles]);
    const content = apply((id, articles) => articles[id][1], [props.id, articles]);
    return Reactive.createElement(
        "div",
        {className: "Article"},
        Reactive.createElement(
            "h2",
            {className: "Article__title"},
            title
        ),
        Reactive.createElement(
            "p",
            {className: "Article__body"},
            content
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
                        style: {fontSize: "40px", borderRadius: "50%", width: "40px", height: "40px", lineHeight: "40px"},
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
    const articleID = apply(headerTitle => headerTitle === "Recipes" ? 1 : 2, [headerTitle]);
    return Reactive.createElement(
        "div",
        {className: "App"},
        Reactive.createElement(
            Header,
            {title: headerTitle}
        ),
        Reactive.createElement(
            Article,
            {id: articleID},
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
                    onClick: () => {let a = deref(articles); a[deref(articleID)] = ["", ""]; setArticles(a)},
                    type: "danger"
                },
                "Delete article"
            )
        ),
        Reactive.createElement(Modal, {open: modalOpen})
    )
}

ReactiveDOM.render(Reactive.createElement(App), document.getElementById("root"));

